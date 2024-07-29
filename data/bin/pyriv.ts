import * as turf from '@turf/turf';
import { Graph } from 'graphlib';
import fs from "fs-extra";
import * as path from 'path';

// Setup
const dataDir = './data/bin';
const fullPath = (s: string) => path.join(dataDir, s);
const watersPath = fullPath('clippingLayer.1.geojson');
const landPath = fullPath('land.1.geojson');
const landShrunkOut = fullPath('landShrunk.1.geojson');
const jsonOut = fullPath('network.1.json')
// const simpNum = .01; // degrees in ESPG:4326

class Land {
    private watersData: any;
    private landData: any;
    private cachedGraph?: Graph;

    constructor(watersFile: string, landFile: string) {
        this.watersData = fs.readJsonSync(watersFile);
        const land = fs.readJsonSync(landFile);
        const landBuffered = turf.buffer(land, -.001);
        fs.writeFileSync(landShrunkOut, JSON.stringify(landBuffered));
        this.landData = landBuffered;
    }

    public async graph(dumpCached = false, verbose = false): Promise<Graph> {
        if (dumpCached || !this.cachedGraph) {
            let G = this.freshGraph();
            G = this._addOceanEdgesComplete(G, verbose);
            this.cachedGraph = G;
        }
        return this.cachedGraph;
    }

    private freshGraph(): Graph {
        const G = new Graph();
        const vertices: Map<string, number[]> = new Map();
            
        // Extract vertices from land polygons
        this.watersData.features.forEach((feature: any, featureIndex: number) => {
            if (feature.geometry.type === 'Polygon') {
                this.extractVerticesFromPolygon(feature.geometry.coordinates, featureIndex, vertices);
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach((polygon: any) => {
                    this.extractVerticesFromPolygon(polygon, featureIndex, vertices);
                });
            }
        });

        // Add vertices as nodes
        vertices.forEach((coord, id) => {
            G.setNode(id, coord);
        });

        return G;
    }

    private extractVerticesFromPolygon(polygon: any, featureIndex: number, vertices: Map<string, number[]>): void {
        polygon.forEach((ring: any, ringIndex: number) => {
            ring.forEach((coord: [number, number], vertexIndex: number) => {
                // Use both featureIndex and vertexIndex to ensure unique IDs
                const id = `node_${featureIndex}_${ringIndex}_${vertexIndex}`;
                vertices.set(id, coord);
            });
        });
    }

    private _addOceanEdgesComplete(graph: Graph, verbose: boolean): Graph {
        const t0 = Date.now();
        if (verbose) {
            console.log(`Starting at ${new Date().toISOString()} to add edges for ${graph.nodeCount()} nodes.`);
            const edgePossibilities = graph.nodeCount() * (graph.nodeCount() - 1);
            console.log(`We'll have to look at somewhere around ${edgePossibilities} edge possibilities.`);
        }

        const nodes = graph.nodes();
        const oceanEdges: {source: string, target: string, distance: number}[] = [];
        
        nodes.forEach((node: string, index) => {
            if(index % 10 === 0) console.log("Running node #", index)
            const edgesForNode = this.oceanEdgesForNode(node, graph);
            oceanEdges.push(...edgesForNode);
        });

        // Add edges individually
        oceanEdges.forEach(({source, target, distance}) => {
            if (graph.hasNode(source) && graph.hasNode(target)) {
                graph.setEdge(source, target, distance);
            } else {
                console.error(`Invalid edge between ${source} and ${target}`);
            }
        });

        if (verbose) {
            console.log(`It took ${(Date.now() - t0) / 60000} minutes to load ${graph.edgeCount()} edges.`);
        }

        return graph;
    }

    private oceanEdgesForNode(node: string, graph: Graph): {source: string, target: string, distance: number}[] {
        const edges: {source: string, target: string, distance: number}[] = [];
        const nodeCoord = graph.node(node);

        if (!nodeCoord) {
            console.error(`Node ${node} does not have coordinates.`);
            return edges;
        }

        graph.nodes().forEach((otherNode: string) => {
            if (node !== otherNode) {
                const otherNodeCoord = graph.node(otherNode);

                if (!otherNodeCoord) {
                    console.error(`Other node ${otherNode} does not have coordinates.`);
                    return;
                }

                if (this.isLineClear(nodeCoord, otherNodeCoord)) {
                    edges.push({source: node, target: otherNode, distance: turf.distance(nodeCoord, otherNodeCoord, {units: "miles"})});
                }
            }
        });

        return edges;
    }

    private isLineClear(coord1: number[], coord2: number[]): boolean {
        const line = turf.lineString([coord1, coord2]);

        // Check each feature in the landData
        for (const feature of this.landData.features) {
            if (feature.geometry.type === 'Polygon') {
                const polygon = turf.polygon(feature.geometry.coordinates);
                if (turf.booleanIntersects(line, polygon)) {
                    return false;
                }
            } else if (feature.geometry.type === 'MultiPolygon') {
                const multiPolygon = turf.multiPolygon(feature.geometry.coordinates);
                if (turf.booleanIntersects(line, multiPolygon)) {
                    return false;
                }
            }
        }

        return true;
    }
}

const lnd = new Land(watersPath, landPath);
lnd.graph(false, true).then((ecGraph) => {
    // Save the graph to a file
    fs.writeFileSync(jsonOut, JSON.stringify(ecGraph));
});
