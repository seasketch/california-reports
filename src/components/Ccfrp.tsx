import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Collapse,
  InfoStatus,
  LayerToggle,
  ReportError,
  ResultsCard,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import type {
  CcfrpCpueTimeSeriesDatum,
  CcfrpResults,
  CcfrpSpecies,
} from "../functions/ccfrp.js";

const Number = new Intl.NumberFormat("en", {
  style: "decimal",
  maximumFractionDigits: 2,
});
const DEFAULT_SPECIES_COUNT = 5;
const STATUS_COLORS = {
  MPA: "#0077b6",
  REF: "#d95f02",
};

// Reports CCFRP catch and biomass per unit effort within the sketch
export const Ccfrp: React.FunctionComponent = () => {
  const { t } = useTranslation();

  const titleLabel = t("California Collaborative Fisheries Research Program");
  const speciesLabel = t("Species");
  const meanCpueLabel = t("Mean CPUE");
  const meanBpueLabel = t("Mean BPUE");
  const sitesPresentLabel = t("# of Sites Present");
  const mpaLabel = t("MPA");
  const refLabel = t("Reference");
  const showAllLabel = t("Show all species");
  const showTopFiveLabel = t("Show top 5 species");
  const cpueTimeSeriesLabel = t("CPUE");

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
                  within the selected area(s).
                </p>
              </Trans>

              <LayerToggle
                label={t("Show Nearshore Fisheries Monitoring Sites On Map")}
                layerId="pXKFkNvLs"
              />
              <VerticalSpacer />

              {ccfrpResults.species.length === 0 ? (
                <InfoStatus
                  msg={
                    <i>
                      {t(
                        "No CCFRP monitoring sites surveyed in 2023 were found within the selected area.",
                      )}
                    </i>
                  }
                />
              ) : (
                <SpeciesTable
                  species={ccfrpResults.species}
                  speciesLabel={speciesLabel}
                  meanCpueLabel={meanCpueLabel}
                  meanBpueLabel={meanBpueLabel}
                  sitesPresentLabel={sitesPresentLabel}
                  mpaLabel={mpaLabel}
                  refLabel={refLabel}
                  showAllLabel={showAllLabel}
                  showTopFiveLabel={showTopFiveLabel}
                />
              )}
              {/* <Collapse title={"Time Series"}>
                {ccfrpResults.cpueTimeSeries.length > 0 && (
                  <>
                    <VerticalSpacer />
                    <CpueTimeSeriesChart
                      data={ccfrpResults.cpueTimeSeries}
                      title={cpueTimeSeriesLabel}
                      mpaLabel={mpaLabel}
                      refLabel={refLabel}
                      meanCpueLabel={meanCpueLabel}
                    />
                  </>
                )}
              </Collapse> */}
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
  meanBpueLabel: string;
  sitesPresentLabel: string;
  mpaLabel: string;
  refLabel: string;
  showAllLabel: string;
  showTopFiveLabel: string;
}> = ({
  species,
  speciesLabel,
  meanCpueLabel,
  meanBpueLabel,
  sitesPresentLabel,
  mpaLabel,
  refLabel,
  showAllLabel,
  showTopFiveLabel,
}) => {
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const hasMoreSpecies = species.length > DEFAULT_SPECIES_COUNT;
  const displayedSpecies = showAllSpecies
    ? species
    : species.slice(0, DEFAULT_SPECIES_COUNT);
  const showMpaColumns = species.some(
    (curSpecies) => curSpecies.mpa.siteCount > 0,
  );
  const showRefColumns = species.some(
    (curSpecies) => curSpecies.ref.siteCount > 0,
  );
  const refGroupHeaderStyle = showMpaColumns
    ? groupDividerHeaderStyle
    : centeredHeaderStyle;
  const refFirstColumnHeaderStyle = showMpaColumns
    ? groupDividerNumericHeaderStyle
    : numericHeaderStyle;
  const refFirstColumnCellStyle = showMpaColumns
    ? groupDividerNumericCellStyle
    : numericCellStyle;

  return (
    <>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th rowSpan={2} style={headerStyle}>
              {speciesLabel}
            </th>
            {showMpaColumns && (
              <th colSpan={3} style={centeredHeaderStyle}>
                {mpaLabel}
              </th>
            )}
            {showRefColumns && (
              <th colSpan={3} style={refGroupHeaderStyle}>
                {refLabel}
              </th>
            )}
          </tr>
          <tr>
            {showMpaColumns && (
              <>
                <th style={numericHeaderStyle}>{meanCpueLabel}</th>
                <th style={numericHeaderStyle}>{meanBpueLabel}</th>
                <th style={numericHeaderStyle}>{sitesPresentLabel}</th>
              </>
            )}
            {showRefColumns && (
              <>
                <th style={refFirstColumnHeaderStyle}>{meanCpueLabel}</th>
                <th style={numericHeaderStyle}>{meanBpueLabel}</th>
                <th style={numericHeaderStyle}>{sitesPresentLabel}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {displayedSpecies.map((curSpecies, index) => (
            <tr
              key={curSpecies.commonName}
              style={index % 2 === 0 ? rowStyle : alternateRowStyle}
            >
              <td style={cellStyle}>{curSpecies.commonName}</td>
              {showMpaColumns && (
                <>
                  <td style={numericCellStyle}>
                    {Number.format(curSpecies.mpa.meanCpue)}
                  </td>
                  <td style={numericCellStyle}>
                    {Number.format(curSpecies.mpa.meanBpue)}
                  </td>
                  <td style={numericCellStyle}>
                    {Number.format(curSpecies.mpa.sitesWithCatch)} /{" "}
                    {Number.format(curSpecies.mpa.siteCount)}
                  </td>
                </>
              )}
              {showRefColumns && (
                <>
                  <td style={refFirstColumnCellStyle}>
                    {Number.format(curSpecies.ref.meanCpue)}
                  </td>
                  <td style={numericCellStyle}>
                    {Number.format(curSpecies.ref.meanBpue)}
                  </td>
                  <td style={numericCellStyle}>
                    {Number.format(curSpecies.ref.sitesWithCatch)} /{" "}
                    {Number.format(curSpecies.ref.siteCount)}
                  </td>
                </>
              )}
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

const CpueTimeSeriesChart: React.FunctionComponent<{
  data: CcfrpCpueTimeSeriesDatum[];
  title: string;
  mpaLabel: string;
  refLabel: string;
  meanCpueLabel: string;
}> = ({ data, title, mpaLabel, refLabel, meanCpueLabel }) => {
  const width = 680;
  const height = 320;
  const margin = { top: 24, right: 24, bottom: 54, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const speciesNames = [...new Set(data.map((datum) => datum.commonName))];
  const [selectedSpecies, setSelectedSpecies] = useState(speciesNames[0] ?? "");
  const activeSpecies = speciesNames.includes(selectedSpecies)
    ? selectedSpecies
    : speciesNames[0];
  const selectedData = data.filter(
    (datum) => datum.commonName === activeSpecies,
  );
  const years = [...new Set(selectedData.map((datum) => datum.year))].sort(
    (a, b) => a - b,
  );
  const maxCpue = Math.max(...selectedData.map((datum) => datum.meanCpue), 0);
  const yMax = maxCpue === 0 ? 1 : maxCpue * 1.1;
  const yTicks = [0, yMax / 2, yMax];

  const getX = (year: number) => {
    if (years.length <= 1) return margin.left + plotWidth / 2;

    return (
      margin.left +
      ((year - years[0]) / (years[years.length - 1] - years[0])) * plotWidth
    );
  };
  const getY = (value: number) =>
    margin.top + plotHeight - (value / yMax) * plotHeight;
  const series = (["MPA", "REF"] as const)
    .map((status) => ({
      status,
      color: STATUS_COLORS[status],
      values: selectedData.filter((datum) => datum.status === status),
    }))
    .filter((curSeries) => curSeries.values.length > 0);
  const statusLabel = (status: "MPA" | "REF") =>
    status === "MPA" ? mpaLabel : refLabel;

  return (
    <div>
      <div>
        <select
          value={activeSpecies}
          onChange={(event) => setSelectedSpecies(event.target.value)}
          aria-label="Select species"
        >
          {speciesNames.map((commonName) => (
            <option key={commonName} value={commonName}>
              {commonName}
            </option>
          ))}
        </select>
      </div>
      <svg
        role="img"
        aria-label={`${title}: ${activeSpecies}`}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto" }}
      >
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + plotHeight}
          stroke="#ccc"
        />
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left + plotWidth}
          y2={margin.top + plotHeight}
          stroke="#ccc"
        />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              y1={getY(tick)}
              x2={margin.left + plotWidth}
              y2={getY(tick)}
              stroke="#eee"
            />
            <text
              x={margin.left - 8}
              y={getY(tick) + 4}
              textAnchor="end"
              fill="#666"
              fontSize={16}
            >
              {Number.format(tick)}
            </text>
          </g>
        ))}
        {years.map((year) => (
          <text
            key={year}
            x={getX(year)}
            y={margin.top + plotHeight + 20}
            textAnchor="middle"
            fill="#666"
            fontSize={16}
          >
            {year}
          </text>
        ))}
        <text
          x={margin.left + plotWidth / 2}
          y={height - 10}
          textAnchor="middle"
          fill="#555"
          fontSize={16}
          fontWeight={600}
        >
          Year
        </text>
        <text
          transform={`translate(18 ${margin.top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fill="#555"
          fontSize={16}
          fontWeight={600}
        >
          {meanCpueLabel}
        </text>
        {series.map((curSeries) => {
          const points = curSeries.values
            .map((datum) => `${getX(datum.year)},${getY(datum.meanCpue)}`)
            .join(" ");

          if (!points) return null;

          return (
            <g key={curSeries.status}>
              <polyline
                points={points}
                fill="none"
                stroke={curSeries.color}
                strokeDasharray={curSeries.status === "REF" ? "5 4" : undefined}
                strokeWidth={2}
              />
              {curSeries.values.map((datum) => (
                <circle
                  key={`${curSeries.status}-${datum.year}`}
                  cx={getX(datum.year)}
                  cy={getY(datum.meanCpue)}
                  r={3}
                  fill="#fff"
                  stroke={curSeries.color}
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div>
        {series.map((curSeries) => (
          <span key={curSeries.status} style={{ marginRight: 12 }}>
            <span
              style={{
                borderTop: `2px ${
                  curSeries.status === "REF" ? "dashed" : "solid"
                } ${curSeries.color}`,
                display: "inline-block",
                marginRight: 5,
                verticalAlign: "middle",
                width: 18,
              }}
            />
            {statusLabel(curSeries.status)}
          </span>
        ))}
      </div>
    </div>
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

const centeredHeaderStyle: React.CSSProperties = {
  ...headerStyle,
  textAlign: "center",
};

const groupDividerHeaderStyle: React.CSSProperties = {
  ...centeredHeaderStyle,
  borderLeft: "1px solid #d8d8d8",
};

const groupDividerNumericHeaderStyle: React.CSSProperties = {
  ...numericHeaderStyle,
  borderLeft: "1px solid #d8d8d8",
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

const groupDividerNumericCellStyle: React.CSSProperties = {
  ...numericCellStyle,
  borderLeft: "1px solid #d8d8d8",
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
