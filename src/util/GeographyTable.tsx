import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleFill, InfoCircleFill } from "@styled-icons/bootstrap";
import {
  Column,
  HorizontalStackedBar,
  HorizontalStackedBarProps,
  LayerToggle,
  ReportTableStyled,
  Table,
  Tooltip,
} from "@seasketch/geoprocessing/client-ui";
import {
  Geography,
  Metric,
  MetricGroup,
  Objective,
  PercentEdgeOptions,
  ValueFormatter,
  keyBy,
  nestMetrics,
  percentWithEdge,
  valueFormatter,
} from "@seasketch/geoprocessing/client-core";
import styled from "styled-components";

export const GeographyTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
    td {
      padding: 6px 5px;
    }
  }
`;

/**
 * Function that given target value for current table row, the table row index, and total number of
 * table rows, returns a function that given target value returns a
 * formatted string or Element.  In other words a function that handles the formatting based on where
 * the row is in the table and returns a function handling the remaining formatting.
 */
export type TargetFormatter = (
  value: number,
  row: number,
  numRows: number
) => (value: number) => string | JSX.Element;

export interface GeographyTableColumnConfig {
  /** column display type */
  type: "class" | "metricValue" | "metricChart" | "metricGoal" | "layerToggle";
  /** metricId to use for column - metricGoal will access its values via the metricGroup  */
  metricId?: string;
  /** column header label */
  columnLabel?: string;
  /** unit string to display after value, or a format function that is passed the row value */
  valueLabel?: string | ((value: number | string) => string);
  /** column percent width out of 100 */
  width?: number;
  /** additional style properties for column */
  colStyle?: React.CSSProperties;
  /** formatting to apply to values in column row, defaults to as-is 'value' formatting. */
  valueFormatter?: ValueFormatter;
  /** formatting of target value based on the location of the row in the table */
  targetValueFormatter?: TargetFormatter;
  /** config options for percent value formatting.  see percentWithEdge function for more details */
  percentFormatterOptions?: PercentEdgeOptions;
  /** override options for metricChart column type */
  chartOptions?: Partial<HorizontalStackedBarProps>;
}

export interface GeographyTableProps {
  /** Table row objects, each expected to have a classId and value. */
  rows: Metric[];
  /** Source for metric class definitions. if group has layerId at top-level, will display one toggle for whole group */
  metricGroup: MetricGroup;
  /** List of geographies */
  geographies: Geography[];
  /** Optional objective for metric */
  objective?: Objective | Objective[];
  /** configuration of one or more columns to display */
  columnConfig: GeographyTableColumnConfig[];
}

/**
 * Table displaying class metrics, one class per table row.  Having more than one metric per class may yield unexpected results
 * Returns 0 value in table when faced with a 'missing' metric instead of erroring
 * Handles "class has no value" NaN situation (common when sketch doesn't overlap with a geography) by overwriting with 0 and adding information circle
 */
export const GeographyTable: React.FunctionComponent<GeographyTableProps> = ({
  rows,
  columnConfig,
  metricGroup,
  geographies,
  objective,
}) => {
  const { t } = useTranslation();
  const geographyByName = keyBy(
    geographies,
    (geography: Geography) => geography.geographyId
  );

  // group metrics by class ID, then metric ID, for easy lookup
  const metricsByGeographyByMetric = nestMetrics(rows, [
    "geographyId",
    "metricId",
  ]);

  // Use sketch ID for each table row, use index to lookup into nested metrics
  const tableRows = Object.keys(metricsByGeographyByMetric).map(
    (geographyId) => ({
      geographyId,
    })
  );

  type GeographyTableColumn = Column<{ geographyId: string }>;

  const genColumns = (
    colConfigs: GeographyTableColumnConfig[]
  ): GeographyTableColumn[] => {
    const defaultWidth = 100 / colConfigs.length;

    const defaultClassLabel = t("Class");
    const defaultMapLabel = t("Map");
    const defaultTargetLabel = t("Target");
    const defaultGoalLabel = t("Goal");
    const defaultValueLabel = t("Value");

    // Transform column configs into Columns
    const colz: GeographyTableColumn[] = colConfigs.map((colConfig) => {
      const style = {
        width: `${colConfig.width || defaultWidth}%`,
        ...(colConfig.colStyle ? colConfig.colStyle : {}),
      };
      if (colConfig.type === "class") {
        return {
          Header: colConfig.columnLabel || defaultClassLabel,
          accessor: (row) => {
            /* i18next-extract-disable-next-line */
            const transString = t(
              geographyByName[row.geographyId || "missing"]?.display
            );
            return transString || "missing";
          },
          style,
        };
      } else if (colConfig.type === "metricValue") {
        return {
          Header: colConfig.columnLabel || defaultValueLabel,
          accessor: (row) => {
            if (!colConfig.metricId)
              throw new Error("Missing metricId in column config");
            // Return 0 when faced with a 'missing' metric
            // Return 0 with a Tooltip when faced with a 'NaN' metric value
            const value = (() => {
              if (
                metricsByGeographyByMetric[row.geographyId] &&
                metricsByGeographyByMetric[row.geographyId][colConfig.metricId]
              ) {
                return metricsByGeographyByMetric[row.geographyId][
                  colConfig.metricId
                ][0].value;
              } else {
                return 0;
              }
            })();
            const suffix = (() => {
              if (isNaN(value)) {
                const tooltipText = "Not present in this geography";
                return (
                  <Tooltip
                    text={tooltipText}
                    placement="bottom"
                    offset={{ horizontal: 0, vertical: 5 }}
                  >
                    <InfoCircleFill
                      size={14}
                      style={{
                        color: "#83C6E6",
                      }}
                    />
                  </Tooltip>
                );
              } else {
                return <></>;
              }
            })();

            const formattedValue = (() => {
              const finalValue = isNaN(value) ? 0 : value;
              return colConfig.valueFormatter
                ? valueFormatter(finalValue, colConfig.valueFormatter)
                : finalValue;
            })();

            return (
              <>
                {formattedValue}
                {colConfig.valueLabel ? ` ${colConfig.valueLabel}` : ""}
                {suffix}
              </>
            );
          },
          style,
        };
      } else if (colConfig.type === "metricChart") {
        return {
          Header: colConfig.columnLabel || " ",
          style: { textAlign: "center", ...style },
          accessor: (row, rowIndex) => {
            if (!colConfig.metricId)
              throw new Error("Missing metricId in column config");
            // Return 0 when faced with a 'missing' metric
            const value = (() => {
              if (
                metricsByGeographyByMetric[row.geographyId] &&
                metricsByGeographyByMetric[row.geographyId][colConfig.metricId]
              ) {
                return metricsByGeographyByMetric[row.geographyId][
                  colConfig.metricId
                ][0].value;
              } else {
                return 0;
              }
            })();

            const tooltipText = "Not present in this region";

            const chartProps = {
              ...(colConfig.chartOptions ? colConfig.chartOptions : {}),
              rows: [
                [
                  [
                    colConfig.valueFormatter === "percent"
                      ? value * 100
                      : value,
                  ],
                ],
              ],
              rowConfigs: [
                {
                  title: (value: number) => (
                    <>
                      {isNaN(value) ? (
                        <Tooltip
                          text={tooltipText}
                          placement="bottom"
                          offset={{ horizontal: 0, vertical: 5 }}
                        >
                          <InfoCircleFill
                            size={14}
                            style={{
                              color: "#83C6E6",
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <></>
                      )}
                      {percentWithEdge(isNaN(value) ? 0 : value / 100)}
                    </>
                  ),
                },
              ],
              max: 100,
            };

            return (
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <HorizontalStackedBar
                    blockGroupNames={["foo"]}
                    blockGroupStyles={[{ backgroundColor: "#ACD0DE" }]}
                    showTitle={true}
                    showLegend={false}
                    showTargetLabel={true}
                    targetLabelPosition="bottom"
                    showTotalLabel={false}
                    barHeight={12}
                    {...chartProps}
                  />
                </div>
              </div>
            );
          },
        };
      } else if (colConfig.type === "layerToggle") {
        return {
          Header: colConfig.columnLabel || defaultMapLabel,
          style: { textAlign: "center", ...style },
          accessor: (row, index) => {
            const isSimpleGroup = metricGroup.layerId ? false : true;
            const layerId =
              metricGroup.layerId || geographyByName[row.geographyId!].layerId;
            if (isSimpleGroup && layerId) {
              return (
                <LayerToggle
                  simple
                  size="small"
                  layerId={layerId}
                  style={{
                    marginTop: 0,
                    justifyContent: "center",
                  }}
                />
              );
            } else if (!isSimpleGroup && layerId && index === 0) {
              return (
                <LayerToggle
                  simple
                  size="small"
                  layerId={layerId}
                  style={{ marginTop: 0, justifyContent: "center" }}
                />
              );
            } else {
              return <></>;
            }
          },
        };
      } else {
        throw new Error(
          `Unexpected GeographyTableColumnConfig type ${colConfig.type}`
        );
      }
    });
    return colz;
  };

  const columns = genColumns(columnConfig);

  return (
    <GeographyTableStyled>
      <Table className="styled" columns={columns} data={tableRows} />
    </GeographyTableStyled>
  );
};
