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

// Spacing function calculates distance between habitat replicates
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

  // Buffer each sketch once (5 meters) for checking contiguity
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
    // Skip if already in cluster
    if (visited[sk.properties.id]) return;

    const stack = [sk];
    const cluster: Sketch<Polygon>[] = [];

    // Run through contiguous sketches to find all in cluster
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

    // Add cluster to clusters array, either as a single sketch or union of contiguous sketches
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

  // Filter to clusters that meet 9 sq mi minimum size (for all habitats except estuaries)
  const largeClusters = clusters.filter(
    (sk) => squareMeterToMile(area(sk)) > 9,
  );

  // Start the spacing workers to calculate metrics
  const metricPromises: Promise<
    { id: string; replicateIds: string[] } | InvocationResponse
  >[] = [];
  metricGroup.classes.forEach((curClass) => {
    // Use the large clusters for all except estuaries, which can be any size
    const possibleReplicates =
      curClass.datasourceId === "estuaries" ? clusters : largeClusters;

    // If no clusters, no replicates
    if (!possibleReplicates.length) {
      metricPromises.push(
        Promise.resolve({ id: curClass.datasourceId!, replicateIds: [] }),
      );
      return;
    }

    // Create dummy sketch collection that gp worker accepts
    const finalSketch = {
      ...featureCollection(possibleReplicates),
      properties: {
        name: `sketchCollection`,
        isCollection: true,
        id: "0",
        userAttributes: [],
        sketchClassId: "0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      bbox: bbox(featureCollection(possibleReplicates)),
    };
    const parameters = {
      datasourceId: curClass.datasourceId!,
    };

    // Run workers and store promises
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

  // Adds sketches to the graph and calculates distances
  const finalGraph = await addSketchesToGraph(clusters, request);

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

  // Generate MST for each class
  const result = await Promise.all(
    metricGroup.classes.map(async (curClass) => {
      const classReplicateIds = replicates[curClass.datasourceId!];

      // Filter sketches
      const replicateSketches = highLOPSketches.filter((sk) =>
        classReplicateIds.some((id) => id === sk.properties.id),
      ) as Sketch<Polygon>[];

      // Calculate centroids
      const sketchCentroids = await Promise.all(
        replicateSketches.map(async (sketch) => ({
          sketch,
          id: sketch.properties!.id as string,
          centroid: centroid(sketch!).geometry.coordinates as [number, number],
        })),
      );

      // Create a graph for the MST
      const mstGraph = new graphlib.Graph();
      sketchCentroids.forEach((sketch) => {
        mstGraph.setNode(sketch.id, sketch.centroid);
      });
      await Promise.all(
        sketchCentroids.map((sourceSketch, i) =>
          sketchCentroids.slice(i + 1).map(async (targetSketch) => {
            const dist = distance(
              point(sourceSketch.centroid),
              point(targetSketch.centroid),
            );
            mstGraph.setEdge(sourceSketch.id, targetSketch.id, dist);
            mstGraph.setEdge(targetSketch.id, sourceSketch.id, dist);
          }),
        ),
      );
      const mst = graphlib.alg.prim(mstGraph, (edge) => mstGraph.edge(edge));

      const pathsWithColors: {
        path: Feature<LineString>;
        distance: number;
        color: string;
      }[] = [];

      // Iterate over MST edges and calculate paths between replicates
      await Promise.all(
        mst.edges().map(async (edge) => {
          const sourceSketch = sketchCentroids.find((s) => s.id === edge.v);
          const targetSketch = sketchCentroids.find((s) => s.id === edge.w);

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

  // Strictly for viewing on the map, add in the low LOP sketches
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

// Read the graph from the file and load it into an R-tree
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

// Add sketches to the graph and calculate distances
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
    (feature) =>
      booleanOverlap(bboxPolygon(sketchBox), bboxPolygon(bbox(feature))),
  );

  const landSimplified = buffer(
    simplify(featureCollection(filteredFeatures), {
      tolerance: 0.01,
    }),
    -250,
    { units: "meters" },
  );

  // Add each sketch node to the graph and rtree
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

  // Calculate the distance between new nodes
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

  // Await the edge metrics from workers
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

// Extract exterior vertices
function extractVerticesFromPolygon(
  polygon: any,
  featureIndex: number,
  vertices: Map<string, number[]>,
): void {
  const exteriorRing = polygon[0];
  exteriorRing.forEach((coord: [number, number], vertexIndex: number) => {
    const id = `polynode_${featureIndex}_0_${vertexIndex}`;
    vertices.set(id, coord);
  });
}

// Find the shortest path between two sketches
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
