import React from "react";
import {
  Column,
  ReportTableStyled,
  Table,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  Metric,
  MetricGroup,
  toPercentMetric,
  percentWithEdge,
  keyBy,
  nestMetrics,
  roundDecimal,
  squareMeterToMile,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import styled from "styled-components";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const AreaSketchTableStyled = styled(ReportTableStyled)`
  & {
    width: 100%;
    overflow-x: scroll;
    font-size: 12px;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }

  th,
  tr,
  td {
    text-align: center;
  }

  td:not(:first-child),
  th {
    white-space: nowrap;
  }

  tr:nth-child(1) > th:not(:last-child) {
    border-right: 2px solid #efefef;
  }

  tr:nth-child(2) > th:nth-child(2n-1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(2n-1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

/**
 * Creates "Show by Zone" report, with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genAreaSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
  valueFormatter?: (val: number) => number
) => {
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(sketchMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "sketchId",
    "classId",
    "metricId",
  ]);
  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }>[] = mg.classes.map(
    (curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      return {
        Header: transString,
        style: { color: "#777" },
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;
              const miVal = squareMeterToMile(
                valueFormatter ? valueFormatter(value) : value
              );

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                miVal && miVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(miVal));
              return valDisplay + " " + t("mi²");
            },
          },
          {
            Header: t("% Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  project.getMetricGroupPercId(mg)
                ][0].value;
              return percentWithEdge(isNaN(value) ? 0 : value);
            },
          },
        ],
      };
    }
  );

  const columns: Column<{ sketchId: string }>[] = [
    {
      Header: "MPA",
      accessor: (row) => sketchesById[row.sketchId].properties.name,
    },
    ...classColumns,
  ];

  return (
    <AreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};
