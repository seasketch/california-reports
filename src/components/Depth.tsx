import React from "react";
import {
  ResultsCard,
  KeySection,
  Collapse,
  ToolbarCard,
  LayerToggle,
  useSketchProperties,
  Column,
  Table,
  ReportTableStyled,
} from "@seasketch/geoprocessing/client-ui";
import { BathymetryResults } from "../functions/bathymetry.js";
import { Trans, useTranslation } from "react-i18next";
import project from "../../project/index.js";
import { styled } from "styled-components";

const formatDepth = (val: number) => {
  if (!val || val > 0) return "0ft";
  const baseVal = Math.round(Math.abs(val) * 3.281);
  return `-${baseVal}ft`;
};

export const Depth: React.FunctionComponent = () => {
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
              <p>
                MPAs can potentially protect a large number of species which may
                occur at a wide variety of depth ranges.
              </p>
              <p>
                For an objective of protecting the diversity of species that
                live at different depths and to accommodate the ontogenetic
                movement of individuals to and from nursery or spawning grounds
                to adult habitats, MPAs should extend from the intertidal zone
                to deep waters offshore.
              </p>
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

              <Collapse title={t("Learn More")}>
                <Trans i18nKey="Depth Card - Learn more">
                  <p>🗺️ Source Data: NOAA NCEI</p>
                  <p>
                    📈 Report: Calculates the minimum, average, and maximum
                    ocean depth within the selected MPA(s).
                  </p>
                  <p>Last updated: October 29, 2024.</p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </div>
  );
};

export const BathyTableStyled = styled(ReportTableStyled)`
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

export const genBathymetryTable = (data: BathymetryResults[]) => {
  const sketchMetrics = data.filter((s) => !s.isCollection);

  const columns: Column<BathymetryResults>[] = [
    {
      Header: "MPA",
      accessor: (row) => row.sketchName,
    },
    {
      Header: "Min",
      accessor: (row) => formatDepth(row.max),
    },
    {
      Header: "Mean",
      accessor: (row) => formatDepth(row.mean!),
    },
    {
      Header: "Max",
      accessor: (row) => formatDepth(row.min),
    },
  ];

  return (
    <BathyTableStyled>
      <Table columns={columns} data={sketchMetrics} />
    </BathyTableStyled>
  );
};
