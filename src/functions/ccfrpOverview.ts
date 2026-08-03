import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  isVectorDatasource,
  loadFgb,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import { toSketchArray } from "@seasketch/geoprocessing/client-core";
import { bbox, booleanPointInPolygon } from "@turf/turf";
import { BBox, Feature, Point } from "geojson";
import { readFileSync } from "fs";

export interface CcfrpOverviewProperties {
  Area?: string;
  Common_Name?: string;
  Date?: string;
  Grid_Cell_ID?: string;
  MPA_Status?: string;
}

export interface CcfrpSiteSummary {
  areaName: string;
  gridCellId: string;
  mpaStatuses: string[];
  years: number[];
}

export interface CcfrpOverviewResults {
  siteCount: number;
  yearRange: {
    min: number;
    max: number;
  } | null;
  species: string[];
  sites: CcfrpSiteSummary[];
}

type CcfrpOverviewFeature = Feature<Point, CcfrpOverviewProperties>;
type CcfrpSpeciesRow = Record<string, string | undefined>;

const SPECIES_TABLE_PATH = "data/monitoring/CCFRP_species_table.csv";
let speciesRowsCache: CcfrpSpeciesRow[] | undefined;

/**
 * @param sketch - A sketch or collection of sketches
 * @returns CCFRP monitoring site summaries
 */
export async function ccfrpOverview(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
): Promise<CcfrpOverviewResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;
  const ds = project.getDatasourceById("ccfrp-full");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);
  const features = (await loadFgb<Feature<Point>>(
    url,
    sketchBbox,
  )) as CcfrpOverviewFeature[];

  const pointsInSketch = features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );

  return summarizeSites(pointsInSketch);
}

function summarizeSites(
  features: CcfrpOverviewFeature[],
): CcfrpOverviewResults {
  const sites = getSiteSummaries(features);
  const years = features
    .map(getFeatureYear)
    .filter((year): year is number => year !== undefined)
    .sort((a, b) => a - b);

  return {
    siteCount: sites.length,
    yearRange:
      years.length === 0
        ? null
        : {
            min: years[0],
            max: years[years.length - 1],
          },
    species: sites.length === 0 ? [] : getSpecies(),
    sites,
  };
}

function getSiteSummaries(
  features: CcfrpOverviewFeature[],
): CcfrpSiteSummary[] {
  const siteGroups = new Map<
    string,
    {
      areaNames: Set<string>;
      mpaStatuses: Set<string>;
      years: Set<number>;
    }
  >();

  features.forEach((feature) => {
    const gridCellId = normalizeLabel(feature.properties.Grid_Cell_ID);
    if (!gridCellId) return;

    const group = siteGroups.get(gridCellId) ?? {
      areaNames: new Set<string>(),
      mpaStatuses: new Set<string>(),
      years: new Set<number>(),
    };
    const year = getFeatureYear(feature);
    const areaName = normalizeLabel(feature.properties.Area);
    const mpaStatus = normalizeMpaStatus(feature.properties.MPA_Status);

    if (year !== undefined) group.years.add(year);
    if (areaName) group.areaNames.add(areaName);
    if (mpaStatus) group.mpaStatuses.add(mpaStatus);
    siteGroups.set(gridCellId, group);
  });

  return [...siteGroups.entries()]
    .map(([gridCellId, group]) => ({
      areaName: [...group.areaNames]
        .sort((a, b) => a.localeCompare(b))
        .join(", "),
      gridCellId,
      mpaStatuses: [...group.mpaStatuses].sort((a, b) => a.localeCompare(b)),
      years: [...group.years].sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        a.areaName.localeCompare(b.areaName) ||
        a.gridCellId.localeCompare(b.gridCellId),
    );
}

function getFeatureYear(feature: CcfrpOverviewFeature): number | undefined {
  const year = feature.properties.Date?.match(/(\d{4})$/)?.[1];
  if (!year) return undefined;

  const parsedYear = Number(year);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function getSpecies(): string[] {
  return [
    ...new Set(
      getSpeciesRows()
        .map((row) => normalizeLabel(row.Common_Name))
        .filter((commonName): commonName is string => Boolean(commonName)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function getSpeciesRows(): CcfrpSpeciesRow[] {
  if (!speciesRowsCache) {
    speciesRowsCache = parseCsv(
      readFileSync(
        `${process.env.PROJECT_PATH ?? process.cwd()}/${SPECIES_TABLE_PATH}`,
        "utf8",
      ),
    );
  }

  return speciesRowsCache;
}

function parseCsv(csv: string): CcfrpSpeciesRow[] {
  const [headerLine, ...recordLines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return recordLines.map((line) => {
    const values = parseCsvLine(line);
    const row: CcfrpSpeciesRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    return row;
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

function normalizeLabel(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const label = String(value).trim();
  return label && label.toUpperCase() !== "NA" ? label : undefined;
}

function normalizeMpaStatus(value: unknown): string | undefined {
  const status = normalizeLabel(value)?.toUpperCase();
  if (!status) return undefined;
  if (status.includes("MPA")) return "MPA";
  if (status.includes("REF")) return "REF";
  return undefined;
}

export default new GeoprocessingHandler(ccfrpOverview, {
  title: "ccfrpOverview",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
