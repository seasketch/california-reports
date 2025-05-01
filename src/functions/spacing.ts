import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
  runLambdaWorker,
  parseLambdaResponse,
  booleanOverlap,
  squareMeterToMile,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Feature,
  FeatureCollection,
  GeoprocessingRequestModel,
  LineString,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { InvocationResponse } from "@aws-sdk/client-lambda";
import { spacingWorker } from "./spacingWorker.js";
import graphlib from "graphlib";
import graphData from "../../data/bin/network.01.json" with { type: "json" };
import landData from "../../data/bin/landShrunk.01.json" with { type: "json" };
import {
  bboxPolygon,
  bbox,
  featureCollection,
  geojsonRbush,
  point,
  simplify,
  buffer,
  centroid,
  distance,
  lineString,
  union,
  area,
  booleanIntersects,
} from "@turf/turf";
import { spacingGraphWorker } from "./spacingGraphWorker.js";

/**
 * span: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacing(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<any> {
  const start = Date.now();
  const metricGroup = project.getMetricGroup("spacing");

  const highLOPSketches = toSketchArray(sketch).filter((sk) =>
    ["A", "B", "C"].includes(sk.properties.proposed_lop?.[0]),
  );
  console.log(`${highLOPSketches.length} sketch(es) with high LOP`);

  // Buffer every geometry once (5 meters) for checking contiguity
  const buffered = Object.fromEntries(
    highLOPSketches.map((sk) => [
      sk.properties.id,
      buffer(sk, 5, { units: "meters" })!,
    ]),
  );

  // Create clusters of contiguous sketches
  const visited: Record<string, boolean> = {};
  const clusters: Sketch<Polygon | MultiPolygon>[] = [];
  highLOPSketches.forEach((sk) => {
    if (visited[sk.properties.id]) return;

    const stack = [sk];
    const cluster: Sketch<Polygon>[] = [];

    while (stack.length) {
      const curSketch = stack.pop()!;
      if (visited[curSketch.properties.id]) return;
      visited[curSketch.properties.id] = true;
      cluster.push(curSketch);

      highLOPSketches.forEach((potentialCluster) => {
        if (
          !visited[potentialCluster.properties.id] &&
          booleanIntersects(
            buffered[curSketch.properties.id].geometry,
            potentialCluster.geometry,
          )
        ) {
          stack.push(potentialCluster);
        }
      });
    }

    clusters.push(
      cluster.length === 1
        ? cluster[0]
        : ({
            geometry: union(featureCollection(cluster))!.geometry,
            properties: {
              id: sk.properties.id,
              name: `Cluster: ${cluster.map((sk) => sk.properties.name).join(", ")}`,
            },
            type: "Feature",
          } as Sketch<Polygon | MultiPolygon>),
    );
  });
  console.log(`${clusters.length} clusters`, Date.now() - start);

  // Filter to clusters that meet 9 sq mi minimum size
  const largeClusters = clusters.filter(
    (sk) => squareMeterToMile(area(sk)) > 9,
  );
  console.log(`${largeClusters.length} large clusters`, Date.now() - start);

  // Start the spacing workers to calculate metrics
  console.log("Running workers", Date.now() - start);
  const metricPromises: Promise<
    { id: string; replicateIds: string[] } | InvocationResponse
  >[] = [];
  metricGroup.classes.forEach((curClass) => {
    // Use the large clusters for all except estuaries, which can be any size
    const finalSketches =
      curClass.datasourceId === "estuaries" ? clusters : largeClusters;

    // If no clusters, no replicates
    if (finalSketches.length === 0) {
      metricPromises.push(
        Promise.resolve({ id: curClass.datasourceId!, replicateIds: [] }),
      );
      return;
    }

    // Create sketch collection that gp worker accepts
    const finalSketch = {
      ...featureCollection(finalSketches),
      properties: {
        name: `sketchCollection`,
        isCollection: true,
        id: "0",
        userAttributes: [],
        sketchClassId: "0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      bbox: bbox(featureCollection(finalSketches)),
    };

    const parameters = {
      datasourceId: curClass.datasourceId!,
    };

    // Run workers
    metricPromises.push(
      process.env.NODE_ENV === "test"
        ? spacingWorker(finalSketch, parameters)
        : runLambdaWorker(
            finalSketch,
            project.package.name,
            "spacingWorker",
            project.geoprocessing.region,
            parameters,
            request!,
          ),
    );
  });

  // Add all possible sketches to the graph
  const finalGraph = await addSketchesToGraph(clusters, request);
  console.log("Added sketches to graph:", Date.now() - start);

  // Await the replicate metrics from workers
  const replicates: Record<string, string[]> = {};
  (await Promise.all(metricPromises)).forEach((result) => {
    const finalResult =
      process.env.NODE_ENV === "test" ||
      ((result as any).id && (result as any).replicateIds)
        ? (result as { id: string; replicateIds: string[] })
        : (parseLambdaResponse(result as InvocationResponse) as {
            id: string;
            replicateIds: string[];
          });
    replicates[finalResult.id] = finalResult.replicateIds;
  });
  console.log("Got replicate metrics", Date.now() - start);

  // Generate MST
  const result = await Promise.all(
    metricGroup.classes.map(async (curClass) => {
      const classReplicateIds = replicates[curClass.datasourceId!];

      // Filter sketches
      const replicateSketches = highLOPSketches.filter((sk) =>
        classReplicateIds.some((id) => id === sk.properties.id),
      ) as Sketch<Polygon>[];

      // Calculate centroids
      const sketchesWithCentroids = await Promise.all(
        replicateSketches.map(async (sketch) => ({
          sketch,
          id: sketch.properties!.id as string,
          centroid: centroid(sketch!).geometry.coordinates as [number, number],
        })),
      );

      // Create a graph for the MST
      const mstGraph = new graphlib.Graph();
      sketchesWithCentroids.forEach((sketch) => {
        mstGraph.setNode(sketch.id, sketch.centroid);
      });

      // Build the MST graph by adding edges
      await Promise.all(
        sketchesWithCentroids.map((sourceSketch, i) =>
          sketchesWithCentroids.slice(i + 1).map(async (targetSketch) => {
            const dist = distance(
              point(sourceSketch.centroid),
              point(targetSketch.centroid),
            );
            mstGraph.setEdge(sourceSketch.id, targetSketch.id, dist);
            mstGraph.setEdge(targetSketch.id, sourceSketch.id, dist);
          }),
        ),
      );

      // Generate the MST using Prim's algorithm
      const mst = graphlib.alg.prim(mstGraph, (edge) => mstGraph.edge(edge));

      const pathsWithColors: {
        path: Feature<LineString>;
        distance: number;
        color: string;
      }[] = [];

      // Iterate over MST edges and calculate paths concurrently
      await Promise.all(
        mst.edges().map(async (edge) => {
          const sourceSketch = sketchesWithCentroids.find(
            (s) => s.id === edge.v,
          );
          const targetSketch = sketchesWithCentroids.find(
            (s) => s.id === edge.w,
          );

          if (sourceSketch && targetSketch) {
            const { path, totalDistance } = findShortestPath(
              finalGraph.graph,
              sourceSketch.sketch,
              targetSketch.sketch,
              finalGraph.sketchNodes,
            );

            const color = totalDistance < 62 ? "green" : "red";
            const nodes = path.map(
              (node) => finalGraph.graph.node(node) as [number, number],
            );
            pathsWithColors.push({
              path: lineString(nodes),
              distance: totalDistance,
              color,
            });
          }
        }),
      );

      return {
        id: curClass.datasourceId!,
        replicates: classReplicateIds,
        paths: pathsWithColors,
      };
    }),
  );
  console.log("Generated MST", Date.now() - start);

  // Strictly for viewing on the map, add in the original sketches
  const skArrayLowProtection = toSketchArray(sketch).filter((sk) => {
    const lop = sk.properties.proposed_lop;
    return !lop || !["A", "B", "C"].includes(lop[0]);
  });

  return {
    sketch: clusters
      .concat(skArrayLowProtection)
      .map((sketch) => simplify(sketch, { tolerance: 0.005 })),
    result,
  };
}

export async function readGraphFromFile(
  graphData: any,
): Promise<{ graph: graphlib.Graph; tree: any }> {
  const tree = geojsonRbush();
  const graph = graphlib.json.read(graphData);

  // Batch insert nodes into R-tree
  const points = graph
    .nodes()
    .map((node) => point(graph.node(node), { id: node }));
  tree.load(featureCollection(points));

  return { graph, tree };
}

async function addSketchesToGraph(
  sketch: Sketch<Polygon | MultiPolygon>[],
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<{
  graph: graphlib.Graph;
  tree: any;
  sketchNodes: Record<string, string[]>;
}> {
  const { graph, tree } = await readGraphFromFile(graphData);

  const sketchesSimplified = sketch.map((sk) =>
    simplify(sk, { tolerance: 0.005 }),
  );

  // Get the bounding box of the simplified sketches
  const sketchBox = bbox(featureCollection(sketchesSimplified));

  // Filter the land features that overlap with the sketch bounding box
  const filteredFeatures = (landData as FeatureCollection).features.filter(
    (feature) => {
      const landBoundingBox = bbox(feature);

      // Check if the bounding boxes overlap
      return booleanOverlap(
        bboxPolygon(sketchBox),
        bboxPolygon(landBoundingBox),
      );
    },
  );

  const landSimplified = buffer(
    simplify(featureCollection(filteredFeatures), {
      tolerance: 0.01,
    }),
    -250,
    { units: "meters" },
  );

  const sketchNodes: Record<string, string[]> = {};
  const allVertices: { node: string; coord: number[] }[] = [];
  sketchesSimplified.forEach((sketch: any, sketchIndex: number) => {
    const vertices: Map<string, number[]> = new Map();
    if (sketch.geometry.type === "Polygon") {
      extractVerticesFromPolygon(
        sketch.geometry.coordinates,
        sketchIndex,
        vertices,
      );
    } else if (sketch.geometry.type === "MultiPolygon") {
      sketch.geometry.coordinates.forEach((polygon: any) => {
        extractVerticesFromPolygon(polygon, sketchIndex, vertices);
      });
    }
    sketchNodes[sketch.properties.id] = Array.from(vertices.keys());

    vertices.forEach((coord, node) => {
      allVertices.push({ node, coord });
      graph.setNode(node, coord);
      const nodeCoord = graph.node(node);
      const nodePoint = point(nodeCoord, { id: node });
      tree.insert(nodePoint);
    });
  });

  // For each node in sketchNodes, run spacingGraphWorker
  const edgePromises: Promise<
    { node1: string; node2: string; dist: number }[] | InvocationResponse
  >[] = [];
  Object.entries(sketchNodes).forEach(([sketchId, nodes]) => {
    const parameters = { land: landSimplified, nodes, allVertices };
    edgePromises.push(
      process.env.NODE_ENV === "test"
        ? spacingGraphWorker(
            sketchesSimplified.find(
              (sketch) => sketch.properties.id === sketchId,
            )!,
            parameters,
          )
        : runLambdaWorker(
            sketchesSimplified.find(
              (sketch) => sketch.properties.id === sketchId,
            )!,
            project.package.name,
            "spacingGraphWorker",
            project.geoprocessing.region,
            parameters,
            request!,
          ),
    );
  });

  (await Promise.all(edgePromises)).forEach((result) => {
    const finalResult =
      process.env.NODE_ENV === "test"
        ? (result as { node1: string; node2: string; dist: number }[])
        : (parseLambdaResponse(result as InvocationResponse) as {
            node1: string;
            node2: string;
            dist: number;
          }[]);
    finalResult.forEach((edge) =>
      graph.setEdge(edge.node1, edge.node2, edge.dist),
    );
  });

  return { graph, tree, sketchNodes };
}

function extractVerticesFromPolygon(
  polygon: any,
  featureIndex: number,
  vertices: Map<string, number[]>,
): void {
  // Only take the perimeter of the polygon
  const exteriorRing = polygon[0];
  exteriorRing.forEach((coord: [number, number], vertexIndex: number) => {
    const id = `polynode_${featureIndex}_0_${vertexIndex}`;
    vertices.set(id, coord);
  });
}

function findShortestPath(
  graph: graphlib.Graph,
  currentSketch: Sketch<Polygon | MultiPolygon>,
  nextSketch: Sketch<Polygon | MultiPolygon>,
  sketchNodes: Record<string, string[]>,
): {
  path: string[];
  totalDistance: number;
  possibleNodes: string[];
} {
  const nodes0 = sketchNodes[currentSketch.properties.id];
  const nodes1 = sketchNodes[nextSketch.properties.id];

  if (nodes0.length === 0 || nodes1.length === 0) {
    throw new Error("No valid nodes found within one or both sketches.");
  }
  let shortestPath: string[] = [];
  let minTotalDistance = Infinity;

  // Iterate over all nodes in nodes0
  nodes0.forEach((node0) => {
    // Run Dijkstra's algorithm for node0
    const pathResults = graphlib.alg.dijkstra(graph, node0, (edge) =>
      graph.edge(edge),
    );

    // Check the distance to each node in nodes1
    nodes1.forEach((node1) => {
      if (node0 === node1) {
        // Early exit if nodes are the same (sketches are touching)
        return {
          path: [node0],
          edges: [],
          totalDistance: 0,
          possibleNodes: nodes0.concat(nodes1),
        };
      }

      const resultNode = pathResults[node1];

      // If no path to node1, skip
      if (!resultNode || !resultNode.predecessor) {
        return;
      }

      const totalDistance = resultNode.distance;

      if (totalDistance < minTotalDistance) {
        minTotalDistance = totalDistance;

        // Reconstruct the shortest path and edges
        const tempPath: string[] = [];
        let currentNode = node1;

        while (currentNode !== node0) {
          const predecessor = pathResults[currentNode].predecessor;
          tempPath.unshift(currentNode);
          currentNode = predecessor;
        }

        tempPath.unshift(node0); // Add the starting node

        shortestPath = tempPath;
      }
    });
  });

  if (minTotalDistance === Infinity) {
    throw new Error(
      `No path found between any nodes of the currentSketch and nextSketch`,
    );
  }

  return {
    path: shortestPath,
    totalDistance: minTotalDistance,
    possibleNodes: nodes0.concat(nodes1),
  };
}

export default new GeoprocessingHandler(spacing, {
  title: "spacing",
  description: "spacing",
  timeout: 500, // seconds
  memory: 2048, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: ["spacingWorker", "spacingGraphWorker"],
});
