import React, {useEffect, useState} from "react";
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
  ReportResult,
} from "@seasketch/geoprocessing/client-core";
import {useTranslation } from "react-i18next";

interface GraphData {
  _nodes: { [key: string]:  [number, number]  };
  _edgeObjs: { source: string; target: string }[];
  _edgeLabels: { [key: string]:  number  }
}

const GraphPlotter: React.FC<{ graphData: GraphData, shortestPathEdges: { source: string, target: string }[], shortestPathNodes: string[] }> = ({ graphData, shortestPathEdges, shortestPathNodes }) => {  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const width = 400;
    const height = 1000;

    svg.attr("width", width)
       .attr("height", height);

    const nodes = Object.values(graphData._nodes);
    const edgeLabels = Object.values(graphData._edgeLabels);
    const edgeObjs = Object.keys(graphData._edgeObjs).map(key => {
      const [source, target] = key.split('\u0001'); // Split by the delimiter  
      return { source, target, distance: graphData._edgeLabels[key] };
    });
    const links = edgeObjs;

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

      svg.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => xScale(graphData._nodes[d.source][0]))
      .attr("y1", d => yScale(graphData._nodes[d.source][1]))
      .attr("x2", d => xScale(graphData._nodes[d.target][0]))
      .attr("y2", d => yScale(graphData._nodes[d.target][1]))
      .attr("stroke", "blue")
      .attr("stroke-width", 0.5);

    // Render shortest path links on top
    svg.selectAll(".shortest-path-link")
      .data(shortestPathEdges)
      .enter()
      .append("line")
      .attr("class", "shortest-path-link")
      .attr("x1", d => xScale(graphData._nodes[d.source][0]))
      .attr("y1", d => yScale(graphData._nodes[d.source][1]))
      .attr("x2", d => xScale(graphData._nodes[d.target][0]))
      .attr("y2", d => yScale(graphData._nodes[d.target][1]))
      .attr("stroke", "red")
      .attr("stroke-width", 1.5);

    // Render nodes
    svg.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d[0]))
      .attr("cy", d => yScale(d[1]))
      .attr("r", 3)
      .attr("fill", d => shortestPathNodes.includes(Object.keys(graphData._nodes).find(key => graphData._nodes[key] === d)!) ? "red" : "black");

    // Render shortest path nodes on top
    svg.selectAll(".shortest-path-node")
      .data(shortestPathNodes.map(node => graphData._nodes[node]))
      .enter()
      .append("circle")
      .attr("class", "shortest-path-node")
      .attr("cx", d => xScale(d[0]))
      .attr("cy", d => yScale(d[1]))
      .attr("r", 3)
      .attr("fill", "red");
    }).catch(error => console.error("Failed to load GeoJSON:", error));
  }, [graphData, shortestPathEdges, shortestPathNodes]);

  return <svg ref={svgRef}></svg>;
};

export const Spacing: React.FunctionComponent = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [shortestPathEdges, setShortestPathEdges] = useState<{ source: string, target: string }[]>([]);
  const [shortestPathNodes, setShortestPathNodes] = useState<string[]>([]);

  useEffect(() => {
    fetch('../../data/bin/network.01.json') // Update the path as necessary
      .then(response => response.json())
      .then(data => {
        console.log("Graph data:", data); // Debugging line to inspect the data
        if (data && data._nodes && Object.keys(data._nodes).length > 0) {
          setGraphData(data);
          const graph = readGraphFromFile(data);
          console.log("graph", graph)
          checkGraphConnectivity(graph);

          const pos0: [number, number] = [-124.08564619268653,
            41.5442591626165];
          const pos1: [number, number] = [-117.14776559202397,
            32.63547106944684];

          const { path, edges, totalDistance } = findShortestPath(graph, pos0, pos1);
          console.log('Shortest path:', path);
          console.log('Shortest path edges:', edges);
          console.log('Total distance:', totalDistance);

          setShortestPathEdges(edges);
          setShortestPathNodes(path);
        } else {
          console.error("Graph data is empty or invalid");
        }
      }).catch(error => console.error("Failed to fetch graph data:", error));
  }, []);

  return (
    <ResultsCard title={t("Plan Overview")} functionName="protection">
      {(data: ReportResult) => {
        return (
          <ReportError>
            <Card>
            {graphData ? <GraphPlotter graphData={graphData} shortestPathEdges={shortestPathEdges} shortestPathNodes={shortestPathNodes} /> : <p>Loading graph...</p>}            </Card>
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
      console.log()
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