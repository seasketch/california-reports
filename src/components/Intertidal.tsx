import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  InfoStatus,
  LayerToggle,
  ReportError,
  VerticalSpacer,
  ResultsCard,
} from "@seasketch/geoprocessing/client-ui";
import type {
  IntertidalPercentCoverResults,
  IntertidalPercentCoverSpecies,
} from "../functions/intertidal.js";

const Number = new Intl.NumberFormat("en", {
  style: "decimal",
  maximumFractionDigits: 1,
});
const DEFAULT_SPECIES_COUNT = 5;

// Reports intertidal percent cover within the sketch for the latest sampled year.
export const Intertidal: React.FunctionComponent = () => {
  const { t } = useTranslation();

  const titleLabel = t("Intertidal Percent Cover");
  const speciesLabel = t("Species");
  const percentCoverLabel = t("% Cover");
  const minLabel = t("Min");
  const meanLabel = t("Mean");
  const maxLabel = t("Max");
  const valueColumnLabel = percentCoverLabel;
  const siteCountLabel = t("# of Sites Present");
  const showAllLabel = t("Show all species");
  const showTopFiveLabel = t("Show top 5 species");

  return (
    <ResultsCard title={titleLabel} functionName="intertidal">
      {(results: IntertidalPercentCoverResults) => {
        return (
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              <Trans i18nKey="Intertidal Percent Cover 1">
                <p>
                  This report summarizes the top five species by mean percent
                  cover for intertidal monitoring sites within the selected
                  area(s), using the most recent year from 2020 onward
                  represented at each site.
                </p>
                <p>
                  <small>
                    Multi-Agency Rocky Intertidal Network (MARINe), Partnership
                    for Interdisciplinary Studies of Coastal Oceans (PISCO),
                    Hakai Institute, and Pete Raimondi
                  </small>
                </p>
              </Trans>
              <LayerToggle
                label={t("Show Intertidal Monitoring Sites on Map")}
                layerId="eFSzynn6J"
              />
              <VerticalSpacer />

              {results.species.length === 0 ? (
                <p>
                  <InfoStatus
                    msg={
                      <i>
                        {t(
                          "No intertidal monitoring sites surveyed since 2020 were found within the selected area.",
                        )}
                      </i>
                    }
                  />
                </p>
              ) : (
                <>
                  {results.years.length > 0 && (
                    <p>
                      <small>
                        {results.years.length === 1
                          ? t("Year")
                          : t("Years included")}
                        : {results.years.join(", ")}
                      </small>
                    </p>
                  )}
                  <SpeciesTable
                    species={results.species}
                    speciesLabel={speciesLabel}
                    percentCoverLabel={percentCoverLabel}
                    minLabel={minLabel}
                    meanLabel={meanLabel}
                    maxLabel={maxLabel}
                    valueColumnLabel={valueColumnLabel}
                    siteCountLabel={siteCountLabel}
                    showAllLabel={showAllLabel}
                    showTopFiveLabel={showTopFiveLabel}
                  />
                </>
              )}
            </ReportError>
          </div>
        );
      }}
    </ResultsCard>
  );
};

const SpeciesTable: React.FunctionComponent<{
  species: IntertidalPercentCoverSpecies[];
  speciesLabel: string;
  percentCoverLabel: string;
  minLabel: string;
  meanLabel: string;
  maxLabel: string;
  valueColumnLabel: string;
  siteCountLabel: string;
  showAllLabel: string;
  showTopFiveLabel: string;
}> = ({
  species,
  speciesLabel,
  percentCoverLabel,
  minLabel,
  meanLabel,
  maxLabel,
  valueColumnLabel,
  siteCountLabel,
  showAllLabel,
  showTopFiveLabel,
}) => {
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const hasMoreSpecies = species.length > DEFAULT_SPECIES_COUNT;
  const displayedSpecies = showAllSpecies
    ? species
    : species.slice(0, DEFAULT_SPECIES_COUNT);
  const showSingleValue = species[0].siteCount === 1;

  return (
    <>
      <table style={tableStyle}>
        <thead>
          {showSingleValue ? (
            <tr>
              <th style={headerStyle}>{speciesLabel}</th>
              <th style={numericHeaderStyle}>{valueColumnLabel}</th>
              <th style={numericHeaderStyle}>{siteCountLabel}</th>
            </tr>
          ) : (
            <>
              <tr>
                <th rowSpan={2} style={headerStyle}>
                  {speciesLabel}
                </th>
                <th colSpan={3} style={centeredHeaderStyle}>
                  {percentCoverLabel}
                </th>
                <th rowSpan={2} style={numericHeaderStyle}>
                  {siteCountLabel}
                </th>
              </tr>
              <tr>
                <th style={numericHeaderStyle}>{minLabel}</th>
                <th style={numericHeaderStyle}>{meanLabel}</th>
                <th style={numericHeaderStyle}>{maxLabel}</th>
              </tr>
            </>
          )}
        </thead>
        <tbody>
          {displayedSpecies.map((curSpecies, index) => (
            <tr
              key={curSpecies.species}
              style={index % 2 === 0 ? rowStyle : alternateRowStyle}
            >
              <td style={cellStyle}>{curSpecies.species}</td>
              {showSingleValue ? (
                <td style={numericCellStyle}>
                  {formatPercentCover(curSpecies.meanPercentCover)}
                </td>
              ) : (
                <>
                  <td style={numericCellStyle}>
                    {formatPercentCover(curSpecies.minPercentCover)}
                  </td>
                  <td style={numericCellStyle}>
                    {formatPercentCover(curSpecies.meanPercentCover)}
                  </td>
                  <td style={numericCellStyle}>
                    {formatPercentCover(curSpecies.maxPercentCover)}
                  </td>
                </>
              )}
              <td style={numericCellStyle}>
                {Number.format(curSpecies.observedSiteCount)} /{" "}
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

const formatPercentCover = (value: number) => Number.format(value);

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

const centeredHeaderStyle: React.CSSProperties = {
  ...headerStyle,
  textAlign: "center",
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
