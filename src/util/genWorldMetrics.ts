import {
  createMetric,
  isSketchCollection,
  Metric,
  MetricGroup,
  Sketch,
  SketchCollection,
  toSketchArray,
} from "@seasketch/geoprocessing";

export function genWorldMetrics(
  sketch: Sketch | SketchCollection,
  metrics: Metric[],
  metricGroup: MetricGroup
) {
  const brMetrics = metrics.filter((m) => m.geographyId?.endsWith("_br"));
  const sketchIds = isSketchCollection(sketch)
    ? toSketchArray(sketch)
        .map((sk) => sk.properties.id)
        .concat([sketch.properties.id])
    : [sketch.properties.id];

  const worldMetrics: Metric[] = [];
  sketchIds.forEach((sketchId) => {
    metricGroup.classes.forEach((curClass) => {
      const metrics = brMetrics.filter(
        (m) => m.classId === curClass.classId && m.sketchId === sketchId
      );
      const sum = metrics.reduce((acc, cur) => acc + cur.value, 0);
      worldMetrics.push(
        createMetric({
          ...metrics[0],
          geographyId: "world",
          value: sum,
        })
      );
    });
  });

  return worldMetrics;
}
