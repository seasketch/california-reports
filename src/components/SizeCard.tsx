import React from "react";
import {
  ReportResult,
  GeogProp,
  squareMeterToMile,
  firstMatchingMetric,
  roundLower,
  percentWithEdge,
  roundDecimal,
  Metric,
  metricsWithSketchId,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import {
  Collapse,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  DataDownload,
  VerticalSpacer,
  KeySection,
  LayerToggle,
  ObjectiveStatus,
} from "@seasketch/geoprocessing/client-ui";
import project from "../../project/projectClient.js";
import Translator from "../components/TranslatorAsync.js";
import { Trans, useTranslation } from "react-i18next";
import { genSketchTable } from "../util/genSketchTable.js";
import {
  genAreaGroupLevelTable,
  groupedCollectionReport,
  groupedSketchReport,
} from "../util/ProtectionLevelOverlapReports.js";
import { GeographyTable } from "../util/GeographyTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const SizeCard: React.FunctionComponent<GeogProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const geographies = project.geographies;
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap", t);
  // Planning regions total area
  const boundaryTotalMetrics = project
    .getPrecalcMetrics()
    .filter((m) => m.metricId === "area" && m.classId === "study_regions-total")
    .map(
      (metric): Metric => ({
        ...metric,
        classId: "state_waters",
      })
    );

  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("sq. mi.");

  const notFoundString = t("Results not found");
  return (
    <ResultsCard
      title={t("Size")}
      functionName="boundaryAreaOverlap"
      useChildCard
    >
      {(data: ReportResult) => {
        if (Object.keys(data).length === 0) throw new Error(notFoundString);

        // Get overall area of sketch metric
        const areaMetric = firstMatchingMetric(
          data.metrics,
          (m) =>
            m.sketchId === data.sketch.properties.id &&
            m.groupId === null &&
            m.geographyId === "world"
        );

        // Grab overall size precalc metric
        const totalAreaMetric = firstMatchingMetric(
          boundaryTotalMetrics,
          (m) => m.groupId === null && m.geographyId === "world"
        );

        // Format area metrics for key section display
        const areaDisplay = roundLower(squareMeterToMile(areaMetric.value));
        const percDisplay = percentWithEdge(
          areaMetric.value / totalAreaMetric.value
        );
        const areaUnitDisplay = t("mi²");
        const mapLabel = t("Show Map Layer");
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id]
        );
        const percentMetrics = toPercentMetric(
          valueMetrics,
          boundaryTotalMetrics,
          {
            metricIdOverride: percMetricIdName,
            idProperty: "geographyId",
          }
        );
        const metrics = [...valueMetrics, ...percentMetrics];

        return (
          <>
            <ToolbarCard
              title={t("Size")}
              items={
                <>
                  <DataDownload
                    filename="size"
                    data={data.metrics}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                </>
              }
            >
              <p>
                <Trans i18nKey="SizeCard - intro">
                  Californian state waters extend from the shoreline out to 12
                  nautical miles. This report summarizes plan overlap with state
                  waters.
                </Trans>
              </p>
              <KeySection>
                {t("This plan is")}{" "}
                <b>
                  {areaDisplay} {areaUnitDisplay}
                </b>
                {", "}
                {t("which is")} <b>{percDisplay}</b> {t("of")}{" "}
                {t("Californian state waters")}.
              </KeySection>

              <LayerToggle label={mapLabel} layerId={metricGroup.layerId} />
              <VerticalSpacer />

              {isCollection ? (
                groupedCollectionReport(
                  {
                    ...data,
                    metrics: data.metrics.filter(
                      (m) => m.geographyId === "world"
                    ),
                  },
                  boundaryTotalMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t
                )
              ) : (
                <>
                  <SizeObjectives value={squareMeterToMile(areaMetric.value)} />
                  {groupedSketchReport(
                    {
                      ...data,
                      metrics: data.metrics.filter(
                        (m) => m.geographyId === "world"
                      ),
                    },
                    boundaryTotalMetrics.filter(
                      (m) => m.geographyId === "world"
                    ),
                    metricGroup,
                    t
                  )}
                </>
              )}

              {isCollection && (
                <>
                  <Collapse
                    title={t("Show by Protection Level")}
                    key={"Protection"}
                  >
                    {genAreaGroupLevelTable(
                      {
                        ...data,
                        metrics: data.metrics.filter(
                          (m) => m.geographyId === "world"
                        ),
                      },
                      boundaryTotalMetrics.filter(
                        (m) => m.geographyId === "world"
                      ),
                      metricGroup,
                      t
                    )}
                  </Collapse>
                  <Collapse title={t("Show By Planning Region")}>
                    <GeographyTable
                      rows={metrics.filter((m) =>
                        m.geographyId?.endsWith("_sr")
                      )}
                      metricGroup={metricGroup}
                      geographies={geographies.filter((g) =>
                        g.geographyId?.endsWith("_sr")
                      )}
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
                  </Collapse>

                  <Collapse title={t("Show By Bioregion")}>
                    <GeographyTable
                      rows={metrics.filter((m) =>
                        m.geographyId?.endsWith("_br")
                      )}
                      metricGroup={metricGroup}
                      geographies={geographies.filter((g) =>
                        g.geographyId?.endsWith("_br")
                      )}
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
                  </Collapse>
                  <Collapse title={t("Show by MPA")} key={"MPA"}>
                    {genSketchTable(
                      {
                        ...data,
                        metrics: data.metrics.filter(
                          (m) => m.geographyId === "world"
                        ),
                      },
                      boundaryTotalMetrics,
                      metricGroup,
                      t,
                      { size: true }
                    )}
                  </Collapse>
                </>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="SizeCard-learn more">
                  <p>
                    ℹ️ Overview: This report summarizes the size and proportion
                    of this plan within these boundaries.
                  </p>
                  <p>
                    Designations to protection levels come from the Californian
                    MLPA process. No-take: State Marine Reserve, "No Take" State
                    Marine Conservation Area. Limited-take: State Marine
                    Conservation Area, State Marine Park, State Marine
                    Recreational Management Area, State Marine Conservation
                    Area. Special closures are in their own protection level.
                  </p>
                  <p>🎯 Planning Objective: None </p>
                  <p>🗺️ Source Data: CDFW</p>
                  <p>
                    📈 Report: If sketch boundaries within a plan overlap with
                    each other, the overlap is only counted once.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          </>
        );
      }}
    </ResultsCard>
  );
};

const SizeObjectives = (props: { value: number }) => {
  return (
    <>
      {props.value > 9 && props.value < 18 ? (
        <ObjectiveStatus
          status={"yes"}
          style={{ color: "#EBB414" }}
          msg={
            <>
              This MPA meets the 9 mi² minimum size guideline, but does not meet
              the 18 mi² preferred size guideline.
            </>
          }
        />
      ) : props.value > 18 ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>This MPA meets the 18 square mile preferred size guideline.</>}
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              This MPA does not meet the 9 square mile minimum size guideline.
            </>
          }
        />
      )}
    </>
  );
};

/**
 * SizeCard as a top-level report client
 */
export const SizeCardReportClient = () => {
  return (
    <Translator>
      <SizeCard />
    </Translator>
  );
};
