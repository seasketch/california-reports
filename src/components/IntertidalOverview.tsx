import React from "react";
import { useTranslation } from "react-i18next";
import {
  Collapse,
  InfoStatus,
  LayerToggle,
  ReportError,
  ResultsCard,
  ToolbarCard,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import type {
  IntertidalGeneraMethodSummary,
  IntertidalOverviewResults,
  IntertidalSiteSummary,
} from "../functions/intertidalOverview.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const IntertidalOverview: React.FunctionComponent = () => {
  const { t } = useTranslation();
  const title = t("Rocky Intertidal Monitoring");

  return (
    <ResultsCard title={title} functionName="intertidalOverview" useChildCard>
      {(results: IntertidalOverviewResults) => (
        <ToolbarCard
          title={title}
          items={
            <LayerToggle label={t("Show on Map")} layerId="eFSzynn6J" simple />
          }
        >
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              {results.siteCount === 0 ? (
                <InfoStatus
                  msg={
                    <i>
                      {t(
                        "No rocky intertidal monitoring sites were found within the selected area.",
                      )}
                    </i>
                  }
                />
              ) : (
                <>
                  <VerticalSpacer />
                  <SummaryStats
                    results={results}
                    labels={{
                      sites: t("Sites"),
                      years: t("Survey Years"),
                    }}
                  />
                  <VerticalSpacer />
                  <Collapse title={t("Show by Site")}>
                    <SiteBreakdownTable
                      sites={results.sites}
                      labels={{
                        site: t("Site"),
                        surveyYears: t("Survey Years"),
                        status: t("Status"),
                      }}
                    />
                  </Collapse>
                  <Collapse title={t("Methods and Genera")}>
                    <GeneraTable
                      generaByMethod={results.genera}
                      labels={{
                        method: t("Method"),
                        genera: t("Genera"),
                        noGenera: t("No genera listed"),
                      }}
                    />
                  </Collapse>
                  <Collapse title={t("Learn More")}>
                    <p>
                      <small>
                        This report summarizes rocky intertidal biodiversity
                        monitoring sites and percent-cover survey records within
                        the selected area. Site metadata come from the Multi-
                        Agency Rocky Intertidal Network (MARINe) site table, and
                        genus information reflects the survey methods listed in
                        the rocky intertidal species table.
                      </small>
                    </p>
                  </Collapse>
                </>
              )}
            </ReportError>
          </div>
        </ToolbarCard>
      )}
    </ResultsCard>
  );
};

const SummaryStats: React.FunctionComponent<{
  results: IntertidalOverviewResults;
  labels: {
    sites: string;
    years: string;
  };
}> = ({ results, labels }) => (
  <div style={summaryGridStyle}>
    <SummaryStat
      label={labels.sites}
      value={Number.format(results.siteCount)}
    />
    <SummaryStat label={labels.years} value={formatYearRange(results)} />
  </div>
);

const SummaryStat: React.FunctionComponent<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div style={summaryStatStyle}>
    <div style={summaryValueStyle}>{value}</div>
    <div style={summaryLabelStyle}>{label}</div>
  </div>
);

const SiteBreakdownTable: React.FunctionComponent<{
  sites: IntertidalSiteSummary[];
  labels: {
    site: string;
    surveyYears: string;
    status: string;
  };
}> = ({ sites, labels }) => {
  if (sites.length === 0) return null;

  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: "48%" }} />
        <col style={{ width: "30%" }} />
        <col style={{ width: "22%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={headerStyle}>{labels.site}</th>
          <th style={headerStyle}>{labels.surveyYears}</th>
          <th style={headerStyle}>{labels.status}</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site, index) => (
          <tr
            key={site.siteCode}
            style={index % 2 === 0 ? rowStyle : alternateRowStyle}
          >
            <td style={cellStyle}>{formatSiteLabel(site)}</td>
            <td style={cellStyle}>{formatYears(site.years)}</td>
            <td style={cellStyle}>{formatList(site.mpaStatuses)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const GeneraTable: React.FunctionComponent<{
  generaByMethod: IntertidalGeneraMethodSummary[];
  labels: {
    method: string;
    genera: string;
    noGenera: string;
  };
}> = ({ generaByMethod, labels }) => {
  if (generaByMethod.length === 0) return <div>{labels.noGenera}</div>;

  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: "20%" }} />
        <col style={{ width: "80%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={headerStyle}>{labels.method}</th>
          <th style={headerStyle}>{labels.genera}</th>
        </tr>
      </thead>
      <tbody>
        {generaByMethod.map((methodSummary, index) => (
          <tr
            key={methodSummary.method}
            style={index % 2 === 0 ? rowStyle : alternateRowStyle}
          >
            <td style={methodCellStyle}>
              {formatMethod(methodSummary.method)}
            </td>
            <td style={cellStyle}>{methodSummary.genera.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const formatSiteLabel = (site: IntertidalSiteSummary) => site.siteName;

const formatYearRange = (results: IntertidalOverviewResults) => {
  if (!results.yearRange) return "n/a";
  if (results.yearRange.min === results.yearRange.max)
    return String(results.yearRange.min);
  return `${results.yearRange.min}-${results.yearRange.max}`;
};

const formatYears = (years: number[]) => {
  if (years.length === 0) return "n/a";
  const ranges: { start: number; end: number }[] = [];

  years.forEach((year) => {
    const currentRange = ranges[ranges.length - 1];

    if (currentRange && year === currentRange.end + 1) {
      currentRange.end = year;
    } else {
      ranges.push({ start: year, end: year });
    }
  });

  return ranges
    .map((range) =>
      range.start === range.end
        ? String(range.start)
        : `${range.start}-${range.end}`,
    )
    .join(", ");
};

const formatList = (values: string[] | undefined) =>
  values?.length ? values.join(", ") : "n/a";

const formatMethod = (method: string) => method.toUpperCase();

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const summaryStatStyle: React.CSSProperties = {
  background: "#f7f7f7",
  border: "1px solid #e4e4e4",
  borderRadius: 6,
  padding: "10px 12px",
  textAlign: "center",
};

const summaryValueStyle: React.CSSProperties = {
  color: "#333",
  fontSize: 20,
  fontWeight: 600,
  lineHeight: 1.2,
};

const summaryLabelStyle: React.CSSProperties = {
  color: "#666",
  fontSize: 11,
  letterSpacing: "0.02em",
  marginTop: 4,
  textTransform: "uppercase",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e4e4e4",
  borderCollapse: "separate",
  borderRadius: 6,
  borderSpacing: 0,
  fontSize: 12,
  overflow: "hidden",
  tableLayout: "fixed",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#f7f7f7",
  borderBottom: "1px solid #ddd",
  color: "#555",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
  padding: "6px 8px",
  textAlign: "left",
  textTransform: "uppercase",
};

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  color: "#333",
  padding: "7px 8px",
  verticalAlign: "middle",
  wordBreak: "break-word",
};

const methodCellStyle: React.CSSProperties = {
  ...cellStyle,
  color: "#555",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  verticalAlign: "top",
};

const rowStyle: React.CSSProperties = {
  backgroundColor: "#fff",
};

const alternateRowStyle: React.CSSProperties = {
  backgroundColor: "#fbfbfb",
};
