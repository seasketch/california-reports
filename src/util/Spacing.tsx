import React, { useEffect, useRef } from "react";
import {
  select,
  scaleLinear,
  extent,
  geoTransform,
  geoPath,
  line,
  color,
} from "d3";
import {
  Feature,
  FeatureCollection,
  LineString,
  Polygon,
  Sketch,
} from "@seasketch/geoprocessing/client-core";
import { bbox, featureCollection } from "@turf/turf";
import { ObjectiveStatus } from "@seasketch/geoprocessing/client-ui";
import landData from "../../data/bin/landShrunk.01.json";

// Props for the Replicate Map
interface ReplicateMapProps {
  sketch: Sketch<Polygon>[];
  replicates: string[];
  paths: {
    path: Feature<LineString>;
    distance: number;
    color: string;
  }[];
}

function calculateProportionalHeight(
  featureCollection: FeatureCollection<Polygon>,
  fixedWidth: number = 430,
): number {
  const [minX, minY, maxX, maxY] = bbox(featureCollection);
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const aspectRatio = bboxWidth / bboxHeight;
  return fixedWidth / aspectRatio;
}

export const ReplicateMap: React.FC<ReplicateMapProps> = ({
  sketch,
  replicates,
  paths,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 430;
    const height = calculateProportionalHeight(
      featureCollection(sketch),
      width,
    );
    svg.attr("width", width).attr("height", height);

    const nodes = featureCollection(sketch).features.flatMap((feature) =>
      feature.geometry.coordinates.flatMap((coords) => coords),
    );

    const xExtent = extent(nodes, (d) => d[0]) as [number, number];
    const yExtent = extent(nodes, (d) => d[1]) as [number, number];

    const paddingFactor = 0.1;
    const xPadding = (xExtent[1] - xExtent[0]) * paddingFactor;
    const yPadding = (yExtent[1] - yExtent[0]) * paddingFactor;

    const paddedXExtent: [number, number] = [
      xExtent[0] - xPadding,
      xExtent[1] + xPadding,
    ];
    const paddedYExtent: [number, number] = [
      yExtent[0] - yPadding,
      yExtent[1] + yPadding,
    ];

    const xScale = scaleLinear().domain(paddedXExtent).range([0, width]);
    const yScale = scaleLinear().domain(paddedYExtent).range([height, 0]);

    const projection = geoTransform({
      point: function (x, y) {
        this.stream.point(xScale(x), yScale(y));
      },
    });
    const pathGenerator = geoPath().projection(projection);

    // Background land rendering
    svg
      .append("g")
      .selectAll("path")
      .data(landData.features)
      .enter()
      .append("path")
      .attr("d", (d: any) => pathGenerator(d))
      .attr("fill", "#f2f2f2")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1);

    const overlayGroup = svg.append("g");

    // Render paths with smooth transitions
    paths.forEach((d) => {
      const pathData = d.path.geometry.coordinates.map(([x, y]) => [
        xScale(x),
        yScale(y),
      ]);

      // Create tooltip element
      const tooltip = select(tooltipRef.current)
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(255, 255, 255, 0.9)")
        .style("border", "1px solid #ccc")
        .style("padding", "5px 10px")
        .style("border-radius", "8px")
        .style("font-size", "12px")
        .style("text-align", "center")
        .style("color", "#333")
        .style("pointer-events", "none");

      overlayGroup
        .append("path")
        .attr("class", "path-link")
        .attr("d", line()(pathData as [number, number][]))
        .attr("stroke", `${d.color}`)
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .on("mouseover", (event) => {
          tooltip
            .style("visibility", "visible")
            .style("border", `2px solid ${d.color}`);
          tooltip.text(`${d.distance.toFixed(0)} miles`);
        })
        .on("mousemove", (event) => {
          const svgRect = svgRef.current!.getBoundingClientRect(); // Get the bounding box of the SVG
          const offsetX = event.clientX - svgRect.left; // Mouse X relative to the SVG
          const offsetY = event.clientY - svgRect.top; // Mouse Y relative to the SVG

          // Position the tooltip near the cursor, relative to the SVG
          tooltip
            .style("top", `${offsetY + 10}px`)
            .style("left", `${offsetX + 10}px`);
        })
        .on("mouseout", () => {
          tooltip.style("visibility", "hidden");
        });
    });

    // Render sketch polygons (MPAs) with refined styles
    featureCollection(sketch).features.forEach((s) => {
      // Create tooltip element
      const tooltip = select(tooltipRef.current)
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(255, 255, 255, 0.9)")
        .style("border", "1px solid #ccc")
        .style("padding", "5px 10px")
        .style("border-radius", "8px")
        .style("font-size", "12px")
        .style("text-align", "center")
        .style("color", "#333")
        .style("pointer-events", "none");

      svg
        .append("g")
        .selectAll(".sketch-path")
        .data(s.geometry.coordinates)
        .enter()
        .append("path")
        .attr("class", "sketch-path")
        .attr("d", (d) => {
          const pathData = d.map(([x, y]) => [xScale(x), yScale(y)]);
          return line()(pathData as [number, number][]);
        })
        .attr("fill", replicates.includes(s.properties.id) ? "#a8e6cf" : "#fff")
        .attr(
          "stroke",
          replicates.includes(s.properties.id) ? "#56ab2f" : "#888",
        )
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .on("mouseover", (event) => {
          tooltip.style("visibility", "visible");
          tooltip.style(
            "border",
            `2px solid ${replicates.includes(s.properties.id) ? "#56ab2f" : "#888"}`,
          );
          tooltip.text(s.properties.name);
        })
        .on("mousemove", (event) => {
          const svgRect = svgRef.current!.getBoundingClientRect();
          const offsetX = event.clientX - svgRect.left;
          const offsetY = event.clientY - svgRect.top;

          tooltip
            .style("top", `${offsetY + 10}px`)
            .style("left", `${offsetX + 10}px`);
        })
        .on("mouseout", (event) => {
          const e = event.toElement || event.relatedTarget;
          if (e && e.closest(".path-link")) return;
          tooltip.style("visibility", "hidden");
        });
    });
  }, [sketch, paths, landData, replicates]);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "5px 10px",
          fontSize: "12px",
          color: "#333",
          pointerEvents: "none",
          visibility: "hidden",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          transition: "visibility 0.2s, top 0.2s, left 0.2s",
        }}
      ></div>
    </div>
  );
};

export const SpacingObjectives = (props: {
  data: {
    title: string;
    sketch: Sketch<Polygon>[];
    replicates: string[];
    paths: {
      path: Feature<LineString>;
      distance: number;
      color: string;
    }[];
  };
}) => {
  if (props.data.replicates.length === 0) return <></>;
  return (
    <>
      {props.data.replicates.length === 1 ? (
        <ObjectiveStatus
          status={"maybe"}
          msg={
            <>
              The selected MPAs contain only one{" "}
              {props.data.title.toLocaleLowerCase()} habitat replicate. Spacing
              analyses require 2+ replicates.
            </>
          }
        />
      ) : props.data.paths.filter((p) => p.color === "red").length === 0 ? (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <>
              These {props.data.title.toLocaleLowerCase()} habitat replicates
              meet the spacing guidelines. All replicates have gaps less than 62
              miles.
            </>
          }
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              These {props.data.title.toLocaleLowerCase()} habitat replicates do
              not meet the spacing guidelines, with{" "}
              {props.data.paths.filter((p) => p.color === "red").length} gap(s)
              greater than 62 miles.
            </>
          }
        />
      )}
    </>
  );
};
