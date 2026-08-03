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
import {
  formatList,
  formatMonitoringMpaStatuses,
  formatYears,
  getTableRowStyle,
  MonitoringSummaryStats,
  monitoringStyles,
} from "./MonitoringOverview.js";

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
          <div style={monitoringStyles.cardBody}>
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
                  <MonitoringSummaryStats
                    siteCount={results.siteCount}
                    yearRange={results.yearRange}
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
                        status: t("Status"),
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
                        This report provides a summary of kelp forest monitoring
                        data across California. It includes information about
                        survey sites, sampling years, scientific methods, and
                        species surveyed within the selected area. The report
                        draws on data contributed by Partnership for
                        Interdisciplinary Studies of Coastal Oceans (PISCO) Kelp
                        Forest Program (UCSC/UCSB), Vantuna Research Group
                        (Occidental College), Cooperative Research and
                        Assessment of Nearshore Ecosystems (CRANE) Program, and
                        Humboldt State University.
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

const SiteBreakdownTable: React.FunctionComponent<{
  sites: KelpForestSiteSummary[];
  labels: {
    siteName: string;
    surveyYears: string;
    campus: string;
    status: string;
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
    <table style={monitoringStyles.table}>
      <colgroup>
        <col style={{ width: "46%" }} />
        <col style={{ width: "26%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "12%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={monitoringStyles.header}>{labels.siteName}</th>
          <th style={monitoringStyles.header}>{labels.surveyYears}</th>
          <th style={monitoringStyles.header}>{labels.campus}</th>
          <th style={monitoringStyles.header}>{labels.status}</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site, index) => {
          const isExpanded = expandedSites.has(site.site);
          const rowBackgroundStyle = getTableRowStyle(index);

          return (
            <React.Fragment key={site.site}>
              <tr style={rowBackgroundStyle}>
                <td style={monitoringStyles.cell}>
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
                <td style={monitoringStyles.cell}>{formatYears(site.years)}</td>
                <td style={monitoringStyles.cell}>
                  {formatList(site.campuses)}
                </td>
                <td style={monitoringStyles.cell}>
                  {formatMonitoringMpaStatuses(site.mpaStatuses)}
                </td>
              </tr>
              {isExpanded && (
                <tr style={rowBackgroundStyle}>
                  <td colSpan={4} style={expandedCellStyle}>
                    <div style={expandedDetailsGridStyle}>
                      <div style={monitoringStyles.detailLabel}>
                        {labels.methods}
                      </div>
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
                      <div style={monitoringStyles.detailLabel}>
                        {labels.species}
                      </div>
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
  ...monitoringStyles.cell,
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

const methodListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
};
