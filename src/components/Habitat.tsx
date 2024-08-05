import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  LayerToggle,
  ReportError,
  ResultsCard,
  useSketchProperties,
  VerticalSpacer,
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
 * Habitat component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Habitat: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("habitat", t);

  // Labels
  const titleLabel = t("Habitat");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="habitat">
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
              <Trans i18nKey="Habitat 1">
                This report summarizes this plan's overlap with substrate within
                California's territorial sea.
              </Trans>
            </p>

            <LayerToggle
              label={t("Show Seafloor Habitat On Map")}
              layerId={metricGroup.layerId}
            />
            <VerticalSpacer />

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: titleLabel,
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
                                29.12261316336177686 *
                                29.12261316336177686
                            : val * 29.12261316336177686 * 29.12261316336177686
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

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
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
                                ? parseInt(val) *
                                    29.12261316336177686 *
                                    29.12261316336177686
                                : val *
                                    29.12261316336177686 *
                                    29.12261316336177686
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
              ))}
            </Collapse>

            <Collapse title={t("Show By Planning Region")}>
              {metricGroup.classes.map((curClass) => (
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
                                ? parseInt(val) *
                                    29.12261316336177686 *
                                    29.12261316336177686
                                : val *
                                    29.12261316336177686 *
                                    29.12261316336177686
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
              ))}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world"
                    ),
                  },
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                  {
                    valueFormatter: (val) =>
                      val * 29.12261316336177686 * 29.12261316336177686,
                    replicate: true,
                    replicateMap: {
                      "0": 1.1,
                      "-1": 1.1,
                      "-30": 7,
                      "-31": 0.13,
                      "-100": 17,
                      "-101": 0.13,
                      "-200": 17,
                      "-201": 0.13,
                    },
                  }
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Habitat - learn more">
                <p>
                  ℹ️ Overview: Seafloor habitat protected by this plan is shown
                  and includes interpolated predicted substrate. Habitat data
                  has been downsampled to a 30m x 30m raster grid for
                  efficiency, therefore area calculations are estimates. Final
                  plans should check area totals in GIS tools before publishing
                  final area statistics.
                </p>
                <p>
                  Habitat replication guidelines come from the SAT 2011 MLPA
                  Guidelines. Rock guidelines are listed under 'rocky reef' and
                  sediment listed under 'soft bottom'. Rock 0-30m: 1.1 square
                  miles, 30-100: 0.13 square miles, above 100m: 0.13 square
                  miles. Sediment 0-30m: 1.1 square miles, 30-100m: 7 square
                  miles, above 100m: 17 square miles.
                </p>
                <p>
                  🎯 Planning Objective: Habitat replication for each substrate
                  type and depth level.
                </p>
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
