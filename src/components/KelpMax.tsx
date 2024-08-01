import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  Column,
  LayerToggle,
  ReportError,
  ResultsCard,
  Table,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  ReportResult,
  createMetric,
  flattenBySketchAllClass,
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
import { CheckCircleFill, XCircleFill } from "@styled-icons/bootstrap";
import { ReplicateAreaSketchTableStyled } from "../util/genSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * KelpMax component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const KelpMax: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("kelpMax", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Kelp (Maximum)");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="kelpMax"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        // Planning region
        const srMg = {
          ...metricGroup,
          classes: metricGroup.classes.filter((c) =>
            c.classId?.endsWith("_sr")
          ),
        };
        const srValueMetrics = metricsWithSketchId(
          data.metrics.filter(
            (m) =>
              m.metricId === metricGroup.metricId && m.classId?.endsWith("_sr")
          ),
          [data.sketch.properties.id]
        );
        const srPercMetrics = toPercentMetric(
          srValueMetrics,
          precalcMetrics.filter((m) => m.classId?.endsWith("_sr")),
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const srMetrics = [...srValueMetrics, ...srPercMetrics];

        // Bioregion
        const brMg = {
          ...metricGroup,
          classes: metricGroup.classes.filter((c) =>
            c.classId?.endsWith("_br")
          ),
        };
        const brValueMetrics = metricsWithSketchId(
          data.metrics.filter(
            (m) =>
              m.metricId === metricGroup.metricId && m.classId?.endsWith("_br")
          ),
          [data.sketch.properties.id]
        );
        const brPercMetrics = toPercentMetric(
          brValueMetrics,
          precalcMetrics.filter((m) => m.classId?.endsWith("_br")),
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const brMetrics = [...brValueMetrics, ...brPercMetrics];

        // Overall / total metrics
        const overallValue = createMetric({
          ...brValueMetrics[0],
          classId: "overall",
          value: brValueMetrics.reduce((acc, m) => acc + m.value, 0),
        });
        const overallPrecalc = createMetric({
          classId: "overall",
          value: precalcMetrics.filter((m) => m.classId?.endsWith("_br")).reduce((acc, m) => acc + m.value, 0),
        });
        const overallPerc = toPercentMetric([overallValue], [overallPrecalc], {
          metricIdOverride: percMetricIdName,
        });
        const overallMetrics = [overallValue, ...overallPerc];
        const overallMG = {
          ...metricGroup,
          classes: [
            {
              classId: "overall",
              display: "Kelp Forest",
              layerId: "",
            },
          ],
        };

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <p>
              <Trans i18nKey="KelpMax 1">
                This report summarizes this plan's overlap with the maximum kelp
                distribution over the years 2002-2016.
              </Trans>
            </p>

            <LayerToggle
              label={t("Show Kelp Layer On Map")}
              layerId={metricGroup.layerId}
            />
            <VerticalSpacer />

            <ClassTable
              rows={overallMetrics}
              metricGroup={overallMG}
              columnConfig={[
                {
                  columnLabel: " ",
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
                        squareMeterToMile(
                          typeof val === "string" ? parseInt(val) : val
                        ), 2,
                        { keepSmallValues: true }
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

            <Collapse title={t("Show by Planning Region")}>
              <p>
                <Trans i18nKey="Kelp Planning Region">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>planning region</i>. The San Francisco Bay
                  planning region is excluded due to not containing any kelp
                  forests per the data provided.
                </Trans>
              </p>

              <ClassTable
                rows={srMetrics}
                metricGroup={srMg}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Planning Region",
                    type: "class",
                    width: 35,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: srMg.metricId,
                    valueFormatter: (val: string | number) =>
                      Number.format(
                        roundDecimal(
                          squareMeterToMile(
                            typeof val === "string" ? parseInt(val) : val
                          )
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
                    width: 35,
                  },
                ]}
              />
            </Collapse>

            <Collapse title={t("Show by Bioregion")}>
              <p>
                <Trans i18nKey="Kelp Bioregion">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>bioregion</i>.
                </Trans>
              </p>

              <ClassTable
                rows={brMetrics}
                metricGroup={brMg}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Bioregion",
                    type: "class",
                    width: 30,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: srMg.metricId,
                    valueFormatter: (val: string | number) =>
                      Number.format(
                        roundDecimal(
                          squareMeterToMile(
                            typeof val === "string" ? parseInt(val) : val
                          )
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
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(data, [overallPrecalc], metricGroup, t)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="KelpMax - learn more">
                <p>
                  ℹ️ Overview: The maximum area of kelp across the years
                  2002-2016 is used in this report. The area and % area of kelp
                  protected by this plan is shown. Kelp data has been
                  rasterized to a 40m x 40m raster grid for efficiency, so area
                  calculations are estimates. Final plans should check area
                  totals in GIS tools before publishing final area statistics.
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
export const genSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any
) => {
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId) && m.classId?.endsWith("_br")
  );

  console.log(precalcMetrics)

  let sumMetrics: Metric[] = [];
  sketchIds.forEach((sketchId) => {
      const metrics = sketchMetrics.filter(
        (m) => m.sketchId === sketchId
      );
      const sum = metrics.reduce((acc, cur) => acc + cur.value, 0);
      sumMetrics.push(
        createMetric({
          metricId: mg.metricId,
          classId: "overall",
          sketchId,
          extra: { sketchName: sketchesById[sketchId].properties.name },
          value: sum,
        })
      );
  });

  console.log(sumMetrics);

  const finalMetrics = [
    ...sumMetrics,
    ...toPercentMetric(sumMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "sketchId",
    "metricId",
  ]);
  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }> = {
        Header: "Kelp Maximum Extent",
        style: { color: "#777" },
        columns: [
          {
            Header: t("Replicate"),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][
                  mg.metricId
                ][0].value;
              const miVal = squareMeterToMile(value);

              return miVal > 0 ? (
                <CheckCircleFill size={15} style={{ color: "#78c679" }} />
              ) : (
                <XCircleFill size={15} style={{ color: "#ED2C7C" }} />
              );
            },
          },
          {
            Header: t("Area"),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][
                  mg.metricId
                ][0].value;
              const miVal = squareMeterToMile(value);

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                miVal && miVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(miVal));
              return valDisplay + " " + t("mi²");
            },
          },
          {
            Header: t("% Area"),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][
                  project.getMetricGroupPercId(mg)
                ][0].value;
              return percentWithEdge(isNaN(value) ? 0 : value);
            },
          },
        ],
      };

  const columns: Column<{ sketchId: string }>[] = [
    {
      Header: "MPA",
      accessor: (row) => sketchesById[row.sketchId].properties.name,
    },
    classColumns,
  ];

  return (
    <ReplicateAreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </ReplicateAreaSketchTableStyled>
  );
};