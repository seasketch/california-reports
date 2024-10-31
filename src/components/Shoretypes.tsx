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
  const classLabel = t("Shoreline Habitat");
  const withinLabel = t("Length Within MPA(s)");
  const percWithinLabel = t("% Total Habitat Length");
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
                m.geographyId === g.geographyId,
            ),
            [data.sketch.properties.id],
          );
          valueMetrics = valueMetrics.concat(vMetrics);

          const preMetrics = project.getPrecalcMetrics(
            metricGroup,
            "area",
            g.geographyId,
          );
          precalcMetrics = precalcMetrics.concat(preMetrics);

          percMetrics = percMetrics.concat(
            toPercentMetric(vMetrics, preMetrics, {
              metricIdOverride: percMetricIdName,
            }),
          );
        });

        const metrics = [...valueMetrics, ...percMetrics];

        return (
          <ReportError>
            <Trans i18nKey="Shoretypes 1">
              <p>
                This report summarizes the overlap of the selected MPA(s) with
                sandy beach and rocky intertidal habitat. Data are included for
                both landward and seaward shoreline, so a single segment of
                shoreline may be counted towards more than one type of habitat.
              </p>
              <p>
                The minimum length of habitat within an MPA necessary to
                encompass 90% of local biodiversity and count as a replicate, as
                determined from biological surveys, is 1.1 linear miles for
                beach habitats and 0.55 linear miles for rocky shore habitats.
              </p>
            </Trans>

            <LayerToggle
              label={t("Show Landward Shoretypes")}
              layerId={metricGroup.classes[0].layerId}
            />
            <VerticalSpacer />
            <LayerToggle
              label={t("Show Seaward Shoretypes")}
              layerId={metricGroup.classes[1].layerId}
            />

            <VerticalSpacer />
            {!isCollection && (
              <ShoretypesObjectives
                metricGroup={metricGroup}
                metrics={valueMetrics.filter((m) => m.geographyId === "world")}
              />
            )}

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              columnConfig={[
                {
                  columnLabel: classLabel,
                  type: "class",
                  width: 25,
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
                          : val / 1609,
                      ),
                    ),
                  colStyle: { textAlign: "center" },
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 30,
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

            <Collapse title={t("Show By Planning Region")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_sr") &&
                      m.classId === curClass.classId,
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_sr"),
                  )}
                  columnConfig={[
                    {
                      columnLabel: t(curClass.display),
                      type: "class",
                      width: 40,
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
                              : val / 1609,
                          ),
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
              ))}
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              {metricGroup.classes.map((curClass) => (
                <GeographyTable
                  key={curClass.classId}
                  rows={metrics.filter(
                    (m) =>
                      m.geographyId?.endsWith("_br") &&
                      m.classId === curClass.classId,
                  )}
                  metricGroup={metricGroup}
                  geographies={geographies.filter((g) =>
                    g.geographyId.endsWith("_br"),
                  )}
                  columnConfig={[
                    {
                      columnLabel: t(curClass.display),
                      type: "class",
                      width: 25,
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
                              : val / 1609,
                          ),
                        ),
                      colStyle: { textAlign: "center" },
                      valueLabel: unitsLabel,
                      chartOptions: {
                        showTitle: true,
                      },
                      width: 30,
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
              ))}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genLengthSketchTable(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world",
                    ),
                  },
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Shoretypes - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total length of each
                  shoretype within the selected MPA(s). This value is divided by
                  the total length of each shoretype to obtain the % contained
                  within the selected MPA(s). If the selected area includes
                  multiple areas that overlap, the overlap is only counted once.
                  Selected MPA(s) were buffered by 250 meters to ensure overlap
                  with shoreline habitats data layer.
                </p>
                <p>Last updated: October 29, 2024.</p>
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
};

/**
 * Creates "Show by Zone" report, with length + percent length
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genLengthSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
) => {
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
            Header:
              (replicateMap[curClass.classId] ? t("Replicate") : "") +
              " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value / 1609;

              return !replicateMap[curClass.classId] ? (
                " "
              ) : value > replicateMap[curClass.classId] ||
                (!replicateMap[curClass.classId] && value) ? (
                <CheckCircleFill size={15} style={{ color: "#78c679" }} />
              ) : (
                <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
              );
            },
          },
          {
            Header: t("Length") + " ".repeat(index),
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
            Header: t("% Length") + " ".repeat(index),
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
    },
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
  const { metricGroup, metrics } = props;

  const beachesReplicate = (() => {
    const metric = firstMatchingMetric(metrics, (m) => m.classId === "beaches");
    if (!metric) throw new Error(`Expected metric for beaches`);
    return metric.value / 1609 > replicateMap["beaches"];
  })();

  const rockyShoresReplicate = (() => {
    const metric = firstMatchingMetric(
      metrics,
      (m) => m.classId === "rocky_shores",
    );
    if (!metric) throw new Error(`Expected metric for rocky_shores`);
    return metric.value / 1609 > replicateMap["rocky_shores"];
  })();

  return (
    <>
      {beachesReplicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <div style={{ paddingTop: "7px" }}>
              This MPA counts as a beach habitat replicate.
            </div>
          }
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={
            <div style={{ paddingTop: "7px" }}>
              This MPA does not count as a beach habitat replicate.
            </div>
          }
        />
      )}
      {rockyShoresReplicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <div style={{ paddingTop: "7px" }}>
              This MPA counts as a rocky shore habitat replicate.
            </div>
          }
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={<>This MPA does not count as a rocky shore habitat replicate.</>}
        />
      )}
    </>
  );
};
