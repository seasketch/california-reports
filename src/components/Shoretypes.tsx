import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  LayerToggle,
  ReportError,
  ResultsCard,
  VerticalSpacer,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  ReportResult,
  metricsWithSketchId,
  roundDecimal,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genAreaSketchTable } from "../util/genAreaSketchTable.js";

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
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("shoretypes", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId
  );

  // Labels
  const titleLabel = t("Shoreline Habitats");
  const classLabel = t("Shoretype");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="shoretypes"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id]
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
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
              rows={metrics}
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

            {isCollection && (
              <Collapse title={t("Show by Sketch")}>
                {genAreaSketchTable(data, precalcMetrics, metricGroup, t)}
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
