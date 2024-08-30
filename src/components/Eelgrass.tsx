import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  KeySection,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  NullSketch,
  NullSketchCollection,
  Polygon,
  ReportResult,
  Sketch,
  firstMatchingMetric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genSketchTable } from "../util/genSketchTable.js";
import { ReplicateMap, SpacingObjectives } from "./Spacing.js";
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
      {(data: {
        metrics: Metric[];
        sketch: NullSketch | NullSketchCollection;
        simpleSketches: Sketch<Polygon>[];
        replicateIds: string[];
        paths: any;
      }) => {
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

            {!isCollection && (
              <EelgrassObjectives
                metricGroup={metricGroup}
                metrics={valueMetrics.filter((m) => m.geographyId === "world")}
              />
            )}

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

            <Collapse title={t("Show By Planning Region")}>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_sr")
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

            <Collapse title={t("Show By Bioregion")}>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_br")
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Eelgrass",
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
              <>
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
                    { replicate: true, replicateMap: { eelgrass: 0.04 } }
                  )}
                </Collapse>
                <Collapse title={t("Spacing Analysis")}>
                  <VerticalSpacer />
                  <KeySection>
                    <p>
                      Of the {data.simpleSketches.length} MPAs analyzed,{" "}
                      {data.replicateIds.length}{" "}
                      {data.replicateIds.length === 1
                        ? "qualifies as an eelgrass replicate."
                        : "qualify as eelgrass replicates."}
                    </p>
                  </KeySection>

                  {data.replicateIds.length !== 0 && (
                    <>
                      {data.replicateIds.length > 1 && (
                        <SpacingObjectives paths={data.paths} />
                      )}
                      <VerticalSpacer />
                      <ReplicateMap
                        sketch={data.simpleSketches}
                        replicateIds={data.replicateIds}
                        paths={data.paths}
                      />
                    </>
                  )}
                </Collapse>
              </>
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
                <p>
                  Eelgrass data has been simplified to a tolerance of 1 meter.
                  MPA habitat replicates must contain 0.04 square miles of
                  eelgrass.
                </p>
                <p>
                  🎯 Planning Objective: Habitat replication across state
                  waters.
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

const EelgrassObjectives = (props: {
  metricGroup: MetricGroup;
  metrics: Metric[];
}) => {
  const { metricGroup, metrics } = props;
  const replicateMap: Record<string, number> = { eelgrass: 0.12 };

  // Get habitat replicates passes and fails for this MPA
  const { passes, fails } = metricGroup.classes.reduce(
    (acc: { passes: string[]; fails: string[] }, curClass) => {
      const metric = firstMatchingMetric(
        metrics,
        (m) => m.classId === curClass.classId
      );
      if (!metric) throw new Error(`Expected metric for ${curClass.classId}`);

      const value = squareMeterToMile(metric.value);
      const replicateValue = replicateMap[curClass.classId];

      value > replicateValue || (!replicateValue && value)
        ? acc.passes.push(curClass.display)
        : acc.fails.push(curClass.display);

      return acc;
    },
    { passes: [], fails: [] }
  );

  return (
    <>
      {passes.length > 0 && (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <>This MPA meets the habitat replicate guidelines for eelgrass.</>
          }
        />
      )}
      {fails.length > 0 && (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              This MPA does not meet the habitat replicate guidelines for
              eelgrass.
            </>
          }
        />
      )}
    </>
  );
};
