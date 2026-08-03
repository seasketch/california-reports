import React from "react";

export type MonitoringYearRange = {
  min: number;
  max: number;
} | null;

const numberFormatter = new Intl.NumberFormat("en", { style: "decimal" });

export const MonitoringSummaryStats: React.FunctionComponent<{
  siteCount: number;
  yearRange: MonitoringYearRange;
  labels: {
    sites: string;
    years: string;
  };
}> = ({ siteCount, yearRange, labels }) => (
  <div style={monitoringStyles.summaryGrid}>
    <SummaryStat
      label={labels.sites}
      value={numberFormatter.format(siteCount)}
    />
    <SummaryStat label={labels.years} value={formatYearRange(yearRange)} />
  </div>
);

const SummaryStat: React.FunctionComponent<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div style={monitoringStyles.summaryStat}>
    <div style={monitoringStyles.summaryValue}>{value}</div>
    <div style={monitoringStyles.summaryLabel}>{label}</div>
  </div>
);

export const formatYearRange = (yearRange: MonitoringYearRange) => {
  if (!yearRange) return "n/a";
  if (yearRange.min === yearRange.max) return String(yearRange.min);
  return `${yearRange.min}-${yearRange.max}`;
};

export const formatYears = (years: number[]) => {
  if (years.length === 0) return "n/a";

  const ranges = years.reduce<{ start: number; end: number }[]>(
    (yearRanges, year) => {
      const currentRange = yearRanges[yearRanges.length - 1];

      if (currentRange && year === currentRange.end + 1) {
        currentRange.end = year;
      } else {
        yearRanges.push({ start: year, end: year });
      }

      return yearRanges;
    },
    [],
  );

  return ranges
    .map((range) =>
      range.start === range.end
        ? String(range.start)
        : `${range.start}-${range.end}`,
    )
    .join(", ");
};

export const formatList = (values: string[] | undefined) =>
  values?.length ? values.join(", ") : "n/a";

export const formatMonitoringMpaStatuses = (values: string[] | undefined) =>
  formatList(
    values
      ?.map(normalizeMonitoringMpaStatus)
      .filter((status): status is string => Boolean(status)),
  );

const normalizeMonitoringMpaStatus = (value: string): string | undefined => {
  const status = value.toUpperCase();
  if (status.includes("MPA")) return "MPA";
  if (status.includes("REF")) return "REF";
  return undefined;
};

export const getTableRowStyle = (index: number) =>
  index % 2 === 0 ? monitoringStyles.row : monitoringStyles.alternateRow;

export const monitoringStyles = {
  cardBody: {
    breakInside: "avoid",
  },
  summaryGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  summaryStat: {
    background: "#f7f7f7",
    border: "1px solid #e4e4e4",
    borderRadius: 6,
    padding: "10px 12px",
    textAlign: "center",
  },
  summaryValue: {
    color: "#333",
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.2,
  },
  summaryLabel: {
    color: "#666",
    fontSize: 11,
    letterSpacing: "0.02em",
    marginTop: 4,
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    border: "1px solid #e4e4e4",
    borderCollapse: "separate",
    borderRadius: 6,
    borderSpacing: 0,
    fontSize: 12,
    overflow: "hidden",
    tableLayout: "fixed",
  },
  header: {
    backgroundColor: "#f7f7f7",
    borderBottom: "1px solid #ddd",
    color: "#555",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    padding: "6px 8px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  cell: {
    borderBottom: "1px solid #eee",
    color: "#333",
    padding: "7px 8px",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  row: {
    backgroundColor: "#fff",
  },
  alternateRow: {
    backgroundColor: "#fbfbfb",
  },
  uppercaseCell: {
    color: "#555",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    verticalAlign: "top",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
} satisfies Record<string, React.CSSProperties>;
