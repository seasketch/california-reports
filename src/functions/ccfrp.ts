import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  isVectorDatasource,
  loadFgb,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { toSketchArray } from "@seasketch/geoprocessing/client-core";
import { bbox, booleanPointInPolygon } from "@turf/turf";
import { BBox, Feature, Point } from "geojson";

export interface CcfrpProperties {
  Common_Name: string;
  Date?: string;
  Grid_Cell_ID?: string;
  ID_Cell_per_Trip?: string;
  MPA_status?: CcfrpStatus;
  MPA_Status?: CcfrpStatus;
  CPUE_catch_per_angler_hour: number;
  "BPUE_biomass(kg)_per_angler_hour": number;
}

export type CcfrpStatus = "MPA" | "REF";

export interface CcfrpStatusMeans {
  meanCpue: number;
  meanBpue: number;
  siteCount: number;
  sitesWithCatch: number;
}

export interface CcfrpSpecies {
  commonName: string;
  mpa: CcfrpStatusMeans;
  ref: CcfrpStatusMeans;
}

export interface CcfrpCpueTimeSeriesDatum {
  commonName: string;
  status: CcfrpStatus;
  year: number;
  meanCpue: number;
}

export interface CcfrpResults {
  species: CcfrpSpecies[];
  cpueTimeSeries: CcfrpCpueTimeSeriesDatum[];
}

type CcfrpFeature = Feature<Point, CcfrpProperties>;

/**
 * ccfrp: Return mean CPUE and BPUE by species for CCFRP sites inside a sketch.
 * @param sketch - A sketch or collection of sketches
 * @returns CCFRP species summaries
 */
export async function ccfrp(
  sketch:
    Sketch<Polygon | MultiPolygon> | SketchCollection<Polygon | MultiPolygon>,
): Promise<CcfrpResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;
  const features = await getDatasourceFeatures(sketchBbox);
  const sketchFeatures = getFeaturesWithinSketch(features, sketchArray);
  const species = getSpeciesMeans(
    sketchFeatures.filter((feature) => getFeatureYear(feature) === 2023),
  );

  return {
    species,
    cpueTimeSeries: getCpueTimeSeries(
      sketchFeatures,
      species.slice(0, 5).map((curSpecies) => curSpecies.commonName),
    ),
  };
}

async function getDatasourceFeatures(
  sketchBbox: BBox,
): Promise<CcfrpFeature[]> {
  const ds = project.getDatasourceById("ccfrp-full");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);

  return (await loadFgb<Feature<Point>>(url, sketchBbox)) as CcfrpFeature[];
}

function getFeaturesWithinSketch(
  features: CcfrpFeature[],
  sketchArray: Sketch<Polygon | MultiPolygon>[],
): CcfrpFeature[] {
  return features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );
}

function getSpeciesMeans(features: CcfrpFeature[]): CcfrpSpecies[] {
  const statusSites = new Map<CcfrpStatus, Set<string>>([
    ["MPA", new Set()],
    ["REF", new Set()],
  ]);

  features.forEach((feature) => {
    const siteId = getSiteId(feature);
    const status = getStatus(feature);

    if (siteId && status) statusSites.get(status)?.add(siteId);
  });

  if (statusSites.get("MPA")!.size === 0 && statusSites.get("REF")!.size === 0)
    return [];

  const speciesGroups = new Map<
    string,
    Map<
      CcfrpStatus,
      Map<string, { cpueTotal: number; bpueTotal: number; recordCount: number }>
    >
  >();

  features.forEach((feature) => {
    const commonName = feature.properties.Common_Name;
    const siteId = getSiteId(feature);
    const status = getStatus(feature);
    const cpue = Number(feature.properties.CPUE_catch_per_angler_hour);
    const bpue = Number(feature.properties["BPUE_biomass(kg)_per_angler_hour"]);

    if (
      !commonName ||
      !siteId ||
      !status ||
      !Number.isFinite(cpue) ||
      !Number.isFinite(bpue)
    )
      return;

    const statusGroups = speciesGroups.get(commonName) ?? new Map();
    const siteGroups = statusGroups.get(status) ?? new Map();
    const siteValues = siteGroups.get(siteId) ?? {
      cpueTotal: 0,
      bpueTotal: 0,
      recordCount: 0,
    };

    siteValues.cpueTotal += cpue;
    siteValues.bpueTotal += bpue;
    siteValues.recordCount += 1;
    siteGroups.set(siteId, siteValues);
    statusGroups.set(status, siteGroups);
    speciesGroups.set(commonName, statusGroups);
  });

  return [...speciesGroups.entries()]
    .map(([commonName, statusGroups]) => ({
      commonName,
      mpa: getStatusMeans(
        statusGroups.get("MPA"),
        statusSites.get("MPA")!.size,
      ),
      ref: getStatusMeans(
        statusGroups.get("REF"),
        statusSites.get("REF")!.size,
      ),
    }))
    .sort(
      (a, b) =>
        Math.max(b.mpa.meanCpue, b.ref.meanCpue) -
          Math.max(a.mpa.meanCpue, a.ref.meanCpue) ||
        Math.max(b.mpa.meanBpue, b.ref.meanBpue) -
          Math.max(a.mpa.meanBpue, a.ref.meanBpue),
    );
}

