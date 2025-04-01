import React from "react";
import {
  ResultsCard,
  ReportError,
  Collapse,
  Column,
  Table,
  ReportTableStyled,
  RbcsIcon,
  GroupPill,
  useSketchProperties,
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
export const ClassificationCard: React.FunctionComponent<{
  printing: boolean;
}> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const title = t("Classification Overview");

  return (
    <ResultsCard title={title} functionName="classification" useChildCard>
      {(data: ReportResult) => {
        return (
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              <ToolbarCard
                title={title}
                items={
                  <DataDownload
                    filename="classification"
                    formats={["csv", "json"]}
                    placement="left-end"
                    data={data.metrics}
                  />
                }
              >
                <Trans i18nKey="Classification Card 1">
                  <p>
                    The following classifications are used for designating
                    managed marine and estuarine areas in California:
                  </p>
                  <p>
                    • State Marine Reserve (SMR)
                    <br />• State Marine Conservation Area (SMCA)
                    <br />• State Marine Conservation Area No-Take (SMCA
                    No-Take)
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
                  : sketchReport(data.metrics[0], t)}

                {isCollection && (
                  <Collapse
                    title={t("Show by MPA")}
                    key={props.printing + "Classification MPA"}
                    collapsed={!props.printing}
                  >
                    {genMpaSketchTable(
                      toNullSketchArray(data.sketch!),
                      t,
                      props.printing,
                    )}
                  </Collapse>
                )}

                <Collapse
                  title={t("Learn More")}
                  key={props.printing + "Classification Learn More"}
                  collapsed={!props.printing}
                >
                  <Trans i18nKey="Classification Card - Learn more">
                    <p>
                      📈 Report: This report totals the number of MPAs in each
                      classification. See the Glossary for more detailed
                      explanations of the classification levels.
                    </p>
                  </Trans>
                  <p>{t("Last updated")}: January 24, 2025.</p>
                </Collapse>
              </ToolbarCard>
            </ReportError>
          </div>
        );
      }}
    </ResultsCard>
  );
};

// Reports classification level for single MPA
const sketchReport = (metric: Metric, t: any) => {
  if (!metric)
    throw new Error(
      "In single sketch classification report, and getting !=1 metric",
    );

  const group = metric.groupId || "Unknown";
  const groupDisplayMapSg: Record<string, string> = {
    SMR: t("State Marine Reserve"),
    SMCANT: t("State Marine Conservation Area (No-Take)"),
    SMCA: t("State Marine Conservation Area"),
    SMRMA: t("State Marine Recreation Management Area"),
    SMP: t("State Marine Park"),
    Special: t("Special Closure"),
    Unknown: t("Unknown"),
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ paddingRight: 10 }}>
        <PointyCircle color={groupColorMap[group]} size={18}>
          {null}
        </PointyCircle>
      </div>
      <div style={{ fontSize: 18 }}>{groupDisplayMapSg[group]}</div>
    </div>
  );
};

// Reports classification level for MPA network
const sketchCollectionReport = (
  sketch: NullSketchCollection | NullSketch,
  metrics: Metric[],
  t: any,
) => {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ paddingRight: 10 }}>
            {row.groupId && groupColorMap ? (
              <PointyCircle size={18} color={groupColorMap[row.groupId]}>
                {row.value}
              </PointyCircle>
            ) : (
              <RbcsIcon value={row.value} size={18} displayValue={true} />
            )}
          </div>
          <div style={{ fontSize: 18 }}>
            {groupDisplayMapPl[row.groupId || "none"]}
          </div>
        </div>
      ),
    },
  ];

  return <Table className="styled" columns={columns} data={sortedMetrics} />;
};

// Generates table of MPAs with classification level and level of protection
const genMpaSketchTable = (
  sketches: NullSketch[],
  t: any,
  printing: boolean,
) => {
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
        manualPagination={printing}
      />
    </SmallReportTableStyled>
  );
};
