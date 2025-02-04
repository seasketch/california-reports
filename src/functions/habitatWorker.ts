import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  splitSketchAntimeridian,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Geography,
  Metric,
  MetricGroup,
  isRasterDatasource,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import { bbox } from "@turf/turf";

/**
 * habitat: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function habitatWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    geography: Geography;
    metricGroup: MetricGroup;
  },
) {
  const geography = extraParams.geography;
  const metricGroup = extraParams.metricGroup;

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  if (!metricGroup.datasourceId)
    throw new Error(`Expected datasourceId for ${metricGroup.metricId}`);

  // Clip sketch to geography
  const clippedSketch = await clipToGeography(splitSketch, geography);

  // Get bounding box of sketch remainder
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  const ds = project.getDatasourceById(metricGroup.datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  // Start analysis when raster load finishes
  const overlapResult = await rasterMetrics(raster, {
    metricId: metricGroup.metricId,
    feature: clippedSketch,
    ...(ds.measurementType === "quantitative" && { stats: ["area"] }),
    ...(ds.measurementType === "categorical" && {
      categorical: true,
      categoryMetricValues: metricGroup.classes.map((c) => c.classId),
    }),
  });

  return overlapResult.map(
    (metrics): Metric => ({
      ...metrics,
      geographyId: geography.geographyId,
    }),
  );
}

export default new GeoprocessingHandler(habitatWorker, {
  title: "habitatWorker",
  description: "",
  timeout: 500, // seconds
  memory: 4096, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
