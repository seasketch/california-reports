import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  overlapFeatures,
  rasterMetrics,
  getDatasourceFeatures,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  createMetric,
  isRasterDatasource,
  isVectorDatasource,
  Metric,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import { useSketchProperties } from "@seasketch/geoprocessing/client-ui";

const replicateTest: Record<
  string,
  { valueFormatter: (val: number) => number; replicateVal: number }
> = {
  kelpMax: {
    valueFormatter: (val: number) => squareMeterToMile(val),
    replicateVal: 1.1,
  },
  beaches: {
    valueFormatter: (val: number) => val / 1609,
    replicateVal: 1.1,
  },
  rocky_shores: {
    valueFormatter: (val: number) => val / 1609,
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
        const lop = sketch.properties.proposed_lop;
        if (isVectorDatasource(ds)) {
          if (!lop || !["A", "B", "C"].includes(lop[0]))
            return [
              createMetric({
                metricId: extraParams.datasourceId,
                sketchId: sketch.properties.id,
                value: 0,
              }),
            ];

          const features = await getDatasourceFeatures<Polygon | MultiPolygon>(
            ds,
            url,
            { sketch },
          );
          return overlapFeatures(extraParams.datasourceId, features, sketch);
        } else if (isRasterDatasource(ds)) {
          if (!lop || !["A", "B", "C"].includes(lop[0])) {
            if (ds.measurementType === "quantitative") {
              return createMetric({
                metricId: extraParams.datasourceId,
                sketchId: sketch.properties.id,
                value: 0,
              });
            } else
              return ["31", "32", "101", "102", "201", "202"].map((classId) =>
                createMetric({
                  metricId: extraParams.datasourceId,
                  sketchId: sketch.properties.id,
                  classId: classId,
                  value: 0,
                }),
              );
          }

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
