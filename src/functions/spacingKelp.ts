import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  isRasterDatasource,
  rekeyMetrics,
  sortMetrics,
  squareMeterToMile,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { spacing } from "./spacing.js";
import { simplify } from "@turf/turf";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";

/**
 * spacingKelp: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacingKelp(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<any> {
  const metricGroup = project.getMetricGroup("kelpMax");

  if (!metricGroup.datasourceId)
    throw new Error(`Expected datasourceId for ${metricGroup.metricId}`);

  const ds = project.getDatasourceById(metricGroup.datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  const sketches = toSketchArray(sketch);

  const metrics = (
    await Promise.all(
      sketches.map(async (sketch) =>
        rasterMetrics(raster, {
          metricId: metricGroup.metricId,
          feature: sketch,
          ...(ds.measurementType === "quantitative" && { stats: ["area"] }),
          ...(ds.measurementType === "categorical" && {
            categorical: true,
            categoryMetricValues: metricGroup.classes.map((c) => c.classId),
          }),
        })
      )
    )
  ).reduce<Metric[]>((acc, val) => acc.concat(val), []);

  // Run replication spacing analysis
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const replicateMetrics = sketchMetrics.filter(
    (m) => squareMeterToMile(m.value) > 1.1
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

export default new GeoprocessingHandler(spacingKelp, {
  title: "spacingKelp",
  description: "spacingKelp",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
