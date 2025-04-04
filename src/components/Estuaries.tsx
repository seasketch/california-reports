import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  DataDownload,
  ReportError,
  ResultsCard,
  ToolbarCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  Metric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genSketchTable } from "../util/genSketchTable.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Reports on estuary overlap
export const Estuaries: React.FunctionComponent<{ printing: boolean }> = (
  props,
) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("estuaries", t);
  const precalcMetrics = geographies
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId),
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

  // Labels
  const titleLabel = t("Estuaries");
  const mapLabel = t("Map");
  const withinLabel = t("Area Within MPA(s)");
  const percWithinLabel = t("% Total Estuary Area");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="estuaries" useChildCard>
      {(metricsResult: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          metricsResult.filter((m) => m.metricId === metricGroup.metricId),
          [id],
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
          idProperty: "geographyId",
        });
        const metrics = [...valueMetrics, ...percentMetrics];

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              <ToolbarCard
                title={titleLabel}
                items={
                  <DataDownload
                    filename={titleLabel}
                    data={metricsResult}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                }
              >
                <Trans i18nKey="Estuaries 1">
                  <p>
                    Estuaries and coastal marsh habitats act as connections
                    between the open coast and nearshore watersheds. This report
                    summarizes the overlap of the selected MPA(s) with
                    estuaries.
                  </p>
                  <p>
                    The minimum area of estuarine habitat within an MPA
                    necessary to encompass 90% of local biodiversity and count
                    as a replicate is 0.12 square miles, as determined from
                    biological surveys.
                  </p>
                </Trans>

                <ClassTable
                  rows={metrics.filter((m) => m.geographyId === "world")}
                  metricGroup={metricGroup}
                  objective={objectives}
                  columnConfig={[
                    {
                      columnLabel: " ",
                      type: "class",
                      width: 20,
                    },
                    {
                      columnLabel: withinLabel,
                      type: "metricValue",
                      metricId: metricGroup.metricId,
                      valueFormatter: (val: string | number) =>
                        Number.format(
                          roundDecimal(
                            squareMeterToMile(
                              typeof val === "string" ? parseInt(val) : val,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
                        ),
                      valueLabel: unitsLabel,
                      colStyle: { textAlign: "center" },
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
                    {
                      columnLabel: mapLabel,
                      type: "layerToggle",
                      width: 10,
                    },
                  ]}
                />

                <Collapse
                  title={t("Show By Planning Region")}
                  key={props.printing + "Estuaries Planning Region"}
                  collapsed={!props.printing}
                >
                  <GeographyTable
                    rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                    metricGroup={metricGroup}
                    geographies={geographies.filter((g) =>
                      g.geographyId?.endsWith("_sr"),
                    )}
                    objective={objectives}
                    columnConfig={[
                      {
                        columnLabel: titleLabel,
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
                                typeof val === "string" ? parseInt(val) : val,
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
                        columnLabel: t("% Planning Region Estuaries"),
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
                </Collapse>

                <Collapse
                  title={t("Show By Bioregion")}
                  key={props.printing + "Estuaries Bioregion"}
                  collapsed={!props.printing}
                >
                  <GeographyTable
                    rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                    metricGroup={metricGroup}
                    geographies={geographies.filter((g) =>
                      g.geographyId?.endsWith("_br"),
                    )}
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
                                typeof val === "string" ? parseInt(val) : val,
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
                        columnLabel: t("% Bioregion Estuaries"),
                        type: "metricChart",
                        metricId: percMetricIdName,
                        valueFormatter: "percent",
                        chartOptions: {
                          showTitle: true,
                        },
                        width: 35,
                      },
                    ]}
                  />
                </Collapse>

                {isCollection && (
                  <Collapse
                    title={t("Show by MPA")}
                    key={props.printing + "Estuaries MPA"}
                    collapsed={!props.printing}
                  >
                    {genSketchTable(
                      childProperties || [],
                      metricsResult.filter((m) => m.geographyId === "world"),
                      precalcMetrics.filter((m) => m.geographyId === "world"),
                      metricGroup,
                      t,
                      { printing: props.printing },
                    )}
                  </Collapse>
                )}

                <Collapse
                  title={t("Learn More")}
                  key={props.printing + "Estuaries Learn More"}
                  collapsed={!props.printing}
                >
                  <Trans i18nKey="Estuaries - learn more">
                    <p>
                      🗺️ Source Data: Pacific Marine and Estuarine Fish Habitat
                      Partnership
                    </p>
                    <p>
                      📈 Report: This report calculates the total area of
                      estuaries within the selected MPA(s). This value is
                      divided by the total area of estuaries to obtain the %
                      contained within the selected MPA(s). If the selected area
                      includes multiple areas that overlap, the overlap is only
                      counted once.
                    </p>
                  </Trans>
                  <p>{t("Last updated")}: January 24, 2025.</p>
                </Collapse>
              </ToolbarCard>
            </ReportError>
          </div>
        );
      }}
    </ResultsCard>
  );
};
