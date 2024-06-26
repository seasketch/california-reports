import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  ObjectiveAnswer,
  ReportResult,
  createMetric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Kelp component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Kelp: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("kelp", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Kelp Forests (2016)");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="kelp"
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

        // Bioregion
        const brMg = {
          ...metricGroup,
          classes: metricGroup.classes.filter((c) =>
            c.classId?.endsWith("_br")
          ),
        };
        const brValueMetrics = metricsWithSketchId(
          data.metrics.filter(
            (m) =>
              m.metricId === metricGroup.metricId && m.classId?.endsWith("_br")
          ),
          [data.sketch.properties.id]
        );
        const brPercMetrics = toPercentMetric(
          brValueMetrics,
          precalcMetrics.filter((m) => m.classId?.endsWith("_br")),
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const brMetrics = [...brValueMetrics, ...brPercMetrics];
        const brIsMet = brValueMetrics.every((m) => m.value > 0)
          ? OBJECTIVE_YES
          : OBJECTIVE_NO;
        const brMsg = objectiveMsgs["bioregion"](brIsMet, t);

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
          metricId: "kelp",
          type: "areaOverlap",
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
              <Trans i18nKey="Kelp 1">
                This report summarizes this plan's overlap with kelp forests.
                Plans should consider protection of kelp forest habitat for
                conservation.
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

            <Collapse title={t("Show by Bioregion")}>
              <p>
                <Trans i18nKey="Kelp Bioregion">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>bioregion</i>.
                </Trans>
              </p>

              <ObjectiveStatus status={brIsMet} msg={brMsg} />

              <ClassTable
                rows={brMetrics}
                metricGroup={brMg}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Bioregion",
                    type: "class",
                    width: 30,
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
                    width: 40,
                  },
                ]}
              />
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genAreaSketchTable(data, precalcMetrics, metricGroup, t)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Kelp - learn more">
                <p>
                  ℹ️ Overview: Area of kelp forests protected by this plan is
                  shown. Kelp data has been downsampled to a 40m x 40m raster
                  grid for efficiency, so area calculations are estimates. Final
                  plans should check area totals in GIS tools before publishing
                  final area statistics.{" "}
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
