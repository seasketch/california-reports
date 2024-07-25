import * as turf from '@turf/turf';
import { Graph } from 'graphlib';
import fs from "fs-extra";
import * as path from 'path';
import { toFeaturePolygonArray } from '@seasketch/geoprocessing';

// Setup:
const dataDir = './data/bin';
const fullPath = (s: string) => path.join(dataDir, s);
const fullLandFn = fullPath('clipLayerSingleParts.geojson');
const simpNum = .01;
const nProcessors = 38;

const landOutFn = fullPath(`coast_poly${simpNum}m.geojson`);
const gpicOutFn = fullPath(`coast${simpNum}m.gpickle`);

// Read in the full resolution land GeoJSON file
const fullLand = fs.readJsonSync(fullLandFn);

// Simplify the polygons
const lowResLand = turf.simplify(fullLand, { tolerance: simpNum});

// Save the simplified polygons to a file
fs.writeJsonSync(landOutFn, lowResLand);

class Land {
    private landData: any;
    private cachedGraph?: Graph;

    constructor(landFile: string) {
        this.landData = fs.readJsonSync(landFile);
    }

    // Convert this to a TypeScript method
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
        this.landData.features.forEach((feature: any, featureIndex: number) => {
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
            console.log(`Node:`);
        }

        const nodes = graph.nodes();
        const oceanEdges: {source: string, target: string}[] = [];
        
        nodes.forEach((node: string) => {
            const edgesForNode = this.oceanEdgesForNode(node, graph);
            oceanEdges.push(...edgesForNode);
        });

        // Add edges individually
        oceanEdges.forEach(({source, target}) => {
            if (graph.hasNode(source) && graph.hasNode(target)) {
                graph.setEdge(source, target);
            } else {
                console.error(`Invalid edge between ${source} and ${target}`);
            }
        });

        if (verbose) {
            console.log(`It took ${(Date.now() - t0) / 60000} minutes to load ${graph.edgeCount()} edges.`);
        }

        return graph;
    }

    private oceanEdgesForNode(node: string, graph: Graph): {source: string, target: string}[] {
        const edges: {source: string, target: string}[] = [];
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
                    edges.push({source: node, target: otherNode});
                }
            }
        });

        return edges;
    }

    private isLineClear(coord1: number[], coord2: number[]): boolean {
        const line = turf.lineString([coord1, coord2]);

        // // Check each feature in the landData
        // for (const feature of this.landData.features) {
        //     if (feature.geometry.type === 'Polygon') {
        //         const polygon = turf.polygon(feature.geometry.coordinates);
        //         if (turf.booleanIntersects(line, polygon)) {
        //             return false;
        //         }
        //     } else if (feature.geometry.type === 'MultiPolygon') {
        //         const multiPolygon = turf.multiPolygon(feature.geometry.coordinates);
        //         // console.log("line", JSON.stringify(line))
        //         // console.log("multipolygon",  JSON.stringify(multiPolygon))
        //         // console.log(turf.booleanIntersects(line, multiPolygon))
        //         if (turf.booleanIntersects(line, multiPolygon)) {
        //             return false;
        //         }
        //     }
        // }

        return false;
    }
}

const lnd = new Land(landOutFn);
lnd.graph(false, true).then((ecGraph) => {
    // Save the graph to a file
    fs.writeFileSync(gpicOutFn, JSON.stringify(ecGraph));
});



// class Land {
//     private landData: any;
    
//     constructor(landFile: string) {
//         this.landData = fs.readJsonSync(landFile);
//     }

//     public graph(nJobs: number): Graph {
//         const graph = new Graph();
        
//         // Loop through each feature's geometry
//         this.landData.features.forEach((feature: any, featureIndex: number) => {
//             // Assuming each feature's geometry is a polygon or line
//             feature.geometry.coordinates.forEach((polygon: any) => {
//                 polygon.forEach((ring: any, ringIndex: number) => {
//                     ring.forEach((coord: [number, number], vertexIndex: number) => {
//                         const nodeId = `${featureIndex}-${ringIndex}-${vertexIndex}`;
//                         graph.setNode(nodeId, { coordinates: coord });
//                     });
//                 });
//             });
//         });

//         // Adding edges based on adjacency (consecutive vertices)
//         this.landData.features.forEach((feature: any, featureIndex: number) => {
//             feature.geometry.coordinates.forEach((polygon: any) => {
//                 polygon.forEach((ring: any, ringIndex: number) => {
//                     ring.forEach((coord: [number, number], vertexIndex: number) => {
//                         const currentNodeId = `${featureIndex}-${ringIndex}-${vertexIndex}`;
//                         const nextNodeId = `${featureIndex}-${ringIndex}-${(vertexIndex + 1) % ring.length}`; // Loop back to the first for polygons
//                         graph.setEdge(currentNodeId, nextNodeId);
//                     });
//                 });
//             });
//         });

//         return graph;
//     }
// }