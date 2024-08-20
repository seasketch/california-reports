import React, {useEffect, useRef} from "react";
import {select, scaleLinear, extent, json, geoTransform, geoPath, line } from 'd3';
import {booleanPointInPolygon, centroid, distance, point, buffer} from '@turf/turf';
import { Graph, alg } from 'graphlib';
import {
  ResultsCard,
  ReportError,
  useSketchProperties,
  Card,
} from "@seasketch/geoprocessing/client-ui";
import {
  Polygon,
  Sketch,
  SketchCollection,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import {useTranslation } from "react-i18next";
import graphData from '../../data/bin/network.1.json';

// Props for the Replicate Map
interface ReplicateMapProps {
  graph: Graph; // Graph with 
  sketch: Sketch<Polygon>[];
  shortestPaths: { source: string; target: string, distance: number }[];
  sketchNodes: string[];
  allPossibleNodes: string[];
  pathColors: { [key: string]: string };
}

// Plots replicates and shortest paths between them
const ReplicateMap: React.FC<ReplicateMapProps> = ({ graph, sketch, shortestPaths, sketchNodes, allPossibleNodes, pathColors }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 800;
    svg.attr("width", width).attr("height", height);

    // Scale map to extent of nodes
    const nodes = graph.nodes().map(node => graph.node(node));
    const links = graph.edges().map(edge => ({
      source: edge.v,
      target: edge.w,
      distance: graph.edge(edge),
    }));

    const xScale = scaleLinear()
      .domain(extent(nodes, d => d[0]) as [number, number])
      .range([0, width]);
    const yScale = scaleLinear()
      .domain(extent(nodes, d => d[1]) as [number, number])
      .range([height, 0]);

    // Load and plot background land
    json('../../data/bin/land.1.geojson').then((geojson: any) => {
      const projection = geoTransform({
        point: function (x, y) {
          this.stream.point(xScale(x), yScale(y));
        }
      });
      const path = geoPath().projection(projection);
      svg.append("g")
        .selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#d3d3d3")
        .attr("stroke", "#000"); 

      // Plot sketch polygons
      sketch.forEach(s => {
        svg.append("g")
          .selectAll(".sketch-path")
          .data(s.geometry.coordinates)
          .enter()
          .append("path")
          .attr("class", "sketch-path")
          .attr("d", d => {
            const pathData = d.map(([x, y]) => [xScale(x as number), yScale(y as number)]);
            return line()(pathData as [number, number][]);
          })
          .attr("fill", "none")
          .attr("stroke", "blue")
          .attr("stroke-width", 1);
      });

      // Plot shortest path routes 
      const overlayGroup = svg.append("g");
      overlayGroup.selectAll(".shortest-path-link")
        .data(shortestPaths)
        .enter()
        .append("line")
        .attr("class", "shortest-path-link")
        .attr("x1", d => xScale(graph.node(d.source)[0]))
        .attr("y1", d => yScale(graph.node(d.source)[1]))
        .attr("x2", d => xScale(graph.node(d.target)[0]))
        .attr("y2", d => yScale(graph.node(d.target)[1]))
        .attr("stroke", d => pathColors[`${d.source}-${d.target}`])
        .attr("stroke-width", 1);

      // Nodes
      overlayGroup.selectAll(".nodes")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "nodes")
        .attr("cx", d => xScale(d[0]))
        .attr("cy", d => yScale(d[1]))
        .attr("r", 1)
        .attr("fill", d => "black");

      // Shortest path nodes
      overlayGroup.selectAll(".shortest-path-nodes")
        .data(shortestPaths)
        .enter()
        .append("circle")
        .attr("class", "shortest-path-nodes")
        .attr("cx", d => xScale(graph.node(d.source)[0]))
        .attr("cy", d => yScale(graph.node(d.source)[1]))
        .attr("r", 2)
        .attr("fill", d => "black");

      // Possible Nodes
      overlayGroup.selectAll(".possible-node")
        .data(allPossibleNodes)
        .enter()
        .append("circle")
        .attr("class", "allPossibleNodes")
        .attr("cx", d => xScale(graph.node(d)[0]))
        .attr("cy", d => yScale(graph.node(d)[1]))
        .attr("r", 1)
        .attr("fill", d => "orange");

      // Plot nodes for sketches
      overlayGroup.selectAll(".important-node")
        .data(sketchNodes)
        .enter()
        .append("circle")
        .attr("class", "important-node")
        .attr("cx", d => xScale(graph.node(d)[0]))
        .attr("cy", d => yScale(graph.node(d)[1]))
        .attr("r", 2)
        .attr("fill", d => "orange");
    }).catch(error => console.error("Failed to load GeoJSON:", error));
  }, [graph, shortestPaths, sketchNodes, pathColors]);

  return <svg ref={svgRef}></svg>;
};

