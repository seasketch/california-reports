import {
  Sketch,
  SketchCollection,
  GeoprocessingHandler,
  Polygon,
  isSketchCollection,
  toSketchArray,
  LineString,
  Feature,
  FeatureCollection,
  cleanCoords,
} from "@seasketch/geoprocessing";
import {
  centroid,
  distance,
  point,
  buffer,
  simplify,
  lineString,
  polygon,
  booleanIntersects,
  multiPolygon,
  geojsonRbush,
  booleanValid,
  featureCollection,
} from "@turf/turf";
import { Graph, alg } from "graphlib";
import graphData from "../../data/bin/network.01.nogrid.json";
import landData from "../../data/bin/landShrunk.01.json";

const SEARCH_RADIUS_MILES = 75; // Set search radius to 75 miles

export async function spacing(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<{
  sketch: any;
  paths: any;
}> {
  if (!isSketchCollection(sketch)) {
    return { sketch, paths: [] };
  }

  console.log("Adding sketches to graph");
  let start = Date.now();

  const sketchesUnbuffered = toSketchArray(sketch);
  const sketchGraph = addSketchesToGraph(
    readGraphFromFile(graphData),
    sketchesUnbuffered
  );
  const graph = sketchGraph.graph;
  const sketchNodes = sketchGraph.sketchNodes;
  let end = Date.now();
  sketchesUnbuffered.forEach((sketch) => {
    console.log(
      `Added ${sketchNodes[sketch.properties.id]} nodes from ${sketch.properties.name} to graph`
    );
  });
  console.log(`Adding sketches to graph took ${end - start} ms`);

  // Buffer by 1 meter to ensure overlap with clipped edges
  const sketches = sketchesUnbuffered.map((sketch) =>
    buffer(sketch, 1, { units: "meters" })
  );

  // Calculate centroids
  const sketchesWithCentroids = sketches.map((sketch) => ({
    sketch,
    centroid: centroid(sketch!).geometry.coordinates as [number, number],
  }));

  // Sort sketches by latitude
  sketchesWithCentroids.sort((a, b) => b.centroid[1] - a.centroid[1]);

  const pathsWithColors: {
    path: Feature<LineString>;
    color: string;
  }[] = [];
  let imporantNodes: string[] = [];

  // Start with northernmost sketch
  let currentSketch = sketchesWithCentroids[0];
  let remainingSketches = sketchesWithCentroids.slice(1);

  while (remainingSketches.length > 0) {
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
    const { path, edges, totalDistance } = findShortestPath(
      graph,
      currentSketch.sketch,
      nextSketch.sketch,
      sketchNodes
    );

    imporantNodes.push(path[0], path[path.length - 1]);

    const color = totalDistance < 62 ? "green" : "red";
    const nodes = path.map((node) => graph.node(node) as [number, number]);
    pathsWithColors.push({
      path: lineString(nodes),
      color,
    });

    currentSketch = nextSketch;
    remainingSketches = remainingSketches.filter(
      (sketch) => sketch !== closestSketch.sketch
    );
  }

  // Return the desired structure
  return {
    sketch: sketches, // Replace with the correct sketch as needed
    paths: pathsWithColors,
  };
}

// Finds shortest path between two nodes using Dijkstra's algorithm
function findShortestPath(
  graph: Graph,
  currentSketch: Sketch<Polygon>,
  nextSketch: Sketch<Polygon>,
  sketchNodes: Record<string, string[]>
): {
  path: string[];
  edges: { source: string; target: string }[];
  totalDistance: number;
  possibleNodes: string[];
} {
  const nodes0 = sketchNodes[currentSketch.properties.id];
  const nodes1 = sketchNodes[nextSketch.properties.id];

  if (nodes0.length === 0 || nodes1.length === 0) {
    throw new Error("No valid nodes found within one or both sketches.");
  }

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

function addSketchesToGraph(
  graph: Graph,
  sketches: Sketch<Polygon>[]
): { graph: Graph; sketchNodes: Record<string, string[]> } {
  const sketchesSimplified = sketches.map((sketch) =>
    simplify(sketch, { tolerance: 0.05 })
  );

  const valid = (landData as FeatureCollection).features.every((feature) => {
    return booleanValid(feature);
  });
  console.log(`Land data is valid: ${valid}`);

  const landSimplified = buffer(
    simplify(landData as FeatureCollection, {
      tolerance: 0.1,
    }),
    0.5,
    { units: "meters" }
  );

  const isValid = landSimplified.features.every((feature) => {
    return booleanValid(feature.geometry);
  });
  console.log(`Land data is valid: ${isValid}`);

  const sketchNodes: Record<string, string[]> = {};
  const tree = geojsonRbush();
  graph.nodes().forEach((node) => {
    const coord = graph.node(node);
    if (coord) {
      tree.insert(point(coord, { id: node }));
    }
  });

  sketchesSimplified.forEach((sketch: any, sketchIndex: number) => {
    let start = Date.now();

    const vertices: Map<string, number[]> = new Map();

    if (sketch.geometry.type === "Polygon") {
      extractVerticesFromPolygon(
        sketch.geometry.coordinates,
        sketchIndex,
        vertices
      );
    } else if (sketch.geometry.type === "MultiPolygon") {
      sketch.geometry.coordinates.forEach((polygon: any) => {
        extractVerticesFromPolygon(polygon, sketchIndex, vertices);
      });
    }

    sketchNodes[sketch.properties.id] = Array.from(vertices.keys());

    // Insert the new node into the spatial index
    const searchArea = buffer(centroid(sketch), SEARCH_RADIUS_MILES, {
      units: "miles",
    });
    const nearbyNodes = tree.search(searchArea!);
    console.log(
      `Adding ${vertices.size} nodes from ${sketch.properties.name} and connecting to nearby ${nearbyNodes.features.length}nodes`
    );
    let edgeCount = 0;

    vertices.forEach((coord, node) => {
      graph.setNode(node, coord);
      const nodeCoord = graph.node(node);
      const nodePoint = point(nodeCoord, { id: node });

      if (!nodeCoord) {
        throw new Error(`Node ${node} does not have coordinates.`);
      }

      if (nearbyNodes.features.length === 0) {
        console.warn(
          `No nearby nodes found within ${SEARCH_RADIUS_MILES} miles for node ${node}`
        );
        return;
      }
      tree.insert(nodePoint);

      nearbyNodes.features.forEach((otherFeature: any) => {
        const otherNode = otherFeature.properties.id;
        const otherNodeCoord = graph.node(otherNode);

        if (!otherNodeCoord) {
          console.error(`Other node ${otherNode} does not have coordinates.`);
          return;
        }

        if (isLineClear(nodeCoord, otherNodeCoord, landSimplified)) {
          graph.setEdge(
            node,
            otherNode,
            distance(nodeCoord, otherNodeCoord, {
              units: "miles",
            })
          );
          graph.setEdge(
            otherNode,
            node,
            distance(nodeCoord, otherNodeCoord, {
              units: "miles",
            })
          );
          edgeCount++;
        }
      });
    });
    let end = Date.now();
    console.log(
      `Adding ${vertices.size} nodes from ${sketch.properties.name} took ${end - start} ms`
    );
    console.log(
      `Added ${edgeCount} edges to graph from ${sketch.properties.name}`
    );
  });

  return { graph, sketchNodes };
}

function extractVerticesFromPolygon(
  polygon: any,
  featureIndex: number,
  vertices: Map<string, number[]>
): void {
  polygon.forEach((ring: any, ringIndex: number) => {
    ring.forEach((coord: [number, number], vertexIndex: number) => {
      const id = `polynode_${featureIndex}_${ringIndex}_${vertexIndex}`;
      vertices.set(id, coord);
    });
  });
}

// Check if a line between two coordinates is clear of land
export function isLineClear(
  coord1: number[],
  coord2: number[],
  landData: any
): boolean {
  const line = lineString([coord1, coord2]);

  for (const feature of landData.features) {
    if (feature.geometry.type === "Polygon") {
      const poly = polygon(feature.geometry.coordinates);
      if (booleanIntersects(line, poly)) {
        return false;
      }
    } else if (feature.geometry.type === "MultiPolygon") {
      const multiPoly = multiPolygon(feature.geometry.coordinates);
      if (booleanIntersects(line, multiPoly)) {
        return false;
      }
    }
  }

  return true;
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
