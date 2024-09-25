import {
  Sketch,
  Polygon,
  LineString,
  Feature,
  FeatureCollection,
  booleanOverlap,
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
  bboxPolygon,
} from "@turf/turf";
import graphlib from "graphlib";
import graphData from "../../data/bin/network.01.nogridJson.json";
import landData from "../../data/bin/landShrunk.01.json";

const SEARCH_RADIUS_MILES = 75; // Set search radius to 75 miles

export async function spacing(sketchArray: Sketch<Polygon>[]): Promise<{
  paths: any;
}> {
  if (sketchArray.length < 2) {
    return { paths: [] };
  }

  let start = Date.now();
  const { graph, tree } = await readGraphFromFile(graphData);
  const sketchGraph = addSketchesToGraph(graph, tree, sketchArray);
  let end = Date.now();
  console.log(`Adding sketches to graph took ${end - start} ms`);

  // Buffer by 1 meter to ensure overlap with clipped edges
  start = Date.now();
  const sketches = sketchArray.map(
    (sketch) => buffer(sketch, 1, { units: "meters" })! as Sketch<Polygon>,
  );

  // Calculate centroids
  const sketchesWithCentroids = sketches.map((sketch) => ({
    sketch,
    id: sketch.properties!.id as string,
    centroid: centroid(sketch!).geometry.coordinates as [number, number],
  }));

  // Create a graph for the MST
  const mstGraph = new graphlib.Graph();
  sketchesWithCentroids.forEach((sketch) => {
    mstGraph.setNode(sketch.id, sketch.centroid);
  });

  // Build the MST graph by adding edges between each pair of sketches
  for (let i = 0; i < sketchesWithCentroids.length; i++) {
    for (let j = i + 1; j < sketchesWithCentroids.length; j++) {
      const dist = distance(
        point(sketchesWithCentroids[i].centroid),
        point(sketchesWithCentroids[j].centroid),
      );
      mstGraph.setEdge(
        sketchesWithCentroids[i].id as string,
        sketchesWithCentroids[j].id as string,
        dist,
      );
      mstGraph.setEdge(
        sketchesWithCentroids[j].id as string,
        sketchesWithCentroids[i].id as string,
        dist,
      );
    }
  }

  // Generate the MST using Prim's algorithm
  const mst = graphlib.alg.prim(mstGraph, (edge) => mstGraph.edge(edge));
  end = Date.now();
  console.log(`Calculating MST took ${end - start} ms`);

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
        sketchGraph.sketchNodes,
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
  graph: graphlib.Graph,
  currentSketch: Sketch<Polygon>,
  nextSketch: Sketch<Polygon>,
  sketchNodes: Record<string, string[]>,
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
  let start = Date.now();
  let shortestPath: string[] = [];
  let shortestEdges: { source: string; target: string }[] = [];
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
      `No path found between any nodes of the currentSketch and nextSketch`,
    );
  }

  let end = Date.now();
  console.log(
    `${currentSketch.properties.name} to ${
      nextSketch.properties.name
    } is ${minTotalDistance}, took ${end - start} ms`,
  );

  return {
    path: shortestPath,
    edges: shortestEdges,
    totalDistance: minTotalDistance,
    possibleNodes: nodes0.concat(nodes1),
  };
}

async function readGraphFromFile(
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

function addSketchesToGraph(
  graph: graphlib.Graph,
  tree: any,
  sketches: Sketch<Polygon>[],
): { graph: graphlib.Graph; tree: any; sketchNodes: Record<string, string[]> } {
  const sketchesSimplified = sketches.map((sketch) =>
    simplify(sketch, { tolerance: 0.005 }),
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

  sketchesSimplified.forEach((sketch: any, sketchIndex: number) => {
    let start = Date.now();

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

    const searchArea = buffer(centroid(sketch), SEARCH_RADIUS_MILES, {
      units: "miles",
    });
    const nearbyNodes = tree.search(searchArea!);
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
          `No nearby nodes found within ${SEARCH_RADIUS_MILES} miles for node ${node}`,
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
      `Connecting ${vertices.size} nodes to ${
        nearbyNodes.features.length
      } nearby nodes, ${edgeCount} edges, from ${sketch.properties.name}, ${
        end - start
      } ms`,
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

// Check if a line between two coordinates is clear of land
function isLineClear(
  coord1: number[],
  coord2: number[],
  landData: any,
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
