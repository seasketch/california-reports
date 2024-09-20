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
  FeatureCollection,
  LineString,
  Polygon,
  Sketch,
} from "@seasketch/geoprocessing/client-core";
import { bbox, featureCollection } from "@turf/turf";
import { ObjectiveStatus } from "@seasketch/geoprocessing/client-ui";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import landData from "../../data/bin/landShrunk.01.json";

// Props for the Replicate Map
interface ReplicateMapProps {
  sketch: Sketch<Polygon>[];
  replicateIds: string[];
  paths: {
    path: Feature<LineString>;
    distance: number;
    color: string;
  }[];
}

function calculateProportionalHeight(
  featureCollection: FeatureCollection<Polygon>,
  fixedWidth: number = 430
): number {
  // Calculate the bounding box of the feature collection
  const [minX, minY, maxX, maxY] = bbox(featureCollection);

  // Calculate the width and height of the bounding box
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;

  // Calculate the aspect ratio
  const aspectRatio = bboxWidth / bboxHeight;

  // Calculate the proportional height based on the fixed width
  const proportionalHeight = fixedWidth / aspectRatio;

  return proportionalHeight;
}

// Plots replicates and shortest paths between them
export const ReplicateMap: React.FC<ReplicateMapProps> = ({
  sketch,
  replicateIds,
  paths,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 430;
    const height = calculateProportionalHeight(featureCollection(sketch));
    svg.attr("width", width).attr("height", height);

    // Scale map to extent of sketch nodes with padding
    const nodes = featureCollection(sketch).features.flatMap((feature) =>
      feature.geometry.coordinates.flatMap((coords) => coords)
    );

    // Calculate the extent of the nodes
    const xExtent = extent(nodes, (d) => d[0]) as [number, number];
    const yExtent = extent(nodes, (d) => d[1]) as [number, number];

    // Apply padding to the extent
    const paddingFactor = 0.1; // 10% padding
    const xPadding = (xExtent[1] - xExtent[0]) * paddingFactor;
    const yPadding = (yExtent[1] - yExtent[0]) * paddingFactor;

    // Adjusted extents
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

    // Load and plot background land
    const geojson = landData as FeatureCollection<Polygon>;
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
        .attr("stroke", `${d.color}`)
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .on("mouseover", (event) => {
          tooltip.style("visibility", "visible");
          tooltipDiv.text(`${d.distance.toFixed(0)} miles`);
        })
        .on("mouseout", (event) => {
          tooltip.style("visibility", "hidden");
        });
    });

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
        .attr(
          "fill",
          replicateIds.includes(s.properties.id) ? "lightgreen" : "white"
        )
        .attr(
          "stroke",
          replicateIds.includes(s.properties.id) ? "darkgreen" : "grey"
        )
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .on("mouseover", (event) => {
          tooltip.style("visibility", "visible");
          tooltipDiv.text(s.properties.name);
        })
        .on("mouseout", (event) => {
          // Ensure that the mouse is not just passing over another element
          const e = event.toElement || event.relatedTarget;
          if (e && e.closest(".path-link")) return;
          tooltip.style("visibility", "hidden");
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

    const tooltip = svg
      .append("foreignObject")
      .attr("id", "svg-tooltip")
      .attr("x", width - 150)
      .attr("y", 10)
      .attr("width", 140)
      .attr("height", 50)
      .attr("visibility", "hidden");

    const tooltipDiv = tooltip
      .append("xhtml:div")
      .style("background", "rgba(255, 255, 255, 0.9)")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("text-align", "center")
      .style("color", "#333");
  }, [sketch, paths]);

  return (
    <>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </>
  );
};

export const SpacingObjectives = (props: {
  data: {
    title: string;
    sketch: Sketch<Polygon>[];
    replicateIds: string[];
    paths: {
      path: Feature<LineString>;
      distance: number;
      color: string;
    }[];
  };
}) => (
  <>
    {props.data.replicateIds.length === 1 ? (
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
            These {props.data.title.toLocaleLowerCase()} habitat replicates meet
            the spacing guidelines. All replicates have gaps less than 62 miles.
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
