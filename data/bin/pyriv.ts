import * as turf from "@turf/turf";
import { Graph } from "graphlib";
import fs from "fs-extra";
import * as path from "path";

// Setup directories and paths
const dataDir = "./data/bin";
const fullPath = (s: string) => path.join(dataDir, s);
const watersPath = fullPath("clippingLayer.01.geojson");
const landPath = fullPath("land.01.geojson");
const landShrunkOut = fullPath("landShrunk.01.geojson");
const jsonOut = fullPath("network.01.nogrid.json");
const nodesOut = fullPath("nodes.01nogrid.json");

// Read and process land data
function loadAndShrinkLandData(landFile: string): any {
  const land = fs.readJsonSync(landFile);
  const landBuffered = turf.buffer(land, -0.001);
  fs.writeFileSync(landShrunkOut, JSON.stringify(landBuffered));
  return landBuffered;
}

// Extract vertices from polygons
export function extractVerticesFromPolygon(
  polygon: any,
  featureIndex: number,
  vertices: Map<string, number[]>
): void {
  polygon.forEach((ring: any, ringIndex: number) => {
    ring.forEach((coord: [number, number], vertexIndex: number) => {
      const id = `node_${featureIndex}_${ringIndex}_${vertexIndex}`;
      vertices.set(id, coord);
    });
  });
}

// Add grid nodes within polygons
function addGridNodes(
  polygon: any,
  featureIndex: number,
  vertices: Map<string, number[]>
): void {
  const bbox = turf.bbox(turf.polygon(polygon));
  const grid = turf.pointGrid(bbox, 3, { units: "miles" });

  grid.features.forEach((point: any, gridIndex: number) => {
    const [x, y] = point.geometry.coordinates;
    if (turf.booleanPointInPolygon(point, turf.polygon(polygon))) {
      const id = `gridnode_${featureIndex}_${gridIndex}`;
      vertices.set(id, [x, y]);
    }
  });
}

// Create graph with vertices
function createGraph(watersData: any): Graph {
  const G = new Graph();
  const vertices: Map<string, number[]> = new Map();

  watersData.features.forEach((feature: any, featureIndex: number) => {
    if (feature.geometry.type === "Polygon") {
      extractVerticesFromPolygon(
        feature.geometry.coordinates,
        featureIndex,
        vertices
      );
      //addGridNodes(feature.geometry.coordinates, featureIndex, vertices);
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon: any) => {
        extractVerticesFromPolygon(polygon, featureIndex, vertices);
        //addGridNodes(polygon, featureIndex, vertices);
      });
    }
  });

  fs.writeFileSync(
    nodesOut,
    JSON.stringify(
      turf.featureCollection(
        Array.from(vertices.values()).map((coord, id) =>
          turf.point(coord, { id })
        )
      )
    )
  );

  vertices.forEach((coord, id) => {
    G.setNode(id, coord);
  });

  return G;
}

// Check if a line between two coordinates is clear of land
export function isLineClear(
  coord1: number[],
  coord2: number[],
  landData: any
): boolean {
  const line = turf.lineString([coord1, coord2]);

  for (const feature of landData.features) {
    if (feature.geometry.type === "Polygon") {
      const polygon = turf.polygon(feature.geometry.coordinates);
      if (turf.booleanIntersects(line, polygon)) {
        return false;
      }
    } else if (feature.geometry.type === "MultiPolygon") {
      const multiPolygon = turf.multiPolygon(feature.geometry.coordinates);
      if (turf.booleanIntersects(line, multiPolygon)) {
        return false;
      }
    }
  }

  return true;
}

// Add ocean edges to the graph
async function addOceanEdgesComplete(
  graph: Graph,
  landData: any,
  verbose: boolean
): Promise<Graph> {
  const t0 = Date.now();
  if (verbose) {
    console.log(
      `Starting at ${new Date().toISOString()} to add edges for ${graph.nodeCount()} nodes.`
    );
    console.log(
      `We'll have to look at somewhere around ${(graph.nodeCount() * (graph.nodeCount() - 1)) / 2} edge possibilities.`
    );
  }

  let nodes = graph.nodes();
  const edgePromises = [];

  while (nodes.length > 0) {
    const node = nodes.shift() as string;
    const nodeCoord = graph.node(node);

    if (!nodeCoord) {
      console.error(`Node ${node} does not have coordinates.`);
      continue;
    }

    edgePromises.push(
      new Promise<void>((resolve) => {
        nodes.forEach((otherNode: string) => {
          const otherNodeCoord = graph.node(otherNode);

          if (!otherNodeCoord) {
            console.error(`Other node ${otherNode} does not have coordinates.`);
            return;
          }

          const distance = turf.distance(nodeCoord, otherNodeCoord, {
            units: "miles",
          });
          if (distance > 400) return;

          if (isLineClear(nodeCoord, otherNodeCoord, landData)) {
            graph.setEdge(node, otherNode, distance);
            graph.setEdge(otherNode, node, distance);
          }
        });

        if (verbose && nodes.length % 10 === 0) {
          console.log(`Remaining nodes: ${nodes.length}`);
        }

        resolve();
      })
    );
  }

  await Promise.all(edgePromises);

  if (verbose) {
    console.log(
      `It took ${(Date.now() - t0) / 60000} minutes to load ${graph.edgeCount()} edges.`
    );
  }

  return graph;
}

// Main function to generate the graph and save it
async function main() {
  const watersData = fs.readJsonSync(watersPath);
  const landData = loadAndShrinkLandData(landPath);
  let graph = createGraph(watersData);
  graph = await addOceanEdgesComplete(graph, landData, true);
  fs.writeFileSync(jsonOut, JSON.stringify(graph));
}

main().catch(console.error);
