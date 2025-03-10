import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ReportError,
  ResultsCard,
  useSketchProperties,
  VerticalSpacer,
  LayerToggle,
  ToolbarCard,
  DataDownload,
} from "@seasketch/geoprocessing/client-ui";
import {
  Metric,
  metricsWithSketchId,
  roundDecimal,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import precalc from "../../data/precalc/precalcSubstrate.json" with { type: "json" };
import { GeographyTable } from "../util/GeographyTable.js";
import { genLengthSketchTable } from "./Shoretypes.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Reports on HabitatNearshore overlap
export const HabitatNearshore: React.FunctionComponent = () => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("substrate_nearshore", t);

  // Labels
  const titleLabel = t("Nearshore Predicted Substrate");
  const withinLabel = t("Length Within MPA(s)");
  const percWithinLabel = t("% Total Length");
  const unitsLabel = t("mi");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="habitatNearshore"
      useChildCard
    >
      {(metricResults: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          metricResults.filter((m) => m.metricId === metricGroup.metricId),
          [id],
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalc, {
          metricIdOverride: percMetricIdName,
          idProperty: "geographyId",
        });
        const metrics = [...valueMetrics, ...percentMetrics];

        return (
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
              <Trans i18nKey="HabitatNearshore 1">
                <p>
                  Hard and soft bottom areas at a range of depths provide
                  habitat for many species of commercial and recreational
                  importance. This report summarizes the overlap of the selected
                  MPA(s) with nearshore (0-30m) hard and soft substrate linear
                  extents.
                </p>
                <p>
                  The minimum extent necessary to encompass 90% of local
                  biodiversity in nearshore substrate is 1.1 linear miles, as
                  determined from biological surveys.
                </p>
              </Trans>

              <LayerToggle
                label={t("Show Nearshore Habitat Layer On Map")}
                layerId={metricGroup.layerId}
              />
              <VerticalSpacer />

              <ClassTable
                rows={metrics.filter((m) => m.geographyId === "world")}
                metricGroup={metricGroup}
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
                          typeof val === "string" ? parseInt(val) : val,
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
                      g.geographyId?.endsWith("_sr"),
                    )}
                    columnConfig={[
                      {
                        columnLabel: t(curClass.display),
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
                              typeof val === "string" ? parseInt(val) : val,
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
                      g.geographyId?.endsWith("_br"),
                    )}
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
                              typeof val === "string" ? parseInt(val) : val,
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
                        width: 35,
                      },
                    ]}
                  />
                ))}
              </Collapse>

              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genLengthSketchTable(
                    childProperties || [],
                    metricResults.filter((m) => m.geographyId === "world"),
                    precalc.filter((m) => m.geographyId === "world"),
                    metricGroup,
                    t,
                  )}
                </Collapse>
              )}

              <Collapse title={t("Learn More")}>
                <Trans i18nKey="Habitat Nearshore - learn more">
                  <p>🗺️ Source Data: CDFW, NOAA</p>
                  <p>
                    📈 Report: This report calculates the total length of
                    maximum linear nearshore substrate within the selected
                    MPA(s). This value is divided by the total length of linear
                    substrate to obtain the % contained within the selected
                    MPA(s). If the selected MPA(s) includes multiple areas that
                    overlap, the overlap is only counted once. Final plans
                    should check area totals in GIS tools before publishing
                    final area statistics.
                  </p>
                </Trans>
                <p>{t("Last updated")}: March 7, 2025.</p>
              </Collapse>
            </ToolbarCard>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