function getSiteId(feature: CcfrpFeature): string | undefined {
  return feature.properties.Grid_Cell_ID ?? feature.properties.ID_Cell_per_Trip;
}

function getStatus(feature: CcfrpFeature): CcfrpStatus | undefined {
  const status = feature.properties.MPA_status ?? feature.properties.MPA_Status;
  return status === "MPA" || status === "REF" ? status : undefined;
}

function getFeatureYear(feature: CcfrpFeature): number | undefined {
  const year = feature.properties.Date?.match(/(\d{4})$/)?.[1];
  if (!year) return undefined;

  const parsedYear = Number(year);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function getCpueTimeSeries(
  features: CcfrpFeature[],
  speciesNames: string[],
): CcfrpCpueTimeSeriesDatum[] {
  const selectedSpecies = new Set(speciesNames);
  if (selectedSpecies.size === 0) return [];

  const yearlyStatusSites = new Map<number, Map<CcfrpStatus, Set<string>>>();
  const speciesGroups = new Map<
    string,
    Map<
      number,
      Map<CcfrpStatus, Map<string, { cpueTotal: number; recordCount: number }>>
    >
  >();

  features.forEach((feature) => {
    const commonName = feature.properties.Common_Name;
    const siteId = getSiteId(feature);
    const status = getStatus(feature);
    const year = getFeatureYear(feature);
    const cpue = Number(feature.properties.CPUE_catch_per_angler_hour);

    if (!commonName || !siteId || !status || !year || !Number.isFinite(cpue))
      return;

    const statusSites =
      yearlyStatusSites.get(year) ??
      new Map<CcfrpStatus, Set<string>>([
        ["MPA", new Set()],
        ["REF", new Set()],
      ]);
    statusSites.get(status)?.add(siteId);
    yearlyStatusSites.set(year, statusSites);

    if (!selectedSpecies.has(commonName)) return;

    const yearGroups = speciesGroups.get(commonName) ?? new Map();
    const statusGroups = yearGroups.get(year) ?? new Map();
    const siteGroups = statusGroups.get(status) ?? new Map();
    const siteValues = siteGroups.get(siteId) ?? {
      cpueTotal: 0,
      recordCount: 0,
    };

    siteValues.cpueTotal += cpue;
    siteValues.recordCount += 1;
    siteGroups.set(siteId, siteValues);
    statusGroups.set(status, siteGroups);
    yearGroups.set(year, statusGroups);
    speciesGroups.set(commonName, yearGroups);
  });

  const years = [...yearlyStatusSites.keys()].sort((a, b) => a - b);

  return speciesNames.flatMap((commonName) =>
    years.flatMap((year) =>
      (["MPA", "REF"] as CcfrpStatus[]).flatMap((status) => {
        const siteCount = yearlyStatusSites.get(year)?.get(status)?.size ?? 0;
        if (siteCount === 0) return [];

        const siteGroups = speciesGroups
          .get(commonName)
          ?.get(year)
          ?.get(status);
        const meanCpue = getMeanCpue(siteGroups, siteCount);

        return {
          commonName,
          status,
          year,
          meanCpue,
        };
      }),
    ),
  );
}

function getMeanCpue(
  siteGroups:
    Map<string, { cpueTotal: number; recordCount: number }> | undefined,
  siteCount: number,
): number {
  if (!siteGroups || siteCount === 0) return 0;

  const siteMeans = [...siteGroups.values()].map(
    (siteValues) => siteValues.cpueTotal / siteValues.recordCount,
  );

  return siteMeans.reduce((sum, siteMean) => sum + siteMean, 0) / siteCount;
}

function getStatusMeans(
  siteGroups:
    | Map<string, { cpueTotal: number; bpueTotal: number; recordCount: number }>
    | undefined,
  siteCount: number,
): CcfrpStatusMeans {
  if (!siteGroups || siteCount === 0) {
    return {
      meanCpue: 0,
      meanBpue: 0,
      siteCount,
      sitesWithCatch: 0,
    };
  }

  const siteMeans = [...siteGroups.values()].map((siteValues) => ({
    cpue: siteValues.cpueTotal / siteValues.recordCount,
    bpue: siteValues.bpueTotal / siteValues.recordCount,
  }));

  return {
    meanCpue:
      siteMeans.reduce((sum, siteMean) => sum + siteMean.cpue, 0) / siteCount,
    meanBpue:
      siteMeans.reduce((sum, siteMean) => sum + siteMean.bpue, 0) / siteCount,
    siteCount,
    sitesWithCatch: siteMeans.filter(
      (siteMean) => siteMean.cpue > 0 || siteMean.bpue > 0,
    ).length,
  };
}

export default new GeoprocessingHandler(ccfrp, {
  title: "ccfrp",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
