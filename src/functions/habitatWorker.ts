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
    curClass: {
      classId: string;
      display: string;
      datasourceId?: string | undefined;
      classKey?: string | undefined;
      numericClassId?: number | undefined;
      layerId?: string | undefined;
      objectiveId?: string | undefined;
    };
    geographyIds?: string[];
  }
) {
  const metricGroup = extraParams.metricGroup;
  const curClass = extraParams.curClass;

  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  // Clip to portion of sketch within current geography
  const clippedSketch = await clipToGeography(splitSketch, curGeography);

  // Get bounding box of sketch remainder
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  // Calculate overlap metrics for each class in metric group
  if (!curClass || !curClass.datasourceId)
    throw new Error(`Expected datasourceId for ${curClass}`);

  const ds = project.getDatasourceById(curClass.datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  // Start analysis when raster load finishes
  const overlapResult = await rasterMetrics(raster, {
    metricId: metricGroup.metricId,
    feature: clippedSketch,
    ...(ds.measurementType === "quantitative" && { stats: ["valid"] }),
    ...(ds.measurementType === "categorical" && {
      categorical: true,
      categoryMetricValues: [curClass.classId],
    }),
    bandMetricProperty: "groupId",
    bandMetricValues: [curClass.classKey!],
  });

  return overlapResult.map(
    (metrics): Metric => ({
      ...metrics,
      classId: curClass.classId,
      geographyId: curGeography.geographyId,
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
