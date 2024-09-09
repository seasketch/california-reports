import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  KeySection,
  LayerToggle,
  ObjectiveStatus,
  ReportError,
  ResultsCard,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  NullSketch,
  NullSketchCollection,
  Polygon,
  Sketch,
  firstMatchingMetric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genSketchTable } from "../util/genSketchTable.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { ReplicateMap, SpacingObjectives } from "./Spacing.js";

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
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("kelpMax", t);
  const precalcMetrics = geographies
    .map((geography) =>
      project.getPrecalcMetrics(metricGroup, "area", geography.geographyId)
    )
    .reduce<Metric[]>((metrics, curMetrics) => metrics.concat(curMetrics), []);

  // Labels
  const titleLabel = t("Kelp (Maximum)");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="kelpMax">
      {(data: {
        metrics: Metric[];
        sketch: NullSketch | NullSketchCollection;
        simpleSketches: Sketch<Polygon>[];
        replicateIds: string[];
        paths: any;
      }) => {
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
            <Trans i18nKey="KelpMax 1">
              <p>
                Potential kelp forest is a key habitat. This report summarizes
                the overlap of the selected MPA(s) with the maximum kelp canopy
                coverage over the years 2002-2016.
              </p>
              <p>
                The minimum extent of nearshore rocky reef within an MPA
                necessary to encompass 90% of local biodiversity in a kelp
                forest is 1.1 linear miles, as determined from biological
                surveys.
              </p>
            </Trans>

            <LayerToggle
              label={t("Show Kelp Layer On Map")}
              layerId={metricGroup.layerId}
            />
            <VerticalSpacer />

            {!isCollection && (
              <KelpMaxObjectives
                metricGroup={metricGroup}
                metrics={valueMetrics.filter((m) => m.geographyId === "world")}
              />
            )}

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
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
                        ),
                        2,
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

            <Collapse title={t("Show By Planning Region")}>
              <p>
                <Trans i18nKey="Kelp Planning Region">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>planning region</i>. The San Francisco Bay
                  planning region is excluded due to not containing any kelp
                  forests per the data provided.
                </Trans>
              </p>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_sr"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_sr")
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Kelp (Maximum)",
                    type: "class",
                    width: 35,
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
                          ),
                          2,
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
                    width: 35,
                  },
                ]}
              />
            </Collapse>

            <Collapse title={t("Show By Bioregion")}>
              <p>
                <Trans i18nKey="Kelp Bioregion">
                  The following is a breakdown of this plan's overlap with kelp
                  forests by <i>bioregion</i>.
                </Trans>
              </p>
              <GeographyTable
                rows={metrics.filter((m) => m.geographyId?.endsWith("_br"))}
                metricGroup={metricGroup}
                geographies={geographies.filter((g) =>
                  g.geographyId?.endsWith("_br")
                )}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: "Kelp (Maximum)",
                    type: "class",
                    width: 35,
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
                          ),
                          2,
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
                    width: 35,
                  },
                ]}
              />
            </Collapse>

            {isCollection && (
              <>
                <Collapse title={t("Show by Sketch")}>
                  {genSketchTable(
                    {
                      ...data,
                      metrics: data.metrics.filter(
                        (m) => m.geographyId === "world"
                      ),
                    },
                    precalcMetrics.filter((m) => m.geographyId === "world"),
                    metricGroup,
                    t,
                    { replicate: true, replicateMap: { kelpMax: 1.1 } }
                  )}
                </Collapse>
                <Collapse title={t("Spacing Analysis")}>
                  <VerticalSpacer />
                  <KeySection>
                    <p>
                      Of the {data.simpleSketches.length} MPAs analyzed,{" "}
                      {data.replicateIds.length}{" "}
                      {data.replicateIds.length === 1
                        ? "qualifies as a kelp habitat replicate."
                        : "qualify as kelp habitat replicates."}
                    </p>
                  </KeySection>
                  {data.replicateIds.length !== 0 && (
                    <>
                      {data.replicateIds.length > 1 && (
                        <SpacingObjectives paths={data.paths} />
                      )}
                      <VerticalSpacer />
                      <ReplicateMap
                        sketch={data.simpleSketches}
                        replicateIds={data.replicateIds}
                        paths={data.paths}
                      />
                    </>
                  )}
                </Collapse>
              </>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="KelpMax - learn more">
                <p>
                  ℹ️ Overview: Overview: This layer shows the maximum extent of
                  kelp canopy based on 13 years of aerial surveys conducted
                  between 2002 and 2016.
                </p>
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total value of kelp
                  canopy coverage within the selected MPA(s). This value is
                  divided by the total value of kelp canopy coverage to obtain
                  the % contained within the selected MPA(s). If the selected
                  areaincludes multiple areas that overlap, the overlap is only
                  counted once. Kelp data has been downsampled to a 30m x 30m
                  raster grid for efficiency, so area calculations are
                  estimates. Final plans should check area totals in GIS tools
                  before publishing final area statistics.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const KelpMaxObjectives = (props: {
  metricGroup: MetricGroup;
  metrics: Metric[];
}) => {
  const { metricGroup, metrics } = props;
  const replicateMap: Record<string, number> = { kelpMax: 1.1 };

  // Get habitat replicates passes and fails for this MPA
  const { passes, fails } = metricGroup.classes.reduce(
    (acc: { passes: string[]; fails: string[] }, curClass) => {
      const metric = firstMatchingMetric(
        metrics,
        (m) => m.classId === curClass.classId
      );
      if (!metric) throw new Error(`Expected metric for ${curClass.classId}`);

      const value = squareMeterToMile(metric.value);
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
              This MPA meets the habitat replicate guidelines for kelp forests.
            </>
          }
        />
      )}
      {fails.length > 0 && (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              This MPA does not meet the habitat replicate guidelines for kelp
              forests.
            </>
          }
        />
      )}
    </>
  );
};
