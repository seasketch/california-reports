import React from "react";
import {
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
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const { t } = useTranslation();
  const geographies = project.geographies;
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap", t);
  // Planning regions total area
  const boundaryTotalMetrics = project
    .getPrecalcMetrics()
    .filter((m) => m.metricId === "area" && m.classId === "clipLayer-total")
    .map(
      (metric): Metric => ({
        ...metric,
        classId: "state_waters",
      }),
    );

  const withinLabel = t("Area");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={t("Size")}
      functionName="boundaryAreaOverlap"
      useChildCard
    >
      {(metricResults: Metric[]) => {
        // Get overall area of sketch metric
        const areaMetric = firstMatchingMetric(
          metricResults,
          (m) =>
            m.sketchId === id &&
            m.groupId === null &&
            m.geographyId === "world",
        );

        // Grab overall size precalc metric
        const totalAreaMetric = firstMatchingMetric(
          boundaryTotalMetrics,
          (m) => m.groupId === null && m.geographyId === "world",
        );

        // Format area metrics for key section display
        const areaDisplay = roundLower(squareMeterToMile(areaMetric.value));
        const percDisplay = percentWithEdge(
          areaMetric.value / totalAreaMetric.value,
        );
        const areaUnitDisplay = t("mi²");
        const mapLabel = t("Show California State Waters On Map");
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          metricResults.filter((m) => m.metricId === metricGroup.metricId),
          [id],
        );
        const percentMetrics = toPercentMetric(
          valueMetrics,
          boundaryTotalMetrics,
          {
            metricIdOverride: percMetricIdName,
            idProperty: "geographyId",
          },
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
                    data={metricResults}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                </>
              }
            >
              <p>
                <Trans i18nKey="SizeCard - intro">
                  California state waters extend to 3 nautical miles from shore,
                  covering about 5,285 square miles (excluding the 473 square
                  miles of state waters in San Francisco Bay). This report
                  summarizes the total area and the proportion of state waters
                  contained within the selected MPA(s).
                </Trans>
              </p>
              <KeySection>
                {t("The selected MPA(s) are")}{" "}
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
                  id,
                  metricResults.filter((m) => m.geographyId === "world"),
                  boundaryTotalMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                )
              ) : (
                <>
                  <SizeObjectives value={squareMeterToMile(areaMetric.value)} />
                  {groupedSketchReport(
                    metricResults.filter((m) => m.geographyId === "world"),
                    boundaryTotalMetrics.filter(
                      (m) => m.geographyId === "world",
                    ),
                    metricGroup,
                    t,
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
                      id,
                      metricResults.filter((m) => m.geographyId === "world"),
                      boundaryTotalMetrics.filter(
                        (m) => m.geographyId === "world",
                      ),
                      metricGroup,
                      t,
                    )}
                  </Collapse>
                  <Collapse title={t("Show By Planning Region")}>
                    <GeographyTable
                      rows={metrics.filter((m) =>
                        m.geographyId?.endsWith("_sr"),
                      )}
                      metricGroup={metricGroup}
                      geographies={geographies.filter((g) =>
                        g.geographyId?.endsWith("_sr"),
                      )}
                      columnConfig={[
                        {
                          columnLabel: " ",
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
                                squareMeterToMile(
                                  typeof val === "string" ? parseInt(val) : val,
                                ),
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
                          columnLabel: t("% Planning Region"),
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
                      rows={metrics.filter((m) =>
                        m.geographyId?.endsWith("_br"),
                      )}
                      metricGroup={metricGroup}
                      geographies={geographies.filter((g) =>
                        g.geographyId?.endsWith("_br"),
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
                                  typeof val === "string" ? parseInt(val) : val,
                                ),
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
                          columnLabel: t("% Bioregion"),
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
                    <p>
                      During the planning process to establish California’s
                      Network of MPAs, the Science Advisory Team recommended a
                      minimum size of 9-18 square statute miles for each MPA,
                      and preferably 18-36 square statute miles.
                    </p>
                    {genSketchTable(
                      childProperties || [],
                      metricResults.filter((m) => m.geographyId === "world"),
                      boundaryTotalMetrics,
                      metricGroup,
                      t,
                      { size: true },
                    )}
                  </Collapse>
                </>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="SizeCard-learn more">
                  <p>🗺️ Source Data: CDFW</p>
                  <p>
                    📈 Report: This report calculates area of the selected
                    MPA(s). If MPA boundaries overlap, the overlap is only
                    counted once.
                  </p>
                  <p>Last updated: December 12, 2024</p>
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
      <p>
        During the planning process to establish California’s Network of MPAs,
        the Science Advisory Team recommended a minimum size of 9-18 square
        statute miles for each MPA, and preferably 18-36 square statute miles.
      </p>
      {props.value > 9 && props.value < 18 ? (
        <ObjectiveStatus
          status={"yes"}
          style={{ color: "#EBB414" }}
          msg={
            <>
              This MPA meets the 9-18 mi² minimum size guideline, but does not
              meet the {">"}18 mi² preferred size guideline.
            </>
          }
        />
      ) : props.value > 18 ? (
        <ObjectiveStatus
          status={"yes"}
          msg={
            <>
              This MPA meets the {">"}18 square mile preferred size guideline.
            </>
          }
        />
      ) : (
        <ObjectiveStatus
          status={"no"}
          msg={
            <>
              This MPA does not meet the 9-18 square mile minimum size
              guideline.
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
