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
  CcfrpOverviewResults,
  CcfrpSiteSummary,
} from "../functions/ccfrpOverview.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const CcfrpOverview: React.FunctionComponent = () => {
  const { t } = useTranslation();
  const title = t("Nearshore Fisheries Monitoring");

  return (
    <ResultsCard title={title} functionName="ccfrpOverview" useChildCard>
      {(results: CcfrpOverviewResults) => (
        <ToolbarCard
          title={title}
          items={
            <LayerToggle label={t("Show on Map")} layerId="pXKFkNvLs" simple />
          }
        >
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              {results.siteCount === 0 ? (
                <InfoStatus
                  msg={
                    <i>
                      {t(
                        "No CCFRP monitoring site records were found within the selected area.",
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
                  <Collapse title={t("Species Surveyed")}>
                    <SpeciesList
                      species={results.species}
                      noSpeciesLabel={t("No species listed")}
                    />
                  </Collapse>
                  <Collapse title={t("Learn More")}>
                    <p>
                      <small>
                        This report summarizes results from the California
                        Collaborative Fisheries Research Program (CCFRP), a
                        collaborative partnership involving recreational
                        anglers, scientists, and resource managers. The dataset
                        includes catch survey records collected in coastal
                        waters to monitor fish populations. Site and species
                        information reflect recent survey years and grid cell
                        locations within the selected area.
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
  results: CcfrpOverviewResults;
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
  sites: CcfrpSiteSummary[];
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
        <col style={{ width: "45%" }} />
        <col style={{ width: "30%" }} />
        <col style={{ width: "25%" }} />
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
            key={site.gridCellId}
            style={index % 2 === 0 ? rowStyle : alternateRowStyle}
          >
            <td style={cellStyle}>{formatSiteLabel(site)}</td>
            <td style={cellStyle}>{formatYears(site.years)}</td>
            <td style={cellStyle}>{formatMpaStatuses(site.mpaStatuses)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SpeciesList: React.FunctionComponent<{
  species: string[];
  noSpeciesLabel: string;
}> = ({ species, noSpeciesLabel }) =>
  species.length === 0 ? (
    <div>{noSpeciesLabel}</div>
  ) : (
    <div>
      <small>{species.join(", ")}</small>
    </div>
  );

const formatSiteLabel = (site: CcfrpSiteSummary) =>
  site.areaName ? `${site.areaName} (${site.gridCellId})` : site.gridCellId;

const formatList = (values: string[] | undefined) =>
  values?.length ? values.join(", ") : "n/a";

const formatMpaStatuses = (values: string[] | undefined) =>
  formatList(
    values
      ?.map(normalizeMpaStatus)
      .filter((status): status is string => Boolean(status)),
  );

const normalizeMpaStatus = (value: string): string | undefined => {
  const status = value.toUpperCase();
  if (status.includes("MPA")) return "MPA";
  if (status.includes("REF")) return "REF";
  return undefined;
};

const formatYearRange = (results: CcfrpOverviewResults) => {
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
