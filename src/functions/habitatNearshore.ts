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
  isMetricArray,
  rekeyMetrics,
  sortMetrics,
} from "@seasketch/geoprocessing/client-core";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { habitatNearshoreWorker } from "./habitatNearshoreWorker.js";

/**
 * habitatNearshore: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function habitatNearshore(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<Metric[]> {
  const metricGroup = project.getMetricGroup("substrate_nearshore");
  const geographies = project.geographies.filter(
    (g) => g.geographyId !== "world",
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
          ? habitatNearshoreWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              project.package.name,
              "habitatNearshoreWorker",
              project.geoprocessing.region,
              parameters,
              request!,
            );
      }),
    )
  ).reduce<Metric[]>(
    (metrics, result) =>
      metrics.concat(
        isMetricArray(result)
          ? result
          : (parseLambdaResponse(result) as Metric[]),
      ),
    [],
  );

  return sortMetrics(
    rekeyMetrics([
      ...metrics,
      ...genWorldMetrics(sketch, metrics, metricGroup),
    ]),
  );
}

export default new GeoprocessingHandler(habitatNearshore, {
  title: "habitatNearshore",
  description: "habitatNearshore overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: ["habitatNearshoreWorker"],
});
