import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  LayerToggle,
  ReportError,
  ResultsCard,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import type {
  KelpForestResults,
  KelpForestSpecies,
} from "../functions/kelpForest.js";
const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Reports on kelp forest monitoring sites within the sketch
export const KelpForest: React.FunctionComponent = () => {
  const { t } = useTranslation();

  // Labels
  const titleLabel = t("Monitoring and Evaluation of Kelp Forest Ecosystems");
  const fishSpeciesLabel = t("Fish");
  const swathSpeciesLabel = t("Macroinvertebrates and Algae");
  const upcSpeciesLabel = t("Substrate");
  const countLabel = t("# / Transect");
  const percentCoverLabel = t("% Cover");
  const minAbundanceLabel = t("Min");
  const meanAbundanceLabel = t("Mean");
  const maxAbundanceLabel = t("Max");
  const valueColumnLabel = t("Value");
  const siteCountLabel = t("# of Sites Present");

  return (
    <ResultsCard title={titleLabel} functionName="kelpForest">
      {(kelpForestResults: KelpForestResults) => {
        return (
          <div style={{ breakInside: "avoid" }}>
            <ReportError>
              <Trans i18nKey="Kelp Forest 1">
                <p>
                  This report summarizes kelp forest ecosystem monitoring sites
                  that fall within the selected MPA(s) in the year 2024.
                </p>
                <p>
                  <small>
                    Partnership for Interdisciplinary Studies of Coastal Oceans
                    (PISCO) Kelp Forest Program (UCSC/UCSB), Vantuna Research
                    Group (Occidental College), Cooperative Research and
                    Assessment of Nearshore Ecosystems (CRANE) Program, Humboldt
                    State University
                  </small>
                </p>
              </Trans>
              <LayerToggle
                label={t("Show Kelp Forest Monitoring Sites on Map")}
                layerId="pXKFkNvLs"
              />
              <VerticalSpacer />

              {kelpForestResults.fish.length === 0 &&
              kelpForestResults.swath.length === 0 &&
              kelpForestResults.upc.length === 0 ? (
                <p>
                  {t(
                    "No kelp forest monitoring points were found within the selected MPA(s).",
                  )}
                </p>
              ) : (
                <>
                  <SpeciesTable
                    title={fishSpeciesLabel}
                    species={kelpForestResults.fish}
                    valueLabel={countLabel}
                    minAbundanceLabel={minAbundanceLabel}
                    meanAbundanceLabel={meanAbundanceLabel}
                    maxAbundanceLabel={maxAbundanceLabel}
                    valueColumnLabel={valueColumnLabel}
                    siteCountLabel={siteCountLabel}
                    valueFormatter={formatCount}
                  />
                  <div style={tableSpacerStyle} />
                  <SpeciesTable
                    title={swathSpeciesLabel}
                    species={kelpForestResults.swath}
                    valueLabel={countLabel}
                    minAbundanceLabel={minAbundanceLabel}
                    meanAbundanceLabel={meanAbundanceLabel}
                    maxAbundanceLabel={maxAbundanceLabel}
                    valueColumnLabel={valueColumnLabel}
                    siteCountLabel={siteCountLabel}
                    valueFormatter={formatCount}
                  />
                  <div style={tableSpacerStyle} />
                  <SpeciesTable
                    title={upcSpeciesLabel}
                    species={kelpForestResults.upc}
                    valueLabel={percentCoverLabel}
                    minAbundanceLabel={minAbundanceLabel}
                    meanAbundanceLabel={meanAbundanceLabel}
                    maxAbundanceLabel={maxAbundanceLabel}
                    valueColumnLabel={valueColumnLabel}
                    siteCountLabel={siteCountLabel}
                    valueFormatter={formatPercentCover}
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
  title: string;
  species: KelpForestSpecies[];
  valueLabel: string;
  minAbundanceLabel: string;
  meanAbundanceLabel: string;
  maxAbundanceLabel: string;
  valueColumnLabel: string;
  siteCountLabel: string;
  valueFormatter: (value: number) => string;
}> = ({
  title,
  species,
  valueLabel,
  minAbundanceLabel,
  meanAbundanceLabel,
  maxAbundanceLabel,
  valueColumnLabel,
  siteCountLabel,
  valueFormatter,
}) => {
  if (species.length === 0) return null;

  const showSingleValue = species[0].siteCount === 1;

  return (
    <table style={tableStyle}>
      <thead>
        {showSingleValue ? (
          <tr>
            <th style={headerStyle}>{title}</th>
            <th style={numericHeaderStyle}>{valueColumnLabel}</th>
            <th style={numericHeaderStyle}>{siteCountLabel}</th>
          </tr>
        ) : (
          <>
            <tr>
              <th rowSpan={2} style={headerStyle}>
                {title}
              </th>
              <th colSpan={3} style={centeredHeaderStyle}>
                {valueLabel}
              </th>
              <th rowSpan={2} style={numericHeaderStyle}>
                {siteCountLabel}
              </th>
            </tr>
            <tr>
              <th style={numericHeaderStyle}>{minAbundanceLabel}</th>
              <th style={numericHeaderStyle}>{meanAbundanceLabel}</th>
              <th style={numericHeaderStyle}>{maxAbundanceLabel}</th>
            </tr>
          </>
        )}
      </thead>
      <tbody>
        {species.map((curSpecies, index) => (
          <tr
            key={curSpecies.classcode}
            style={index % 2 === 0 ? rowStyle : alternateRowStyle}
          >
            <td style={cellStyle}>
              <div style={commonNameStyle}>{curSpecies.commonName}</div>
              <div style={scientificNameStyle}>
                {curSpecies.speciesDefinition}
              </div>
            </td>
            {showSingleValue ? (
              <td style={numericCellStyle}>
                {valueFormatter(curSpecies.meanAbundance)}
              </td>
            ) : (
              <>
                <td style={numericCellStyle}>
                  {valueFormatter(curSpecies.minAbundance)}
                </td>
                <td style={numericCellStyle}>
                  {valueFormatter(curSpecies.meanAbundance)}
                </td>
                <td style={numericCellStyle}>
                  {valueFormatter(curSpecies.maxAbundance)}
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
  );
};

const formatCount = (value: number) => Number.format(Math.round(value));

const formatPercentCover = (value: number) =>
  Number.format(Math.round(value * 10) / 10);

const tableSpacerStyle: React.CSSProperties = {
  height: 14,
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

const commonNameStyle: React.CSSProperties = {
  fontWeight: 600,
  lineHeight: 1.25,
};

const scientificNameStyle: React.CSSProperties = {
  color: "#666",
  fontSize: 11,
  fontStyle: "italic",
  lineHeight: 1.25,
  marginTop: 2,
};
