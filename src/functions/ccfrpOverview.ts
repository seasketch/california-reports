import { GeoprocessingHandler } from "@seasketch/geoprocessing";
import { toSketchArray } from "@seasketch/geoprocessing/client-core";
import { bbox } from "@turf/turf";
import {
  getDatasourceFeatures,
  getFeaturesWithinSketch,
  getYearRange,
  type MonitoringSketch,
  normalizeLabel,
  normalizeMpaStatus,
  type PointFeature,
  readCsvRows,
} from "./monitoringOverviewHelpers.js";

type CcfrpOverviewProperties = {
  Area?: string;
  Common_Name?: string;
  Date?: string;
  Grid_Cell_ID?: string;
  MPA_Status?: string;
};

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

type CcfrpOverviewFeature = PointFeature<CcfrpOverviewProperties>;
type CcfrpSpeciesRow = Record<string, string | undefined>;

const SPECIES_TABLE_PATH = "data/monitoring/CCFRP_species_table.csv";
let speciesRowsCache: CcfrpSpeciesRow[] | undefined;

/**
 * @param sketch - A sketch or collection of sketches
 * @returns CCFRP monitoring site summaries
 */
export async function ccfrpOverview(
  sketch: MonitoringSketch,
): Promise<CcfrpOverviewResults> {
  const sketchArray = toSketchArray(sketch);
  const features = await getDatasourceFeatures<CcfrpOverviewFeature>(
    "ccfrp-full",
    bbox(sketch),
  );
  const pointsInSketch = getFeaturesWithinSketch(features, sketchArray);

  return summarizeSites(pointsInSketch);
}

function summarizeSites(
  features: CcfrpOverviewFeature[],
): CcfrpOverviewResults {
  const sites = getSiteSummaries(features);
  const years = features
    .map(getFeatureYear)
    .filter((year): year is number => year !== undefined);

  return {
    siteCount: sites.length,
    yearRange: getYearRange(years),
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
    speciesRowsCache = readCsvRows<CcfrpSpeciesRow>(SPECIES_TABLE_PATH);
  }

  return speciesRowsCache;
}

export default new GeoprocessingHandler(ccfrpOverview, {
  title: "ccfrpOverview",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
