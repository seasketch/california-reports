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
} from "@seasketch/geoprocessing/client-core";
import awsSdk from "aws-sdk";
import gp from "../../project/geoprocessing.json";

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
  const payload = JSON.stringify(
    {
      queryStringParameters: {
        geometryUri: request!.geometryUri,
        extraParams: parameters,
        cacheKey,
      },
    },
    null,
    2
  );

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
  if (lambdaResult.StatusCode !== 200)
    throw Error(`Report error: ${lambdaResult.Payload}`);

  return JSON.parse(JSON.parse(lambdaResult.Payload as string).body).data;
}
