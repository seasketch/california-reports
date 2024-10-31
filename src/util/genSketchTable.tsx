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
import { styled } from "styled-components";
import { CheckCircleFill, XCircleFill } from "@styled-icons/bootstrap";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

const BaseSketchTableStyled = styled(ReportTableStyled)`
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
`;

export const AreaSketchTableStyled = styled(BaseSketchTableStyled)`
  tr:nth-child(2) > th:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const ReplicateAreaSketchTableStyled = styled(BaseSketchTableStyled)`
  tr:nth-child(2) > th:nth-child(3n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(3n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const AreaSizeSketchTableStyled = styled(BaseSketchTableStyled)`
  tr:nth-child(2) > th:nth-child(4n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(4n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const genSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
  options?: {
    valueFormatter?: (val: number) => number;
    size?: boolean;
    replicate?: boolean;
    replicateMap?: Record<string, number>;
  },
) => {
  const {
    valueFormatter = (val: any) => val,
    size = false,
    replicate = false,
    replicateMap = {},
  } = options || {};

  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId),
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

  const rows: {
    sketchId: string;
  }[] = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }>[] = mg.classes.map(
    (curClass, index) => {
      const transString = t(curClass.display);
      const columns = [];

      if (replicate) {
        columns.push({
          Header:
            (replicateMap[curClass.classId] ? t("Replicate") : " ") +
            " ".repeat(index),
          accessor: (row: { sketchId: string }) => {
            let val =
              aggMetrics[row.sketchId][curClass.classId as string][
                mg.metricId
              ][0].value;
            let value = squareMeterToMile(
              valueFormatter ? valueFormatter(val) : val,
            );

            // Case for habitat report
            if (curClass.classId === "102" || curClass.classId === "202") {
              val =
                aggMetrics[row.sketchId]["102"][mg.metricId][0].value +
                aggMetrics[row.sketchId]["202"][mg.metricId][0].value;
              value = squareMeterToMile(
                valueFormatter ? valueFormatter(val) : val,
              );
            } else if (
              curClass.classId === "101" ||
              curClass.classId === "201"
            ) {
              val =
                aggMetrics[row.sketchId]["101"][mg.metricId][0].value +
                aggMetrics[row.sketchId]["201"][mg.metricId][0].value;
              value = squareMeterToMile(
                valueFormatter ? valueFormatter(val) : val,
              );
            }

            return !replicateMap[curClass.classId] ? (
              " "
            ) : (replicateMap && value > replicateMap[curClass.classId]) ||
              (!replicateMap[curClass.classId] && value) ? (
              <CheckCircleFill size={15} style={{ color: "#78c679" }} />
            ) : (
              <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
            );
          },
        });
      }

      if (size) {
        columns.push({
          Header: t("Minimum") + " ".repeat(index),
          accessor: (row: { sketchId: string }) => {
            const value = squareMeterToMile(
              aggMetrics[row.sketchId][curClass.classId as string][
                mg.metricId
              ][0].value,
            );
            return value > 9 ? (
              <CheckCircleFill size={15} style={{ color: "#78c679" }} />
            ) : (
              <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
            );
          },
        });
        columns.push({
          Header: t("Preferred") + " ".repeat(index),
          accessor: (row: { sketchId: string }) => {
            const value = squareMeterToMile(
              aggMetrics[row.sketchId][curClass.classId as string][
                mg.metricId
              ][0].value,
            );
            return value > 18 ? (
              <CheckCircleFill size={15} style={{ color: "#78c679" }} />
            ) : (
              <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
            );
          },
        });
      }

      columns.push({
        Header: t("Area") + " ".repeat(index),
        accessor: (row: { sketchId: string }) => {
          const value =
            aggMetrics[row.sketchId][curClass.classId as string][mg.metricId][0]
              .value;
          const miVal = squareMeterToMile(
            valueFormatter ? valueFormatter(value) : value,
          );
          const valDisplay =
            miVal && miVal < 0.1 ? "< 0.1" : Number.format(roundDecimal(miVal));
          return valDisplay + " " + t("mi²");
        },
      });
      columns.push({
        Header: t("% Area") + " ".repeat(index),
        accessor: (row: { sketchId: string }) => {
          const value =
            aggMetrics[row.sketchId][curClass.classId as string][
              project.getMetricGroupPercId(mg)
            ][0].value;
          return percentWithEdge(isNaN(value) ? 0 : value);
        },
      });

      return {
        Header: transString,
        style: { color: "#777" },
        columns: columns,
      };
    },
  );

  const columns: Column<{ sketchId: string }>[] = [
    {
      Header: "MPA",
      accessor: (row) => sketchesById[row.sketchId].properties.name,
    },
    ...classColumns,
  ];

  return replicate ? (
    <ReplicateAreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </ReplicateAreaSketchTableStyled>
  ) : size ? (
    <AreaSizeSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSizeSketchTableStyled>
  ) : (
    <AreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};
