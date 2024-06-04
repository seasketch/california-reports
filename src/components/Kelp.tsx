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
  createMetric,
  flattenBySketchAllClass,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Kelp component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Kelp: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("kelp", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Kelp Forests (2016)");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="kelp"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id]
        );

        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
        });

        const studyRegionMetrics = [...valueMetrics, ...percentMetrics];

        const overallValue = createMetric({
          ...valueMetrics[0],
          classId: "overall",
          value: valueMetrics.reduce((acc, m) => acc + m.value, 0),
        });
        const overallPrecalc = createMetric({
          classId: "overall",
          value: precalcMetrics.reduce((acc, m) => acc + m.value, 0),
        });
        const overallPerc = toPercentMetric([overallValue], [overallPrecalc], {
          metricIdOverride: percMetricIdName,
        });
        const overallMetrics = [overallValue, ...overallPerc];
        const overallMG = {
          metricId: "kelp",
          type: "areaOverlap",
          classes: [
            {
              classId: "overall",
              display: "Kelp Forest",
              layerId: "",
            },
          ],
        };

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        const studyRegionIsMet = valueMetrics.every((m) => m.value > 0)
          ? OBJECTIVE_YES
          : OBJECTIVE_NO;
        const studyRegionMsg = objectiveMsgs["studyRegion"](
          studyRegionIsMet,
          t
        );

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Kelp 1">
                This report summarizes this plan's overlap with kelp forests.
                Plans should consider protection of kelp forest habitat for
                conservation.
              </Trans>
            </p>

            <ClassTable
              rows={overallMetrics}
              metricGroup={overallMG}
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
                        )
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

            <Collapse title={t("Show by Study Region")} collapsed={false}>
              <p>
                <Trans i18nKey="Kelp Study Region">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>study region</i>. The San Francisco Bay study
                  region is excluded due to not containing any kelp forests per
                  the data provided.
                </Trans>
              </p>

              <ObjectiveStatus status={studyRegionIsMet} msg={studyRegionMsg} />

              <ClassTable
                rows={studyRegionMetrics}
                metricGroup={metricGroup}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Study Region",
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
                          )
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
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(data, metricGroup, precalcMetrics)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Kelp - learn more">
                <p>
                  ℹ️ Overview: Area of kelp forests protected by this plan is
                  shown. Kelp data has been downsampled to a 40m x 40m raster
                  grid for efficiency, so area calculations are estimates. Final
                  plans should check area totals in GIS tools before publishing
                  final area statistics.{" "}
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

const genSketchTable = (
  data: ReportResult,
  metricGroup: MetricGroup,
  precalcMetrics: Metric[]
) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};

const objectiveMsgs: Record<string, any> = {
  studyRegion: (objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            "This plan meets the objective of habitat replication in all study regions."
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            "This plan does not meet the objective of habitat replication in all study regions."
          )}
        </>
      );
    }
  },
};
