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
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  ObjectiveAnswer,
  ReportResult,
  keyBy,
  metricsWithSketchId,
  nestMetrics,
  percentWithEdge,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import {
  AreaSketchTableStyled,
  genAreaSketchTable,
} from "../util/genAreaSketchTable.js";
import { GeographyTable } from "../util/GeographyTable.js";
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
  const precalcMetrics = geographies
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId)
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

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
              <Trans i18nKey="Shoretypes 1">
                This report summarizes this plan's protection of California's
                shoretypes.
              </Trans>
            </p>

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
              objective={objectives}
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

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
                <>
                  {metrics
                    .filter(
                      (m) =>
                        m.geographyId !== "world" &&
                        m.classId === curClass.classId
                    )
                    .every((m) => m.value > 0) ? (
                    <ObjectiveStatus
                      status={OBJECTIVE_YES}
                      msg={objectiveMsgs["bioregion"](
                        OBJECTIVE_YES,
                        curClass.display,
                        t
                      )}
                    />
                  ) : (
                    <ObjectiveStatus
                      status={OBJECTIVE_NO}
                      msg={objectiveMsgs["bioregion"](
                        OBJECTIVE_NO,
                        curClass.display,
                        t
                      )}
                    />
                  )}

                  <GeographyTable
                    key={curClass.classId}
                    rows={metrics.filter(
                      (m) =>
                        m.geographyId !== "world" &&
                        m.classId === curClass.classId
                    )}
                    metricGroup={metricGroup}
                    geographies={geographies.filter(
                      (g) => g.geographyId !== "world"
                    )}
                    objective={objectives}
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
                </>
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
    <AreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};

const objectiveMsgs: Record<string, any> = {
  studyRegion: (
    objectiveMet: ObjectiveAnswer,
    classDisplay: string,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            `This plan contains ${classDisplay.toLowerCase()} in all study regions and may achieve habitat replication.`
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            `This plan does not contain ${classDisplay.toLowerCase()} in all study regions and does not achieve habitat replication.`
          )}
        </>
      );
    }
  },
  bioregion: (objectiveMet: ObjectiveAnswer, classDisplay: string, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t(
            `This plan contains ${classDisplay.toLowerCase()} in all bioregions and may achieve habitat replication.`
          )}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t(
            `This plan does not contain ${classDisplay.toLowerCase()} in all bioregions and does not achieve habitat replication.`
          )}
        </>
      );
    }
  },
};
