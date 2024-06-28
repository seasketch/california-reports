import {
  Sketch,
  SketchCollection,
  GeoprocessingHandler,
  Polygon,
  toSketchArray,
  getCogFilename,
  toRasterProjection,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import { min, max, mean } from "simple-statistics";
import project from "../../project/projectClient.js";

// @ts-ignore
import geoblaze, { Georaster } from "geoblaze";

export interface BathymetryResults {
  /** minimum depth in sketch */
  min: number;
  /** maximum depth in sketch */
  max: number;
  /** avg depth in sketch */
  mean?: number;
  units: string;
  sketchName?: string;
  isCollection?: boolean;
}

export async function bathymetry(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<BathymetryResults[]> {
  const mg = project.getMetricGroup("bathymetry");
  const box = sketch.bbox || bbox(sketch);
  if (!mg.classes[0].datasourceId)
    throw new Error(`Expected datasourceId for ${mg.classes[0]}`);
  const url = `${project.dataBucketUrl()}${getCogFilename(
    project.getInternalRasterDatasourceById(mg.classes[0].datasourceId)
  )}`;
  const raster = await loadCog(url);
  const stats = await bathyStats(sketch, raster);
  if (!stats)
    throw new Error(`No stats returned for ${sketch.properties.name}`);
  return stats;
}

/**
 * Core raster analysis - given raster, counts number of cells with value that are within Feature polygons
 */
export async function bathyStats(
  /** Polygons to filter for */
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  /** bathymetry raster to search */
  raster: Georaster
): Promise<BathymetryResults[]> {
  const features = toSketchArray(sketch);

  const sketchStats: BathymetryResults[] = await Promise.all(
    features.map(async (feature, index) => {
      const finalFeat = toRasterProjection(raster, feature);
      // If empty sketch (from subregional clipping)
      if (!finalFeat.geometry.coordinates.length)
        return {
          min: null,
          mean: null,
          max: null,
          units: "meters",
          sketchName: finalFeat.properties.name,
        };
      try {
        // @ts-ignore
        const stats = (
          await geoblaze.stats(raster, finalFeat, {
            calcMax: true,
            calcMean: true,
            calcMin: true,
          })
        )[0];
        return {
          min: stats.min,
          max: stats.max,
          mean: stats.mean,
          units: "meters",
          sketchName: finalFeat.properties.name,
        };
      } catch (err) {
        if (err === "No Values were found in the given geometry") {
          return {
            min: null,
            mean: null,
            max: null,
            units: "meters",
            sketchName: finalFeat.properties.name,
          };
        } else {
          throw err;
        }
      }
    })
  );

  if (isSketchCollection(sketch)) {
    const minVal = min(sketchStats.map((s) => s.min).filter(notNull));
    const maxVal = max(sketchStats.map((s) => s.max).filter(notNull));

    // Restrict values to be <= 0
    return sketchStats.concat([
      {
        min: minVal > 0 ? 0 : minVal,
        max: maxVal > 0 ? 0 : maxVal,
        units: "meters",
        sketchName: sketch.properties.name,
        isCollection: true,
      },
    ]);
  } else return sketchStats;
}

function notNull(value: number): value is number {
  return value !== null && value !== undefined;
}

export default new GeoprocessingHandler(bathymetry, {
  title: "bathymetry",
  description: "calculates bathymetry within given sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 8192,
});
