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
import { substrateWorker } from "./substrateWorker.js";

/**
 * substrate: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function substrate(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("substrate");
  const geographies = project.geographies;

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) =>
        (
          await Promise.all(
            metricGroup.classes.map(async (curClass) => {
              const parameters = {
                ...extraParams,
                geography: geography,
                metricGroup,
                classId: curClass.classId,
              };

              return process.env.NODE_ENV === "test"
                ? substrateWorker(sketch, parameters)
                : runLambdaWorker(
                    sketch,
                    parameters,
                    "substrateWorker",
                    request
                  );
            })
          )
        ).flat()
      )
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

export default new GeoprocessingHandler(substrate, {
  title: "substrate",
  description: "substrate overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
