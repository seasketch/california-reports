import React from "react";
import {
  ResultsCard,
  KeySection,
  Collapse,
  ToolbarCard,
  LayerToggle,
  VerticalSpacer,
  useSketchProperties,
  Column,
  Table,
  ReportTableStyled,
} from "@seasketch/geoprocessing/client-ui";
import { BathymetryResults } from "../functions/bathymetry.js";
import { Trans, useTranslation } from "react-i18next";
import project from "../../project/index.js";
import { ReportProps } from "../util/ReportProp.js";
import styled from "styled-components";

const formatDepth = (val: number) => {
  if (!val) return "0m";
  if (val > 0) val = 0;
  const baseVal = Math.abs(parseInt(val.toString()));
  return val ? `-${baseVal}m` : `0m`;
};

export const Bathymetry: React.FunctionComponent<ReportProps> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const mg = project.getMetricGroup("bathymetry", t);
  const mapLabel = t("Map");

  return (
    <div style={{ breakInside: "avoid" }}>
      <ResultsCard title={t("Depth")} functionName="bathymetry" useChildCard>
        {(data: BathymetryResults[]) => {
          const overallStats = isCollection
            ? data.find((s) => s.isCollection)
            : data[0];

          return (
            <ToolbarCard
              title={t("Depth")}
              items={
                <>
                  <LayerToggle label={mapLabel} layerId={mg.layerId} simple />
                </>
              }
            >
              <VerticalSpacer />
              <KeySection
                style={{ display: "flex", justifyContent: "space-around" }}
              >
                <span>
                  {t("Min")}: <b>{formatDepth(overallStats!.max)}</b>
                </span>
                {overallStats!.mean && (
                  <span>
                    {t("Avg")}: <b>{formatDepth(overallStats!.mean)}</b>
                  </span>
                )}
                <span>
                  {t("Max")}: <b>{formatDepth(overallStats!.min)}</b>
                </span>
              </KeySection>

              {isCollection && (
                <Collapse title={t("Show by Sketch")}>
                  {genBathymetryTable(data)}
                </Collapse>
              )}

              {!props.printing && (
                <Collapse title={t("Learn More")}>
                  <BathymetryLearnMore />
                </Collapse>
              )}
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </div>
  );
};

/** Protection level learn more */
export const BathymetryLearnMore: React.FunctionComponent = () => {
  return (
    <>
      <Trans i18nKey="Bathymetry Card - Learn more">
        <p>
          ℹ️ Overview: Ocean depth is useful in determining where fish and other
          marine life feed, live, and breed. Plans should consider protecting a
          wide range of water depths.
        </p>
        <p>🎯 Planning Objective: None</p>
        <p>🗺️ Source Data: NOAA NCEI</p>
        <p>
          📈 Report: Calculates the minimum, average, and maximum ocean depth
          within the plan.
        </p>
      </Trans>
    </>
  );
};

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const AreaSketchTableStyled = styled(ReportTableStyled)`
  & {
    width: 100%;
    overflow-x: scroll;
    font-size: 12px;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }

  th,
  tr,
  td {
    text-align: center;
  }

  td:not(:first-child),
  th {
    white-space: nowrap;
  }
`;

/**
 * Creates "Show by Zone" report, with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genBathymetryTable = (data: BathymetryResults[]) => {
  const sketchMetrics = data.filter((s) => !s.isCollection);
  console.log(sketchMetrics);

  const classColumns: Column<BathymetryResults>[] = [
    {
      Header: "Min",
      accessor: (row) => formatDepth(row.max),
    },
    {
      Header: "Mean",
      accessor: (row) => formatDepth(row.mean),
    },
    {
      Header: "Max",
      accessor: (row) => formatDepth(row.min),
    },
  ];

  const columns: Column<BathymetryResults>[] = [
    {
      Header: "MPA",
      accessor: (row) => row.sketchName,
    },
    ...classColumns,
  ];

  return (
    <AreaSketchTableStyled>
      <Table columns={columns} data={sketchMetrics} />
    </AreaSketchTableStyled>
  );
};
