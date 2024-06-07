import {
  Polygon,
  Sketch,
  MultiPolygon,
  SketchCollection,
  Feature,
  isVectorDatasource,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import {
  GeoprocessingHandler,
  Metric,
  MetricGroup,
  splitSketchAntimeridian,
  getFirstFromParam,
  overlapFeatures,
} from "@seasketch/geoprocessing";
import { clipToGeography } from "../util/clipToGeography.js";
import bbox from "@turf/bbox";

export async function bioregionsWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    metricGroup: MetricGroup;
    classId: string;
    geographyIds?: string[];
  }
) {
  const metricGroup = extraParams.metricGroup;
  const curClass = metricGroup.classes.find(
    (c) => c.classId === extraParams.classId
  );
  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  // Clip to portion of sketch within current geography
  const clippedSketch = await clipToGeography(splitSketch, curGeography);

  if (!curClass || !curClass.datasourceId)
    throw new Error(`Expected datasourceId for ${curClass}`);

  const ds = project.getDatasourceById(curClass.datasourceId);

  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Fetch features overlapping with sketch, pull from cache if already fetched
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);
  const features = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
    url,
    sketchBox
  );

  // If this is a sub-class, filter by class name
  const finalFeatures =
    curClass.classKey && curClass.classId !== `${ds.datasourceId}_all`
      ? features.filter((feat) => {
          return (
            feat.geometry &&
            feat.properties![ds.classKeys[0]] === curClass.classId
          );
        }, [])
      : features;

  // Calculate overlap metrics
  const overlapResult = await overlapFeatures(
    metricGroup.metricId,
    finalFeatures,
    clippedSketch
  );

  return overlapResult.map(
    (metric): Metric => ({
      ...metric,
      classId: curClass.classId,
      geographyId: curGeography.geographyId,
    })
  );
}

export default new GeoprocessingHandler(bioregionsWorker, {
  title: "bioregionsWorker",
  description: "",
  timeout: 900, // seconds
  memory: 1024, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
