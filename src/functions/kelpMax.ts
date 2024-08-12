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
import { kelpMaxWorker } from "./kelpMaxWorker.js";

/**
 * kelpMax: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function kelpMax(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("kelpMax");
  const geographies = project.geographies;

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) => {
        const parameters = {
          ...extraParams,
          geography: geography,
          metricGroup,
        };

        console.log(
          `Processing metric group: ${metricGroup.metricId} for geography: ${geography.geographyId}`
        );

        return process.env.NODE_ENV === "test"
          ? kelpMaxWorker(sketch, parameters)
          : runLambdaWorker(sketch, parameters, "kelpMaxWorker", request);
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

export default new GeoprocessingHandler(kelpMax, {
  title: "kelpMax",
  description: "kelpMax overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
