import { bbox, featureCollection, union } from "@turf/turf";
import geographies from "../../project/geographies.json" with { type: "json" };
import { lineOverlap } from "../../src/util/overlapLineLength.js";
import {
  LineString,
  loadFgb,
  MultiPolygon,
  Feature,
  Polygon,
  genFeatureCollection,
  createMetric,
} from "@seasketch/geoprocessing";
import fs from "fs-extra";
import projectClient from "../../project/projectClient.js";

async function main() {
  // Initialize an empty array to store results
  const metrics = [];
  const metricGroup = projectClient.getMetricGroup("span");
  for (const geography of geographies) {
    try {
      console.log(`Processing geography: ${geography.geographyId}`);
      const geo = await loadFgb<Feature<Polygon | MultiPolygon>>(
        `http://127.0.0.1:8080/${geography.datasourceId}.fgb`,
      );

      // Load features once
      const features = await loadFgb<Feature<LineString>>(
        "http://127.0.0.1:8080/" + metricGroup.datasourceId + ".fgb",
        bbox(featureCollection(geo)),
      );

      // Use union if there are multiple features
      const geoUnion =
        geo.length > 1 ? union(genFeatureCollection(geo))! : geo[0];

      // Calculate total length
      const totalLength = lineOverlap(geoUnion, features, { units: "miles" });

      // Create metric and add it to the array
      const metric = createMetric({
        geographyId: geography.geographyId,
        classId: "span",
        value: totalLength,
      });
      metrics.push(metric);
    } catch (error) {
      console.error(
        `Error processing geography ${geography.geographyId}:`,
        error,
      );
    }
  }

  // Write the results to a JSON file
  fs.writeJsonSync(`${import.meta.dirname}/precalcSpan.json`, metrics);

  console.log("All geographies processed.");
}

main();
