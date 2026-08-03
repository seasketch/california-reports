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
import {
  formatList,
  formatYears,
  getTableRowStyle,
  MonitoringSummaryStats,
  monitoringStyles,
} from "./MonitoringOverview.js";

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
          <div style={monitoringStyles.cardBody}>
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
                  <MonitoringSummaryStats
                    siteCount={results.siteCount}
                    yearRange={results.yearRange}
                    labels={{
                      sites: t("Sites"),
                      years: t("Survey Years"),
                    }}
                  />
                  <VerticalSpacer />
                  <Collapse title={t("Sites")}>
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
    <table style={monitoringStyles.table}>
      <colgroup>
        <col style={{ width: "48%" }} />
        <col style={{ width: "30%" }} />
        <col style={{ width: "22%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={monitoringStyles.header}>{labels.site}</th>
          <th style={monitoringStyles.header}>{labels.surveyYears}</th>
          <th style={monitoringStyles.header}>{labels.status}</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site, index) => (
          <tr key={site.siteCode} style={getTableRowStyle(index)}>
            <td style={monitoringStyles.cell}>{formatSiteLabel(site)}</td>
            <td style={monitoringStyles.cell}>{formatYears(site.years)}</td>
            <td style={monitoringStyles.cell}>
              {formatList(site.mpaStatuses)}
            </td>
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
    <table style={monitoringStyles.table}>
      <colgroup>
        <col style={{ width: "20%" }} />
        <col style={{ width: "80%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={monitoringStyles.header}>{labels.method}</th>
          <th style={monitoringStyles.header}>{labels.genera}</th>
        </tr>
      </thead>
      <tbody>
        {generaByMethod.map((methodSummary, index) => (
          <tr key={methodSummary.method} style={getTableRowStyle(index)}>
            <td style={methodCellStyle}>
              {formatMethod(methodSummary.method)}
            </td>
            <td style={monitoringStyles.cell}>
              {methodSummary.genera.join(", ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const formatSiteLabel = (site: IntertidalSiteSummary) => site.siteName;

const formatMethod = (method: string) => method.toUpperCase();

const methodCellStyle: React.CSSProperties = {
  ...monitoringStyles.cell,
  ...monitoringStyles.uppercaseCell,
};
