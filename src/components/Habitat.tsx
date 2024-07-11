import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  ClassTableColumnConfig,
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
  createMetric,
  firstMatchingMetric,
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
 * Habitat component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Habitat: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metric group
  const mg = project.getMetricGroup("habitat", t);

  // Planning Regions
  const planningRegions = ["ncsr", "nccsr", "ccsr", "scsr_is", "scsr_ml"];
  const planningRegionsDisplay: Record<string, string> = {
    ncsr: "North Coast",
    nccsr: "North Central Coast",
    ccsr: "Central Coast",
    scsr_is: "South Coast: Islands",
    scsr_ml: "South Coast: Mainland",
  };

  // Labels
  const titleLabel = t("Seafloor Habitat");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");
  const substrateLabel = t("Substrate");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="habitat"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${mg.metricId}Perc`;

        // All metrics
        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === mg.metricId),
          [data.sketch.properties.id]
        );
        const precalcMetrics = project.getPrecalcMetrics(
          mg,
          "valid",
          curGeography.geographyId
        );

        // Total sum metrics
        const totalClasses: any = [];
        const uniqueClasses: { [key: string]: boolean } = {};
        mg.classes.forEach((curClass) => {
          if (!uniqueClasses[curClass.classId]) {
            uniqueClasses[curClass.classId] = true;
            totalClasses.push({
              classId: curClass.classId,
              display: curClass.display,
            });
          }
        });
        const totalMg = {
          metricId: mg.metricId,
          type: mg.type,
          classes: totalClasses,
        };
        const totalValueMetrics = flattenByClass(valueMetrics, mg);
        const totalPrecalcMetrics = flattenByClass(precalcMetrics, mg);
        const totalPercMetrics = toPercentMetric(
          totalValueMetrics,
          totalPrecalcMetrics,
          {
            metricIdOverride: percMetricIdName,
          }
        );
        const totalMetrics = [...totalValueMetrics, ...totalPercMetrics];

        return (
          <ReportError>
            <p>
              <Trans i18nKey="Habitat 1">
                This report summarizes this plan's overlap with seafloor
                habitats.
              </Trans>
            </p>

            {!isCollection && (
              <HabitatObjectives
                metricGroup={totalMg}
                metrics={totalValueMetrics}
              />
            )}

            {/* Total metrics */}
            <ClassTable
              rows={totalMetrics}
              metricGroup={totalMg}
              columnConfig={[
                { columnLabel: substrateLabel, type: "class", width: 30 },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: mg.metricId,
                  valueFormatter: (val) =>
                    Number.format(
                      roundDecimal(
                        squareMeterToMile(
                          typeof val === "string"
                            ? parseInt(val) * 40 * 40
                            : val * 40 * 40
                        )
                      )
                    ),
                  valueLabel: unitsLabel,
                  chartOptions: { showTitle: true },
                  width: 20,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: { showTitle: true },
                  width: 40,
                },
              ]}
            />

            {/* Individual planning region metrics */}
            <Collapse title={t("Show by Planning Region")}>
              {planningRegions.map((region) => {
                const regionMg = {
                  ...mg,
                  classes: mg.classes.filter((c) => c.classKey === region),
                };
                const regionValueMetrics = valueMetrics.filter(
                  (m) => m.groupId === region
                );
                const regionPrecalcMetrics = project.getPrecalcMetrics(
                  regionMg,
                  "valid",
                  curGeography.geographyId
                );
                const regionPercMetrics = toPercentMetric(
                  regionValueMetrics,
                  regionPrecalcMetrics,
                  {
                    metricIdOverride: percMetricIdName,
                  }
                );
                const metrics = [...regionValueMetrics, ...regionPercMetrics];

                const columnConfig: ClassTableColumnConfig[] = [
                  { columnLabel: substrateLabel, type: "class", width: 40 },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: mg.metricId,
                    valueFormatter: (val) =>
                      Number.format(
                        roundDecimal(
                          squareMeterToMile(
                            typeof val === "string"
                              ? parseInt(val) * 40 * 40
                              : val * 40 * 40
                          ),
                          1,
                          { keepSmallValues: true }
                        )
                      ),
                    valueLabel: unitsLabel,
                    chartOptions: { showTitle: true },
                    width: 20,
                  },
                  {
                    columnLabel: percWithinLabel,
                    type: "metricChart",
                    metricId: percMetricIdName,
                    valueFormatter: "percent",
                    chartOptions: { showTitle: true },
                    width: 40,
                  },
                ];

                return (
                  <Collapse
                    title={t(planningRegionsDisplay[region])}
                    key={region}
                  >
                    <VerticalSpacer />
                    <LayerToggle
                      label={t("Show Map Layer")}
                      layerId={regionMg.classes[0].layerId}
                    />
                    <ClassTable
                      rows={metrics}
                      metricGroup={regionMg}
                      columnConfig={columnConfig}
                    />
                  </Collapse>
                );
              })}
            </Collapse>

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genSketchTable(data, totalPrecalcMetrics, totalMg, t)}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Habitat - learn more">
                <p>
                  ℹ️ Overview: Seafloor habitat protected by this plan is shown.
                  Habitat data has been downsampled to a 40m x 40m raster grid
                  for efficiency, therefore area calculations are estimates.
                  Final plans should check area totals in GIS tools before
                  publishing final area statistics. Replication indicates
                  whether that seafloor habitat is protected in all five
                  planning regions.
                </p>
                <p>
                  Habitat replication guidelines come from the SAT 2011 MLPA
                  Guidelines. Rock guidelines are listed under 'rocky reef' and
                  sediment listed under 'soft bottom'. Rock 0-30m: 1.1 square
                  miles, 30-100: 0.13 square miles, above 100m: 0.13 square
                  miles. Sediment 0-30m: 1.1 square miles, 30-100m: 7 square
                  miles, above 100m: 17 square miles.
                </p>
                <p>
                  🎯 Planning Objective: Habitat replication for each substrate
                  type and depth level.
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

function flattenByClass(metrics: Metric[], mg: MetricGroup): Metric[] {
  return Object.entries(
    metrics.reduce<Record<string, number>>((acc: Record<string, number>, m) => {
      if (!m.classId) throw new Error("Missing classId");
      if (acc[m.classId]) acc[m.classId] += m.value;
      else acc[m.classId] = m.value;
      return acc;
    }, {})
  ).map(([classId, value]) => {
    return createMetric({
      metricId: mg.metricId,
      classId,
      value,
      groupId: "total",
    });
  });
}

const replicateMap: Record<string, number> = {
  "0": 1.1,
  "-1": 1.1,
  "-30": 7,
  "-31": 0.13,
  "-100": 17,
  "-101": 0.13,
  "-200": 17,
  "-201": 0.13,
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
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );

  let sumMetrics: Metric[] = [];
  sketchIds.forEach((sketchId) => {
    mg.classes.forEach((curClass) => {
      const metrics = sketchMetrics.filter(
        (m) => m.classId === curClass.classId && m.sketchId === sketchId
      );
      const sum = metrics.reduce((acc, cur) => acc + cur.value, 0);
      sumMetrics.push(
        createMetric({
          metricId: mg.metricId,
          classId: curClass.classId,
          sketchId,
          extra: { sketchName: sketchesById[sketchId].properties.name },
          value: sum,
        })
      );
    });
  });

  const finalMetrics = [
    ...sumMetrics,
    ...toPercentMetric(sumMetrics, precalcMetrics, {
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
                ][0].value;
              const miVal = squareMeterToMile(value * 40 * 40);

              return miVal > replicateMap[curClass.classId] ||
                (!replicateMap[curClass.classId] && miVal) ? (
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
              const miVal = squareMeterToMile(value * 40 * 40);

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
    <ReplicateAreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </ReplicateAreaSketchTableStyled>
  );
};

const HabitatObjectives = (props: {
  metricGroup: MetricGroup;
  metrics: Metric[];
}) => {
  const { metricGroup, metrics } = props;

  // Get habitat replicates passes and fails for this MPA
  const { passes, fails } = metricGroup.classes.reduce(
    (acc: { passes: string[]; fails: string[] }, curClass) => {
      const metric = firstMatchingMetric(
        metrics,
        (m) => m.classId === curClass.classId
      );
      if (!metric) throw new Error(`Expected metric for ${curClass.classId}`);

      const value = squareMeterToMile(metric.value * 40 * 40);
      const replicateValue = replicateMap[curClass.classId];

      value > replicateValue || (!replicateValue && value)
        ? acc.passes.push(curClass.display)
        : acc.fails.push(curClass.display);

      return acc;
    },
    { passes: [], fails: [] }
  );

  return (
    <>
      {passes.length > 0 && (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <>
              This MPA meets the habitat replicate guidelines for:{" "}
              {passes.join(", ")}
            </>
          }
        />
      )}
      {fails.length > 0 && (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              This MPA does not meet the habitat replicate guidelines for:{" "}
              {fails.join(", ")}
            </>
          }
        />
      )}
    </>
  );
};
