import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  runLambdaWorker,
  parseLambdaResponse,
  genFeatureCollection,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  isMetricArray,
  isSketchCollection,
  rekeyMetrics,
  sortMetrics,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { spanWorker } from "./spanWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { bbox, buffer } from "@turf/turf";

/**
 * span: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function span(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<Metric[]> {
  const metricGroup = project.getMetricGroup("span");
  const geographies = project.geographies.filter(
    (g) => g.geographyId !== "world",
  );

  const sketches = toSketchArray(sketch);
  const finalSketches: Sketch<Polygon | MultiPolygon>[] = [];
  sketches.forEach((sketch) => {
    sketch.geometry = buffer(sketch, 250, { units: "meters" })!.geometry;
    finalSketches.push(sketch);
  });

  const bufferedSketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon> = isSketchCollection(sketch)
    ? {
        properties: sketch.properties,
        bbox: bbox(genFeatureCollection(finalSketches)),
        type: "FeatureCollection",
        features: finalSketches,
      }
    : finalSketches[0];

  const metrics = (
    await Promise.all(
      geographies.map(async (geography) => {
        const parameters = {
          ...extraParams,
          geography: geography,
          metricGroup,
        };

        return process.env.NODE_ENV === "test"
          ? spanWorker(bufferedSketch, parameters)
          : runLambdaWorker(
              bufferedSketch,
              project.package.name,
              "spanWorker",
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
      ...genWorldMetrics(bufferedSketch, metrics, metricGroup),
    ]),
  );
}

export default new GeoprocessingHandler(span, {
  title: "span",
  description: "span overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: ["spanWorker"],
});
