import React from "react";
import {
  Column,
  ReportTableStyled,
  Table,
} from "@seasketch/geoprocessing/client-ui";
import {
  Metric,
  MetricGroup,
  toPercentMetric,
  percentWithEdge,
  keyBy,
  nestMetrics,
  roundDecimal,
  squareMeterToMile,
  SketchProperties,
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

export const AreaSketchTableStyled = styled(BaseSketchTableStyled)<{
  printing: boolean;
}>`
  & {
    overflow-x: ${(props) => (props.printing ? "visible" : "scroll")};
  }

  tr:nth-child(2) > th:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const ReplicateAreaSketchTableStyled = styled(BaseSketchTableStyled)<{
  printing: boolean;
}>`
  & {
    overflow-x: ${(props) => (props.printing ? "visible" : "scroll")};
  }

  tr:nth-child(2) > th:nth-child(3n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(3n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const AreaSizeSketchTableStyled = styled(BaseSketchTableStyled)<{
  printing: boolean;
}>`
  & {
    overflow-x: ${(props) => (props.printing ? "visible" : "scroll")};
  }

  tr:nth-child(2) > th:nth-child(4n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(4n + 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const genSketchTable = (
  childProperties: SketchProperties[],
  metrics: Metric[],
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
  options?: {
    valueFormatter?: (val: number) => number;
    size?: boolean;
    printing?: boolean;
  },
) => {
  const { valueFormatter = (val: any) => val, size = false } = options || {};

  const sketchesById = keyBy(childProperties, (sk) => sk.id);
  const sketchIds = childProperties.map((sk) => sk.id);
  const sketchMetrics = metrics.filter(
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
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      const columns = [];
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
        Header: size
          ? t("% State Waters") + " ".repeat(index)
          : t("% Area") + " ".repeat(index),
        accessor: (row: { sketchId: string }) => {
          const value =
            aggMetrics[row.sketchId][curClass.classId as string][
              project.getMetricGroupPercId(mg)
            ][0].value;
          return percentWithEdge(isNaN(value) ? 0 : value);
        },
      });

      return {
        Header: size ? " " : transString,
        style: { color: "#777" },
        columns: columns,
      };
    },
  );

  const columns: Column<{ sketchId: string }>[] = [
    {
      Header: "MPA",
      accessor: (row) => sketchesById[row.sketchId].name,
    },
    ...classColumns,
  ];

  if (options && options.printing) {
    const tables: JSX.Element[] = [];
    const totalClasses = mg.classes.length;
    const numTables = Math.ceil(totalClasses / 5);

    for (let i = 0; i < numTables; i++) {
      const startIndex = i * 5;
      const endIndex = Math.min((i + 1) * 5, totalClasses);

      const tableColumns: Column<{ sketchId: string }>[] = [
        columns[0], // "This plan contains" column
        ...classColumns.slice(startIndex, endIndex),
      ];

      tables.push(
        size ? (
          <AreaSizeSketchTableStyled printing={!!options?.printing}>
            <Table
              columns={tableColumns}
              data={rows}
              manualPagination={!!options?.printing}
            />
          </AreaSizeSketchTableStyled>
        ) : (
          <AreaSketchTableStyled printing={!!options?.printing}>
            <Table
              columns={tableColumns}
              data={rows}
              manualPagination={!!options?.printing}
            />
          </AreaSketchTableStyled>
        ),
      );
    }

    return tables;
  }

  return size ? (
    <AreaSizeSketchTableStyled printing={!!options?.printing}>
      <Table columns={columns} data={rows} />
    </AreaSizeSketchTableStyled>
  ) : (
    <AreaSketchTableStyled printing={!!options?.printing}>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};
