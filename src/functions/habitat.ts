import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { parseLambdaResponse, runLambdaWorker } from "../util/lambdaHelpers.js";
import awsSdk from "aws-sdk";
import { habitatWorker } from "./habitatWorker.js";

/**
 * habitat: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function habitat(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("habitat");

  const datasourceIds = metricGroup.classes.reduce(
    (acc, c) =>
      !c.datasourceId || acc.includes(c.datasourceId)
        ? acc
        : [...acc, c.datasourceId],
    [] as string[]
  );

  const metrics = (
    await Promise.all(
      datasourceIds.map(async (datasourceId) => {
        const parameters = {
          ...extraParams,
          metricGroup,
          datasourceId,
        };

        return process.env.NODE_ENV === "test"
          ? habitatWorker(sketch, parameters)
          : runLambdaWorker(sketch, parameters, "habitatWorker", request);
      })
    )
  ).reduce<Metric[]>(
    (metrics, lambdaResult) =>
      metrics.concat(
        process.env.NODE_ENV === "test"
          ? (lambdaResult as Metric[])
          : parseLambdaResponse(
              lambdaResult as awsSdk.Lambda.InvocationResponse
            )
      ),
    []
  );

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(habitat, {
  title: "habitat",
  description: "region overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
