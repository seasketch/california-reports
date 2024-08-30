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
  squareMeterToMile,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { eelgrassWorker } from "./eelgrassWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { spacing } from "./spacing.js";
import { simplify } from "@turf/turf";

/**
 * eelgrass: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function eelgrass(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<any> {
  const metricGroup = project.getMetricGroup("eelgrass");
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
          classId: "eelgrass",
        };

        return process.env.NODE_ENV === "test"
          ? eelgrassWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              project.package.name,
              "eelgrassWorker",
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

  const worldMetrics = genWorldMetrics(sketch, metrics, metricGroup);

  // Run replication spacing analysis
  const sketchArray = toSketchArray(sketch);
  const sketchIds = sketchArray.map((sk) => sk.properties.id);
  const sketchMetrics = worldMetrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const replicateMetrics = sketchMetrics.filter(
    (m) => squareMeterToMile(m.value) > 0.04
  );
  const replicateSketches = sketchArray.filter((sk) =>
    replicateMetrics.some((m) => m.sketchId === sk.properties.id)
  ) as Sketch<Polygon>[];

  const { paths } = await spacing(replicateSketches);

  const replicateIds = replicateSketches.map((sk) => sk.properties.id);

  return {
    metrics: sortMetrics(rekeyMetrics([...metrics, ...worldMetrics])),
    sketch: toNullSketch(sketch, true),
    simpleSketches: sketchArray.map((sketch) =>
      simplify(sketch, { tolerance: 0.005 })
    ),
    replicateIds,
    paths,
  };
}

export default new GeoprocessingHandler(eelgrass, {
  title: "eelgrass",
  description: "eelgrass overlap",
  timeout: 900, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
