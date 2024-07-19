import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  splitSketchAntimeridian,
  isRasterDatasource,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import { Metric, MetricGroup } from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";

/**
 * habitatWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function habitatWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    metricGroup: MetricGroup;
    datasourceId: string;
  }
) {
  const metricGroup = extraParams.metricGroup;
  const datasourceId = extraParams.datasourceId;

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  const ds = project.getDatasourceById(datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  // Start analysis when raster load finishes
  const overlapResult = await rasterMetrics(raster, {
    metricId: metricGroup.metricId,
    feature: splitSketch,
    ...(ds.measurementType === "quantitative" && { stats: ["valid"] }),
    ...(ds.measurementType === "categorical" && {
      categorical: true,
      categoryMetricValues: metricGroup.classes
        .filter((c) => c.datasourceId === datasourceId)
        .map((c) => c.classId),
    }),
    bandMetricProperty: "groupId",
    bandMetricValues: [
      metricGroup.classes.filter((c) => c.datasourceId === datasourceId)[0]
        .classKey!,
    ],
  });

  return overlapResult.map(
    (metrics): Metric => ({
      ...metrics,
      geographyId: "world",
    })
  );
}

export default new GeoprocessingHandler(habitatWorker, {
  title: "habitatWorker",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
