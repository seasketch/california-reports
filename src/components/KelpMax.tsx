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
import { genSketchTable } from "../util/genSketchTable.js";
import { GeographyTable } from "../util/GeographyTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * KelpMax component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const KelpMax: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("kelpMax", t);
  const precalcMetrics = geographies
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId)
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

  // Labels
  const titleLabel = t("Kelp (Maximum)");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="kelpMax">
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id]
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
          <ReportError>
            <p>
              <Trans i18nKey="KelpMax 1">
                This report summarizes this plan's overlap with the maximum kelp
                distribution over the years 2002-2016.
              </Trans>
            </p>

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

            <Collapse title={t("Show By Planning Region")}>
              <p>
                <Trans i18nKey="Kelp Planning Region">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>planning region</i>. The San Francisco Bay
                  planning region is excluded due to not containing any kelp
                  forests per the data provided.
                </Trans>
              </p>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_sr")
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Kelp (Maximum)",
                    type: "class",
                    width: 35,
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
                    width: 35,
                  },
                ]}
              />
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              <p>
                <Trans i18nKey="Kelp Bioregion">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>bioregion</i>.
                </Trans>
              </p>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_br")
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Kelp (Maximum)",
                    type: "class",
                    width: 35,
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
                    width: 35,
                  },
                ]}
              />
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
                  { replicate: true, replicateMap: { kelpMax: 1.1 } }
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="KelpMax - learn more">
                <p>
                  ℹ️ Overview: The maximum area of kelp across the years
                  2002-2016 is used in this report. The area and % area of kelp
                  protected by this plan is shown. Kelp data has been rasterized
                  to a 30m x 30m raster grid for efficiency, so area
                  calculations are estimates. Final plans should check area
                  totals in GIS tools before publishing final area statistics.
                </p>
                <p>
                  An MPA is counted as a replicate if it contains at least 1.1
                  mi² of kelp forest.
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
