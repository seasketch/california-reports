import {
  Feature,
  FeatureClipOperation,
  PreprocessingHandler,
  Sketch,
  VectorDataSource,
  clipToPolygonFeatures,
  ensureValidPolygon,
  isVectorDatasource,
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
  const clipLayer = new VectorDataSource(url);
  const eezFC = await clipLayer.fetchUnion(featureBox, "UNION");

  const keepInsideEez: FeatureClipOperation = {
    operation: "intersection",
    clipFeatures: eezFC.features,
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
