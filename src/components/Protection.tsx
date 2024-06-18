import React from "react";
import {
  ResultsCard,
  ReportError,
  Collapse,
  Column,
  Table,
  ReportTableStyled,
  PointyCircle,
  RbcsMpaClassPanelProps,
  RbcsIcon,
  GroupPill,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  NullSketch,
  NullSketchCollection,
  Metric,
  toNullSketchArray,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";
import { styled } from "styled-components";
import { Trans, useTranslation } from "react-i18next";
import { ReportProps } from "../util/ReportProp.js";

// Table styling for Show by MPA table
export const SmallReportTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
  }
`;

// Display values for groups (plural)
export const groupDisplayMapPl: Record<string, string> = {
  FMCA: "Federal Marine Conservation Area(s)",
  FMR: "Federal Marine Reserve(s)",
  SMCA: "State Marine Conservation Area(s)",
  SMCANT: "State Marine Conervation Area(s) (No-Take)",
  RED: "RED(s)",
  SMP: "State Marine Park(s)",
  SMR: "State Marine Reserve(s)",
  SMRMA: "State Marine Recreation Management Area(s)",
  Special: "Special Closure(s)",
};

// Display values for groups (singular)
export const groupDisplayMapSg: Record<string, string> = {
  FMCA: "Federal Marine Conservation Area",
  FMR: "Federal Marine Reserve",
  SMCA: "State Marine Conservation Area",
  SMCANT: "State Marine Conervation Area (No-Take)",
  RED: "RED",
  SMP: "State Marine Park",
  SMR: "State Marine Reserve",
  SMRMA: "State Marine Recreation Management Area",
  Special: "Special Closure",
};

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  FMCA: "#98DBF4",
  FMR: "#98DBF4",
  SMCA: "#98DBF4",
  SMCANT: "#98DBF4",
  RED: "#98DBF4",
  SMP: "#98DBF4",
  SMR: "#98DBF4",
  SMRMA: "#98DBF4",
  Special: "#98DBF4",
};

/**
 * Top level Protection report - JSX.Element
 */
export const ProtectionCard: React.FunctionComponent<ReportProps> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  return (
    <ResultsCard title={t("Plan Overview")} functionName="protection">
      {(data: ReportResult) => {
        return (
          <ReportError>
            {isCollection
              ? sketchCollectionReport(data.sketch, data.metrics, t)
              : sketchReport(data.metrics, t)}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

/**
 * Report protection level for single sketch
 * @param metrics Metric[] passed from ReportResult
 * @param mg MetricGroup
 * @param t TFunction for translation
 */
const sketchReport = (metrics: Metric[], t: any) => {
  // Should only have only a single metric
  if (metrics.length !== 1)
    throw new Error(
      "In single sketch protection report, and getting !=1 metric"
    );

  return (
    <>
      <div
        style={{
          padding: "10px 10px 10px 0px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <MpaClassPanel
          value={metrics[0].value}
          size={18}
          displayName={t(groupDisplayMapSg[metrics[0].groupId || "none"])}
          displayValue={false}
          group={metrics[0].groupId as string | undefined}
          groupColorMap={groupColorMap}
        />
      </div>

      <Collapse title={t("Learn More")}>
        <ProtectionLearnMore t={t} />
      </Collapse>
    </>
  );
};

/**
 * Report protection level for sketch collection
 * @param sketch NullSketchCollection | NullSketch passed from ReportResult
 * @param metrics Metric[] passed from ReportResult
 * @param mg MetricGroup
 * @param t TFunction for translation
 */
const sketchCollectionReport = (
  sketch: NullSketchCollection | NullSketch,
  metrics: Metric[],
  t: any
) => {
  const sketches = toNullSketchArray(sketch);
  const columns: Column<Metric>[] = [
    {
      Header: " ",
      accessor: (row) => (
        <MpaClassPanel
          value={row.value}
          size={18}
          displayName={t(groupDisplayMapPl[row.groupId || "none"])}
          group={row.groupId as string | undefined}
          groupColorMap={groupColorMap}
        />
      ),
    },
  ];

  return (
    <>
      <Table className="styled" columns={columns} data={metrics} />

      <Collapse title={t("Show by MPA")}>
        {genMpaSketchTable(sketches, t)}
      </Collapse>

      <Collapse title={t("Learn More")}>
        <ProtectionLearnMore t={t} />
      </Collapse>
    </>
  );
};

/**
 * Show by MPA sketch table for sketch collection
 */
const genMpaSketchTable = (sketches: NullSketch[], t: any) => {
  const columns: Column<NullSketch>[] = [
    {
      Header: t("MPA"),
      accessor: (row) => row.properties.name,
    },
    {
      Header: t("Protection Level"),
      accessor: (row) => (
        <GroupPill
          groupColorMap={groupColorMap}
          group={getUserAttribute(row.properties, "proposed_designation", "")}
        >
          {t(
            groupDisplayMapSg[
              getUserAttribute(row.properties, "proposed_designation", "")
            ]
          )}
        </GroupPill>
      ),
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={sketches.sort((a, b) =>
          a.properties.name.localeCompare(b.properties.name)
        )}
      />
    </SmallReportTableStyled>
  );
};

/**
 * Interface for Learn More function component
 */
interface LearnMoreProps {
  t: any;
}

/** Protection level learn more */
export const ProtectionLearnMore: React.FunctionComponent<LearnMoreProps> = ({
  t,
}) => {
  return (
    <>
      <Trans i18nKey="Protection Card - Learn more">
        <p>
          ℹ️ Overview: This planning process uses a combination of marine
          protection levels: Federal Marine Conservation Areas, Federal Marine
          Reserves, State Marine Conservation Areas, State Marine Conervation
          Area (No-Take), REDs, State Marine Parks, State Marine Reserves, State
          Marine Recreation Management Areas, and Special Closures.
        </p>
        <p>🎯 Planning Objective: None</p>
        <p>🗺️ Source Data: None</p>
        <p>
          📈 Report: Simply counts number of zones in each protection level.
        </p>
      </Trans>
    </>
  );
};

/**
 * Sketch collection status panel for MPA classification
 */
const MpaClassPanel: React.FunctionComponent<RbcsMpaClassPanelProps> = ({
  value,
  displayName,
  size,
  displayValue = true,
  group,
  groupColorMap,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ paddingRight: 10 }}>
        {group && groupColorMap ? (
          <PointyCircle size={size} color={groupColorMap[group]}>
            {displayValue ? value : null}
          </PointyCircle>
        ) : (
          <RbcsIcon value={value} size={size} displayValue={displayValue} />
        )}
      </div>
      <div style={{ fontSize: 18 }}>{displayName}</div>
    </div>
  );
};
