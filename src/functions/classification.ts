import {
  rekeyMetrics,
  sortMetrics,
  Sketch,
  SketchCollection,
  Polygon,
  createMetric,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";
import { GeoprocessingHandler, Metric } from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";

export async function classification(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
): Promise<Metric[]> {
  const mg = project.getMetricGroup("classification");
  const sketchFeatures = getSketchFeatures(sketch);

  const classificationLevels = sketchFeatures.reduce<Record<string, number>>(
    (levels, sketch) => {
      const designation = getUserAttribute(
        sketch.properties,
        "proposed_designation",
        "",
      );
      if (!designation)
        throw new Error("Malformed sketch, no proposed designation level");

      levels[designation] = 1 + (levels[designation] || 0);
      return levels;
    },
    {},
  );

  const metrics = Object.keys(classificationLevels).map((level) => {
    return createMetric({
      metricId: mg.metricId,
      groupId: level,
      classId: level,
      value: classificationLevels[level],
    });
  });

  return sortMetrics(rekeyMetrics(metrics));
}

export default new GeoprocessingHandler(classification, {
  title: "classification",
  description: "returns area metrics for classification levels for sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 4096,
});
