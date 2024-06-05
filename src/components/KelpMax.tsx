import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  SketchClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  ObjectiveAnswer,
  ReportResult,
  createMetric,
  flattenBySketchAllClass,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * KelpMax component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const KelpMax: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("kelpMax", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("KelpMax");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="kelpMax"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        // Study region
        const srMg = {
          ...metricGroup,
          classes: metricGroup.classes.filter((c) =>
            c.classId?.endsWith("_sr")
          ),
        };
        const srValueMetrics = metricsWithSketchId(
          data.metrics.filter(
            (m) =>
              m.metricId === metricGroup.metricId && m.classId?.endsWith("_sr")
          ),
          [data.sketch.properties.id]
        );
        const srPercMetrics = toPercentMetric(
          srValueMetrics,
          precalcMetrics.filter((m) => m.classId?.endsWith("_sr")),
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const srMetrics = [...srValueMetrics, ...srPercMetrics];
        const srIsMet = srValueMetrics.every((m) => m.value > 0)
          ? OBJECTIVE_YES
          : OBJECTIVE_NO;
        const srMsg = objectiveMsgs["studyRegion"](srIsMet, t);

        // Overall / total metrics
        const overallValue = createMetric({
          ...srValueMetrics[0],
          classId: "overall",
          value: srValueMetrics.reduce((acc, m) => acc + m.value, 0),
        });
        const overallPrecalc = createMetric({
          classId: "overall",
          value: precalcMetrics.reduce((acc, m) => acc + m.value, 0),
        });
        const overallPerc = toPercentMetric([overallValue], [overallPrecalc], {
          metricIdOverride: percMetricIdName,
        });
        const overallMetrics = [overallValue, ...overallPerc];
        const overallMG = {
          ...metricGroup,
          classes: [
            {
              classId: "overall",
              display: "Kelp Forest",
              layerId: "",
            },
          ],
        };

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="KelpMax 1">
                This report summarizes this plan's overlap with the maximum kelp
                distribution over the years 2002-2016.
              </Trans>
            </p>

            <ClassTable
              rows={overallMetrics}
              metricGroup={overallMG}
              columnConfig={[
                {
                  columnLabel: " ",
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: metricGroup.metricId,
                  valueFormatter: (val: string | number) =>
                    Number.format(
                      roundDecimal(
                        squareMeterToMile(
                          typeof val === "string" ? parseInt(val) : val
                        )
                      )
                    ),
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 20,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 40,
                },
              ]}
            />

            <Collapse title={t("Show by Study Region")}>
              <p>
                <Trans i18nKey="Kelp Study Region">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>study region</i>. The San Francisco Bay study
                  region is excluded due to not containing any kelp forests per
                  the data provided.
                </Trans>
              </p>

              <ObjectiveStatus status={srIsMet} msg={srMsg} />

              <ClassTable
                rows={srMetrics}
                metricGroup={srMg}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Study Region",
                    type: "class",
                    width: 35,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: srMg.metricId,
                    valueFormatter: (val: string | number) =>
                      Number.format(
                        roundDecimal(
                          squareMeterToMile(
                            typeof val === "string" ? parseInt(val) : val
                          )
                        )
                      ),
                    valueLabel: unitsLabel,
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 20,
                  },
                  {
                    columnLabel: percWithinLabel,
                    type: "metricChart",
                    metricId: percMetricIdName,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 35,
                  },
                  {
                    columnLabel: mapLabel,
                    type: "layerToggle",
                    width: 10,
                  },
                ]}
              />
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(data, metricGroup, precalcMetrics)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="KelpMax - learn more">
                <p>
                  ℹ️ Overview: The maximum area of kelp across the years
                  2002-2016 is used in this report. The area and % area of kelp
                  protected by this plan is shown. Kelp data has been
                  downsampled to a 40m x 40m raster grid for efficiency, so area
                  calculations are estimates. Final plans should check area
                  totals in GIS tools before publishing final area statistics.
                </p>
                <p>🎯 Planning Objective: None</p>
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total value of each
                  feature within the plan. This value is divided by the total
                  value of each feature to obtain the % contained within the
                  plan. If the plan includes multiple areas that overlap, the
                  overlap is only counted once.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSketchTable = (
  data: ReportResult,
  metricGroup: MetricGroup,
  precalcMetrics: Metric[]
) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};

const objectiveMsgs: Record<string, any> = {
  studyRegion: (objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            "This plan meets the objective of kelp habitat replication in all study regions."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not meet the objective of kelp habitat replication in all study regions."
          )}
        </>
      );
    }
  },
  bioregion: (objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            "This plan meets the objective of kelp habitat replication in all bioregions."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not meet the objective of kelp habitat replication in all bioregions."
          )}
        </>
      );
    }
  },
};
