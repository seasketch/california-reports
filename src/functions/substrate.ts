import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  runLambdaWorker,
  parseLambdaResponse,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  isMetricArray,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { substrateWorker } from "./substrateWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";

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
        };

        return process.env.NODE_ENV === "test"
          ? substrateWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              project.package.name,
              "substrateWorker",
              project.geoprocessing.region,
              parameters,
              request!
            );
      })
    )
  ).reduce<Metric[]>(
    (metrics, result) =>
      metrics.concat(
        isMetricArray(result)
          ? result
          : (parseLambdaResponse(result) as Metric[])
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

export default new GeoprocessingHandler(substrate, {
  title: "substrate",
  description: "substrate overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: ["substrateWorker"],
});
