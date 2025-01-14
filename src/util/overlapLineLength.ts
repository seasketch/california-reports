import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  Feature,
  removeOverlap,
} from "@seasketch/geoprocessing";
import {
  LineString,
  Metric,
  createMetric,
  isSketchCollection,
  roundDecimal,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import {
  featureCollection,
  length,
  lineSplit,
  booleanDisjoint,
  booleanWithin,
  lineSliceAlong,
  truncate as truncateGeom,
  Units,
} from "@turf/turf";

/**
 * Clips line features to the polygons in a sketch and calculates the total length of the clipped
 *
 * @param metricId - metricId to assign result to
 * @param features - An array of line features to be clipped.
 * @param sketch - A FeatureCollection<Polygon> or a single Feature<Polygon>
 * @param options - units: The units of the returned length. Can be degrees, radians, miles, kilometers, nauticalmiles, or meters.
 * @param options - includeChildMetrics: If true, returns metrics for each sketch in a collection. Default is true.
 * @param options - solveOverlap: If true, solves for overlap between sketches in a collection, handling overlap. Default is true.
 * @param options - truncate: If true, truncates the result to 6 decimal places. Default is true.
 * @returns The total length of the clipped line features inside the sketch polygons.
 */
export async function overlapLineLength(
  metricId: string,
  features: Feature<LineString>[],
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>
    | Sketch<Polygon | MultiPolygon>[],
  options: {
    units?:
      | "miles"
      | "kilometers"
      | "degrees"
      | "radians"
      | "nauticalmiles"
      | "meters";
    includeChildMetrics?: boolean;
    solveOverlap?: boolean;
    truncate?: boolean;
  } = {},
): Promise<Metric[]> {
  const {
    includeChildMetrics = true,
    solveOverlap = true,
    truncate = true,
  } = options;

  // If sketch collection, used to accumulate collection level value
  let collectionValue = 0;

  // Truncate coordinate precision
  const truncatedSketches = (
    Array.isArray(sketch) ? sketch : toSketchArray(sketch)
  ).map((s) => truncateGeom(s));
  const truncatedFeatures = features.map((f) => truncateGeom(f));

  // Individual sketch metrics
  const metrics: Metric[] =
    includeChildMetrics || !solveOverlap
      ? truncatedSketches.map((curSketch) => {
          const sketchValue = lineOverlap(curSketch, truncatedFeatures, {
            units: options.units,
          });

          // Accumulate collection level value from children. Does not solve for overlap
          if (solveOverlap === false) collectionValue += sketchValue;

          return createMetric({
            metricId,
            sketchId: curSketch.properties.id,
            value: truncate
              ? roundDecimal(sketchValue, 6, { keepSmallValues: true })
              : sketchValue,
            extra: {
              sketchName: curSketch.properties.name,
            },
          });
        })
      : [];

  // Collection level metrics
  if (isSketchCollection(sketch)) {
    // Slower method but solves for overlap
    if (solveOverlap === true) {
      // Remove overlap between sketches then calculate collection level area
      const noOverlapPolygons = removeOverlap(
        featureCollection(truncatedSketches),
      );
      collectionValue = lineOverlap(noOverlapPolygons, truncatedFeatures, {
        units: options.units,
      });
    }

    metrics.push(
      createMetric({
        metricId,
        sketchId: sketch.properties.id,
        value: truncate
          ? roundDecimal(collectionValue, 6, { keepSmallValues: true })
          : collectionValue,
        extra: {
          sketchName: sketch.properties.name,
          isCollection: true,
        },
      }),
    );
  }

  return metrics;
}

export function lineOverlap(
  poly: Feature<Polygon | MultiPolygon>,
  features: Feature<LineString>[],
  options?: { units?: Units },
) {
  const units = options?.units || "meters";
  let totalLength = 0;

  for (const line of features) {
    // Line fully within polygon
    if (booleanWithin(line, poly)) {
      totalLength += length(line, { units: units || "meters" });
      continue;
    }

    // Line fully outside polygon
    if (booleanDisjoint(poly, line)) continue;

    // Line intersects polygon
    const splitLines = lineSplit(line, poly);
    for (const segment of splitLines.features) {
      if (
        segment.geometry.type === "LineString" &&
        length(segment, { units: "meters" }) > 0.2 &&
        booleanWithin(
          lineSliceAlong(segment, 0.1, 0.1, { units: "meters" }),
          poly,
        )
      ) {
        totalLength += length(segment, { units: units || "meters" });
      }
    }
  }

  return totalLength;
}
