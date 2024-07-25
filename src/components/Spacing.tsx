import React, {useEffect, useState} from "react";
import * as d3 from 'd3';
import fs from 'fs-extra';
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
}

const GraphPlotter: React.FC<{ graphData: GraphData }> = ({ graphData }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const width = 400;
    const height = 1000;

    svg.attr("width", width)
       .attr("height", height);

    const nodes = Object.values(graphData._nodes);
    const edgeObjs = Object.keys(graphData._edgeObjs).map(key => {
      const [source, target] = key.split('\u0001'); // Split by the delimiter
      return { source, target };
  });
    const links = edgeObjs;

    console.log(links[0])

    const xScale = d3.scaleLinear()
    .domain(d3.extent(nodes, d => d[0]) as [number, number])
    .range([0, width]);

const yScale = d3.scaleLinear()
    .domain(d3.extent(nodes, d => d[1]) as [number, number])
    .range([height, 0]);

    svg.selectAll("circle")
       .data(nodes)
       .enter()
       .append("circle")
       .attr("cx", d => xScale(d[0]))
       .attr("cy", d => yScale(d[1]))
       .attr("r", 3)
       .attr("fill", "black");

    svg.selectAll("line")
       .data(links)
       .enter()
       .append("line")
       .attr("x1", d => xScale(graphData._nodes[d.source][0]))
       .attr("y1", d => yScale(graphData._nodes[d.source][1]))
       .attr("x2", d => xScale(graphData._nodes[d.target][0]))
       .attr("y2", d => yScale(graphData._nodes[d.target][1]))
       .attr("stroke", "gray")
       .attr("stroke-width", .5);
  }, [graphData]);

  return <svg ref={svgRef}></svg>;
};

export const Spacing: React.FunctionComponent = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  useEffect(() => {
    fetch('../../data/bin/coast1000m.gpickle') // Update the path as necessary
      .then(response => response.json())
      .then(data => {
        console.log("Graph data:", data); // Debugging line to inspect the data
        if (data && data._nodes && Object.keys(data._nodes).length > 0) {
          setGraphData(data);
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
              {graphData ? <GraphPlotter graphData={graphData} /> : <p>Loading graph...</p>}
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
