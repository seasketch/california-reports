import React, {useEffect, useRef} from "react";
import * as d3 from 'd3';
import *  as turf from '@turf/turf';
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
import graphData from '../../data/bin/network.01.json';

// Props for the Replicate Map
interface ReplicateMapProps {
  graph: Graph; // Graph with 
  shortestPaths: { source: string; target: string, distance: number }[];
  sketchNodes: string[];
  pathColors: { [key: string]: string };
}

// Plots replicates and shortest paths between them
const ReplicateMap: React.FC<ReplicateMapProps> = ({ graph, shortestPaths, sketchNodes, pathColors }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
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

    const xScale = d3.scaleLinear()
      .domain(d3.extent(nodes, d => d[0]) as [number, number])
      .range([0, width]);
    const yScale = d3.scaleLinear()
      .domain(d3.extent(nodes, d => d[1]) as [number, number])
      .range([height, 0]);

    // Load and plot background land
    d3.json('../../data/bin/land.01.geojson').then((geojson: any) => {
      const projection = d3.geoTransform({
        point: function (x, y) {
          this.stream.point(xScale(x), yScale(y));
        }
      });
      const path = d3.geoPath().projection(projection);
      svg.append("g")
        .selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#d3d3d3")
        .attr("stroke", "#000"); 

      // Plot shortest path routes 
      const overlayGroup = svg.append("g");
      // overlayGroup.selectAll(".links")
      //   .data(links)
      //   .enter()
      //   .append("line")
      //   .attr("class", "links")
      //   .attr("x1", d => xScale(graph.node(d.source)[0]))
      //   .attr("y1", d => yScale(graph.node(d.source)[1]))
      //   .attr("x2", d => xScale(graph.node(d.target)[0]))
      //   .attr("y2", d => yScale(graph.node(d.target)[1]))
      //   .attr("stroke", d => "blue")
      //   .attr("stroke-width", .5);

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
        .attr("stroke-width", 1.5);

        // overlayGroup.selectAll(".nodes")
        // .data(nodes)
        // .enter()
        // .append("circle")
        // .attr("class", "nodes")
        // .attr("cx", d => xScale(d[0]))
        // .attr("cy", d => yScale(d[1]))
        // .attr("r", 3)
        // .attr("fill", d => "black");

      // Plot nodes for sketches
      overlayGroup.selectAll(".important-node")
        .data(sketchNodes)
        .enter()
        .append("circle")
        .attr("class", "important-node")
        .attr("cx", d => xScale(graph.node(d)[0]))
        .attr("cy", d => yScale(graph.node(d)[1]))
        .attr("r", 3)
        .attr("fill", d => "black");
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
        const sketches = toSketchArray(sketch);

        // Calculate centroids
        const sketchesWithCentroids = sketches.map(sketch => ({
          sketch,
          centroid: turf.centroid(sketch).geometry.coordinates as [number, number]
        }));

        // Sort sketches by latitude
        sketchesWithCentroids.sort((a, b) => b.centroid[1] - a.centroid[1]);

        let allEdges: { source: string; target: string; distance: number }[] = [];
        let sketchNodes: string[] = [];
        const pathColors: { [key: string]: string } = {};

        // Start with northernmost sketch
        let currentPos = sketchesWithCentroids[0].centroid;
        let remainingSketches = sketchesWithCentroids.slice(1);

        while (remainingSketches.length > 0) {
          // Find the closest unvisited sketch
          const closestSketch = remainingSketches.reduce((closest, sketch) => {
            const distance = turf.distance(turf.point(currentPos), turf.point(sketch.centroid));
            return distance < closest.distance ? { sketch, distance } : closest;
          }, { sketch: remainingSketches[0], distance: Infinity });

          const pos1 = closestSketch.sketch.centroid;
          const { path, edges, totalDistance } = findShortestPath(graph, currentPos, pos1);

          allEdges = allEdges.concat(edges.map(edge => ({ ...edge, distance: totalDistance })));
          sketchNodes.push(path[0], path[path.length - 1]);

          const color = totalDistance < 62 ? "green" : "red";
          edges.forEach(edge => pathColors[`${edge.source}-${edge.target}`] = color);

          currentPos = pos1;
          remainingSketches = remainingSketches.filter(sketch => sketch !== closestSketch.sketch);
        }

        return (
          <ReportError>
            <Card>
              {graphData ? 
                <ReplicateMap graph={graph} shortestPaths={allEdges} sketchNodes={sketchNodes} pathColors={pathColors} /> 
                : <p>Loading graph...</p>}            
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

// Finds closest node to a given position
function findClosestNode(graph: Graph, pos: [number, number]): string {
  let closestNode = '';
  let minDistance = Infinity;

  graph.nodes().forEach(node => {
    const nodePos = graph.node(node);
    const distance = turf.distance(turf.point(pos), turf.point(nodePos));
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  });

  return closestNode;
}

// Finds shortest path between two nodes using Dijkstra's algorithm
function findShortestPath(graph: Graph, pos0: [number, number], pos1: [number, number]): { path: string[], edges: { source: string, target: string }[], totalDistance: number } {
  const node0 = findClosestNode(graph, pos0);
  const node1 = findClosestNode(graph, pos1);

  console.log(`Closest node to pos0 (${pos0}) is ${node0}`);
  console.log(`Closest node to pos1 (${pos1}) is ${node1}`);

  // If sketches are connected/overlapping
  if(node0 === node1) {
    return {path: [node0], edges: [], totalDistance: 0};
  }

  // Using Dijkstra's algorithm to find the shortest path
  const path = alg.dijkstra(graph, node0, edge => graph.edge(edge));
  if (!path[node1].predecessor) {
    throw new Error(`No path from ${node0} to ${node1}`);
  }

  // Reconstruct the path from node0 to node1
  let currentNode = node1;
  const shortestPath = [];
  const edges = [];
  let totalDistance = 0;
  while (currentNode !== node0) {
    const predecessor = path[currentNode].predecessor;
    if (!predecessor) {
      throw new Error(`No path from ${node0} to ${node1}`);
    }
    shortestPath.unshift(currentNode);
    edges.push({ source: predecessor, target: currentNode });
    totalDistance += graph.edge(predecessor, currentNode);
    currentNode = predecessor;
  }
  shortestPath.unshift(node0);

  console.log(`Total distance from ${node0} to ${node1} is ${totalDistance}`);

  return { path: shortestPath, edges, totalDistance };
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