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
  metricsWithSketchId,
  roundDecimal,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * RockIslands component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const RockIslands: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  const metricGroup = project.getMetricGroup("rockIslands", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Rock Islands");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("m²");
  const srLabel = t("Study Region");
  const brLabel = t("Bioregion");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="rockIslands"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        // Metrics
        // Overall metrics
        const overallMg = {
          ...metricGroup,
          classes: metricGroup.classes.filter(
            (c) => c.classId === "rock_islands"
          ),
        };
        const overallValueMetrics = metricsWithSketchId(
          data.metrics.filter(
            (m) =>
              m.metricId === metricGroup.metricId &&
              m.classId === "rock_islands"
          ),
          [data.sketch.properties.id]
        );
        const overallPercMetrics = toPercentMetric(
          overallValueMetrics,
          precalcMetrics.filter((m) => m.classId === "rock_islands"),
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const overallMetrics = [...overallValueMetrics, ...overallPercMetrics];

        // Study region metrics
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

        // Bioregion metrics
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
        const brMsg = objectiveMsgs["bioregion"](srIsMet, t);

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="RockIslands 1">
                This report summarizes this plan's overlap with rock islands in
                the study region.
              </Trans>
            </p>

            <ClassTable
              rows={overallMetrics}
              metricGroup={overallMg}
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
                        typeof val === "string" ? parseInt(val) : val
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

            <Collapse title={t("Show by Study Region")}>
              <p>
                <Trans i18nKey="Rock Islands Study Region">
                  The following is a breakdown of this plan's overlap with rock
                  islands by <i>study region</i>. The San Francisco Bay study
                  region is excluded due to not containing any rock islands per
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
                    columnLabel: srLabel,
                    type: "class",
                    width: 40,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: metricGroup.metricId,
                    valueFormatter: (val: string | number) =>
                      Number.format(
                        roundDecimal(
                          typeof val === "string" ? parseInt(val) : val
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

            <Collapse title={t("Show by Bioregion")}>
              <p>
                <Trans i18nKey="Rock Islands Bioregion">
                  The following is a breakdown of this plan's overlap with rock
                  islands by <i>bioregion</i>. The San Francisco Bay study
                  region is excluded due to not containing any rock islands per
                  the data provided.
                </Trans>
              </p>

              <ObjectiveStatus status={brIsMet} msg={brMsg} />

              <ClassTable
                rows={brMetrics}
                metricGroup={brMg}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: brLabel,
                    type: "class",
                    width: 40,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: metricGroup.metricId,
                    valueFormatter: (val: string | number) =>
                      Number.format(
                        roundDecimal(
                          typeof val === "string" ? parseInt(val) : val
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
              <Trans i18nKey="RockIslands - learn more">
                <p>ℹ️ Overview:</p>
                <p>🎯 Planning Objective:</p>
                <p>🗺️ Source Data:</p>
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
            "This plan meets the objective of rock island replication in all study regions."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not meet the objective of rock island replication in all study regions."
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
            "This plan meets the objective of rock island replication in all bioregions."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not meet the objective of rock island replication in all bioregions."
          )}
        </>
      );
    }
  },
};
