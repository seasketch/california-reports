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
  Feature,
  LineString,
  Polygon,
  Sketch,
} from "@seasketch/geoprocessing/client-core";
import { featureCollection } from "@turf/turf";
import {
  Card,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";

// Props for the Replicate Map
interface ReplicateMapProps {
  sketch: Sketch<Polygon>[];
  paths: {
    path: Feature<LineString>;
    distance: number;
    color: string;
  }[];
}

// Plots replicates and shortest paths between them
const ReplicateMap: React.FC<ReplicateMapProps> = ({ sketch, paths }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 600;
    svg.attr("width", width).attr("height", height);

    // Tooltip setup
    const tooltip = select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(255, 255, 255, 0.9)")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("border-radius", "8px")
      .style("box-shadow", "0 0 10px rgba(0, 0, 0, 0.15)")
      .style("font-size", "12px")
      .style("color", "#333");

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
    json("../../data/bin/land.005.geojson")
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
          .attr("fill", "#e0e0e0")
          .attr("stroke", "#333");

        // Plot sketch polygons (MPAs)
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
            .attr("fill", "lightblue")
            .attr("stroke", "#4682b4")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round");
        });

        // Plot paths with colors and add hover interaction
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
            .attr("stroke-width", 3)
            .on("mouseover", (event) => {
              tooltip
                .style("visibility", "visible")
                .text(`${d.distance.toFixed(0)} miles`);
            })
            .on("mousemove", (event) => {
              const svgRect = svgRef.current?.getBoundingClientRect();
              const tooltipWidth = tooltip
                .node()
                ?.getBoundingClientRect().width;
              const tooltipHeight = tooltip
                .node()
                ?.getBoundingClientRect().height;

              // Calculate the position relative to the SVG
              const left = event.clientX - svgRect!.left + 30;
              const top = event.clientY - svgRect!.top + 10;

              // Ensure the tooltip stays within the SVG boundaries
              const finalLeft = Math.min(left, svgRect!.width - tooltipWidth!);
              const finalTop = Math.min(top, svgRect!.height - tooltipHeight!);

              tooltip
                .style("top", `${finalTop}px`)
                .style("left", `${finalLeft}px`);
            })

            .on("mouseout", (event) => {
              // Ensure that the mouse is not just passing over another element
              const e = event.toElement || event.relatedTarget;
              if (e && e.closest(".path-link")) return;

              setTimeout(() => {
                tooltip.style("visibility", "hidden");
              }, 300); // Slight delay to prevent flickering
            });
        });

        // // Optional: Plot nodes for paths
        // overlayGroup
        //   .selectAll(".path-node")
        //   .data(paths.flatMap((d) => d.path.geometry.coordinates))
        //   .enter()
        //   .append("circle")
        //   .attr("class", "path-node")
        //   .attr("cx", (d) => xScale(d[0]))
        //   .attr("cy", (d) => yScale(d[1]))
        //   .attr("r", 4)
        //   .attr("fill", "#fff")
        //   .attr("stroke", "#000")
        //   .attr("stroke-width", 1);
      })
      .catch((error) => console.error("Failed to load GeoJSON:", error));
  }, [sketch, paths]);

  return (
    <>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </>
  );
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
