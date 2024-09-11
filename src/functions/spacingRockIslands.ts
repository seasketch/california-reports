import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  overlapFeatures,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Feature,
  GeoprocessingRequestModel,
  Metric,
  isVectorDatasource,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { spacing } from "../util/spacing.js";
import { bbox, simplify } from "@turf/turf";
import { fgbFetchAll, loadCog } from "@seasketch/geoprocessing/dataproviders";

/**
 * spacingRockIslands: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacingRockIslands(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<any> {
  const ds = project.getDatasourceById("rock_islands");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

  const sketches = toSketchArray(sketch);

  const url = project.getDatasourceUrl(ds);

  const metrics = (
    await Promise.all(
      sketches.map(async (sketch) => {
        const features = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
          url,
          sketch.bbox || bbox(sketch)
        );
        return overlapFeatures("rock_islands", features, sketch);
      })
    )
  ).reduce<Metric[]>((acc, val) => acc.concat(val), []);

  // Run replication spacing analysis
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const replicateMetrics = sketchMetrics.filter((m) => m.value / 1609 > 0.55);
  const replicateSketches = sketches.filter((sk) =>
    replicateMetrics.some((m) => m.sketchId === sk.properties.id)
  ) as Sketch<Polygon>[];

  const { paths } = await spacing(replicateSketches);

  const replicateIds = replicateSketches.map((sk) => sk.properties.id);

  return {
    sketch: sketches.map((sketch) => simplify(sketch, { tolerance: 0.005 })),
    replicateIds,
    paths,
  };
}

export default new GeoprocessingHandler(spacingRockIslands, {
  title: "spacingRockIslands",
  description: "spacingRockIslands",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
