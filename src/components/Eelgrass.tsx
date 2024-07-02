import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  SketchClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  ObjectiveAnswer,
  ReportResult,
  flattenBySketchAllClass,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Eelgrass component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Eelgrass: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("eelgrass", t);
  const precalcMetrics = geographies
    .filter((g) => !g.geographyId?.endsWith("_sr"))
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId)
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

  // Labels
  const titleLabel = t("Eelgrass");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("sq. mi.");

  return (
    <ResultsCard title={titleLabel} functionName="eelgrass">
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
              <Trans i18nKey="Eelgrass 1">
                This report summarizes this plan's overlap with eelgrass within
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
                {
                  columnLabel: mapLabel,
                  type: "layerToggle",
                  width: 10,
                },
              ]}
            />

            <Collapse title={t("Show By Bioregion")}>
              {metrics
                .filter((m) => m.geographyId?.endsWith("_br"))
                .every((m) => m.value > 0) ? (
                <ObjectiveStatus
                  status={OBJECTIVE_YES}
                  msg={objectiveMsgs["bioregion"](OBJECTIVE_YES, t)}
                />
              ) : (
                <ObjectiveStatus
                  status={OBJECTIVE_NO}
                  msg={objectiveMsgs["bioregion"](OBJECTIVE_NO, t)}
                />
              )}

              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_br")
                )}
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
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genAreaSketchTable(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world"
                    ),
                  },
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="eelgrass - learn more">
                <p>
                  ℹ️ Overview: Zostera marina, or eelgrass, grows intertidally
                  and in the shallow subtidal of estuaries, bays, and other
                  protected coastal areas of the ecoregion. It is a flowering
                  plant, not an alga, and often occurs in dense beds. It helps
                  prevent erosion and maintain stability near shore by anchoring
                  sediment with its spreading rhizomes and slowing water flow.
                  Eelgrass beds also provide foraging, breeding, and nursery
                  areas for many species of invertebrates, fish, and birds. This
                  file aggregates data from many sources across multiple years.
                </p>
                <p>🎯 Planning Objective: None.</p>
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

const objectiveMsgs: Record<string, any> = {
  studyRegion: (objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            "This plan contains eelgrass in all study regions and may achieve habitat replication."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not contain eelgrass in all study regions and does not achieve habitat replication."
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
            "This plan contains eelgrass in all bioregions and may achieve habitat replication."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not contain eelgrass in all bioregions and does not achieve habitat replication."
          )}
        </>
      );
    }
  },
};
