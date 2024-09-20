import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  overlapFeatures,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Feature,
  Metric,
  isVectorDatasource,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { spacing } from "../util/spacing.js";
import { bbox, simplify } from "@turf/turf";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

/**
 * spacingEstuaries: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacingEstuaries(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>
): Promise<any> {
  const ds = project.getDatasourceById("estuaries");
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

        return overlapFeatures("spacingEstuaries", features, sketch);
      })
    )
  ).reduce<Metric[]>((acc, val) => acc.concat(val), []);

  // Run replication spacing analysis
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const replicateMetrics = sketchMetrics.filter(
    (m) => squareMeterToMile(m.value) > 0.12
  );
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

export default new GeoprocessingHandler(spacingEstuaries, {
  title: "spacingEstuaries",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
