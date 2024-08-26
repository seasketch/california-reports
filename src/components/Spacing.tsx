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
import {
  ResultsCard,
  ReportError,
  useSketchProperties,
  Card,
} from "@seasketch/geoprocessing/client-ui";
import {
  Feature,
  LineString,
  Polygon,
  Sketch,
} from "@seasketch/geoprocessing/client-core";
import { useTranslation } from "react-i18next";
import { featureCollection } from "@turf/turf";

// Props for the Replicate Map
interface ReplicateMapProps {
  sketch: Sketch<Polygon>[];
  paths: {
    path: Feature<LineString>;
    color: string;
  }[];
}

// Plots replicates and shortest paths between them
const ReplicateMap: React.FC<ReplicateMapProps> = ({ sketch, paths }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 800;
    svg.attr("width", width).attr("height", height);

    // Scale map to extent of sketch nodes
    const nodes = featureCollection(sketch).features.flatMap((feature) =>
      feature.geometry.coordinates.flatMap((coords) => coords)
    );

    const xScale = scaleLinear()
      .domain(extent(nodes, (d) => d[0]) as [number, number])
      .range([0, width]);
    const yScale = scaleLinear()
      .domain(extent(nodes, (d) => d[1]) as [number, number])
      .range([height, 0]);

    // Load and plot background land
    json("../../data/bin/landShrunk.01.json")
      .then((geojson: any) => {
        const projection = geoTransform({
          point: function (x, y) {
            this.stream.point(xScale(x), yScale(y));
          },
        });
        const pathGenerator = geoPath().projection(projection);
        svg
          .append("g")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
          .attr("d", (d: any) => pathGenerator(d))
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
            .attr("stroke-width", 1);
        });

        // Plot paths with colors
        const overlayGroup = svg.append("g");
        paths.forEach((d) => {
          const pathData = d.path.geometry.coordinates.map(([x, y]) => [
            xScale(x),
            yScale(y),
          ]);

          overlayGroup
            .append("path")
            .attr("class", "path-link")
            .attr("d", line()(pathData as [number, number][]))
            .attr("stroke", d.color)
            .attr("fill", "none")
            .attr("stroke-width", 1);
        });

        // Plot nodes for paths (optional)
        overlayGroup
          .selectAll(".path-node")
          .data(paths.flatMap((d) => d.path.geometry.coordinates))
          .enter()
          .append("circle")
          .attr("class", "path-node")
          .attr("cx", (d) => xScale(d[0]))
          .attr("cy", (d) => yScale(d[1]))
          .attr("r", 2)
          .attr("fill", "orange");
      })
      .catch((error) => console.error("Failed to load GeoJSON:", error));
  }, [sketch, paths]);

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

        return (
          <ReportError>
            <Card>
              <ReplicateMap sketch={data.sketch} paths={data.paths} />
            </Card>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
