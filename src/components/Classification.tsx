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
import {
  groups,
  groupColorMap,
  groupColorMapTransparent,
  groupDisplayMapPl,
  groupDisplayMapSg,
} from "../util/getGroup.js";

// Table styling for Show by MPA table
export const SmallReportTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
  }
`;

/**
 * Top level Classification report - JSX.Element
 */
export const ClassificationCard: React.FunctionComponent = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  return (
    <ResultsCard
      title={t("Classification Overview")}
      functionName="classification"
    >
      {(data: ReportResult) => {
        return (
          <ReportError>
            <p>
              The following classifications are used for designating managed
              marine and estuarine areas in California: State Marine Reserve
              (SMR), State Marine Conservation Area (SMCA), SMCA no-take, State
              Marine Recreational Management Area (SMRMA), and Special Closure.
              In addition, the classification State Marine Park (SMP) is used by
              the California Department of Parks and Recreation.
            </p>
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
 * Report classification level for single sketch
 * @param metrics Metric[] passed from ReportResult
 * @param mg MetricGroup
 * @param t TFunction for translation
 */
const sketchReport = (metrics: Metric[], t: any) => {
  // Should only have only a single metric
  if (metrics.length !== 1)
    throw new Error(
      "In single sketch classification report, and getting !=1 metric",
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
        <ClassificationLearnMore t={t} />
      </Collapse>
    </>
  );
};

/**
 * Report classification level for sketch collection
 * @param sketch NullSketchCollection | NullSketch passed from ReportResult
 * @param metrics Metric[] passed from ReportResult
 * @param mg MetricGroup
 * @param t TFunction for translation
 */
const sketchCollectionReport = (
  sketch: NullSketchCollection | NullSketch,
  metrics: Metric[],
  t: any,
) => {
  const sketches = toNullSketchArray(sketch);
  const sortedMetrics = metrics.sort(
    (a, b) => groups.indexOf(a.groupId || "") - groups.indexOf(b.groupId || ""),
  );

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
      <Table className="styled" columns={columns} data={sortedMetrics} />

      <Collapse title={t("Show by MPA")}>
        {genMpaSketchTable(sketches, t)}
      </Collapse>

      <Collapse title={t("Learn More")}>
        <ClassificationLearnMore t={t} />
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
      Header: t("Classification Level"),
      accessor: (row) => (
        <GroupPill
          groupColorMap={groupColorMapTransparent}
          group={getUserAttribute(row.properties, "proposed_designation", "")}
        >
          {t(
            groupDisplayMapSg[
              getUserAttribute(row.properties, "proposed_designation", "")
            ],
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
          a.properties.name.localeCompare(b.properties.name),
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

/** Classification level learn more */
export const ClassificationLearnMore: React.FunctionComponent<
  LearnMoreProps
> = ({ t }) => {
  return (
    <>
      <Trans i18nKey="Classification Card - Learn more">
        <p>
          📈 Report: This report totals number of areas in each classification.
          See the Glossary for more detailed explanations of the classification
          levels.
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
