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
  keyBy,
  rekeyMetrics,
  sortMetrics,
  squareMeterToMile,
  toNullSketch,
  toNullSketchArray,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { kelpMaxWorker } from "./kelpMaxWorker.js";
import { genWorldMetrics } from "../util/genWorldMetrics.js";
import { spacing } from "./spacing.js";
import { simplify } from "@turf/turf";

/**
 * kelpMax: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function kelpMax(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<any> {
  const metricGroup = project.getMetricGroup("kelpMax");
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
          ? kelpMaxWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              project.package.name,
              "kelpMaxWorker",
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
    (m) => squareMeterToMile(m.value) > 1.1
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

export default new GeoprocessingHandler(kelpMax, {
  title: "kelpMax",
  description: "kelpMax overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
