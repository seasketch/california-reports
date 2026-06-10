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

export interface KelpForestProperties {
  site: string;
  classcode: string;
  count?: number;
  pct_cov?: number;
  CA_MPA_Name_Short: string;
  site_designation: string;
  site_status: string;
  species_definition: string;
  common_name: string;
}

export interface KelpForestSpecies {
  classcode: string;
  minAbundance: number;
  meanAbundance: number;
  maxAbundance: number;
  siteCount: number;
  observedSiteCount: number;
  speciesDefinition: string;
  commonName: string;
}

export interface KelpForestResults {
  fish: KelpForestSpecies[];
  swath: KelpForestSpecies[];
  upc: KelpForestSpecies[];
}

type KelpForestFeature = Feature<Point, KelpForestProperties>;

/**
 * kelpForest: Return the top 5 species by average abundance inside a sketch
 * @param sketch - A sketch or collection of sketches
 * @returns Top species summaries
 */
export async function kelpForest(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
): Promise<KelpForestResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;

  const [fishFeatures, swathFeatures, upcFeatures] = await Promise.all([
    getDatasourceFeatures("fish_surveys_2024_aggregated", sketchBbox),
    getDatasourceFeatures("swath_2024_aggregated", sketchBbox),
    getDatasourceFeatures("upc_2024_aggregated", sketchBbox),
  ]);

  return {
    fish: getTopSpeciesByAverageValue(
      getFeaturesWithinSketch(fishFeatures, sketchArray),
      "count",
    ),
    swath: getTopSpeciesByAverageValue(
      getFeaturesWithinSketch(swathFeatures, sketchArray),
      "count",
    ),
    upc: getTopSpeciesByAverageValue(
      getFeaturesWithinSketch(upcFeatures, sketchArray),
      "pct_cov",
    ),
  };
}

async function getDatasourceFeatures(
  datasourceId: string,
  sketchBbox: BBox,
): Promise<KelpForestFeature[]> {
  const ds = project.getDatasourceById(datasourceId);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);

  return (await loadFgb<Feature<Point>>(
    url,
    sketchBbox,
  )) as KelpForestFeature[];
}

function getFeaturesWithinSketch(
  features: KelpForestFeature[],
  sketchArray: Sketch<Polygon | MultiPolygon>[],
): KelpForestFeature[] {
  return features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );
}

function getTopSpeciesByAverageValue(
  features: KelpForestFeature[],
  valueProperty: "count" | "pct_cov",
): KelpForestSpecies[] {
  const sites = new Set(
    features
      .map((feature) => feature.properties.site)
      .filter((site) => Boolean(site)),
  );
  const siteCount = sites.size;

  if (siteCount === 0) return [];

  const speciesGroups = new Map<
    string,
    {
      totalAbundance: number;
      observedSiteCount: number;
      minObservedAbundance: number;
      maxObservedAbundance: number;
      speciesDefinition: string;
      commonName: string;
    }
  >();

  features.forEach((feature) => {
    const { classcode, common_name, species_definition } = feature.properties;
    const abundance = Number(feature.properties[valueProperty]);

    if (!classcode || !Number.isFinite(abundance)) return;

    const existing = speciesGroups.get(classcode) ?? {
      totalAbundance: 0,
      observedSiteCount: 0,
      minObservedAbundance: abundance,
      maxObservedAbundance: abundance,
      speciesDefinition: species_definition,
      commonName: common_name,
    };

    existing.totalAbundance += abundance;
    existing.observedSiteCount += 1;
    existing.minObservedAbundance = Math.min(
      existing.minObservedAbundance,
      abundance,
    );
    existing.maxObservedAbundance = Math.max(
      existing.maxObservedAbundance,
      abundance,
    );
    speciesGroups.set(classcode, existing);
  });

  return [...speciesGroups.entries()]
    .map(([classcode, group]) => ({
      classcode,
      minAbundance:
        group.observedSiteCount < siteCount ? 0 : group.minObservedAbundance,
      meanAbundance: group.totalAbundance / siteCount,
      maxAbundance: group.maxObservedAbundance,
      siteCount,
      observedSiteCount: group.observedSiteCount,
      speciesDefinition: group.speciesDefinition,
      commonName: group.commonName,
    }))
    .sort((a, b) => b.meanAbundance - a.meanAbundance)
    .slice(0, 5);
}

export default new GeoprocessingHandler(kelpForest, {
  title: "kelpForest",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
