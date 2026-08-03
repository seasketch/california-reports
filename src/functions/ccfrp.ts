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
  CPUE_catch_per_angler_hour: number;
  "BPUE_biomass(kg)_per_angler_hour": number;
}

export interface CcfrpSpecies {
  commonName: string;
  meanCpue: number;
  meanBpue: number;
  siteCount: number;
  sitesWithCatch: number;
}

export interface cpueTimeSeriesPt {
  commonName: string;
  year: number;
  meanCpue: number;
}

export interface CcfrpResults {
  species: CcfrpSpecies[];
  cpueTimeSeries: cpueTimeSeriesPt[];
}

type CcfrpFeature = Feature<Point, CcfrpProperties>;
type SiteEffortTotals = {
  cpueTotal: number;
  bpueTotal: number;
  recordCount: number;
};

/**
 * ccfrp: Return mean CPUE and BPUE by species for CCFRP sites inside a sketch.
 * @param sketch - A sketch or collection of sketches
 * @returns CCFRP species summaries
 */
export async function ccfrp(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
): Promise<CcfrpResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;
  const ds = project.getDatasourceById("ccfrp-full");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);
  const features = (await loadFgb<Feature<Point>>(
    url,
    sketchBbox,
  )) as CcfrpFeature[];

  const pointsInSketch = features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );

  const pointsInSketch2023 = pointsInSketch.filter(
    (feature) => getFeatureYear(feature) === 2023,
  );
  const species = getMeans(pointsInSketch2023);

  const cpueTimeSeries = getCpueTimeSeries(
    pointsInSketch,
    species.slice(0, 5).map((curSpecies) => curSpecies.commonName),
  );

  return {
    species,
    cpueTimeSeries,
  };
}

function getMeans(features: CcfrpFeature[]): CcfrpSpecies[] {
  // Keep a complete set of sampled sites so species means are averaged across
  // the same site denominator, even when a species is absent from some sites.
  const sites = new Set<string>();

  // Records are grouped by species and Grid_Cell_ID first. This prevents a site
  // with more survey records from outweighing another site in the final mean.
  const recordsBySpeciesAndSite: Record<
    string,
    Record<string, SiteEffortTotals>
  > = {};

  features.forEach((feature) => {
    const siteId = feature.properties.Grid_Cell_ID;
    if (siteId) sites.add(siteId);
    const commonName = feature.properties.Common_Name;
    const cpue = Number(feature.properties.CPUE_catch_per_angler_hour);
    const bpue = Number(feature.properties["BPUE_biomass(kg)_per_angler_hour"]);

    if (
      !commonName ||
      !siteId ||
      !Number.isFinite(cpue) ||
      !Number.isFinite(bpue)
    )
      return;

    const siteRecords = recordsBySpeciesAndSite[commonName] ?? {};
    const siteTotals = siteRecords[siteId] ?? {
      cpueTotal: 0,
      bpueTotal: 0,
      recordCount: 0,
    };

    siteTotals.cpueTotal += cpue;
    siteTotals.bpueTotal += bpue;
    siteTotals.recordCount += 1;
    siteRecords[siteId] = siteTotals;
    recordsBySpeciesAndSite[commonName] = siteRecords;
  });

  if (sites.size === 0) return [];

  return Object.entries(recordsBySpeciesAndSite)
    .map(([commonName, siteRecords]) => {
      // First average all records from the same site, then average those site
      // means across the full set of sampled sites in the sketch.
      const siteMeans = Object.values(siteRecords).map((siteRecords) => ({
        meanCpue: siteRecords.cpueTotal / siteRecords.recordCount,
        meanBpue: siteRecords.bpueTotal / siteRecords.recordCount,
      }));

      return {
        commonName,
        meanCpue:
          siteMeans.reduce((sum, siteMean) => sum + siteMean.meanCpue, 0) /
          sites.size,
        meanBpue:
          siteMeans.reduce((sum, siteMean) => sum + siteMean.meanBpue, 0) /
          sites.size,
        siteCount: sites.size,
        sitesWithCatch: siteMeans.filter(
          (siteMean) => siteMean.meanCpue > 0 || siteMean.meanBpue > 0,
        ).length,
      };
    })
    .sort((a, b) => b.meanCpue - a.meanCpue || b.meanBpue - a.meanBpue);
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
): cpueTimeSeriesPt[] {
  const selectedSpecies = new Set(speciesNames);
  if (selectedSpecies.size === 0) return [];

  const sitesByYear: Record<number, Set<string>> = {};
  const recordsBySpeciesYearAndSite: Record<
    string,
    Record<number, Record<string, { cpueTotal: number; recordCount: number }>>
  > = {};

  features.forEach((feature) => {
    const commonName = feature.properties.Common_Name;
    const siteId = feature.properties.Grid_Cell_ID;
    const year = getFeatureYear(feature);
    const cpue = Number(feature.properties.CPUE_catch_per_angler_hour);

    if (!commonName || !siteId || !year || !Number.isFinite(cpue)) return;

    const sites = sitesByYear[year] ?? new Set<string>();
    sites.add(siteId);
    sitesByYear[year] = sites;

    if (!selectedSpecies.has(commonName)) return;

    const recordsByYear = recordsBySpeciesYearAndSite[commonName] ?? {};
    const recordsBySite = recordsByYear[year] ?? {};
    const siteRecords = recordsBySite[siteId] ?? {
      cpueTotal: 0,
      recordCount: 0,
    };

    siteRecords.cpueTotal += cpue;
    siteRecords.recordCount += 1;
    recordsBySite[siteId] = siteRecords;
    recordsByYear[year] = recordsBySite;
    recordsBySpeciesYearAndSite[commonName] = recordsByYear;
  });

  const years = Object.keys(sitesByYear)
    .map(Number)
    .sort((a, b) => a - b);

  return speciesNames.flatMap((commonName) =>
    years.map((year) => {
      const siteCount = sitesByYear[year]?.size ?? 0;
      const recordsBySite = recordsBySpeciesYearAndSite[commonName]?.[year];
      const siteCpueMeans = recordsBySite
        ? Object.values(recordsBySite).map(
            (siteRecords) => siteRecords.cpueTotal / siteRecords.recordCount,
          )
        : [];
      const meanCpueAcrossSites =
        siteCount === 0
          ? 0
          : siteCpueMeans.reduce((sum, siteMean) => sum + siteMean, 0) /
            siteCount;

      return {
        commonName,
        year,
        meanCpue: meanCpueAcrossSites,
      };
    }),
  );
}

export default new GeoprocessingHandler(ccfrp, {
  title: "ccfrp",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
