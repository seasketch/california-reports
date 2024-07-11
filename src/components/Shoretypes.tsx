import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  Column,
  LayerToggle,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  Table,
  VerticalSpacer,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  ReportResult,
  firstMatchingMetric,
  keyBy,
  metricsWithSketchId,
  nestMetrics,
  percentWithEdge,
  roundDecimal,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { ReplicateAreaSketchTableStyled } from "../util/genSketchTable.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { CheckCircleFill, XCircleFill } from "@styled-icons/bootstrap";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Shoretypes component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Shoretypes: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("shoretypes", t);

  // Labels
  const titleLabel = t("Shoreline Habitats");
  const classLabel = t("Shoretype");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi");

  return (
    <ResultsCard title={titleLabel} functionName="shoretypes">
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        let valueMetrics: Metric[] = [];
        let precalcMetrics: Metric[] = [];
        let percMetrics: Metric[] = [];

        geographies.forEach((g) => {
          const vMetrics = metricsWithSketchId(
            data.metrics.filter(
              (m) =>
                m.metricId === metricGroup.metricId &&
                m.geographyId === g.geographyId
            ),
            [data.sketch.properties.id]
          );
          valueMetrics = valueMetrics.concat(vMetrics);

          const preMetrics = project.getPrecalcMetrics(
            metricGroup,
            "area",
            g.geographyId
          );
          precalcMetrics = precalcMetrics.concat(preMetrics);

          percMetrics = percMetrics.concat(
            toPercentMetric(vMetrics, preMetrics, {
              metricIdOverride: percMetricIdName,
            })
          );
        });

        const metrics = [...valueMetrics, ...percMetrics];

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Shoretypes 1">
                This report summarizes this plan's protection of California's
                shoretypes.
              </Trans>
            </p>

            {!isCollection && (
              <ShoretypesObjectives
                metricGroup={metricGroup}
                metrics={valueMetrics.filter((m) => m.geographyId === "world")}
              />
            )}

            <LayerToggle
              label={t("Show Landward Shoretypes")}
              layerId={metricGroup.classes[0].layerId}
            />
            <VerticalSpacer />
            <LayerToggle
              label={t("Show Seaward Shoretypes")}
              layerId={metricGroup.classes[1].layerId}
            />

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              columnConfig={[
                {
                  columnLabel: classLabel,
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
                        typeof val === "string"
                          ? parseInt(val) / 1609
                          : val / 1609
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

            <Collapse title={t("Show By Planning Region")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_sr") &&
                      m.classId === curClass.classId
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_sr")
                  )}
                  columnConfig={[
                    {
                      columnLabel: t(curClass.display),
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
                            typeof val === "string"
                              ? parseInt(val) / 1609
                              : val / 1609
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
              ))}
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_br") &&
                      m.classId === curClass.classId
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_br")
                  )}
                  columnConfig={[
                    {
                      columnLabel: t(curClass.display),
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
                            typeof val === "string"
                              ? parseInt(val) / 1609
                              : val / 1609
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
              ))}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genLengthSketchTable(
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
              <Trans i18nKey="Shoretypes - learn more">
                <p>
                  ℹ️ Overview: Shoretype data has been categorized into five
                  types: beaches, coastal marsh, rocky shores, tidal flats, and
                  unclassified if qualifiying ESI codes were present in the
                  landward or seaward fields for that stretch of coastline.
                  Therefore, the same shoreline can count for multiple
                  shoretypes. More specific shoreline types can be viewed by
                  turning on the matching map layers and hovering.
                </p>
                <p>Tidal flats = ESI 7, 9, 9A, and 9C.</p>
                <p>Beaches = ESI 3, 3A, 4, 5, 6A.</p>
                <p>Rocky shores = ESI 1A, 1C, 2, 2A, 8, and 8A.</p>
                <p>Coastal marsh = ESI 10 and 10A.</p>
                <p>
                  Unclassified = ESI 0, 1B, 3B, 6B, 6D, 8B, 8C, 9B, 10B, 10C,
                  and 10D.
                </p>
                <p>
                  MPA replicates must meet certain size standards for certain
                  habitats: 1.1 linear miles of beaches, 0.55 linear miles of
                  rocky shores, 0.55 linear miles of rock islands. Coastal
                  marsh, tidal flats, and unclassified are considered replicates
                  if area is above 0.
                </p>
                <p>
                  🎯 Planning Objective: Habitat replication throughout state
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

const replicateMap: Record<string, number> = {
  beaches: 1.1,
  rocky_shores: 0.55,
  rock_islands: 0.55,
};

/**
 * Creates "Show by Zone" report, with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genLengthSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any
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
            Header: t("Replicate") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value / 1609;

              return value > replicateMap[curClass.classId] ||
                (!replicateMap[curClass.classId] && value) ? (
                <CheckCircleFill size={15} style={{ color: "#78c679" }} />
              ) : (
                <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
              );
            },
          },
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;
              const miVal = value / 1609;

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                miVal && miVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(miVal));
              return valDisplay + " " + t("mi");
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
    <ReplicateAreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </ReplicateAreaSketchTableStyled>
  );
};

const ShoretypesObjectives = (props: {
  metricGroup: MetricGroup;
  metrics: Metric[];
}) => {
  // Habitat replication
  let habitatReplicationPass: string[] = [];
  let habitatReplicationFail: string[] = [];

  props.metricGroup.classes.forEach((curClass) => {
    const metric = firstMatchingMetric(
      props.metrics,
      (m) => m.classId === curClass.classId
    );
    const value = metric.value / 1609;

    value > replicateMap[curClass.classId] ||
    (!replicateMap[curClass.classId] && value)
      ? habitatReplicationPass.push(curClass.display)
      : habitatReplicationFail.push(curClass.display);
  });

  return (
    <>
      {habitatReplicationPass.length && (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <>
              This MPA meets the habitat replicate guidelines for:{" "}
              {habitatReplicationPass.join(", ")}
            </>
          }
        />
      )}
    </>
  );
};
