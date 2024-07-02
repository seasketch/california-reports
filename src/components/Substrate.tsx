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
  Metric,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  ObjectiveAnswer,
  ReportResult,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Substrate component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Substrate: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("substrate", t);

  // Labels
  const titleLabel = t("Substrate");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="substrate">
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        let valueMetrics: Metric[] = [];
        let precalcMetrics: Metric[] = [];
        let percMetrics: Metric[] = [];

        geographies.forEach((g) => {
          const vMetrics = metricsWithSketchId(
            data.metrics.filter(
              (m) =>
                m.metricId === metricGroup.metricId &&
                m.geographyId === g.geographyId
            ),
            [data.sketch.properties.id]
          );
          valueMetrics = valueMetrics.concat(vMetrics);

          const preMetrics = project.getPrecalcMetrics(
            metricGroup,
            "valid",
            g.geographyId
          );
          precalcMetrics = precalcMetrics.concat(preMetrics);

          percMetrics = percMetrics.concat(
            toPercentMetric(vMetrics, preMetrics, {
              metricIdOverride: percMetricIdName,
            })
          );
        });

        const metrics = [...valueMetrics, ...percMetrics];

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Substrate 1">
                This report summarizes this plan's overlap with substrate within
                California's territorial sea.
              </Trans>
            </p>

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              objective={objectives}
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
                          typeof val === "string"
                            ? parseInt(val) * 30 * 30
                            : val * 30 * 30
                        ),
                        2,
                        { keepSmallValues: true }
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
                {
                  columnLabel: mapLabel,
                  type: "layerToggle",
                  width: 10,
                },
              ]}
            />

<Collapse title={t("Show By Study Region")}>
              {metricGroup.classes.map((curClass) => (
                <React.Fragment key={curClass.classId}>
                  {metrics
                    .filter(
                      (m) =>
                        m.geographyId?.endsWith("_sr") &&
                        m.classId === curClass.classId
                    )
                    .every((m) => m.value > 0) ? (
                    <ObjectiveStatus
                      status={OBJECTIVE_YES}
                      msg={objectiveMsgs["studyRegion"](
                        OBJECTIVE_YES,
                        curClass.display,
                        t
                      )}
                    />
                  ) : (
                    <ObjectiveStatus
                      status={OBJECTIVE_NO}
                      msg={objectiveMsgs["studyRegion"](
                        OBJECTIVE_NO,
                        curClass.display,
                        t
                      )}
                    />
                  )}

                  <GeographyTable
                    key={curClass.classId}
                    rows={metrics.filter(
                      (m) =>
                        m.geographyId?.endsWith("_sr") &&
                        m.classId === curClass.classId
                    )}
                    metricGroup={metricGroup}
                    geographies={geographies.filter((g) =>
                      g.geographyId.endsWith("_sr")
                    )}
                    objective={objectives}
                    columnConfig={[
                      {
                        columnLabel: t(curClass.display),
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
                                typeof val === "string"
                                  ? parseInt(val) * 30 * 30
                                  : val * 30 * 30
                              ),
                              2,
                              { keepSmallValues: true }
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
                </React.Fragment>
              ))}
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
                <React.Fragment key={curClass.classId}>
                  {metrics
                    .filter(
                      (m) =>
                        m.geographyId?.endsWith("_br") &&
                        m.classId === curClass.classId
                    )
                    .every((m) => m.value > 0) ? (
                    <ObjectiveStatus
                      status={OBJECTIVE_YES}
                      msg={objectiveMsgs["bioregion"](
                        OBJECTIVE_YES,
                        curClass.display,
                        t
                      )}
                    />
                  ) : (
                    <ObjectiveStatus
                      status={OBJECTIVE_NO}
                      msg={objectiveMsgs["bioregion"](
                        OBJECTIVE_NO,
                        curClass.display,
                        t
                      )}
                    />
                  )}

                  <GeographyTable
                    key={curClass.classId}
                    rows={metrics.filter(
                      (m) =>
                        m.geographyId?.endsWith("_br") &&
                        m.classId === curClass.classId
                    )}
                    metricGroup={metricGroup}
                    geographies={geographies.filter((g) =>
                      g.geographyId.endsWith("_br")
                    )}
                    objective={objectives}
                    columnConfig={[
                      {
                        columnLabel: t(curClass.display),
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
                                typeof val === "string"
                                  ? parseInt(val) * 30 * 30
                                  : val * 30 * 30
                              ),
                              2,
                              { keepSmallValues: true }
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
                </React.Fragment>
              ))}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genAreaSketchTable(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world"
                    ),
                  },
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                  (val) => val * 30 * 30
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Substrate - learn more">
                <p>
                  ℹ️ Overview: California's waters were modelled into two
                  substrate classes: soft and hard. Substrate data has been
                  downsampled to a 30m x 30m raster grid for efficiency,
                  therefore area calculations are estimates. Final plans should
                  check area totals in GIS tools before publishing final area
                  statistics.
                </p>
                <p>🎯 Planning Objective: N/A</p>
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
  studyRegion: (
    objectiveMet: ObjectiveAnswer,
    classDisplay: string,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            `This plan contains ${classDisplay.toLowerCase()} in all study regions and may achieve habitat replication.`
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            `This plan does not contain ${classDisplay.toLowerCase()} in all study regions and does not achieve habitat replication.`
          )}
        </>
      );
    }
  },
  bioregion: (objectiveMet: ObjectiveAnswer, classDisplay: string, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            `This plan contains ${classDisplay.toLowerCase()} in all bioregions and may achieve habitat replication.`
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            `This plan does not contain ${classDisplay.toLowerCase()} in all bioregions and does not achieve habitat replication.`
          )}
        </>
      );
    }
  },
};
