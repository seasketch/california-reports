import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
} from "@seasketch/geoprocessing";
import {
  booleanIntersects,
  buffer,
  centroid,
  distance,
  lineString,
  multiPolygon,
  point,
  polygon,
} from "@turf/turf";
import { FeatureCollection } from "@seasketch/geoprocessing/client-core";
import graphData from "../../data/bin/network.01.json" with { type: "json" };
import { readGraphFromFile } from "./spacing.js";
const SEARCH_RADIUS_MILES = 75; // Set search radius to 75 miles

/**
 * spacingGraphWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacingGraphWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    land: any;
    nodes: string[];
    allVertices: { node: string; coord: number[] }[];
  },
) {
  const start = Date.now();
  const land = extraParams.land as FeatureCollection<Polygon | MultiPolygon>;

  const { graph, tree } = await readGraphFromFile(graphData);
  extraParams.allVertices.forEach((vertex) => {
    graph.setNode(vertex.node, vertex.coord);
    const nodeCoord = graph.node(vertex.node);
    const nodePoint = point(nodeCoord, { id: vertex.node });
    tree.insert(nodePoint);
  });

  const searchArea = buffer(centroid(sketch), SEARCH_RADIUS_MILES, {
    units: "miles",
  });
  const nearbyNodes = tree.search(searchArea!);
  let edgeCount = 0;

  const edges: { node1: string; node2: string; dist: number }[] = [];
  extraParams.nodes.forEach((node) => {
    const nodeCoord = graph.node(node);
    if (!nodeCoord) {
      throw new Error(
        `Node ${node} does not have coordinates. Something went wrong when adding sketches to graph.`,
      );
    }

    if (nearbyNodes.features.length === 0) {
      console.warn(
        `No nearby nodes found within ${SEARCH_RADIUS_MILES} miles for node ${node}`,
      );
      return;
    }

    nearbyNodes.features.forEach((otherFeature: any) => {
      const otherNode = otherFeature.properties.id;
      const otherNodeCoord = graph.node(otherNode);

      if (!otherNodeCoord) {
        console.error(`Other node ${otherNode} does not have coordinates.`);
        return;
      }

      const dist = distance(nodeCoord, otherNodeCoord, { units: "miles" });
      if (isLineClear(nodeCoord, otherNodeCoord, land) || dist < 0.5) {
        edges.push({ node1: node, node2: otherNode, dist });
        edges.push({ node1: otherNode, node2: node, dist });
        edgeCount++;
      }
    });
  });

  return edges;
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

export default new GeoprocessingHandler(spacingGraphWorker, {
  title: "spacingGraphWorker",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
