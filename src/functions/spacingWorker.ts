import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  overlapFeatures,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import { bbox } from "@turf/turf";
import project from "../../project/projectClient.js";
import {
  Feature,
  isRasterDatasource,
  isVectorDatasource,
  Metric,
  squareMeterToMile,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { fgbFetchAll, loadCog } from "@seasketch/geoprocessing/dataproviders";

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
  const ds = project.getDatasourceById(extraParams.datasourceId);
  const url = project.getDatasourceUrl(ds);
  const sketches = toSketchArray(sketch);

  const raster = isRasterDatasource(ds) ? await loadCog(url) : null;

  const metrics = (
    await Promise.all(
      sketches.map(async (sketch: Sketch<Polygon | MultiPolygon>) => {
        if (isVectorDatasource(ds)) {
          const features = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
            url,
            sketch.bbox || bbox(sketch),
          );
          return overlapFeatures(extraParams.datasourceId, features, sketch);
        } else if (isRasterDatasource(ds)) {
          return rasterMetrics(raster, {
            metricId: extraParams.datasourceId,
            feature: sketch,
            ...(ds.measurementType === "quantitative" && { stats: ["area"] }),
            ...(ds.measurementType === "categorical" && {
              categorical: true,
              categoryMetricValues: [extraParams.datasourceId],
            }),
          });
        } else
          throw new Error(
            `Unsupported datasource type: ${extraParams.datasourceId}`,
          );
      }),
    )
  ).reduce<Metric[]>((acc, val) => acc.concat(val), []);

  // Get sketchIds of replicates
  const sketchIds = sketches.map((sk) => sk.properties.id);
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
