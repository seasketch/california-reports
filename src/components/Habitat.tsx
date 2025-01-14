import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
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
  firstMatchingMetric,
  metricsWithSketchId,
  roundDecimal,
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { GeographyTable } from "../util/GeographyTable.js";
import { genSketchTable } from "../util/genSketchTable.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Habitat component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Habitat: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const geographies = project.geographies;

  // Metrics
  const metricGroup = project.getMetricGroup("habitat", t);

  // Labels
  const titleLabel = t("Predicted Substrate");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard title={titleLabel} functionName="habitat">
      {(metricResults: Metric[]) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        let valueMetrics: Metric[] = [];
        let precalcMetrics: Metric[] = [];
        let percMetrics: Metric[] = [];

        geographies.forEach((g) => {
          const vMetrics = metricsWithSketchId(
            metricResults.filter(
              (m) =>
                m.metricId === metricGroup.metricId &&
                m.geographyId === g.geographyId,
            ),
            [id],
          );
          valueMetrics = valueMetrics.concat(vMetrics);

          const preMetrics = project.getPrecalcMetrics(
            metricGroup,
            "valid",
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

        console.log(metrics);

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (!objectives.length) return undefined;
          else return objectives;
        })();

        return (
          <ReportError>
            <Trans i18nKey="Habitat 1">
              <p>
                Hard and soft bottom areas at a range of depths are key
                habitats. This report summarizes the overlap of the selected
                MPA(s) with hard and soft substrate classes at four depth
                ranges: 0-30 m, 30-100 m, 100-200 m, and &gt;200 m.
              </p>
              <p>
                As determined by the Marine Life Protection Act Initiative
                Science Advisory Team, the minimum area within an MPA necessary
                to encompass 90% of local biodiversity and count as a replicate
                in each habitat and depth is:
                <br />
                <br>• soft substrate 30-100m: 7 square miles</br>
                <br>• soft substrate &gt;100m: 17 square miles</br>
                <br>• hard substrate 30-100m: 0.13 square miles</br>
                <br>• hard substrate &gt;100m: 0.13 square miles</br>
              </p>
            </Trans>

            <LayerToggle
              label={t("Show Seafloor Habitat On Map")}
              layerId={metricGroup.layerId}
            />
            <VerticalSpacer />

            {!isCollection && (
              <SubstrateObjectives
                metricGroup={metricGroup}
                metrics={valueMetrics.filter((m) => m.geographyId === "world")}
              />
            )}

            <ClassTable
              rows={metrics.filter((m) => m.geographyId === "world")}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: titleLabel,
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
                          typeof val === "string"
                            ? parseInt(val) *
                                9.710648864705849093 *
                                9.710648864705849093
                            : val * 9.710648864705849093 * 9.710648864705849093,
                        ),
                        2,
                        { keepSmallValues: true },
                      ),
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
                            squareMeterToMile(
                              typeof val === "string"
                                ? parseInt(val) *
                                    9.710648864705849093 *
                                    9.710648864705849093
                                : val *
                                    9.710648864705849093 *
                                    9.710648864705849093,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
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
                            squareMeterToMile(
                              typeof val === "string"
                                ? parseInt(val) *
                                    9.710648864705849093 *
                                    9.710648864705849093
                                : val *
                                    9.710648864705849093 *
                                    9.710648864705849093,
                            ),
                            2,
                            { keepSmallValues: true },
                          ),
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
              <Collapse title={t("Show by MPA")}>
                {genSketchTable(
                  childProperties || [],
                  metricResults.filter((m) => m.geographyId === "world"),
                  precalcMetrics.filter((m) => m.geographyId === "world"),
                  metricGroup,
                  t,
                  {
                    valueFormatter: (val) =>
                      val * 9.710648864705849093 * 9.710648864705849093,
                    replicate: true,
                    replicateMap: {
                      32: 7,
                      102: 17,
                      202: 17,
                      31: 0.13,
                      101: 0.13,
                      201: 0.13,
                    },
                  },
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="Habitat - learn more">
                <p>🗺️ Source Data: CDFW</p>
                <p>
                  📈 Report: This report calculates the total area of each
                  habitat class within the selected MPA(s). This value is
                  divided by the total area of each habitat class to obtain the
                  % contained within the selected MPA(s). If the selected area
                  includes multiple areas that overlap, the overlap is only
                  counted once. Habitat data has been downscaled to 30x30 meter
                  resolution.
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

const SubstrateObjectives = (props: {
  metricGroup: MetricGroup;
  metrics: Metric[];
}) => {
  const replicateMap = {
    32: 7,
    102: 17,
    31: 0.13,
    101: 0.13,
  };
  const { metricGroup, metrics } = props;

  const substrate31Replicate = (() => {
    const metric = firstMatchingMetric(metrics, (m) => m.classId === "31");
    if (!metric) throw new Error(`Expected metric for substrate31`);
    return (
      squareMeterToMile(
        metric.value * 9.710648864705849093 * 9.710648864705849093,
      ) > replicateMap["31"]
    );
  })();
  const substrate32Replicate = (() => {
    const metric = firstMatchingMetric(metrics, (m) => m.classId === "32");
    if (!metric) throw new Error(`Expected metric for substrate32`);
    return (
      squareMeterToMile(
        metric.value * 9.710648864705849093 * 9.710648864705849093,
      ) > replicateMap["32"]
    );
  })();

  const substrate101Replicate = (() => {
    const metric101 = firstMatchingMetric(metrics, (m) => m.classId === "101");
    const metric201 = firstMatchingMetric(metrics, (m) => m.classId === "201");
    if (!metric101 || !metric201)
      throw new Error(`Expected metric for substrate31`);
    return (
      squareMeterToMile(
        (metric101.value + metric201.value) *
          9.710648864705849093 *
          9.710648864705849093,
      ) > replicateMap["101"]
    );
  })();
  const substrate102Replicate = (() => {
    const metric102 = firstMatchingMetric(metrics, (m) => m.classId === "102");
    const metric202 = firstMatchingMetric(metrics, (m) => m.classId === "202");
    if (!metric102 || !metric202)
      throw new Error(`Expected metric for substrate31`);
    return (
      squareMeterToMile(
        (metric102.value + metric202.value) *
          9.710648864705849093 *
          9.710648864705849093,
      ) > replicateMap["102"]
    );
  })();

  return (
    <>
      {substrate31Replicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>Hard substrate (30-100m) replicate</>}
        />
      ) : (
        <></>
      )}
      {substrate32Replicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>Soft substrate (30-100m) replicate</>}
        />
      ) : (
        <></>
      )}
      {substrate101Replicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>Hard substrate (&gt;100m) replicate</>}
        />
      ) : (
        <></>
      )}
      {substrate102Replicate ? (
        <ObjectiveStatus
          status={"yes"}
          msg={<>Soft substrate (&gt;100m) replicate</>}
        />
      ) : (
        <></>
      )}
    </>
  );
};
