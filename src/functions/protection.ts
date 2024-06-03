import {
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
  Sketch,
  SketchCollection,
  Polygon,
  ReportResult,
  createMetric,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";
import { GeoprocessingHandler } from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";

export async function protection(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const mg = project.getMetricGroup("protection");
  const sketchFeatures = getSketchFeatures(sketch);

  const protectionLevels = sketchFeatures.reduce<Record<string, number>>(
    (levels, sketch) => {
      const designation = getUserAttribute(
        sketch.properties,
        "proposed_designation",
        ""
      );
      if (!designation)
        throw new Error("Malformed sketch, no proposed designation level");

      levels[designation] = 1 + (levels[designation] || 0);
      return levels;
    },
    {}
  );

  const metrics = Object.keys(protectionLevels).map((level) => {
    return createMetric({
      metricId: mg.metricId,
      groupId: level,
      classId: level,
      value: protectionLevels[level],
    });
  });

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch),
  };
}

export default new GeoprocessingHandler(protection, {
  title: "protection",
  description: "returns area metrics for protection levels for sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 4096,
});
