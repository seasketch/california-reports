import React, {useEffect, useRef} from "react";
import * as d3 from 'd3';
import fs from 'fs-extra'
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
import graphData from '../../data/bin/network.01.json'

interface GraphPlotterProps {
  graph: Graph;
  shortestPathEdges: { source: string; target: string, distance: number }[];
  importantNodes: string[];
  pathColors: { [key: string]: string };
}

const GraphPlotter: React.FC<GraphPlotterProps> = ({ graph, shortestPathEdges, importantNodes, pathColors }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const width = 400;
    const height = 800;

    svg.attr("width", width).attr("height", height);

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

    // Load and render GeoJSON background map
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
        .attr("fill", "#d3d3d3") // Light grey color for land
        .attr("stroke", "#000"); // Black stroke for boundaries

      // Render shortest path links on top
      svg.selectAll(".shortest-path-link")
        .data(shortestPathEdges)
        .enter()
        .append("line")
        .attr("class", "shortest-path-link")
        .attr("x1", d => xScale(graph.node(d.source)[0]))
        .attr("y1", d => yScale(graph.node(d.source)[1]))
        .attr("x2", d => xScale(graph.node(d.target)[0]))
        .attr("y2", d => yScale(graph.node(d.target)[1]))
        .attr("stroke", d => pathColors[`${d.source}-${d.target}`])
        .attr("stroke-width", 1.5);

      // Render circles for the important nodes
      svg.selectAll(".important-node")
        .data(importantNodes)
        .enter()
        .append("circle")
        .attr("class", "important-node")
        .attr("cx", d => xScale(graph.node(d)[0]))
        .attr("cy", d => yScale(graph.node(d)[1]))
        .attr("r", 5)
        .attr("fill", d =>  "black");
    }).catch(error => console.error("Failed to load GeoJSON:", error));
  }, [graph, shortestPathEdges, importantNodes, pathColors]);

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
        checkGraphConnectivity(graph);

        const sketches = toSketchArray(sketch);
        if (sketches.length < 2) {
          return <p>Not enough polygons in the sketch collection</p>;
        }

        // Calculate centroids and sort sketches from north to south
        const sketchesWithCentroids = sketches.map(sketch => ({
          sketch,
          centroid: turf.centroid(sketch).geometry.coordinates as [number, number]
        }));

        sketchesWithCentroids.sort((a, b) => b.centroid[1] - a.centroid[1]);

        let allEdges: { source: string; target: string; distance: number }[] = [];
        let importantNodes: string[] = [];
        let pos0 = sketchesWithCentroids[0].centroid;
        const pathColors: { [key: string]: string } = {};

        for (let i = 1; i < sketchesWithCentroids.length; i++) {
          const pos1 = sketchesWithCentroids[i].centroid;
          const { path, edges, totalDistance } = findShortestPath(graph, pos0, pos1);
          allEdges = allEdges.concat(edges.map(edge => ({ ...edge, distance: totalDistance })));
          importantNodes.push(path[0], path[path.length - 1]);
          pos0 = pos1;

          const color = totalDistance < 100 ? "green" : "red";
          edges.forEach(edge => {
            pathColors[`${edge.source}-${edge.target}`] = color;
            pathColors[edge.source] = color;
            pathColors[edge.target] = color;
          });
        }

        return (
          <ReportError>
            <Card>
              {graphData ? 
                <GraphPlotter graph={graph} shortestPathEdges={allEdges} importantNodes={importantNodes} pathColors={pathColors} /> 
                : <p>Loading graph...</p>}            
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

// Function to find the closest node to a given position
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


function findShortestPath(graph: Graph, pos0: [number, number], pos1: [number, number]): { path: string[], edges: { source: string, target: string }[], totalDistance: number } {
  const node0 = findClosestNode(graph, pos0);
  const node1 = findClosestNode(graph, pos1);

  console.log(`Closest node to pos0 (${pos0}) is ${node0}`);
  console.log(`Closest node to pos1 (${pos1}) is ${node1}`);

  // Using Dijkstra's algorithm to find the shortest path
  const path = alg.dijkstra(graph, node0, edge => graph.edge(edge));
  console.log(path);
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

function checkGraphConnectivity(graph) {
  const nodes = graph.nodes();
  const visited = new Set();

  function dfs(node) {
    visited.add(node);
    graph.successors(node).forEach(successor => {
      if (!visited.has(successor)) {
        dfs(successor);
      }
    });
  }

  dfs(nodes[0]);

  if (visited.size !== nodes.length) {
    console.log('The graph has disconnected components.');
  } else {
    console.log('The graph is fully connected.');
  }
}