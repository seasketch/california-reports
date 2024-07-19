import {
  GeoprocessingTask,
  GeoprocessingTaskStatus,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Metric,
  Sketch,
  SketchCollection,
  MultiPolygon,
  Polygon,
  genTaskCacheKey,
  GeoprocessingRequestParams,
  GeoprocessingRequestModel,
  isMetricArray,
} from "@seasketch/geoprocessing/client-core";
import awsSdk from "aws-sdk";
import gp from "../../project/geoprocessing.json";
import geobuf from "geobuf";
import Pbf from "pbf";

/**
 * Runs a function on a specified lambda worker
 * @param sketch
 * @param parameters
 * @param functionName
 * @param request
 * @returns Lambda invocation response containing Metric[]
 */
export async function runLambdaWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  parameters = {},
  functionName: string,
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>
): Promise<awsSdk.Lambda.InvocationResponse> {
  // Create cache key for this task
  const cacheKey = genTaskCacheKey(sketch.properties, {
    cacheId: `${JSON.stringify(parameters)}`,
  } as GeoprocessingRequestParams);

  // Create payload including geometry and parameters for function
  const workerRequest: GeoprocessingRequestModel = (() => {
    let newRequest: GeoprocessingRequestModel = {
      geometryUri: request!.geometryUri,
      extraParams: parameters,
      cacheKey,
    };

    const sketchBuffer = geobuf.encode(sketch, new Pbf());
    var sketch64 = Buffer.from(sketchBuffer).toString("base64");

    const requestSizeBytes = JSON.stringify(newRequest).length * 2;
    const sketchSizeBytes = JSON.stringify(sketch).length * 2;
    const sketch64SizeBytes = JSON.stringify(sketch64).length * 2;

    const MAX_SIZE_BYTES = 6_000_000; // 6MB max payload size
    console.log(
      "requestSize",
      requestSizeBytes + sketchSizeBytes,
      "requestGeobufSize",
      requestSizeBytes + sketch64SizeBytes,
      MAX_SIZE_BYTES
    );
    if (requestSizeBytes + sketch64SizeBytes < MAX_SIZE_BYTES) {
      newRequest.geometryGeobuf = sketch64;
    }
    return newRequest;
  })();
  const payload = JSON.stringify(workerRequest, null, 2);

  // Configure task
  const service = gp.region;
  const location = `/${service}/tasks/${cacheKey}`;
  const task: GeoprocessingTask = {
    id: cacheKey,
    service,
    wss: "",
    location,
    startedAt: new Date().toISOString(),
    logUriTemplate: `${location}/logs{?limit,nextToken}`,
    geometryUri: `${location}/geometry`,
    status: GeoprocessingTaskStatus.Pending,
    estimate: 2,
  };

  // Run lambda
  const Lambda = new awsSdk.Lambda();
  return Lambda.invoke({
    FunctionName: `gp-${project.package.name}-sync-${functionName}`,
    ClientContext: Buffer.from(JSON.stringify(task)).toString("base64"),
    InvocationType: "RequestResponse",
    Payload: payload,
  }).promise();
}

/**
 * Parses lambda worker response
 */
export function parseLambdaResponse(
  lambdaResult: awsSdk.Lambda.InvocationResponse
): Metric[] {
  console.log("lambdaResult", JSON.stringify(lambdaResult, null, 2));
  if (lambdaResult.StatusCode !== 200)
    throw Error(`Report error: ${JSON.stringify(lambdaResult.Payload)}`);

  const payload = JSON.parse(lambdaResult.Payload as string);

  if (payload.statusCode !== 200)
    throw Error(`Report error: ${JSON.stringify(JSON.parse(payload.body))}`);

  const parsedResult = JSON.parse(payload.body).data;
  console.log("parsedResult", JSON.stringify(parsedResult, null, 2));
  if (
    !Array.isArray(parsedResult) ||
    (parsedResult.length > 0 && !isMetricArray(parsedResult))
  )
    throw Error("Not metric array", parsedResult);
  return parsedResult;
}
