import React from "react";
import {
  ReportResult,
  keyBy,
  valueFormatter,
  toPercentMetric,
  sortMetricsDisplayOrder,
  MetricGroup,
  GeogProp,
  squareMeterToMile,
  Metric,
  firstMatchingMetric,
} from "@seasketch/geoprocessing/client-core";
import {
  ClassTable,
  Collapse,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  DataDownload,
} from "@seasketch/geoprocessing/client-ui";
import project from "../../project/projectClient.js";
import Translator from "../components/TranslatorAsync.js";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";

import watersImgUrl from "../assets/img/territorial_waters.png";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const SizeCard: React.FunctionComponent<GeogProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap", t);
  // Study regions total area
  const precalcMetrics = [
    {
      metricId: "area",
      value: 15235250304.770761,
      classId: "state_waters",
      groupId: null,
      geographyId: "world",
      sketchId: null,
    },
  ];

  const notFoundString = t("Results not found");

  /* i18next-extract-disable-next-line */
  const planningUnitName = t(project.basic.planningAreaName);
  return (
    <ResultsCard
      title={t("Size")}
      functionName="boundaryAreaOverlap"
      useChildCard
    >
      {(data: ReportResult) => {
        if (Object.keys(data).length === 0) throw new Error(notFoundString);

        return (
          <>
            <ToolbarCard
              title={t("Size")}
              items={
                <>
                  <DataDownload
                    filename="size"
                    data={data.metrics}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                </>
              }
            >
              <p>
                <Trans i18nKey="SizeCard - intro">
                  Californian state waters extend from the shoreline out to 12
                  nautical miles. This report summarizes plan overlap with state
                  waters.
                </Trans>
              </p>
              {genSingleSizeTable(data, precalcMetrics, metricGroup, t)}
              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genAreaSketchTable(data, precalcMetrics, metricGroup, t)}
                </Collapse>
              )}
              <Collapse title={t("Learn more")}>
                <p>
                  {<img src={watersImgUrl} style={{ maxWidth: "100%" }} />}
                  <a
                    target="_blank"
                    href="https://en.wikipedia.org/wiki/Territorial_waters"
                  >
                    <Trans i18nKey="SizeCard - learn more source">
                      Source: Wikipedia - Territorial Waters
                    </Trans>
                  </a>
                </p>
                <Trans i18nKey="SizeCard - learn more">
                  <p>
                    ℹ️ Overview: This report summarizes the size and proportion
                    of this plan within these boundaries.
                  </p>
                  <p>🎯 Planning Objective: None </p>
                  <p>🗺️ Source Data: CDFW </p>
                  <p>
                    📈 Report: If sketch boundaries within a plan overlap with
                    each other, the overlap is only counted once.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          </>
        );
      }}
    </ResultsCard>
  );
};

const genSingleSizeTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: TFunction
) => {
  const boundaryLabel = t("Boundary");
  const areaWithinLabel = t("Area Within Plan");
  const areaPercWithinLabel = t("% Area Within Plan");
  const mapLabel = t("Map");
  const sqKmLabel = t("mi²");

  let singleMetrics = data.metrics.filter(
    (m) => m.sketchId === data.sketch.properties.id
  );

  const finalMetrics = sortMetricsDisplayOrder(
    [
      ...singleMetrics,
      ...toPercentMetric(singleMetrics, precalcMetrics, {
        metricIdOverride: project.getMetricGroupPercId(mg),
      }),
    ],
    "classId",
    ["eez", "offshore", "contiguous"]
  );

  return (
    <>
      <ClassTable
        rows={finalMetrics}
        metricGroup={mg}
        columnConfig={[
          {
            columnLabel: boundaryLabel,
            type: "class",
            width: 25,
          },
          {
            columnLabel: areaWithinLabel,
            type: "metricValue",
            metricId: mg.metricId,
            valueFormatter: (val: string | number) =>
              Number.format(
                Math.round(
                  squareMeterToMile(
                    typeof val === "string" ? parseInt(val) : val
                  )
                )
              ),
            valueLabel: sqKmLabel,
            width: 20,
          },
          {
            columnLabel: areaPercWithinLabel,
            type: "metricChart",
            metricId: project.getMetricGroupPercId(mg),
            valueFormatter: "percent",
            chartOptions: {
              showTitle: true,
              showTargetLabel: true,
              targetLabelPosition: "bottom",
              targetLabelStyle: "tight",
              barHeight: 11,
            },
            width: 40,
            targetValueFormatter: (
              value: number,
              row: number,
              numRows: number
            ) => {
              if (row === 0) {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")} ${t(
                    "Target"
                  )}`;
              } else {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")}`;
              }
            },
          },
          {
            type: "layerToggle",
            width: 15,
            columnLabel: mapLabel,
          },
        ]}
      />
    </>
  );
};

/**
 * SizeCard as a top-level report client
 */
export const SizeCardReportClient = () => {
  return (
    <Translator>
      <SizeCard />
    </Translator>
  );
};
