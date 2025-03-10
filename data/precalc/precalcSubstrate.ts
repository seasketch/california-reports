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
import project from "../../project/index.js";

async function main() {
  // Initialize an empty array to store results
  const metrics = [];
  const metricGroup = {
    metricId: "substrate_nearshore",
    type: "areaOverlap",
    classKey: "Sub_depth",
    classes: [
      {
        classId: "Soft 0 - 30m",
        display: "Soft 0-30m",
        datasourceId: "substrate_nearshore",
      },
      {
        classId: "Hard 0 - 30m",
        display: "Hard 0-30m",
        datasourceId: "substrate_nearshore",
      },
    ],
  };

  for (const curClass of metricGroup.classes) {
    for (const geography of geographies) {
      try {
        console.log(`Processing geography: ${geography.geographyId}`);
        const geo = await loadFgb<Feature<Polygon | MultiPolygon>>(
          `http://127.0.0.1:8080/${geography.datasourceId}.fgb`,
        );

        // Load features once
        const features = await loadFgb<Feature<LineString>>(
          "http://127.0.0.1:8080/" + curClass.datasourceId + ".fgb",
          bbox(featureCollection(geo)),
        );

        const classKey = project.getMetricGroupClassKey(metricGroup, {
          classId: curClass.classId,
        });

        let finalFeatures: Feature<LineString>[] = [];
        if (classKey === undefined)
          // Use all features
          finalFeatures = features;
        else {
          // Filter to features that are a member of this class
          finalFeatures = features.filter(
            (feat) =>
              feat.geometry &&
              feat.properties &&
              feat.properties[classKey] === curClass.classId,
          );
        }
        console.log(finalFeatures);

        // Use union if there are multiple features
        const geoUnion =
          geo.length > 1 ? union(genFeatureCollection(geo))! : geo[0];

        // Calculate total length
        const totalLength = lineOverlap(geoUnion, finalFeatures, {
          units: "miles",
        });

        // Create metric and add it to the array
        const metric = createMetric({
          geographyId: geography.geographyId,
          classId: curClass.classId,
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
  }

  // Write the results to a JSON file
  fs.writeJsonSync(`${import.meta.dirname}/precalcSubstrate.json`, metrics);

  console.log("All geographies processed.");
}

main();
