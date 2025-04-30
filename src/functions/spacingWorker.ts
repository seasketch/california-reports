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
import { buffer } from "@turf/turf";

const replicateMap = {
  kelp: 1.1,
  beaches: 1.1,
  rocks: 0.55,
  eelgrass: 0.04,
  estuaries: 0.12,
  linearSubstrate_hard: 1.1,
  linearSubstrate_soft: 1.1,
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
    : dsId.startsWith("linearSubstrate")
      ? project.getDatasourceById("substrate_nearshore")
      : project.getDatasourceById(dsId);
  const url = project.getDatasourceUrl(ds);
  const sketches = toSketchArray(sketch);

  const replicateIds: string[] = [];

  await Promise.all(
    sketches.map(async (sketch: Sketch<Polygon | MultiPolygon>) => {
      // Check depth for kelp and hard/soft substrate 0-30m
      if (
        ["kelp", "linearSubstrate_hard", "linearSubstrate_soft"].includes(
          dsId,
        ) &&
        !(await depthCheck(sketch))
      )
        return;

      switch (dsId) {
        // Line feature datasources
        case "kelp":
        case "beaches":
        case "rocks":
        case "linearSubstrate_hard":
        case "linearSubstrate_soft": {
          const finalSketch =
            dsId === "beaches" || dsId === "rocks"
              ? (buffer(sketch, 250, { units: "meters" })! as Sketch<
                  Polygon | MultiPolygon
                >)
              : sketch;

          const features = await getFeaturesForSketchBBoxes<LineString>(
            finalSketch,
            url,
          );

          const finalFeatures = features.filter((feat) => {
            if (!feat.geometry) return false;
            if (dsId === "linearSubstrate_hard") {
              return feat.properties!["Sub_depth"] === "Hard 0 - 30m";
            }
            if (dsId === "linearSubstrate_soft") {
              return feat.properties!["Sub_depth"] === "Soft 0 - 30m";
            }
            return true;
          });

          const [metric] = await overlapLineLength(
            dsId,
            finalFeatures,
            finalSketch,
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
