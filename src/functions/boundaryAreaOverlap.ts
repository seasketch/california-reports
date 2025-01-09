import {
  Sketch,
  GeoprocessingHandler,
  Metric,
  Polygon,
  SketchCollection,
  rekeyMetrics,
  sortMetrics,
  DefaultExtraParams,
  GeoprocessingRequestModel,
  MultiPolygon,
  runLambdaWorker,
  isMetricArray,
  parseLambdaResponse,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { boundaryAreaOverlapWorker } from "./boundaryAreaOverlapWorker.js";

export async function boundaryAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<Metric[]> {
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
              project.package.name,
              "boundaryAreaOverlapWorker",
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

  return sortMetrics(rekeyMetrics(metrics));
}

export default new GeoprocessingHandler(boundaryAreaOverlap, {
  title: "boundaryAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 500,
  requiresProperties: [],
  memory: 10240,
  workers: ["boundaryAreaOverlapWorker"],
});
