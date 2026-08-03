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
  cpueTimeSeriesPt,
  CcfrpResults,
  CcfrpSpecies,
} from "../functions/ccfrp.js";

const Number = new Intl.NumberFormat("en", {
  style: "decimal",
  maximumFractionDigits: 2,
});
const DEFAULT_SPECIES_COUNT = 5;
const CPUE_COLOR = "#0077b6";

// Reports CCFRP catch and biomass per unit effort within the sketch
export const Ccfrp: React.FunctionComponent = () => {
  const { t } = useTranslation();

  const titleLabel = t("California Collaborative Fisheries Research Program");
  const speciesLabel = t("Species");
  const meanCpueLabel = t("Mean CPUE");
  const meanBpueLabel = t("Mean BPUE");
  const sitesPresentLabel = t("# Sites Present / Total Sites");
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
                  This report summarizes mean catch per angler hour and biomass
                  (kg) per angler hour for species sampled in 2023 within the
                  selected area(s).
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
                  labels={{
                    species: speciesLabel,
                    meanCpue: meanCpueLabel,
                    meanBpue: meanBpueLabel,
                    sitesPresent: sitesPresentLabel,
                    showAll: showAllLabel,
                    showTopFive: showTopFiveLabel,
                  }}
                />
              )}
              <Collapse title={"Time Series"}>
                {ccfrpResults.cpueTimeSeries.length > 0 && (
                  <>
                    <VerticalSpacer />
                    <CpueTimeSeriesChart
                      data={ccfrpResults.cpueTimeSeries}
                      title={cpueTimeSeriesLabel}
                    />
                  </>
                )}
              </Collapse>
            </ReportError>
          </div>
        );
      }}
    </ResultsCard>
  );
};

const SpeciesTable: React.FunctionComponent<{
  species: CcfrpSpecies[];
  labels: {
    species: string;
    meanCpue: string;
    meanBpue: string;
    sitesPresent: string;
    showAll: string;
    showTopFive: string;
  };
}> = ({ species, labels }) => {
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
            <th style={headerStyle}>{labels.species}</th>
            <th style={numericHeaderStyle}>{labels.meanCpue}</th>
            <th style={numericHeaderStyle}>{labels.meanBpue}</th>
            <th style={numericHeaderStyle}>{labels.sitesPresent}</th>
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
          {showAllSpecies ? labels.showTopFive : labels.showAll}
        </button>
      )}
    </>
  );
};

const CpueTimeSeriesChart: React.FunctionComponent<{
  data: cpueTimeSeriesPt[];
  title: string;
}> = ({ data, title }) => {
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
  const yearSpan = years.length > 0 ? years[years.length - 1] - years[0] : 0;
  const xAxisYears =
    yearSpan > 10
      ? years.filter(
          (year, index) =>
            year % 5 === 0 || index === 0 || index === years.length - 1,
        )
      : years;
  const maxCpue = Math.max(...selectedData.map((datum) => datum.meanCpue), 0);
  const yTicks = getNiceTicks(maxCpue);
  const yMax = yTicks[yTicks.length - 1];

  const getX = (year: number) => {
    if (years.length <= 1) return margin.left + plotWidth / 2;

    return (
      margin.left +
      ((year - years[0]) / (years[years.length - 1] - years[0])) * plotWidth
    );
  };
  const getY = (value: number) =>
    margin.top + plotHeight - (value / yMax) * plotHeight;
  const points = selectedData
    .map((datum) => `${getX(datum.year)},${getY(datum.meanCpue)}`)
    .join(" ");

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
        {xAxisYears.map((year) => (
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
          {"Mean CPUE"}
        </text>
        {points && (
          <g>
            <polyline
              points={points}
              fill="none"
              stroke={CPUE_COLOR}
              strokeWidth={2}
            />
            {selectedData.map((datum) => (
              <circle
                key={datum.year}
                cx={getX(datum.year)}
                cy={getY(datum.meanCpue)}
                r={3}
                fill="#fff"
                stroke={CPUE_COLOR}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

const getNiceTicks = (maxValue: number, tickCount = 4) => {
  if (maxValue <= 0) return [0, 0.25, 0.5, 0.75, 1];

  const niceMax = niceNumber(maxValue * 1.1, true);
  const interval = niceNumber(niceMax / tickCount, false);
  const roundedMax = Math.ceil(niceMax / interval) * interval;
  const ticks: number[] = [];

  for (let tick = 0; tick <= roundedMax + interval / 2; tick += interval) {
    ticks.push(roundTick(tick));
  }

  return ticks;
};

const niceNumber = (value: number, round: boolean) => {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
};

const roundTick = (value: number) => {
  const precision = Math.max(0, -Math.floor(Math.log10(value || 1)) + 2);
  return globalThis.parseFloat(value.toFixed(precision));
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
