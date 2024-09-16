import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  runLambdaWorker,
  parseLambdaResponse,
  genFeatureCollection,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  DefaultExtraParams,
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  genSketchCollection,
  isMetricArray,
  isSketch,
  isSketchCollection,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { shoretypesWorker } from "./shoretypesWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { bbox, buffer } from "@turf/turf";

/**
 * shoretypes: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function shoretypes(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("shoretypes");
  const geographies = project.geographies.filter(
    (g) => g.geographyId !== "world",
  );

  const sketches = toSketchArray(sketch);
  const finalSketches: Sketch<Polygon | MultiPolygon>[] = [];
  sketches.forEach((sketch) => {
    sketch.geometry = buffer(sketch, 200, { units: "meters" })!.geometry;
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

  try {
    const allMetrics = await Promise.all(
      geographies.map(async (geography) => {
        const classMetrics = await Promise.all(
          metricGroup.classes.map(async (curClass) => {
            const parameters = {
              ...extraParams,
              geography: geography,
              metricGroup,
              classId: curClass.classId,
            };

            return process.env.NODE_ENV === "test"
              ? shoretypesWorker(bufferedSketch, parameters)
              : runLambdaWorker(
                  bufferedSketch,
                  project.package.name,
                  "shoretypesWorker",
                  project.geoprocessing.region,
                  parameters,
                  request!,
                );
          }),
        );

        return classMetrics.reduce<Metric[]>(
          (metrics, result) =>
            metrics.concat(
              isMetricArray(result)
                ? result
                : (parseLambdaResponse(result) as Metric[]),
            ),
          [],
        );
      }),
    );

    const metrics = allMetrics.flat();

    return {
      metrics: sortMetrics(
        rekeyMetrics([
          ...metrics,
          ...genWorldMetrics(bufferedSketch, metrics, metricGroup),
        ]),
      ),
      sketch: toNullSketch(bufferedSketch, true),
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw error;
  }
}

export default new GeoprocessingHandler(shoretypes, {
  title: "shoretypes",
  description: "shoretypes overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
