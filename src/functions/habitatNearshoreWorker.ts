import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  splitSketchAntimeridian,
  isVectorDatasource,
  getDatasourceFeatures,
  LineString,
  getFeaturesForSketchBBoxes,
} from "@seasketch/geoprocessing";
import { bbox } from "@turf/turf";
import project from "../../project/projectClient.js";
import {
  Geography,
  Metric,
  MetricGroup,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { overlapLineLength } from "../util/overlapLineLength.js";

/**
 * habitatNearshoreWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function habitatNearshoreWorker(
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

  const splitSketch = splitSketchAntimeridian(sketch);
  const clippedSketch = await clipToGeography(splitSketch, geography);

  if (!metricGroup.datasourceId)
    throw new Error(`Expected datasourceId for ${metricGroup.metricId}`);
  const ds = project.getDatasourceById(metricGroup.datasourceId);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);
  // Fetch features overlapping with sketch, pull from cache if already fetched
  const features = await getFeaturesForSketchBBoxes<LineString>(
    clippedSketch,
    url,
  );

  const metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        // If this is a sub-class, filter by class name
        const classFeatures =
          metricGroup.classKey && curClass.classId !== `${ds.datasourceId}_all`
            ? features.filter((feat) => {
                return (
                  feat.geometry &&
                  feat.properties![ds.classKeys[0]] === curClass.classId
                );
              }, [])
            : features;

        // Calculate overlap metrics
        const overlapResult = await overlapLineLength(
          metricGroup.metricId,
          classFeatures,
          clippedSketch,
          {
            units: "miles",
          },
        );

        return overlapResult.map(
          (metric): Metric => ({
            ...metric,
            classId: curClass.classId,
            geographyId: geography.geographyId,
          }),
        );
      }),
    )
  ).flat();

  return metrics;
}

export default new GeoprocessingHandler(habitatNearshoreWorker, {
  title: "habitatNearshoreWorker",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
