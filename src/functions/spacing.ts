import {
  Sketch,
  SketchCollection,
  GeoprocessingHandler,
  Polygon,
  isSketchCollection,
  toSketchArray,
  FeatureCollection,
  Point,
} from "@seasketch/geoprocessing";
import {
  centroid,
  distance,
  point,
  buffer,
  bbox,
  bboxPolygon,
  featureCollection,
  pointsWithinPolygon,
} from "@turf/turf";
import { Graph, alg } from "graphlib";
import graphData from "../../data/bin/network.05.json";

export async function spacing(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<{
  sketch;
  allEdges?;
  sketchNodes?;
  allPossibleNodes?;
  pathColors?;
}> {
  if (!isSketchCollection(sketch)) {
    return { sketch };
  }

  console.log("create graph");

  const graph = readGraphFromFile(graphData);
  const nodePoints = featureCollection(
    graph.nodes().map((node) => point(graph.node(node), { id: node }))
  );

  // Buffer by 1 meter to ensure overlap with clipped edges
  const sketches = toSketchArray(sketch).map((sketch) => buffer(sketch, 1));

  // Calculate centroids
  const sketchesWithCentroids = sketches.map((sketch) => ({
    sketch,
    centroid: centroid(sketch!).geometry.coordinates as [number, number],
  }));

  // Sort sketches by latitude
  sketchesWithCentroids.sort((a, b) => b.centroid[1] - a.centroid[1]);

  let allEdges: { source: string; target: string; distance: number }[] = [];
  let sketchNodes: string[] = [];
  let allPossibleNodes: string[] = [];
  let reds = 0;
  let greens = 0;
  const pathColors: { [key: string]: string } = {};
  const pathPromises = [];

  // Start with northernmost sketch
  let currentSketch = sketchesWithCentroids[0];
  let remainingSketches = sketchesWithCentroids.slice(1);

  console.log("Start while loop");

  while (remainingSketches.length > 0) {
    console.log("Finding closest sketch");
    let start = Date.now();
    // Find the closest unvisited sketch
    const closestSketch = remainingSketches.reduce(
      (closest, sketch) => {
        const dist = distance(
          point(currentSketch.centroid),
          point(sketch.centroid)
        );
        return dist < closest.distance ? { sketch, distance: dist } : closest;
      },
      { sketch: remainingSketches[0], distance: Infinity }
    );
    let end = Date.now();
    console.log(`Finding closest sketch took ${end - start} ms`);

    start = Date.now();
    const nextSketch = closestSketch.sketch;
    const { path, edges, totalDistance, possibleNodes } = findShortestPath(
      graph,
      nodePoints,
      currentSketch.sketch,
      nextSketch.sketch
    );

    allEdges = allEdges.concat(
      edges.map((edge) => ({ ...edge, distance: totalDistance }))
    );
    sketchNodes.push(path[0], path[path.length - 1]);
    allPossibleNodes = [...allPossibleNodes, ...possibleNodes];

    const color = totalDistance < 62 ? "green" : "red";
    totalDistance < 62 ? greens++ : reds++;
    edges.forEach(
      (edge) => (pathColors[`${edge.source}-${edge.target}`] = color)
    );

    currentSketch = nextSketch;
    remainingSketches = remainingSketches.filter(
      (sketch) => sketch !== closestSketch.sketch
    );
  }

  return { sketch, allEdges, sketchNodes, allPossibleNodes, pathColors };
}

// Finds closest node to a given position
function findNodesWithinSketch(
  graph: Graph,
  nodePoints: FeatureCollection<Point>,
  sketch: Sketch<Polygon>
): string[] {
  const sketchCentroid = centroid(sketch).geometry.coordinates as [
    number,
    number,
  ];

  const sketchBox = bboxPolygon(sketch.bbox || bbox(sketch));
  const candidates = pointsWithinPolygon(nodePoints, sketchBox);
  const nodesWithinSketch = pointsWithinPolygon(
    candidates,
    sketch
  ).features.map((f) => f.properties!.id);
  console.log("nodes within", JSON.stringify(nodesWithinSketch));

  // If no nodes are found within the sketch, return the closest node
  if (nodesWithinSketch.length === 0) {
    console.log(
      `Sketch ${sketch.properties.name} has no nodes within, finding closest node`
    );
    let closestNode = "";
    let minDistance = Infinity;

    graph.nodes().forEach((node) => {
      const nodePos = graph.node(node);
      const dist = distance(point(sketchCentroid), point(nodePos));

      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    });

    return [closestNode];
  }
  console.log(
    `Sketch ${sketch.properties.name} has has these nodes within: ${nodesWithinSketch}`
  );

  return nodesWithinSketch;
}

// Finds shortest path between two nodes using Dijkstra's algorithm
function findShortestPath(
  graph: Graph,
  nodePoints: FeatureCollection<
    Point,
    {
      id: string;
    }
  >,
  currentSketch: Sketch<Polygon>,
  nextSketch: Sketch<Polygon>
): {
  path: string[];
  edges: { source: string; target: string }[];
  totalDistance: number;
  possibleNodes: string[];
} {
  const nodes0 = findNodesWithinSketch(graph, nodePoints, currentSketch);
  const nodes1 = findNodesWithinSketch(graph, nodePoints, nextSketch);

  console.log(
    `Finding shortest path between ${currentSketch.properties.name} and ${nextSketch.properties.name}`
  );
  let start = Date.now();

  if (nodes0.length === 0 || nodes1.length === 0) {
    throw new Error("No valid nodes found within one or both sketches.");
  }

  let shortestPath: string[] = [];
  let shortestEdges: { source: string; target: string }[] = [];
  let minTotalDistance = Infinity;

  // Iterate over all combinations of node0[] and node1[]
  nodes0.forEach((node0) => {
    nodes1.forEach((node1) => {
      // If sketches are connected/overlapping
      if (node0 === node1) {
        shortestPath = [node0];
        shortestEdges = [];
        minTotalDistance = 0;
        return;
      }

      // Using Dijkstra's algorithm to find the shortest path
      const path = alg.dijkstra(graph, node0, (edge) => graph.edge(edge));
      if (!path[node1].predecessor) {
        console.warn(`No path from ${node0} to ${node1}`);
        return;
      }

      let currentNode = node1;
      const tempPath = [];
      const tempEdges = [];
      let totalDistance = 0;

      while (currentNode !== node0) {
        const predecessor = path[currentNode].predecessor;
        if (!predecessor) {
          throw new Error(`No path from ${node0} to ${node1}`);
        }

        tempPath.unshift(currentNode);
        tempEdges.push({ source: predecessor, target: currentNode });

        // The weight was already calculated during Dijkstra, so just add it
        totalDistance +=
          graph.edge(predecessor, currentNode) ||
          graph.edge(currentNode, predecessor);

        currentNode = predecessor;
      }

      tempPath.unshift(node0);

      // Update if this path is shorter than the previously found ones
      if (totalDistance < minTotalDistance) {
        minTotalDistance = totalDistance;
        shortestPath = tempPath;
        shortestEdges = tempEdges;
      }
    });
  });

  if (minTotalDistance === Infinity) {
    throw new Error(
      `No path found between any nodes of the currentSketch and nextSketch`
    );
  }

  console.log(
    `Total distance from ${currentSketch.properties.name} to ${nextSketch.properties.name} is ${minTotalDistance}`
  );
  let end = Date.now();
  console.log(`Finding shortest path took ${end - start} ms`);

  return {
    path: shortestPath,
    edges: shortestEdges,
    totalDistance: minTotalDistance,
    possibleNodes: nodes0.concat(nodes1),
  };
}

function readGraphFromFile(graphData: any): Graph {
  const graph = new Graph();

  // Adding nodes
  for (const node in graphData._nodes) {
    graph.setNode(node, graphData._nodes[node]);
  }

  // Adding edges
  for (const edge in graphData._in) {
    const edges = graphData._in[edge];
    for (const e in edges) {
      const edgeInfo = edges[e];
      const weight = graphData._edgeLabels[e];
      graph.setEdge(edgeInfo.v, edgeInfo.w, weight);
    }
  }

  return graph;
}

export default new GeoprocessingHandler(spacing, {
  title: "spacing",
  description: "calculates spacing within given sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 8192,
});
