import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  LayerToggle,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  MetricGroup,
  ReportResult,
  createMetric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genSketchTable } from "../util/genSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Bioregions component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Bioregions: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("bioregions", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Bioregions");
  const countLabel = t("# MPAs");
  const areaLabel = t("Area");
  const percWithinLabel = t("% Area Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="bioregions"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;
        const countMetricIdName = `${metricGroup.metricId}Count`;

        const countMetrics = genCount(data, metricGroup);
        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id]
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
        });
        const metrics = [...countMetrics, ...valueMetrics, ...percentMetrics];

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Bioregions 1">
                This report summarizes this plan's overlap with California's
                bioregions.
              </Trans>
            </p>

            <LayerToggle
              label={t("Show Map Layer")}
              layerId={metricGroup.layerId}
            />

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: titleLabel,
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: countLabel,
                  type: "metricValue",
                  metricId: countMetricIdName,
                  chartOptions: {
                    showTitle: true,
                  },
                  colStyle: { textAlign: "center" },
                  width: 20,
                },
                {
                  columnLabel: areaLabel,
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

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(data, precalcMetrics, metricGroup, t)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Bioregions - learn more">
                <p>
                  ℹ️ Overview: This planning process considers California's
                  three bioregions: north, central, and south.
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

const genCount = (data: ReportResult, metricGroup: MetricGroup) => {
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const classIds = metricGroup.classes.map((c) => c.classId);
  const childSketchMetrics = metricsWithSketchId(
    data.metrics.filter((m) => m.metricId === metricGroup.metricId),
    childSketchIds
  );
  const nonZeroMetrics = childSketchMetrics.filter((m) => m.value > 0);
  const countMetrics = classIds.map((classId) => {
    const count = nonZeroMetrics.filter((m) => m.classId === classId).length;
    return createMetric({
      metricId: `${metricGroup.metricId}Count`,
      classId,
      value: count,
    });
  });
  return countMetrics;
};
