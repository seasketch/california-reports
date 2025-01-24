import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  Column,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  Table,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  SketchProperties,
  firstMatchingMetric,
  keyBy,
  metricsWithSketchId,
  nestMetrics,
  percentWithEdge,
  roundDecimal,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { AreaSketchTableStyled } from "../util/genSketchTable.js";
import { CheckCircleFill, XCircleFill } from "@styled-icons/bootstrap";
import precalcMetrics from "../../data/precalc/precalcSpan.json";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Span component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Span: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("span", t);

  // Labels
  const titleLabel = t("Span");
  const mapLabel = t("Map");
  const withinLabel = t("Shoreline within MPA(s)");
  const unitsLabel = t("mi");

  return (
    <ResultsCard title={titleLabel} functionName="span">
      {(metricResults: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          metricResults.filter((m) => m.metricId === metricGroup.metricId),
          [id],
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
          idProperty: "geographyId",
        });
        const metrics = [...valueMetrics, ...percentMetrics];

        // Get overall length of sketch metric
        const lengthMetric = firstMatchingMetric(
          metrics,
          (m) =>
            m.sketchId === id &&
            m.groupId === null &&
            m.geographyId === "world",
        );

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Span 1">
                This report summarizes the total length and proportion of
                shoreline contained within the selected MPA(s).
              </Trans>
            </p>

            {!isCollection && <SpanObjectives value={lengthMetric.value} />}

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: " ",
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
                        typeof val === "string" ? parseInt(val) : val,
                        2,
                        { keepSmallValues: true },
                      ),
                    ),
                  colStyle: { textAlign: "center" },
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 25,
                },
                {
                  columnLabel: t("% Total Shoreline"),
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 30,
                },
                {
                  columnLabel: mapLabel,
                  type: "layerToggle",
                  width: 10,
                },
              ]}
            />

            <Collapse title={t("Show By Planning Region")}>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_sr"),
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Planning Region",
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
                          typeof val === "string" ? parseInt(val) : val,
                          2,
                          { keepSmallValues: true },
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
                    columnLabel: t("% Planning Region Shoreline"),
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
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_br"),
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Bioregion",
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
                          typeof val === "string" ? parseInt(val) : val,
                          2,
                          { keepSmallValues: true },
                        ),
                      ),
                    colStyle: { textAlign: "center" },
                    valueLabel: unitsLabel,
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 35,
                  },
                  {
                    columnLabel: t("% Bioregion Shoreline"),
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
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by MPA")}>
                <>
                  <p>
                    During the planning process to establish California’s
                    Network of MPAs, the Science Advisory Team recommended a
                    minimum alongshore span of 5-10 km (3-6 mi) of coastline,
                    and preferably 10-20 km (6-12.5 mi).
                  </p>
                  {genLengthSketchTable(
                    childProperties || [],
                    metricResults.filter((m) => m.geographyId === "world"),
                    precalcMetrics.filter((m) => m.geographyId === "world"),
                    metricGroup,
                    t,
                  )}
                </>
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Span - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the alongshore span of the
                  selected MPA(s). This value is divided by the total alongshore
                  span of the California coastline to obtain the % contained
                  within the selected MPA(s). If the selected MPA(s) include
                  multiple areas that overlap, the overlap is only counted once.
                </p>
                <p>Last updated: January 15, 2025.</p>
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
  childProperties: SketchProperties[],
  metrics: Metric[],
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
) => {
  console.log(metrics);
  const sketchesById = keyBy(childProperties, (sk) => sk.id);
  const sketchIds = childProperties.map((sk) => sk.id);
  const sketchMetrics = metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId),
  );
  console.log(sketchMetrics);
  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(sketchMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];
  console.log(finalMetrics);

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
            Header: t("Minimum") + " ".repeat(index),
            accessor: (row: { sketchId: string }) => {
              const miVal =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;

              return miVal > 3 ? (
                <CheckCircleFill size={15} style={{ color: "#78c679" }} />
              ) : (
                <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
              );
            },
          },
          {
            Header: t("Preferred") + " ".repeat(index),
            accessor: (row: { sketchId: string }) => {
              const miVal =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;

              return miVal > 6 ? (
                <CheckCircleFill size={15} style={{ color: "#78c679" }} />
              ) : (
                <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
              );
            },
          },
          {
            Header: t("Length") + " ".repeat(index),
            accessor: (row) => {
              const miVal =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;

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
      accessor: (row) => sketchesById[row.sketchId].name,
    },
    ...classColumns,
  ];

  return (
    <AreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};

const SpanObjectives = (props: { value: number }) => {
  return (
    <>
      <p>
        During the planning process to establish California's Network of MPAs,
        the Science Advisory Team recommended a minimum alongshore span of 5-10
        km (3-6 mi) of coastline, and preferably 10-20 km (6-12.5 mi).
      </p>
      {props.value > 3 && props.value < 6 ? (
        <ObjectiveStatus
          status={"yes"}
          style={{ color: "#EBB414" }}
          msg={
            <>
              This MPA meets the 3-6 mile minimum span guideline, but does not
              meet the {">"} 6 mile preferred span guideline.
            </>
          }
        />
      ) : props.value > 6 ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>This MPA meets the {">"} 6 mile preferred span guideline</>}
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={<>This MPA does not meet the 3 mile minimum span guideline</>}
        />
      )}
    </>
  );
};
