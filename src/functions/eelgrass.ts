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
import { InvocationResponse } from "@aws-sdk/client-lambda";
import { eelgrassWorker } from "./eelgrassWorker.js";

/**
 * eelgrass: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function eelgrass(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("eelgrass");
  const geographies = project.geographies;

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) => {
        const parameters = {
          ...extraParams,
          geography: geography,
          metricGroup,
          classId: "eelgrass",
        };

        return process.env.NODE_ENV === "test"
          ? eelgrassWorker(sketch, parameters)
          : runLambdaWorker(sketch, parameters, "eelgrassWorker", request);
      })
    )
  ).reduce<Metric[]>(
    (metrics, lambdaResult) =>
      metrics.concat(
        process.env.NODE_ENV === "test"
          ? (lambdaResult as Metric[])
          : parseLambdaResponse(lambdaResult as InvocationResponse)
      ),
    []
  );

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(eelgrass, {
  title: "eelgrass",
  description: "eelgrass overlap",
  timeout: 900, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
