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
  featureCollection,
  bbox,
} from "@turf/turf";
import { Graph, alg, json } from "graphlib";
import graphData from "../../data/bin/network.01.nogridJson.json";
import landData from "../../data/bin/landShrunk.01.json";

const SEARCH_RADIUS_MILES = 75; // Set search radius to 75 miles

export async function spacing(sketchArray: Sketch<Polygon>[]): Promise<{
  paths: any;
}> {
  if (sketchArray.length === 1) {
    return { paths: [] };
  }

  console.log("Adding sketches to graph");
  let start = Date.now();

  const { graph, tree } = await readGraphFromFile(graphData);
  const sketchGraph = addSketchesToGraph(graph, tree, sketchArray);
  let end = Date.now();
  console.log(`Adding sketches to graph took ${end - start} ms`);

  // Buffer by 1 meter to ensure overlap with clipped edges
  const sketches = sketchArray.map(
    (sketch) => buffer(sketch, 1, { units: "meters" })!
  );

  // Calculate centroids
  const sketchesWithCentroids = sketches.map((sketch) => ({
    sketch,
    id: sketch.properties!.id as string,
    centroid: centroid(sketch!).geometry.coordinates as [number, number],
  }));

  // Create a graph for the MST
  const mstGraph = new Graph();
  sketchesWithCentroids.forEach((sketch) => {
    mstGraph.setNode(sketch.id, sketch.centroid);
  });

  // Build the MST graph by adding edges between each pair of sketches
  for (let i = 0; i < sketchesWithCentroids.length; i++) {
    for (let j = i + 1; j < sketchesWithCentroids.length; j++) {
      const dist = distance(
        point(sketchesWithCentroids[i].centroid),
        point(sketchesWithCentroids[j].centroid)
      );
      mstGraph.setEdge(
        sketchesWithCentroids[i].id as string,
        sketchesWithCentroids[j].id as string,
        dist
      );
      mstGraph.setEdge(
        sketchesWithCentroids[j].id as string,
        sketchesWithCentroids[i].id as string,
        dist
      );
    }
  }

  // Generate the MST using Prim's algorithm
  const mst = alg.prim(mstGraph, (edge) => mstGraph.edge(edge));

  const pathsWithColors: {
    path: Feature<LineString>;
    distance: number;
    color: string;
  }[] = [];
  let imporantNodes: string[] = [];

  // Iterate over the MST edges to find the shortest path for each edge
  for (const edge of mst.edges()) {
    const sourceSketch = sketchesWithCentroids.find((s) => s.id === edge.v);
    const targetSketch = sketchesWithCentroids.find((s) => s.id === edge.w);

    if (sourceSketch && targetSketch) {
      const { path, edges, totalDistance } = findShortestPath(
        sketchGraph.graph,
        sourceSketch.sketch,
        targetSketch.sketch,
        sketchGraph.sketchNodes
      );

      imporantNodes.push(path[0], path[path.length - 1]);

      const color = totalDistance < 62 ? "green" : "red";
      const nodes = path.map((node) => graph.node(node) as [number, number]);
      pathsWithColors.push({
        path: lineString(nodes),
        distance: totalDistance,
        color,
      });
    }
  }

  // Return the desired structure
  return {
    paths: pathsWithColors,
  };
}

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

  let shortestPath: string[] = [];
  let shortestEdges: { source: string; target: string }[] = [];
  let minTotalDistance = Infinity;

  // Iterate over all nodes in nodes0
  nodes0.forEach((node0) => {
    // Run Dijkstra's algorithm for node0
    const pathResults = alg.dijkstra(graph, node0, (edge) => graph.edge(edge));

    // Check the distance to each node in nodes1
    nodes1.forEach((node1) => {
      if (node0 === node1) {
        console.log(`Sketches are touching`);
        minTotalDistance = 0;
        shortestPath = [node0];
        shortestEdges = [];
      }

      if (!pathResults[node1].predecessor) {
        return;
      }

      let currentNode = node1;
      const tempPath = [];
      const tempEdges = [];
      let totalDistance = 0;

      while (currentNode !== node0) {
        const predecessor = pathResults[currentNode].predecessor;

        tempPath.unshift(currentNode);
        tempEdges.push({ source: predecessor, target: currentNode });

        totalDistance +=
          graph.edge(predecessor, currentNode) ||
          graph.edge(currentNode, predecessor);

        if (totalDistance > minTotalDistance) {
          return;
        }

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

async function readGraphFromFile(
  graphData: any
): Promise<{ graph: Graph; tree: any }> {
  const tree = geojsonRbush();
  const graph = json.read(graphData);

  // Batch insert nodes into R-tree
  const points = graph
    .nodes()
    .map((node) => point(graph.node(node), { id: node }));
  tree.load(featureCollection(points));

  return { graph, tree };
}

function addSketchesToGraph(
  graph: Graph,
  tree: any,
  sketches: Sketch<Polygon>[]
): { graph: Graph; tree: any; sketchNodes: Record<string, string[]> } {
  const sketchesSimplified = sketches.map((sketch) =>
    simplify(sketch, { tolerance: 0.05 })
  );

  const sketchBox =
    featureCollection(sketchesSimplified).bbox ||
    bbox(featureCollection(sketchesSimplified));
  const filteredFeatures = (landData as FeatureCollection).features.filter(
    (feature) => {
      const landBoundingBox = feature.bbox || bbox(feature);

      return (
        landBoundingBox[0] <= sketchBox[2] && // land minX <= sketch maxX
        landBoundingBox[2] >= sketchBox[0] && // land maxX >= sketch minX
        landBoundingBox[1] <= sketchBox[3] && // land minY <= sketch maxY
        landBoundingBox[3] >= sketchBox[1] // land maxY >= sketch minY
      );
    }
  );
  const landSimplified = buffer(
    simplify(featureCollection(filteredFeatures), {
      tolerance: 0.01,
    }),
    0.5,
    { units: "meters" }
  );

  const sketchNodes: Record<string, string[]> = {};

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

        const dist = distance(nodeCoord, otherNodeCoord, { units: "miles" });
        if (
          isLineClear(nodeCoord, otherNodeCoord, landSimplified) ||
          dist < 0.5
        ) {
          graph.setEdge(node, otherNode, dist);
          graph.setEdge(otherNode, node, dist);
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

  return { graph, tree, sketchNodes };
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
