import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  LayerToggle,
  ReportError,
  ResultsCard,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import type { CcfrpResults, CcfrpSpecies } from "../functions/ccfrp.js";

const Number = new Intl.NumberFormat("en", {
  style: "decimal",
  maximumFractionDigits: 2,
});
const DEFAULT_SPECIES_COUNT = 5;

// Reports CCFRP catch and biomass per unit effort within the sketch
export const Ccfrp: React.FunctionComponent = () => {
  const { t } = useTranslation();

  const titleLabel = t("California Collaborative Fisheries Research Program");
  const speciesLabel = t("Species");
  const meanCpueLabel = t("Mean CPUE");
  const meanBpueLabel = t("Mean BPUE");
  const sitesPresentLabel = t("# of Sites Present");
  const showAllLabel = t("Show all species");
  const showTopFiveLabel = t("Show top 5 species");

  return (
    <ResultsCard title={titleLabel} functionName="ccfrp">
      {(ccfrpResults: CcfrpResults) => {
        return (
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              <Trans i18nKey="CCFRP 1">
                <p>
                  This report summarizes mean catch per unit effort (CPUE) and
                  biomass per unit effort (BPUE) for species sampled in 2023
                  within the selected MPA(s).
                </p>
              </Trans>

              <LayerToggle
                label={t("Show Nearshore Fisheries Monitoring Sites On Map")}
                layerId="lVCbwMAu6"
              />
              <VerticalSpacer />

              {ccfrpResults.species.length === 0 ? (
                <p>
                  {t(
                    "No CCFRP monitoring points were found within the selected MPA(s).",
                  )}
                </p>
              ) : (
                <SpeciesTable
                  species={ccfrpResults.species}
                  speciesLabel={speciesLabel}
                  meanCpueLabel={meanCpueLabel}
                  sitesPresentLabel={sitesPresentLabel}
                  meanBpueLabel={meanBpueLabel}
                  showAllLabel={showAllLabel}
                  showTopFiveLabel={showTopFiveLabel}
                />
              )}
            </ReportError>
          </div>
        );
      }}
    </ResultsCard>
  );
};

const SpeciesTable: React.FunctionComponent<{
  species: CcfrpSpecies[];
  speciesLabel: string;
  meanCpueLabel: string;
  sitesPresentLabel: string;
  meanBpueLabel: string;
  showAllLabel: string;
  showTopFiveLabel: string;
}> = ({
  species,
  speciesLabel,
  meanCpueLabel,
  sitesPresentLabel,
  meanBpueLabel,
  showAllLabel,
  showTopFiveLabel,
}) => {
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const hasMoreSpecies = species.length > DEFAULT_SPECIES_COUNT;
  const displayedSpecies = showAllSpecies
    ? species
    : species.slice(0, DEFAULT_SPECIES_COUNT);

  return (
    <>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerStyle}>{speciesLabel}</th>
            <th style={numericHeaderStyle}>{meanCpueLabel}</th>
            <th style={numericHeaderStyle}>{meanBpueLabel}</th>
            <th style={numericHeaderStyle}>{sitesPresentLabel}</th>
          </tr>
        </thead>
        <tbody>
          {displayedSpecies.map((curSpecies, index) => (
            <tr
              key={curSpecies.commonName}
              style={index % 2 === 0 ? rowStyle : alternateRowStyle}
            >
              <td style={cellStyle}>{curSpecies.commonName}</td>
              <td style={numericCellStyle}>
                {Number.format(curSpecies.meanCpue)}
              </td>
              <td style={numericCellStyle}>
                {Number.format(curSpecies.meanBpue)}
              </td>
              <td style={numericCellStyle}>
                {Number.format(curSpecies.sitesWithCatch)} /{" "}
                {Number.format(curSpecies.siteCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMoreSpecies && (
        <button
          type="button"
          style={toggleButtonStyle}
          onClick={() => setShowAllSpecies((prev) => !prev)}
        >
          {showAllSpecies ? showTopFiveLabel : showAllLabel}
        </button>
      )}
    </>
  );
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e4e4e4",
  borderCollapse: "separate",
  borderRadius: 6,
  borderSpacing: 0,
  fontSize: 12,
  overflow: "hidden",
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

const numericHeaderStyle: React.CSSProperties = {
  ...headerStyle,
  textAlign: "right",
};

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  color: "#333",
  padding: "7px 8px",
  verticalAlign: "middle",
};

const numericCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
};

const rowStyle: React.CSSProperties = {
  backgroundColor: "#fff",
};

const alternateRowStyle: React.CSSProperties = {
  backgroundColor: "#fbfbfb",
};

const toggleButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#0077b6",
  cursor: "pointer",
  fontSize: 12,
  marginTop: 8,
  padding: 0,
};
