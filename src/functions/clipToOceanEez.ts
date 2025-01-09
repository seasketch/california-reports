import {
  Feature,
  FeatureClipOperation,
  MultiPolygon,
  Polygon,
  PreprocessingHandler,
  Sketch,
  clipToPolygonFeatures,
  ensureValidPolygon,
  isVectorDatasource,
  loadFgb,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { bbox } from "@turf/turf";

/**
 * Preprocessor takes a Polygon feature/sketch and returns the portion that
 * is in the ocean (not on land) and within one or more EEZ boundaries.
 */
export async function clipToOceanEez(
  feature: Feature | Sketch,
): Promise<Feature> {
  // throws if not valid with specific message
  ensureValidPolygon(feature, {
    minSize: 1,
    enforceMinSize: false,
    maxSize: 500_000 * 1000 ** 2, // Default 500,000 KM
    enforceMaxSize: false,
  });

  const featureBox = bbox(feature);

  const ds = project.getDatasourceById("clipLayer");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);

  // Keep portion of sketch within EEZ
  const features: Feature<Polygon | MultiPolygon>[] = await loadFgb(
    url,
    featureBox,
  );

  const keepInsideEez: FeatureClipOperation = {
    operation: "intersection",
    clipFeatures: features,
  };

  return clipToPolygonFeatures(feature, [keepInsideEez], {
    ensurePolygon: true,
  });
}

export default new PreprocessingHandler(clipToOceanEez, {
  title: "clipToOceanEez",
  description: "Clips sketches to state waters",
  timeout: 40,
  requiresProperties: [],
  memory: 4096,
});
