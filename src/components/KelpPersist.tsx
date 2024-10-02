import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  LayerToggle,
  ReportError,
  ResultsCard,
  VerticalSpacer,
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
 * KelpPersist component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const KelpPersist: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("kelpPersist", t);

  // Labels
  const titleLabel = t("Kelp (Persistence)");
  const withinLabel = t("Area Within MPA(s)");
  const percWithinLabel = t("% Total Kelp Area");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="kelpPersist">
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
              <Trans i18nKey="KelpPersist 1">
                Potential kelp forest is a key habitat. This report summarizes
                the overlap of the selected MPA(s) with the number of years of
                kelp canopy coverage between 2002-2016.
              </Trans>
            </p>

            <LayerToggle
              label={t("Show Kelp Layer On Map")}
              layerId={metricGroup.classes[0].layerId}
            />
            <VerticalSpacer />

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: t("Kelp Persistence"),
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
                                23.21062239466359856 *
                                23.21062239466359856
                            : val * 23.21062239466359856 * 23.21062239466359856,
                        ),
                        2,
                        { keepSmallValues: true },
                      ),
                    ),
                  colStyle: { textAlign: "center" },
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 30,
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
                      columnLabel: t("Kelp (" + curClass.display + ")"),
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
                            squareMeterToMile(
                              typeof val === "string"
                                ? parseInt(val) *
                                    23.21062239466359856 *
                                    23.21062239466359856
                                : val *
                                    23.21062239466359856 *
                                    23.21062239466359856,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
                        ),
                      colStyle: { textAlign: "center" },
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
                      width: 30,
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
                      columnLabel: t("Kelp (" + curClass.display + ")"),
                      type: "class",
                      width: 25,
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
                                    23.21062239466359856 *
                                    23.21062239466359856
                                : val *
                                    23.21062239466359856 *
                                    23.21062239466359856,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
                        ),
                      colStyle: { textAlign: "center" },
                      valueLabel: unitsLabel,
                      chartOptions: {
                        showTitle: true,
                      },
                      width: 30,
                    },
                    {
                      columnLabel: percWithinLabel,
                      type: "metricChart",
                      metricId: percMetricIdName,
                      valueFormatter: "percent",
                      chartOptions: {
                        showTitle: true,
                      },
                      width: 30,
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
                      val * 23.21062239466359856 * 23.21062239466359856,
                  },
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="KelpPersist - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total value of kelp
                  canopy coverage and number of years present within the
                  selected MPA(s). This value is divided by the total value of
                  kelp canopy coverage to obtain the % contained within the
                  selected MPA(s). If the selected area includes multiple areas
                  that overlap, the overlap is only counted once. Kelp data has
                  been downsampled to a 30 m x 30 m raster grid for efficiency,
                  so area calculations are estimates. Final statistics should be
                  calculated in desktop GIS tools.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
