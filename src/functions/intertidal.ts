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

export interface IntertidalPercentCoverProperties {
  marine_site_name?: string;
  marine_site_code?: string;
  cbs_site_code?: number;
  year?: number;
  species_lump?: string;
  percent_cover?: number;
}

export interface IntertidalPercentCoverSpecies {
  species: string;
  minPercentCover: number;
  meanPercentCover: number;
  maxPercentCover: number;
  siteCount: number;
  observedSiteCount: number;
}

export interface IntertidalPercentCoverResults {
  years: number[];
  species: IntertidalPercentCoverSpecies[];
}

type IntertidalPercentCoverFeature = Feature<
  Point,
  IntertidalPercentCoverProperties
>;

const MIN_YEAR = 2020;

/**
 * intertidalPercentCover: Return species percent cover inside a sketch.
 * @param sketch - A sketch or collection of sketches
 * @returns Intertidal percent cover species summaries for the latest year represented
 */
export async function intertidal(
  sketch:
    Sketch<Polygon | MultiPolygon> | SketchCollection<Polygon | MultiPolygon>,
): Promise<IntertidalPercentCoverResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;
  const features = await getDatasourceFeatures(sketchBbox);
  const sketchFeatures = getFeaturesWithinSketch(features, sketchArray);
  const recentSketchFeatures = sketchFeatures.filter((feature) => {
    const year = getFeatureYear(feature);
    return year !== undefined && year >= MIN_YEAR;
  });
  const latestYearBySite = getLatestYearBySite(recentSketchFeatures);
  const latestSiteFeatures = getLatestSiteFeatures(
    recentSketchFeatures,
    latestYearBySite,
  );
  const years = [...new Set(latestYearBySite.values())].sort((a, b) => a - b);

  if (latestSiteFeatures.length === 0) {
    return {
      years: [],
      species: [],
    };
  }

  return {
    years,
    species: getSpeciesByPercentCover(latestSiteFeatures),
  };
}

async function getDatasourceFeatures(
  sketchBbox: BBox,
): Promise<IntertidalPercentCoverFeature[]> {
  const ds = project.getDatasourceById("intertidal");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);

  return (await loadFgb<Feature<Point>>(
    url,
    sketchBbox,
  )) as IntertidalPercentCoverFeature[];
}

function getFeaturesWithinSketch(
  features: IntertidalPercentCoverFeature[],
  sketchArray: Sketch<Polygon | MultiPolygon>[],
): IntertidalPercentCoverFeature[] {
  return features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );
}

function getLatestYearBySite(
  features: IntertidalPercentCoverFeature[],
): Map<string, number> {
  const latestYearBySite = new Map<string, number>();

  features.forEach((feature) => {
    const siteId = getSiteId(feature);
    const year = getFeatureYear(feature);

    if (!siteId || year === undefined) return;

    latestYearBySite.set(
      siteId,
      Math.max(latestYearBySite.get(siteId) ?? year, year),
    );
  });

  return latestYearBySite;
}

function getLatestSiteFeatures(
  features: IntertidalPercentCoverFeature[],
  latestYearBySite: Map<string, number>,
): IntertidalPercentCoverFeature[] {
  return features.filter((feature) => {
    const siteId = getSiteId(feature);
    const year = getFeatureYear(feature);

    return Boolean(
      siteId && year !== undefined && latestYearBySite.get(siteId) === year,
    );
  });
}

function getFeatureYear(
  feature: IntertidalPercentCoverFeature,
): number | undefined {
  const year = Number(feature.properties.year);
  return Number.isFinite(year) ? year : undefined;
}

function getSiteId(feature: IntertidalPercentCoverFeature): string | undefined {
  const { marine_site_code, marine_site_name, cbs_site_code } =
    feature.properties;

  if (marine_site_code) return marine_site_code;
  if (cbs_site_code !== undefined && cbs_site_code !== null)
    return String(cbs_site_code);
  return marine_site_name;
}

function getSpeciesByPercentCover(
  features: IntertidalPercentCoverFeature[],
): IntertidalPercentCoverSpecies[] {
  const sites = new Set(
    features.map((feature) => getSiteId(feature)).filter(Boolean),
  );
  const siteCount = sites.size;

  if (siteCount === 0) return [];

  const speciesGroups = new Map<
    string,
    Map<string, { percentCoverTotal: number; recordCount: number }>
  >();

  features.forEach((feature) => {
    const species = feature.properties.species_lump;
    const siteId = getSiteId(feature);
    const percentCover = Number(feature.properties.percent_cover);

    if (!species || !siteId || !Number.isFinite(percentCover)) return;

    const siteGroups = speciesGroups.get(species) ?? new Map();
    const siteValues = siteGroups.get(siteId) ?? {
      percentCoverTotal: 0,
      recordCount: 0,
    };

    siteValues.percentCoverTotal += percentCover;
    siteValues.recordCount += 1;
    siteGroups.set(siteId, siteValues);
    speciesGroups.set(species, siteGroups);
  });

  return [...speciesGroups.entries()]
    .map(([species, siteGroups]) => {
      const siteMeans = [...siteGroups.values()].map(
        (siteValues) => siteValues.percentCoverTotal / siteValues.recordCount,
      );
      const observedSiteCount = siteMeans.filter(
        (siteMean) => siteMean > 0,
      ).length;

      return {
        species,
        minPercentCover:
          siteMeans.length < siteCount ? 0 : Math.min(...siteMeans),
        meanPercentCover:
          siteMeans.reduce((sum, siteMean) => sum + siteMean, 0) / siteCount,
        maxPercentCover: Math.max(...siteMeans),
        siteCount,
        observedSiteCount,
      };
    })
    .sort(
      (a, b) =>
        b.meanPercentCover - a.meanPercentCover ||
        b.maxPercentCover - a.maxPercentCover ||
        a.species.localeCompare(b.species),
    );
}

export default new GeoprocessingHandler(intertidal, {
  title: "intertidal",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
