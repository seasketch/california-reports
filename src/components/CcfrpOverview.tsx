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
import {
  formatMonitoringMpaStatuses,
  formatYears,
  getTableRowStyle,
  MonitoringSummaryStats,
  monitoringStyles,
} from "./MonitoringOverview.js";

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
          <div style={monitoringStyles.cardBody}>
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
    <table style={monitoringStyles.table}>
      <colgroup>
        <col style={{ width: "45%" }} />
        <col style={{ width: "30%" }} />
        <col style={{ width: "25%" }} />
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
          <tr key={site.gridCellId} style={getTableRowStyle(index)}>
            <td style={monitoringStyles.cell}>{formatSiteLabel(site)}</td>
            <td style={monitoringStyles.cell}>{formatYears(site.years)}</td>
            <td style={monitoringStyles.cell}>
              {formatMonitoringMpaStatuses(site.mpaStatuses)}
            </td>
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
