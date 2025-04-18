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

// Reports on eelgrass overlap
export const Eelgrass: React.FunctionComponent<{ printing: boolean }> = (
  props,
) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("eelgrass", t);
  const precalcMetrics = geographies
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId),
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

  // Labels
  const titleLabel = t("Eelgrass");
  const mapLabel = t("Map");
  const withinLabel = t("Area Within MPA(s)");
  const percWithinLabel = t("% Total Eelgrass Area");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="eelgrass" useChildCard>
      {(metricResults: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          metricResults.filter((m) => m.metricId === metricGroup.metricId),
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
                    data={metricResults}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                }
              >
                <Trans i18nKey="Eelgrass 1">
                  <p>
                    Eelgrass helps prevent erosion and maintain stability near
                    shore by anchoring sediment with its spreading rhizomes and
                    slowing water flow. Eelgrass beds also provide foraging,
                    breeding, and nursery areas for many species of
                    invertebrates, fish, and birds. This report summarizes the
                    overlap of the selected MPA(s) with eelgrass extent.
                  </p>
                  <p>
                    The minimum area of eelgrass within an MPA necessary to
                    encompass 90% of local biodiversity and count as a replicate
                    is 0.04 square miles, as determined from biological surveys.
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
                      chartOptions: {
                        showTitle: true,
                      },
                      colStyle: { textAlign: "center" },
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
                  key={props.printing + "Eelgrass Planning Region"}
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
                        columnLabel: t("% Planning Region") + " " + titleLabel,
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
                  key={props.printing + "Eelgrass Bioregion"}
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
                        columnLabel: t("Eelgrass"),
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
                        columnLabel: t("% Bioregion") + " " + titleLabel,
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
                  <Collapse
                    title={t("Show by MPA")}
                    key={props.printing + "Eelgrass MPA"}
                    collapsed={!props.printing}
                  >
                    {genSketchTable(
                      childProperties || [],
                      metricResults.filter((m) => m.geographyId === "world"),
                      precalcMetrics.filter((m) => m.geographyId === "world"),
                      metricGroup,
                      t,
                      { printing: props.printing },
                    )}
                  </Collapse>
                )}

                <Collapse
                  title={t("Learn More")}
                  key={props.printing + "Eelgrass Learn More"}
                  collapsed={!props.printing}
                >
                  <Trans i18nKey="eelgrass - learn more">
                    <p>🗺️ Source Data: CDFW</p>
                    <p>
                      📈 Report: This report calculates the total area of
                      eelgrass within the selected MPA(s). This value is divided
                      by the total area of eelgrass to obtain the % contained
                      within the selected MPA(s). If the selected area includes
                      multiple areas that overlap, the overlap is only counted
                      once. Eelgrass data has been simplified to a tolerance of
                      5 meters.
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
