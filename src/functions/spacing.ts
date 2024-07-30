import {
  Sketch,
  SketchCollection,
  GeoprocessingHandler,
  Polygon,
} from "@seasketch/geoprocessing";

export async function spacing(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<Sketch<Polygon> | SketchCollection<Polygon>> {
  return sketch;
}


export default new GeoprocessingHandler(spacing, {
  title: "spacing",
  description: "calculates spacing within given sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 8192,
});
