import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  ReportResult,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genSketchTable } from "../util/genSketchTable.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Substrate component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Substrate: React.FunctionComponent<GeogProp> = () => {
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
                m.geographyId === g.geographyId,
            ),
            [data.sketch.properties.id],
          );
          valueMetrics = valueMetrics.concat(vMetrics);

          const preMetrics = project.getPrecalcMetrics(
            metricGroup,
            "valid",
            g.geographyId,
          );
          precalcMetrics = precalcMetrics.concat(preMetrics);

          percMetrics = percMetrics.concat(
            toPercentMetric(vMetrics, preMetrics, {
              metricIdOverride: percMetricIdName,
            }),
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
                            ? parseInt(val) *
                                9.709749513740293381 *
                                9.709749513740293381
                            : val * 9.709749513740293381 * 9.709749513740293381,
                        ),
                        2,
                        { keepSmallValues: true },
                      ),
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
                  width: 9.709749513740293381,
                },
              ]}
            />

            <Collapse title={t("Show By Planning Region")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_sr") &&
                      m.classId === curClass.classId,
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_sr"),
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
                                ? parseInt(val) *
                                    9.709749513740293381 *
                                    9.709749513740293381
                                : val *
                                    9.709749513740293381 *
                                    9.709749513740293381,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
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
              ))}
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_br") &&
                      m.classId === curClass.classId,
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_br"),
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
                                ? parseInt(val) *
                                    9.709749513740293381 *
                                    9.709749513740293381
                                : val *
                                    9.709749513740293381 *
                                    9.709749513740293381,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
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
              ))}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world",
                    ),
                  },
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                  {
                    valueFormatter: (val) =>
                      val * 9.709749513740293381 * 9.709749513740293381,
                    replicate: true,
                  },
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Substrate - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total area of each
                  habitat class within the selected MPA(s). This value is
                  divided by the total area of each habitat class to obtain the
                  % contained within the selected MPA(s). If the selected area
                  includes multiple areas that overlap, the overlap is only
                  counted once.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
