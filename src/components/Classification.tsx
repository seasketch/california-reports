import React from "react";
import {
  ResultsCard,
  ReportError,
  Collapse,
  Column,
  Table,
  ReportTableStyled,
  RbcsMpaClassPanelProps,
  RbcsIcon,
  GroupPill,
  useSketchProperties,
  VerticalSpacer,
  ToolbarCard,
  DataDownload,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  NullSketch,
  NullSketchCollection,
  Metric,
  toNullSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { styled } from "styled-components";
import { Trans, useTranslation } from "react-i18next";
import {
  groups,
  groupColorMap,
  groupColorMapTransparent,
} from "../util/getGroup.js";
import { PointyCircle } from "../util/PointyCircle.js";

// Table styling for Show by MPA table
export const SmallReportTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
  }
  .styled td:nth-child(2) {
    line-height: 1.5;
  }
`;

/**
 * Top level Classification report - JSX.Element
 */
export const ClassificationCard: React.FunctionComponent = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const title = t("Classification Overview");

  return (
    <ResultsCard title={title} functionName="classification" useChildCard>
      {(data: ReportResult) => {
        return (
          <ReportError>
            <ToolbarCard
              title={title}
              items={
                <>
                  <DataDownload
                    filename="classification"
                    data={data.metrics}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                </>
              }
            >
              <Trans i18nKey="Classification Card 1">
                <p>
                  The following classifications are used for designating managed
                  marine and estuarine areas in California:
                </p>
                <p>
                  • State Marine Reserve (SMR)
                  <br />• State Marine Conservation Area (SMCA)
                  <br />• State Marine Conservation Area No-Take (SMCA No-Take)
                  <br />• State Marine Recreational Management Area (SMRMA)
                  <br />• Special Closure{" "}
                </p>
                <p>
                  In addition, the classification State Marine Park (SMP) is
                  used by the California Department of Parks and Recreation.
                </p>
              </Trans>

              {isCollection
                ? sketchCollectionReport(data.sketch!, data.metrics, t)
                : sketchReport(data.metrics, t)}
            </ToolbarCard>
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

  // Display values for groups
  const groupDisplayMapSg: Record<string, string> = {
    SMR: t("State Marine Reserve"),
    SMCANT: t("State Marine Conservation Area (No-Take)"),
    SMCA: t("State Marine Conservation Area"),
    SMRMA: t("State Marine Recreation Management Area"),
    SMP: t("State Marine Park"),
    Special: t("Special Closure"),
  };

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
          /* i18next-extract-disable-next-line */
          displayName={t(groupDisplayMapSg[metrics[0].groupId || "none"])}
          displayValue={false}
          group={metrics[0].groupId as string | undefined}
          groupColorMap={groupColorMap}
        />
      </div>
      <VerticalSpacer />
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

  const groupDisplayMapPl: Record<string, string> = {
    SMR: t("State Marine Reserve(s)"),
    SMCANT: t("State Marine Conservation Area(s) (No-Take)"),
    SMCA: t("State Marine Conservation Area(s)"),
    SMRMA: t("State Marine Recreation Management Area(s)"),
    SMP: t("State Marine Park(s)"),
    Special: t("Special Closure(s)"),
  };

  const columns: Column<Metric>[] = [
    {
      Header: " ",
      accessor: (row) => (
        <MpaClassPanel
          value={row.value}
          size={18}
          /* i18next-extract-disable-next-line */
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
  const lopMap: Record<string, string> = {
    A: t("Very High"),
    B: t("High"),
    C: t("Moderate-High"),
    D: t("Moderate"),
    E: t("Moderate-Low"),
    F: t("Low"),
    G: t("N/A"),
  };

  const columns: Column<NullSketch>[] = [
    {
      Header: t("MPA"),
      accessor: (row) => row.properties.name,
    },
    {
      Header: t("Classification Level"),
      accessor: (row) => {
        const designation = row.properties.proposed_designation;
        if (!designation) return "N/A";

        return (
          <GroupPill
            groupColorMap={groupColorMapTransparent}
            group={designation}
          >
            {designation === "Special"
              ? "Special Closure"
              : designation === "SMCANT"
                ? "SMCA No-Take"
                : designation}
          </GroupPill>
        );
      },
      style: { textAlign: "center" },
    },
    {
      Header: t("Level of Protection"),
      accessor: (row) => lopMap[row.properties.proposed_lop] || "N/A",
      style: { textAlign: "center" },
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
          📈 Report: This report totals the number of MPAs in each
          classification. See the Glossary for more detailed explanations of the
          classification levels.
        </p>
      </Trans>
      <p>{t("Last updated")}: January 24, 2025.</p>
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
