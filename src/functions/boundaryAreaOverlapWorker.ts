import {
  Sketch,
  GeoprocessingHandler,
  Metric,
  Polygon,
  SketchCollection,
  overlapFeatures,
  isPolygonFeatureArray,
  splitSketchAntimeridian,
  isVectorDatasource,
  overlapAreaGroupMetrics,
  MultiPolygon,
  Geography,
  MetricGroup,
  getDatasourceFeatures,
} from "@seasketch/geoprocessing";
import { bbox } from "@turf/turf";
import project from "../../project/projectClient.js";
import { clipToGeography } from "../util/clipToGeography.js";
import { getGroup, groups } from "../util/getGroup.js";

export async function boundaryAreaOverlapWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    geography: Geography;
    metricGroup: MetricGroup;
    classId: string;
  },
) {
  const geography = extraParams.geography;
  const metricGroup = extraParams.metricGroup;
  const curClass = metricGroup.classes.find(
    (c) => c.classId === extraParams.classId,
  );

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  // Clip to portion of sketch within current geography
  const clippedSketch = await clipToGeography(splitSketch, geography);

  // Get bounding box of sketch remainder
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  // Fetch boundary features indexed by classId
  if (!curClass || !curClass.datasourceId) {
    throw new Error(`Missing datasourceId ${curClass}`);
  }
  const ds = project.getDatasourceById(curClass.datasourceId);
  if (!isVectorDatasource(ds)) {
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  }

  // Fetch datasource features overlapping with sketch remainder
  const url = project.getDatasourceUrl(ds);
  const polys = await getDatasourceFeatures<Polygon | MultiPolygon>(ds, url, {
    sketch,
  });
  if (!isPolygonFeatureArray(polys)) {
    throw new Error("Expected array of Polygon features");
  }

  const metrics: Metric[] = (
    await overlapFeatures(metricGroup.metricId, polys, clippedSketch)
  ).map(
    (metric): Metric => ({
      ...metric,
      classId: curClass.classId,
      geographyId: geography.geographyId,
    }),
  );

  if (geography.geographyId === "world") {
    // Generate area metrics grouped by zone type, with area overlap within zones removed
    // Each sketch gets one group metric for its zone type, while collection generates one for each zone type
    const sketchToZone = getGroup(sketch);
    const metricToZone = (sketchMetric: Metric) => {
      return sketchToZone[sketchMetric.sketchId!];
    };

    // Planning regions total area
    const totalArea = 15235250304.770761;

    const levelMetrics = (
      await overlapAreaGroupMetrics({
        metricId: metricGroup.metricId,
        groupIds: groups,
        sketch: clippedSketch as Sketch<Polygon> | SketchCollection<Polygon>,
        metricToGroup: metricToZone,
        metrics: metrics,
        classId: metricGroup.classes[0].classId,
        outerArea: totalArea,
      })
    ).map(
      (metric): Metric => ({
        ...metric,
        geographyId: geography.geographyId,
      }),
    );

    return [...metrics, ...levelMetrics];
  }

  return metrics;
}

export default new GeoprocessingHandler(boundaryAreaOverlapWorker, {
  title: "boundaryAreaOverlapWorker",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "sync",
  timeout: 900,
  requiresProperties: [],
  memory: 2480,
});
