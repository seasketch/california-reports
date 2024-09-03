import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  runLambdaWorker,
  parseLambdaResponse,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  DefaultExtraParams,
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  isMetricArray,
  rekeyMetrics,
  sortMetrics,
  squareMeterToMile,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { shoretypesWorker } from "./shoretypesWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { simplify } from "@turf/turf";
import { spacing } from "./spacing.js";

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
): Promise<any> {
  const metricGroup = project.getMetricGroup("shoretypes");
  const geographies = project.geographies.filter(
    (g) => g.geographyId !== "world"
  );

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
              ? shoretypesWorker(sketch, parameters)
              : runLambdaWorker(
                  sketch,
                  project.package.name,
                  "shoretypesWorker",
                  project.geoprocessing.region,
                  parameters,
                  request!
                );
          })
        );

        return classMetrics.reduce<Metric[]>(
          (metrics, result) =>
            metrics.concat(
              isMetricArray(result)
                ? result
                : (parseLambdaResponse(result) as Metric[])
            ),
          []
        );
      })
    );

    const metrics = allMetrics.flat();

    const worldMetrics = genWorldMetrics(sketch, metrics, metricGroup);

    // Run replication spacing analysis
    const sketchArray = toSketchArray(sketch);
    const sketchIds = sketchArray.map((sk) => sk.properties.id);
    const sketchMetrics = worldMetrics.filter(
      (m) => m.sketchId && sketchIds.includes(m.sketchId)
    );

    const replicateMap: Record<string, number> = {
      beaches: 1.1,
      rocky_shores: 0.55,
      rock_islands: 0.55,
      coastal_marsh: 0.04,
    };

    const replicateSpacingResults: Record<string, any> = {};

    await Promise.all(
      Object.entries(replicateMap).map(
        async ([ecosystem, spacingThreshold]: [string, number]) => {
          const replicateMetrics = sketchMetrics.filter(
            (m) => m.classId === ecosystem && m.value / 1609 > spacingThreshold
          );

          const replicateSketches = sketchArray.filter((sk) =>
            replicateMetrics.some((m) => m.sketchId === sk.properties.id)
          ) as Sketch<Polygon>[];

          const { paths } = await spacing(replicateSketches);

          const replicateIds = replicateSketches.map((sk) => sk.properties.id);

          replicateSpacingResults[ecosystem] = {
            replicateIds,
            paths,
          };
        }
      )
    );

    return {
      metrics: sortMetrics(rekeyMetrics([...metrics, ...worldMetrics])),
      sketch: toNullSketch(sketch, true),
      simpleSketches: sketchArray.map((sketch) =>
        simplify(sketch, { tolerance: 0.005 })
      ),
      replicateSpacingResults,
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
