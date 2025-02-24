import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  rasterMetrics,
  getDatasourceFeatures,
  overlapPolygonArea,
  getCogFilename,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  isRasterDatasource,
  isVectorDatasource,
  LineString,
  Metric,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import { overlapLineLength } from "../util/overlapLineLength.js";
import { bathyStats } from "./bathymetry.js";

const replicateTest: Record<
  string,
  { valueFormatter: (val: number) => number; replicateVal: number }
> = {
  kelp: {
    valueFormatter: (val: number) => val,
    replicateVal: 1.1,
  },
  beaches: {
    valueFormatter: (val: number) => val,
    replicateVal: 1.1,
  },
  rocks: {
    valueFormatter: (val: number) => val,
    replicateVal: 0.55,
  },
  eelgrass: {
    valueFormatter: (val: number) => squareMeterToMile(val),
    replicateVal: 0.04,
  },
  estuaries: {
    valueFormatter: (val: number) => squareMeterToMile(val),
    replicateVal: 0.12,
  },
  substrate31: {
    valueFormatter: (val: number) =>
      squareMeterToMile(val * 9.710648864705849093 * 9.710648864705849093),
    replicateVal: 0.13,
  },
  substrate101: {
    valueFormatter: (val: number) =>
      squareMeterToMile(val * 9.710648864705849093 * 9.710648864705849093),
    replicateVal: 0.13,
  },
  substrate32: {
    valueFormatter: (val: number) =>
      squareMeterToMile(val * 9.710648864705849093 * 9.710648864705849093),
    replicateVal: 7,
  },
  substrate102: {
    valueFormatter: (val: number) =>
      squareMeterToMile(val * 9.710648864705849093 * 9.710648864705849093),
    replicateVal: 17,
  },
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
  const ds = extraParams.datasourceId.startsWith("substrate")
    ? project.getDatasourceById("substrate_depth")
    : project.getDatasourceById(extraParams.datasourceId);
  const url = project.getDatasourceUrl(ds);
  const sketches = toSketchArray(sketch);
  const sketchIds = sketches.map((sk) => sk.properties.id);

  const raster = isRasterDatasource(ds) ? await loadCog(url) : null;

  const metrics = (
    await Promise.all(
      sketches.map(async (sketch: Sketch<Polygon | MultiPolygon>) => {
        if (extraParams.datasourceId === "kelp") {
          const url = `${project.dataBucketUrl()}${getCogFilename(
            project.getInternalRasterDatasourceById("depth"),
          )}`;
          const raster = await loadCog(url);
          const stats = await bathyStats(sketch, raster);

          if (stats[0].min > -30 || stats[0].max < 0) {
            console.log("stats[0].min > -30 || stats[0].max < 0");
            return [
              {
                metricId: extraParams.datasourceId,
                value: 0,
                sketchId: sketch.properties.id,
                extra: {
                  sketchName: sketch.properties.name,
                },
              },
            ];
          }
        }

        if (isVectorDatasource(ds)) {
          // Overlap lines
          if (
            extraParams.datasourceId === "beaches" ||
            extraParams.datasourceId === "rocks" ||
            extraParams.datasourceId === "kelp"
          ) {
            const features = await getDatasourceFeatures<LineString>(ds, url, {
              sketch,
            });
            return overlapLineLength(
              extraParams.datasourceId,
              features,
              sketch,
              {
                units: "miles",
              },
            );
          }

          // Overlap polygons
          const features = await getDatasourceFeatures<Polygon | MultiPolygon>(
            ds,
            url,
            { sketch },
          );

          return overlapPolygonArea(extraParams.datasourceId, features, sketch);
        } else if (isRasterDatasource(ds)) {
          return rasterMetrics(raster, {
            metricId: extraParams.datasourceId,
            feature: sketch,
            ...(ds.measurementType === "quantitative" && { stats: ["area"] }),
            ...(ds.measurementType === "categorical" && {
              categorical: true,
              categoryMetricValues: ["31", "32", "101", "102", "201", "202"],
            }),
          });
        } else
          throw new Error(
            `Unsupported datasource type: ${extraParams.datasourceId}`,
          );
      }),
    )
  ).reduce<Metric[]>((acc, val) => acc.concat(val), []);

  // Substrate handled differently
  if (extraParams.datasourceId.startsWith("substrate")) {
    const sketchMetrics = metrics.filter(
      (m) => m.sketchId && sketchIds.includes(m.sketchId),
    );
    const sketchClassMetrics =
      extraParams.datasourceId === "substrate31"
        ? sketchMetrics.filter((m) => m.classId === "31")
        : extraParams.datasourceId === "substrate32"
          ? sketchMetrics.filter((m) => m.classId === "32")
          : extraParams.datasourceId === "substrate101"
            ? sketchMetrics.filter(
                (m) => m.classId === "101" || m.classId === "201",
              )
            : extraParams.datasourceId === "substrate102"
              ? sketchMetrics.filter(
                  (m) => m.classId === "102" || m.classId === "202",
                )
              : [];

    if (sketchClassMetrics.length === 0) throw new Error("No metrics found");

    const replicateMetrics =
      extraParams.datasourceId === "substrate31" ||
      extraParams.datasourceId === "substrate32"
        ? sketchClassMetrics.filter(
            (m) =>
              replicateTest[extraParams.datasourceId].valueFormatter(m.value) >
              replicateTest[extraParams.datasourceId].replicateVal,
          )
        : // For substrate101 and substrate102, sum the two classes
          sketchClassMetrics.filter((m) => {
            const value = replicateTest[
              extraParams.datasourceId
            ].valueFormatter(
              sketchClassMetrics
                .filter((skm) => skm.sketchId === m.sketchId)
                .reduce((acc, val) => acc + val.value, 0),
            );

            return value > replicateTest[extraParams.datasourceId].replicateVal;
          });

    const replicateSketches = sketches.filter((sk) =>
      replicateMetrics.some((m) => m.sketchId === sk.properties.id),
    ) as Sketch<Polygon>[];
    const replicateIds = replicateSketches.map((sk) => sk.properties.id);
    return { id: extraParams.datasourceId, replicateIds };
  }

  // Get sketchIds of replicates
  const sketchMetrics = metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId),
  );
  const replicateMetrics = sketchMetrics.filter(
    (m) =>
      replicateTest[extraParams.datasourceId].valueFormatter(m.value) >
      replicateTest[extraParams.datasourceId].replicateVal,
  );
  const replicateSketches = sketches.filter((sk) =>
    replicateMetrics.some((m) => m.sketchId === sk.properties.id),
  ) as Sketch<Polygon>[];
  const replicateIds = replicateSketches.map((sk) => sk.properties.id);

  return { id: extraParams.datasourceId, replicateIds };
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
