import React, { useEffect, useRef } from "react";
import {
  select,
  scaleLinear,
  extent,
  json,
  geoTransform,
  geoPath,
  line,
} from "d3";
import { Graph } from "graphlib";
import {
  ResultsCard,
  ReportError,
  useSketchProperties,
  Card,
} from "@seasketch/geoprocessing/client-ui";
import {
  Polygon,
  Sketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { useTranslation } from "react-i18next";
import graphData from "../../data/bin/network.05.json";

// Props for the Replicate Map
interface ReplicateMapProps {
  graph: Graph; // Graph with
  sketch: Sketch<Polygon>[];
  shortestPaths: { source: string; target: string; distance: number }[];
  sketchNodes: string[];
  allPossibleNodes: string[];
  pathColors: { [key: string]: string };
}

// Plots replicates and shortest paths between them
const ReplicateMap: React.FC<ReplicateMapProps> = ({
  graph,
  sketch,
  shortestPaths,
  sketchNodes,
  allPossibleNodes,
  pathColors,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 800;
    svg.attr("width", width).attr("height", height);

    // Scale map to extent of nodes
    const nodes = graph.nodes().map((node) => graph.node(node));

    const xScale = scaleLinear()
      .domain(extent(nodes, (d) => d[0]) as [number, number])
      .range([0, width]);
    const yScale = scaleLinear()
      .domain(extent(nodes, (d) => d[1]) as [number, number])
      .range([height, 0]);

    // Load and plot background land
    json("../../data/bin/land.01.geojson")
      .then((geojson: any) => {
        const projection = geoTransform({
          point: function (x, y) {
            this.stream.point(xScale(x), yScale(y));
          },
        });
        const path = geoPath().projection(projection);
        svg
          .append("g")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
          .attr("d", (d: any) => path(d))
          .attr("fill", "#d3d3d3")
          .attr("stroke", "#000");

        // Plot sketch polygons
        sketch.forEach((s) => {
          svg
            .append("g")
            .selectAll(".sketch-path")
            .data(s.geometry.coordinates)
            .enter()
            .append("path")
            .attr("class", "sketch-path")
            .attr("d", (d) => {
              const pathData = d.map(([x, y]) => [
                xScale(x as number),
                yScale(y as number),
              ]);
              return line()(pathData as [number, number][]);
            })
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 0.5);
        });

        // Plot shortest path routes
        const overlayGroup = svg.append("g");
        overlayGroup
          .selectAll(".shortest-path-link")
          .data(shortestPaths)
          .enter()
          .append("line")
          .attr("class", "shortest-path-link")
          .attr("x1", (d) => xScale(graph.node(d.source)[0]))
          .attr("y1", (d) => yScale(graph.node(d.source)[1]))
          .attr("x2", (d) => xScale(graph.node(d.target)[0]))
          .attr("y2", (d) => yScale(graph.node(d.target)[1]))
          .attr("stroke", (d) => pathColors[`${d.source}-${d.target}`])
          .attr("stroke-width", 1);

        // Nodes
        // overlayGroup
        //   .selectAll(".nodes")
        //   .data(nodes)
        //   .enter()
        //   .append("circle")
        //   .attr("class", "nodes")
        //   .attr("cx", (d) => xScale(d[0]))
        //   .attr("cy", (d) => yScale(d[1]))
        //   .attr("r", 1)
        //   .attr("fill", (d) => "black");

        // Shortest path nodes
        // overlayGroup
        //   .selectAll(".shortest-path-nodes")
        //   .data(shortestPaths)
        //   .enter()
        //   .append("circle")
        //   .attr("class", "shortest-path-nodes")
        //   .attr("cx", (d) => xScale(graph.node(d.source)[0]))
        //   .attr("cy", (d) => yScale(graph.node(d.source)[1]))
        //   .attr("r", 1)
        //   .attr("fill", (d) => "orange");

        // Possible Nodes
        // overlayGroup.selectAll(".possible-node")
        //   .data(allPossibleNodes)
        //   .enter()
        //   .append("circle")
        //   .attr("class", "allPossibleNodes")
        //   .attr("cx", d => xScale(graph.node(d)[0]))
        //   .attr("cy", d => yScale(graph.node(d)[1]))
        //   .attr("r", 1)
        //   .attr("fill", d => "orange");

        // Plot nodes for sketches
        overlayGroup
          .selectAll(".important-node")
          .data(sketchNodes)
          .enter()
          .append("circle")
          .attr("class", "important-node")
          .attr("cx", (d) => xScale(graph.node(d)[0]))
          .attr("cy", (d) => yScale(graph.node(d)[1]))
          .attr("r", 1)
          .attr("fill", (d) => "orange");
      })
      .catch((error) => console.error("Failed to load GeoJSON:", error));
  }, [graph, shortestPaths, sketchNodes, pathColors]);

  return <svg ref={svgRef}></svg>;
};

export const Spacing: React.FunctionComponent = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  return (
    <ResultsCard title={t("Spacing Report")} functionName="spacing">
      {(data: any) => {
        if (!isCollection) {
          return <p>This is only available for sketch collections.</p>;
        }

        const graph = readGraphFromFile(graphData);

        return (
          <ReportError>
            <Card>
              {graphData ? (
                <ReplicateMap
                  graph={graph}
                  sketch={toSketchArray(data.sketch)}
                  shortestPaths={data.allEdges}
                  sketchNodes={data.sketchNodes}
                  allPossibleNodes={data.allPossibleNodes}
                  pathColors={data.pathColors}
                />
              ) : (
                <p>Loading graph...</p>
              )}
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

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
