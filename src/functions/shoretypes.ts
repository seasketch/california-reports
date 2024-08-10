import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  DefaultExtraParams,
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { parseLambdaResponse, runLambdaWorker } from "../util/lambdaHelpers.js";
import awsSdk from "aws-sdk";
import { shoretypesWorker } from "./shoretypesWorker.js";

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
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("shoretypes");
  const geographies = project.geographies;

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

            // console.log(
            //   `Processing classId: ${curClass.classId} for geography: ${geography}`
            // );

            return process.env.NODE_ENV === "test"
              ? shoretypesWorker(sketch, parameters)
              : runLambdaWorker(
                  sketch,
                  parameters,
                  "shoretypesWorker",
                  request
                );
          })
        );

        // console.log(`Results for geography ${geography.geographyId}:`, classMetrics);

        return classMetrics.flat();
      })
    );

    const metrics = allMetrics
      .flat()
      .reduce<
        Metric[]
      >((acc, lambdaResult) => acc.concat(process.env.NODE_ENV === "test" ? (lambdaResult as Metric[]) : parseLambdaResponse(lambdaResult as awsSdk.Lambda.InvocationResponse)), []);

    // console.log("Final metrics:", metrics);

    return {
      metrics: sortMetrics(rekeyMetrics(metrics)),
      sketch: toNullSketch(sketch, true),
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
