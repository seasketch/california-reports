import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  DataDownload,
  LayerToggle,
  ReportError,
  ResultsCard,
  ToolbarCard,
  useSketchProperties,
  VerticalSpacer,
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

// Reports on substrate overlap
export const Habitat: React.FunctionComponent<{ printing: boolean }> = (
  props,
) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("habitat", t);

  // Labels
  const titleLabel = t("Predicted Substrate");
  const withinLabel = t("Area Within MPA(s)");
  const percWithinLabel = t("% Total Area Within MPA(s)");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="habitat" useChildCard>
      {(metricResults: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        let valueMetrics: Metric[] = [];
        let precalcMetrics: Metric[] = [];
        let percMetrics: Metric[] = [];

        geographies.forEach((g) => {
          const vMetrics = metricsWithSketchId(
            metricResults.filter(
              (m) =>
                m.metricId === metricGroup.metricId &&
                m.geographyId === g.geographyId,
            ),
            [id],
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
                <Trans i18nKey="Habitat 1">
                  <p>
                    Hard and soft bottom areas at a range of depths provide
                    habitat for many species of commercial and recreational
                    importance. This report summarizes the overlap of the
                    selected MPA(s) with hard and soft substrate classes at four
                    depth ranges: 0-30 m, 30-100 m, 100-200 m, and &gt;200 m.
                  </p>
                  <p>
                    The minimum area within an MPA necessary to encompass 90% of
                    local biodiversity and count as a replicate in each depth
                    zone is:
                    <br />
                    <br>
                      • soft substrate 30-100m (not combined with other depth
                      zones): 7 square miles
                    </br>
                    <br>
                      • soft substrate &gt;100m (100-200 m + &gt;200 m; not
                      combined with shallower depth zones): 17 square miles
                    </br>
                    <br>• hard substrate 30-100m: 0.13 square miles</br>
                    <br>
                      • hard substrate &gt;100m (100-200 m + &gt;200 m): 0.13
                      square miles
                    </br>
                  </p>
                </Trans>

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
                                    9.710648864705849093 *
                                    9.710648864705849093
                                : val *
                                    9.710648864705849093 *
                                    9.710648864705849093,
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

                <Collapse
                  title={t("Show By Bioregion")}
                  key={props.printing + "Habitat Bioregion"}
                  collapsed={!props.printing}
                >
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
                                        9.710648864705849093 *
                                        9.710648864705849093
                                    : val *
                                        9.710648864705849093 *
                                        9.710648864705849093,
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
                          columnLabel: t("% Bioregion Substrate"),
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

                <Collapse
                  title={t("Show By Planning Region")}
                  key={props.printing + "Habitat Planning Region"}
                  collapsed={!props.printing}
                >
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
                          columnLabel: curClass.display,
                          type: "class",
                          width: 45,
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
                                        9.710648864705849093 *
                                        9.710648864705849093
                                    : val *
                                        9.710648864705849093 *
                                        9.710648864705849093,
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
                          columnLabel: t("% Planning Region Substrate"),
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
                  <Collapse
                    title={t("Show by MPA")}
                    key={props.printing + "Habitat MPA"}
                    collapsed={!props.printing}
                  >
                    {genSketchTable(
                      childProperties || [],
                      metricResults.filter((m) => m.geographyId === "world"),
                      precalcMetrics.filter((m) => m.geographyId === "world"),
                      metricGroup,
                      t,
                      {
                        valueFormatter: (val) =>
                          val * 9.710648864705849093 * 9.710648864705849093,
                        printing: props.printing,
                      },
                    )}
                  </Collapse>
                )}

                <Collapse
                  title={t("Learn More")}
                  key={props.printing + "Habitat Learn More"}
                  collapsed={!props.printing}
                >
                  <Trans i18nKey="Habitat - learn more">
                    <p>🗺️ Source Data: CDFW, NOAA</p>
                    <p>
                      📈 Report: This report calculates the total area of each
                      habitat class within the selected MPA(s). This value is
                      divided by the total area of each habitat class to obtain
                      the % contained within the selected MPA(s). If the
                      selected area includes multiple areas that overlap, the
                      overlap is only counted once. Habitat data has been
                      downscaled to 30x30 meter resolution.
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
