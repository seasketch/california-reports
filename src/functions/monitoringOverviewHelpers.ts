import {
  isVectorDatasource,
  loadFgb,
  MultiPolygon,
  Polygon,
  Sketch,
  SketchCollection,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { booleanPointInPolygon } from "@turf/turf";
import { BBox, Feature, Point } from "geojson";
import { readFileSync } from "fs";

export type MonitoringSketch =
  | Sketch<Polygon | MultiPolygon>
  | SketchCollection<Polygon | MultiPolygon>;

export type PointFeature<Props = object> = Feature<Point, Props>;

export async function getDatasourceFeatures<T extends PointFeature>(
  datasourceId: string,
  sketchBbox: BBox,
): Promise<T[]> {
  const datasource = project.getDatasourceById(datasourceId);
  if (!isVectorDatasource(datasource)) {
    throw new Error(
      `Expected vector datasource for ${datasource.datasourceId}`,
    );
  }

  return (await loadFgb<Feature<Point>>(
    project.getDatasourceUrl(datasource),
    sketchBbox,
  )) as T[];
}

export function getFeaturesWithinSketch<T extends Feature<Point>>(
  features: T[],
  sketchArray: Sketch<Polygon | MultiPolygon>[],
): T[] {
  return features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );
}

export function readCsvRows<T extends Record<string, string | undefined>>(
  relativePath: string,
): T[] {
  return parseCsv<T>(
    readFileSync(
      `${process.env.PROJECT_PATH ?? process.cwd()}/${relativePath}`,
      "utf8",
    ),
  );
}

export function normalizeLabel(
  value: unknown,
  missingLabels: string[] = ["NA"],
): string | undefined {
  if (value === undefined || value === null) return undefined;

  const label = String(value).trim();
  return label && !missingLabels.includes(label.toUpperCase())
    ? label
    : undefined;
}

export function addIfPresent(values: Set<string>, value: unknown) {
  const label = normalizeLabel(value, ["NA", "NONE"]);
  if (label) values.add(label);
}

export function getUniqueNormalizedValues(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => normalizeLabel(value, ["NA", "NONE"]))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function getUniqueSortedValues(
  values: (string | undefined)[],
): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((a, b) => a.localeCompare(b));
}

export function getYearRange(years: number[]) {
  if (years.length === 0) return null;

  const sortedYears = [...years].sort((a, b) => a - b);
  return {
    min: sortedYears[0],
    max: sortedYears[sortedYears.length - 1],
  };
}

export function normalizeMpaStatus(value: unknown): string | undefined {
  const status = normalizeLabel(value)?.toUpperCase();
  if (!status) return undefined;
  if (status.includes("MPA")) return "MPA";
  if (status.includes("REF")) return "REF";
  return undefined;
}

function parseCsv<T extends Record<string, string | undefined>>(
  csv: string,
): T[] {
  const [headerLine, ...recordLines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return recordLines.map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string | undefined> = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    return row as T;
  });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      value += char;
      index++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}
