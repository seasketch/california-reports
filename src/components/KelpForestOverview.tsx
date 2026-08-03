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
  KelpForestOverviewResults,
  KelpForestSiteSummary,
} from "../functions/kelpForestOverview.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const KelpForestOverview: React.FunctionComponent = () => {
  const { t } = useTranslation();

  return (
    <ResultsCard
      title={t("Kelp Forest Monitoring")}
      functionName="kelpForestOverview"
      useChildCard
    >
      {(results: KelpForestOverviewResults) => (
        <ToolbarCard
          title={t("Kelp Forest Monitoring")}
          items={
            <LayerToggle label={t("Show on Map")} layerId="lVCbwMAu6" simple />
          }
        >
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              {results.siteCount === 0 ? (
                <InfoStatus
                  msg={
                    <i>
                      {t(
                        "No kelp forest monitoring site records were found within the selected area.",
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
                        siteName: t("Site Name"),
                        surveyYears: t("Survey Years"),
                        campus: t("Campus"),
                        methods: t("Methods"),
                        noMethods: t("No methods listed"),
                        species: t("Species Surveyed"),
                        noSpecies: t("No species listed"),
                      }}
                    />
                  </Collapse>
                  <Collapse title={t("Learn More")}>
                    <p>
                      <small>
                        Partnership for Interdisciplinary Studies of Coastal
                        Oceans (PISCO) Kelp Forest Program (UCSC/UCSB), Vantuna
                        Research Group (Occidental College), Cooperative
                        Research and Assessment of Nearshore Ecosystems (CRANE)
                        Program, Humboldt State University
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
  results: KelpForestOverviewResults;
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
  sites: KelpForestSiteSummary[];
  labels: {
    siteName: string;
    surveyYears: string;
    campus: string;
    methods: string;
    noMethods: string;
    species: string;
    noSpecies: string;
  };
}> = ({ sites, labels }) => {
  const [expandedSites, setExpandedSites] = React.useState<Set<string>>(
    new Set(),
  );
  if (sites.length === 0) return null;

  const toggleSite = (siteId: string) => {
    setExpandedSites((prevExpandedSites) => {
      const nextExpandedSites = new Set(prevExpandedSites);

      if (nextExpandedSites.has(siteId)) nextExpandedSites.delete(siteId);
      else nextExpandedSites.add(siteId);

      return nextExpandedSites;
    });
  };

  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: "50%" }} />
        <col style={{ width: "28%" }} />
        <col style={{ width: "22%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={headerStyle}>{labels.siteName}</th>
          <th style={headerStyle}>{labels.surveyYears}</th>
          <th style={headerStyle}>{labels.campus}</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site, index) => {
          const isExpanded = expandedSites.has(site.site);
          const rowBackgroundStyle =
            index % 2 === 0 ? rowStyle : alternateRowStyle;

          return (
            <React.Fragment key={site.site}>
              <tr style={rowBackgroundStyle}>
                <td style={cellStyle}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`${labels.methods}: ${site.siteName}`}
                    style={siteToggleStyle}
                    onClick={() => toggleSite(site.site)}
                  >
                    <span
                      style={{
                        ...toggleIconStyle,
                        transform: isExpanded ? "rotate(90deg)" : undefined,
                      }}
                    />
                    {site.siteName}
                  </button>
                </td>
                <td style={cellStyle}>{formatYears(site.years)}</td>
                <td style={cellStyle}>{formatList(site.campuses)}</td>
              </tr>
              {isExpanded && (
                <tr style={rowBackgroundStyle}>
                  <td colSpan={3} style={expandedCellStyle}>
                    <div style={expandedDetailsGridStyle}>
                      <div style={detailLabelStyle}>{labels.methods}</div>
                      {site.methods.length === 0 ? (
                        <div>{labels.noMethods}</div>
                      ) : (
                        <ul style={methodListStyle}>
                          {site.methods.map((method) => (
                            <li key={method}>{method}</li>
                          ))}
                        </ul>
                      )}
                      <div style={detailSeparatorStyle} />
                      <div style={detailLabelStyle}>{labels.species}</div>
                      {site.species.length === 0 ? (
                        <div>{labels.noSpecies}</div>
                      ) : (
                        <div>{site.species.join(", ")}</div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

const formatYearRange = (results: KelpForestOverviewResults) => {
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

const formatList = (values: string[]) =>
  values.length === 0 ? "n/a" : values.join(", ");

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

const rowStyle: React.CSSProperties = {
  backgroundColor: "#fff",
};

const alternateRowStyle: React.CSSProperties = {
  backgroundColor: "#fbfbfb",
};

const siteToggleStyle: React.CSSProperties = {
  alignItems: "center",
  background: "none",
  border: 0,
  color: "#555",
  cursor: "pointer",
  display: "inline-flex",
  fontWeight: 600,
  gap: 6,
  padding: 0,
  textAlign: "left",
};

const toggleIconStyle: React.CSSProperties = {
  display: "inline-block",
  borderBottom: "4px solid transparent",
  borderLeft: "6px solid currentColor",
  borderTop: "4px solid transparent",
  height: 0,
  transition: "transform 120ms ease",
  width: 0,
};

const expandedCellStyle: React.CSSProperties = {
  ...cellStyle,
  color: "#555",
  paddingLeft: 28,
};

const expandedDetailsGridStyle: React.CSSProperties = {
  alignItems: "start",
  display: "grid",
  gap: 12,
  gridTemplateColumns: "90px 1fr",
};

const detailSeparatorStyle: React.CSSProperties = {
  borderTop: "1px solid #ddd",
  gridColumn: "1 / -1",
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const methodListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
};
