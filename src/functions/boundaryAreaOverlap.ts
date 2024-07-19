import {
  Sketch,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  DefaultExtraParams,
  GeoprocessingRequestModel,
  MultiPolygon,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { parseLambdaResponse, runLambdaWorker } from "../util/lambdaHelpers.js";
import awsSdk from "aws-sdk";
import { boundaryAreaOverlapWorker } from "./boundaryAreaOverlapWorker.js";

export async function boundaryAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap");
  const geographies = project.geographies;

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) => {
        const parameters = {
          ...extraParams,
          geography: geography,
          metricGroup,
          classId: "state_waters",
        };

        return process.env.NODE_ENV === "test"
          ? boundaryAreaOverlapWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              parameters,
              "boundaryAreaOverlapWorker",
              request
            );
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

export default new GeoprocessingHandler(boundaryAreaOverlap, {
  title: "boundaryAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 500,
  requiresProperties: [],
  memory: 10240,
});
