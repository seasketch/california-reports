import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  useSketchProperties,
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
            <Trans i18nKey="Eelgrass 1">
              <p>
                Eelgrass helps prevent erosion and maintain stability near shore
                by anchoring sediment with its spreading rhizomes and slowing
                water flow. Eelgrass beds also provide foraging, breeding,and
                nursery areas for many species of invertebrates, fish, and
                birds. This report summarizes the overlap of the selected MPA(s)
                with eelgrass extent.
              </p>
              <p>
                The minimum area of eelgrass within an MPA necessary to
                encompass 90% of local biodiversity and count as a replicate is
                0.04 square miles, as determined from biological surveys.
              </p>
            </Trans>

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
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="eelgrass - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total area of eelgrass
                  within the selected MPA(s). This value is divided by the total
                  area of eelgrass to obtain the % contained within the selected
                  MPA(s). If the selected area includes multiple areas that
                  overlap, the overlap is only counted once. Eelgrass data has
                  been simplified to a tolerance of 5 meters.
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