export const Spacing: React.FunctionComponent = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  return (
    <ResultsCard title={t("Spacing Report")} functionName="spacing">
      {(sketch: Sketch<Polygon> | SketchCollection<Polygon>) => {
        if (!isCollection) {
          return <p>This is only available for sketch collections.</p>;
        }

        const graph = readGraphFromFile(graphData);
        // Buffer by 1 meter to ensure overlap with clipped edges
        const sketches = toSketchArray(sketch).map((sketch)=> buffer(sketch, 1));

        // Calculate centroids
        const sketchesWithCentroids = sketches.map(sketch => ({
          sketch,
          centroid: centroid(sketch!).geometry.coordinates as [number, number]
        }));

        // Sort sketches by latitude
        sketchesWithCentroids.sort((a, b) => b.centroid[1] - a.centroid[1]);

        let allEdges: { source: string; target: string; distance: number }[] = [];
        let sketchNodes: string[] = [];
        let allPossibleNodes: string[] = [];
        let reds = 0;
        let greens = 0;
        const pathColors: { [key: string]: string } = {};

        // Start with northernmost sketch
        let currentSketch = sketchesWithCentroids[0];
        let remainingSketches = sketchesWithCentroids.slice(1);

        while (remainingSketches.length > 0) {
          // Find the closest unvisited sketch
          const closestSketch = remainingSketches.reduce((closest, sketch) => {
            const dist = distance(point(currentSketch.centroid), point(sketch.centroid));
            return dist < closest.distance ? { sketch, distance: dist } : closest;
          }, { sketch: remainingSketches[0], distance: Infinity });

          const nextSketch = closestSketch.sketch;
          const { path, edges, totalDistance, possibleNodes } = findShortestPath(graph, currentSketch.sketch, nextSketch.sketch);

          allEdges = allEdges.concat(edges.map(edge => ({ ...edge, distance: totalDistance })));
          sketchNodes.push(path[0], path[path.length - 1]);
          allPossibleNodes = [...allPossibleNodes, ...possibleNodes];

          const color = totalDistance < 62 ? "green" : "red";
          totalDistance < 62 ? greens++ : reds++;
          edges.forEach(edge => pathColors[`${edge.source}-${edge.target}`] = color);

          currentSketch = nextSketch;
          remainingSketches = remainingSketches.filter(sketch => sketch !== closestSketch.sketch);
        }

        return (
          <ReportError>
            <Card>
              <p>Among the {greens+reds+1} MPAs analyzed, there are {reds} connectivity gaps greater than 62 miles.</p>
              {graphData ? 
                <ReplicateMap graph={graph} sketch={sketches} shortestPaths={allEdges} sketchNodes={sketchNodes} allPossibleNodes={allPossibleNodes} pathColors={pathColors} /> 
                : <p>Loading graph...</p>}            
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

// Finds closest node to a given position
function findNodesWithinSketch(graph: Graph, sketch: Sketch<Polygon>): string[] {
  const nodesWithinSketch: string[] = [];
  const sketchCentroid = centroid(sketch).geometry.coordinates as [number, number];

  graph.nodes().forEach(node => {
    const nodePos = graph.node(node);

    // Check if the node is within the sketch polygon
    if (booleanPointInPolygon(point(nodePos), sketch)) {
      nodesWithinSketch.push(node);
    }
  });

  // If no nodes are found within the sketch, return the closest node
  if (nodesWithinSketch.length === 0) {
    console.log(`Sketch ${sketch.properties.name} has no nodes within, finding closest node`)
    let closestNode = '';
    let minDistance = Infinity;

    graph.nodes().forEach(node => {
      const nodePos = graph.node(node);
      const dist = distance(point(sketchCentroid), point(nodePos));

      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    });

    return [closestNode];
  }
  console.log(`Sketch ${sketch.properties.name} has has these nodes within: ${nodesWithinSketch}` )

  return nodesWithinSketch;
}

// Finds shortest path between two nodes using Dijkstra's algorithm
function findShortestPath(graph: Graph, currentSketch: Sketch<Polygon>, nextSketch: Sketch<Polygon>): { path: string[], edges: { source: string, target: string }[], totalDistance: number, possibleNodes: string[] } {
  const nodes0 = findNodesWithinSketch(graph, currentSketch);
  const nodes1 = findNodesWithinSketch(graph, nextSketch);

  if (nodes0.length === 0 || nodes1.length === 0) {
    throw new Error('No valid nodes found within one or both sketches.');
  }

  let shortestPath: string[] = [];
  let shortestEdges: { source: string, target: string }[] = [];
  let minTotalDistance = Infinity;

  // Iterate over all combinations of node0[] and node1[]
  nodes0.forEach(node0 => {
    nodes1.forEach(node1 => {
      // If sketches are connected/overlapping
      if (node0 === node1) {
        shortestPath = [node0];
        shortestEdges = [];
        minTotalDistance = 0;
        return;
      }

      // Using Dijkstra's algorithm to find the shortest path
      const path = alg.dijkstra(graph, node0, edge => graph.edge(edge));
      if (!path[node1].predecessor) {
        console.warn(`No path from ${node0} to ${node1}`);
        return;
      }

      // Reconstruct the path from node0 to node1
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
        totalDistance += graph.edge(predecessor, currentNode);
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
    throw new Error(`No path found between any nodes of the currentSketch and nextSketch`);
  }

  console.log(`Total distance from ${currentSketch.properties.name} to ${nextSketch.properties.name} is ${minTotalDistance}`);

  return { path: shortestPath, edges: shortestEdges, totalDistance: minTotalDistance, possibleNodes: nodes0.concat(nodes1) };
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