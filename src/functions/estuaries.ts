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
import { estuariesWorker } from "./estuariesWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";

/**
 * estuaries: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function estuaries(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("estuaries");
  const geographies = project.geographies.filter(
    (g) => g.geographyId !== "world"
  );

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) => {
        const parameters = {
          ...extraParams,
          geography: geography,
          metricGroup,
          classId: "estuaries",
        };

        return process.env.NODE_ENV === "test"
          ? estuariesWorker(sketch, parameters)
          : runLambdaWorker(sketch, parameters, "estuariesWorker", request);
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
    metrics: sortMetrics(
      rekeyMetrics([
        ...metrics,
        ...genWorldMetrics(sketch, metrics, metricGroup),
      ])
    ),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(estuaries, {
  title: "estuaries",
  description: "estuaries overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
