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
  Grid_Cell_ID?: string;
  ID_Cell_per_Trip?: string;
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

export interface CcfrpResults {
  species: CcfrpSpecies[];
}

type CcfrpFeature = Feature<Point, CcfrpProperties>;

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
  const features = await getDatasourceFeatures(sketchBbox);
  const sketchFeatures = getFeaturesWithinSketch(features, sketchArray);

  return {
    species: getSpeciesMeans(sketchFeatures),
  };
}

async function getDatasourceFeatures(
  sketchBbox: BBox,
): Promise<CcfrpFeature[]> {
  const ds = project.getDatasourceById("ccfrp_derived_effort_2023");
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
  const sites = new Set(
    features
      .map((feature) => getSiteId(feature))
      .filter((siteId): siteId is string => Boolean(siteId)),
  );
  const siteCount = sites.size;

  if (siteCount === 0) return [];

  const speciesGroups = new Map<
    string,
    Map<string, { cpueTotal: number; bpueTotal: number; recordCount: number }>
  >();

  features.forEach((feature) => {
    const commonName = feature.properties.Common_Name;
    const siteId = getSiteId(feature);
    const cpue = Number(feature.properties.CPUE_catch_per_angler_hour);
    const bpue = Number(feature.properties["BPUE_biomass(kg)_per_angler_hour"]);

    if (
      !commonName ||
      !siteId ||
      !Number.isFinite(cpue) ||
      !Number.isFinite(bpue)
    )
      return;

    const siteGroups = speciesGroups.get(commonName) ?? new Map();
    const siteValues = siteGroups.get(siteId) ?? {
      cpueTotal: 0,
      bpueTotal: 0,
      recordCount: 0,
    };

    siteValues.cpueTotal += cpue;
    siteValues.bpueTotal += bpue;
    siteValues.recordCount += 1;
    siteGroups.set(siteId, siteValues);
    speciesGroups.set(commonName, siteGroups);
  });

  return [...speciesGroups.entries()]
    .map(([commonName, siteGroups]) => {
      const siteMeans = [...siteGroups.values()].map((siteValues) => ({
        cpue: siteValues.cpueTotal / siteValues.recordCount,
        bpue: siteValues.bpueTotal / siteValues.recordCount,
      }));

      return {
        commonName,
        meanCpue:
          siteMeans.reduce((sum, siteMean) => sum + siteMean.cpue, 0) /
          siteCount,
        meanBpue:
          siteMeans.reduce((sum, siteMean) => sum + siteMean.bpue, 0) /
          siteCount,
        siteCount,
        sitesWithCatch: siteMeans.filter(
          (siteMean) => siteMean.cpue > 0 || siteMean.bpue > 0,
        ).length,
      };
    })
    .sort((a, b) => b.meanCpue - a.meanCpue || b.meanBpue - a.meanBpue);
}

function getSiteId(feature: CcfrpFeature): string | undefined {
  return feature.properties.Grid_Cell_ID ?? feature.properties.ID_Cell_per_Trip;
}

export default new GeoprocessingHandler(ccfrp, {
  title: "ccfrp",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
