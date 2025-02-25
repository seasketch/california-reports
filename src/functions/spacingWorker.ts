import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  rasterMetrics,
  overlapPolygonArea,
  getCogFilename,
  getFeaturesForSketchBBoxes,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  LineString,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import { overlapLineLength } from "../util/overlapLineLength.js";
import { bathyStats } from "./bathymetry.js";

const replicateMap = {
  kelp: 1.1,
  beaches: 1.1,
  rocks: 0.55,
  eelgrass: 0.04,
  estuaries: 0.12,
  substrate31: 0.13,
  substrate32: 7,
  substrate101: 0.13,
  substrate102: 17,
};

/**
 * spacingWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function spacingWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    datasourceId: string;
  },
) {
  const dsId = extraParams.datasourceId;
  const ds = dsId.startsWith("substrate")
    ? project.getDatasourceById("substrate_depth")
    : project.getDatasourceById(dsId);
  const url = project.getDatasourceUrl(ds);
  const sketches = toSketchArray(sketch);

  const replicateIds: string[] = [];

  await Promise.all(
    sketches.map(async (sketch: Sketch<Polygon | MultiPolygon>) => {
      // Check depth for kelp and hard/soft substrate 0-30m
      if (dsId === "kelp" && !(await depthCheck(sketch))) return;

      switch (dsId) {
        // Line feature datasources
        case "kelp":
        case "beaches":
        case "rocks": {
          const features = await getFeaturesForSketchBBoxes<LineString>(
            sketch,
            url,
          );
          const [metric] = await overlapLineLength(
            ds.datasourceId,
            features,
            sketch,
            {
              units: "miles",
            },
          );
          if (metric?.value >= replicateMap[dsId])
            replicateIds.push(sketch.properties.id);
          break;
        }
        // Polygon feature datasources
        case "eelgrass":
        case "estuaries": {
          const features = await getFeaturesForSketchBBoxes<
            Polygon | MultiPolygon
          >(sketch, url);
          const [metric] = await overlapPolygonArea(
            ds.datasourceId,
            features,
            sketch,
          );
          if (squareMeterToMile(metric?.value) >= replicateMap[dsId])
            replicateIds.push(sketch.properties.id);
          break;
        }
        // Categorical raster datasources
        case "substrate31":
        case "substrate32": {
          const raster = await loadCog(url);
          const category = dsId.slice(-2);
          const [metric] = await rasterMetrics(raster, {
            metricId: dsId,
            feature: sketch,
            categorical: true,
            categoryMetricValues: [category],
          });

          if (
            squareMeterToMile(metric?.value * 9.71 * 9.71) >= replicateMap[dsId]
          )
            replicateIds.push(sketch.properties.id);
          break;
        }
        case "substrate101":
        case "substrate102": {
          const raster = await loadCog(url);
          const category = dsId.slice(-3);
          const metrics = await rasterMetrics(raster, {
            metricId: dsId,
            feature: sketch,
            categorical: true,
            categoryMetricValues: [category, String(parseInt(category) + 100)],
          });

          if (metrics.length !== 2) throw new Error("Expected two metrics");

          if (
            squareMeterToMile(
              metrics.reduce((acc, val) => acc + val.value, 0) * 9.71 * 9.71,
            ) >= replicateMap[dsId]
          )
            replicateIds.push(sketch.properties.id);
          break;
        }

        // Soft Substrate 0-30m replicate, must cover 0-30m depth range and contain >1.1 miles
        // TO DO

        // Hard Substrate 0-30m replicate, must cover 0-30m depth range and contain >1.1 miles
        // TO DO

        // Soft Substrate 0-100m replicate, must contain >7 sq. miles total w/
        // >1.1 miles 0-30m and >5 sq. miles 30-100m
        // TO DO

        // Soft Substrate 0-3000m replicate, must contain >10 sq. miles total w/
        // >1.1 miles 0-30m, >5 sq. miles 30-100m, and >1 sq. miles >100m
        // TO DO

        default:
          throw new Error(`Unsupported datasource type: ${ds.datasourceId}`);
      }
    }),
  );

  return { id: extraParams.datasourceId, replicateIds: replicateIds.sort() };
}

// Check if sketch covers entire depth range 0-30m
async function depthCheck(sketch: Sketch<Polygon | MultiPolygon>) {
  const url = `${project.dataBucketUrl()}${getCogFilename(
    project.getInternalRasterDatasourceById("depth"),
  )}`;
  const raster = await loadCog(url);
  const stats = await bathyStats(sketch, raster);

  if (stats[0].min > -30 || stats[0].max < 0) return false;
  return true;
}

export default new GeoprocessingHandler(spacingWorker, {
  title: "spacingWorker",
  description: "",
  timeout: 500, // seconds
  memory: 2048, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
