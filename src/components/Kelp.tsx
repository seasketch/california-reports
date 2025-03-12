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
import precalc from "../../data/precalc/precalcKelp.json" with { type: "json" };
import { GeographyTable } from "../util/GeographyTable.js";
import { genLengthSketchTable } from "./Shoretypes.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Reports on kelp overlap
export const Kelp: React.FunctionComponent = () => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("kelp", t);

  // Labels
  const titleLabel = t("Kelp");
  const withinLabel = t("Length Within MPA(s)");
  const percWithinLabel = t("% Total Kelp Length");
  const unitsLabel = t("mi");

  return (
    <ResultsCard title={titleLabel} functionName="kelp" useChildCard>
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
              <Trans i18nKey="Kelp 1">
                <p>
                  Kelp forests are found in nearshore waters along much of
                  California's coastline and boost biodiversity, enhance
                  recreational opportunities, and support important fisheries.
                  This report summarizes the overlap of the selected MPA(s) with
                  a linear representation of the maximum extent of kelp canopy
                  between 1984 and 2023.
                </p>
                <p>
                  The minimum extent necessary to encompass 90% of local
                  biodiversity in a kelp forest is 1.1 linear miles, as
                  determined from biological surveys. The MPA must encompass the
                  entire 0-30 m depth zone to count as a replicate.
                </p>
              </Trans>

              <LayerToggle
                label={t("Show Kelp Layer On Map")}
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
                <GeographyTable
                  rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId?.endsWith("_sr"),
                  )}
                  columnConfig={[
                    {
                      columnLabel: t("Kelp (Maximum)"),
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
                      columnLabel: t("% Planning Region Kelp"),
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

              <Collapse title={t("Show By Bioregion")}>
                <GeographyTable
                  rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId?.endsWith("_br"),
                  )}
                  columnConfig={[
                    {
                      columnLabel: t("Kelp (Maximum)"),
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
                      columnLabel: t("% Bioregion Kelp"),
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
                <Trans i18nKey="Kelp - learn more">
                  <p>
                    🗺️ Source Data: Bell, T, K. Cavanaugh, D. Siegel. 2024. SBC
                    LTER: Time series of quarterly NetCDF files of kelp biomass
                    in the canopy from Landsat 5, 7 and 8, since 1984 (ongoing)
                    ver 26. Environmental Data Initiative.
                    https://doi.org/10.6073/pasta/a9071a2ce1b78242c2ad1dda5854ec78.
                    Accessed 2025-01-21.
                  </p>
                  <p>
                    📈 Report: This report calculates the total length of
                    maximum linear kelp canopy within the selected MPA(s). This
                    value is divided by the total length of linear kelp canopy
                    to obtain the % contained within the selected MPA(s). If the
                    selected MPA(s) includes multiple areas that overlap, the
                    overlap is only counted once. Final plans should check area
                    totals in GIS tools before publishing final area statistics.
                  </p>
                </Trans>
                <p>{t("Last updated")}: February 3, 2025.</p>
              </Collapse>
            </ToolbarCard>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
