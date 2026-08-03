import { GeoprocessingHandler } from "@seasketch/geoprocessing";
import { toSketchArray } from "@seasketch/geoprocessing/client-core";
import { bbox } from "@turf/turf";
import {
  getDatasourceFeatures,
  getFeaturesWithinSketch,
  getUniqueSortedValues,
  getYearRange,
  type MonitoringSketch,
  normalizeLabel,
  normalizeMpaStatus,
  type PointFeature,
  readCsvRows,
} from "./monitoringOverviewHelpers.js";

type KelpForestOverviewProperties = {
  LTM_project_short_code?: string;
  campus?: string;
  method?: string;
  survey_year?: number | string;
  site?: string;
  site_name_old?: string;
  CA_MPA_Name_Short?: string;
  site_designation?: string;
  site_status?: string;
  Secondary_MPA_Name?: string;
  Secondary_site_designation?: string;
  BaselineRegion?: string;
  LongTermRegion?: string;
};

export interface KelpForestSiteSummary {
  site: string;
  siteName: string;
  mpaStatuses: string[];
  years: number[];
  campuses: string[];
  methods: string[];
  species: string[];
}

export interface KelpForestOverviewResults {
  siteCount: number;
  yearRange: {
    min: number;
    max: number;
  } | null;
  sites: KelpForestSiteSummary[];
}

type KelpForestOverviewFeature = PointFeature<KelpForestOverviewProperties>;
type KelpForestTaxonRow = Record<string, string | undefined>;
type SiteSurveyRecord = {
  year?: number;
  campus?: string;
  method?: string;
};

const TAXON_TABLE_PATH = "data/monitoring/MLPA_kelpforest_taxon_table.10.csv";
const SAMPLE_TYPES = ["SIZEFREQ", "FISH", "SWATH", "UPC"];
let taxonRowsCache: KelpForestTaxonRow[] | undefined;

/**
 * @param sketch - A sketch or collection of sketches
 * @returns Kelp forest monitoring site summaries
 */
export async function kelpForestOverview(
  sketch: MonitoringSketch,
): Promise<KelpForestOverviewResults> {
  const sketchArray = toSketchArray(sketch);
  const features = await getDatasourceFeatures<KelpForestOverviewFeature>(
    "kelpforest_sites",
    bbox(sketch),
  );
  const pointsInSketch = getFeaturesWithinSketch(features, sketchArray);

  return summarizeSites(pointsInSketch);
}

function summarizeSites(
  features: KelpForestOverviewFeature[],
): KelpForestOverviewResults {
  const siteSummaries = getSiteSummaries(features);
  const years = features
    .map(getFeatureYear)
    .filter((year): year is number => year !== undefined);

  return {
    siteCount: siteSummaries.length,
    yearRange: getYearRange(years),
    sites: siteSummaries,
  };
}

function getSiteSummaries(
  features: KelpForestOverviewFeature[],
): KelpForestSiteSummary[] {
  const taxonRows = getTaxonRows();
  const siteGroups = new Map<
    string,
    {
      siteName: string;
      mpaStatuses: Set<string>;
      years: Set<number>;
      campuses: Set<string>;
      methods: Set<string>;
      records: SiteSurveyRecord[];
    }
  >();

  features.forEach((feature) => {
    const site = normalizeLabel(feature.properties.site);
    if (!site) return;

    const group = siteGroups.get(site) ?? {
      siteName: formatSiteName(
        normalizeLabel(feature.properties.site_name_old) ?? site,
      ),
      mpaStatuses: new Set<string>(),
      years: new Set<number>(),
      campuses: new Set<string>(),
      methods: new Set<string>(),
      records: [],
    };

    const year = getFeatureYear(feature);
    const campus = normalizeLabel(feature.properties.campus);
    const method = normalizeLabel(feature.properties.method);
    const mpaStatus = normalizeMpaStatus(feature.properties.site_status);

    if (year !== undefined) group.years.add(year);
    if (campus) group.campuses.add(campus);
    if (method) group.methods.add(method);
    if (mpaStatus) group.mpaStatuses.add(mpaStatus);
    group.records.push({ year, campus, method });
    siteGroups.set(site, group);
  });

  return [...siteGroups.entries()]
    .map(([site, group]) => {
      const years = [...group.years].sort((a, b) => a - b);
      const latestYear = years[years.length - 1];
      const latestRecords = group.records.filter(
        (record) => record.year === latestYear,
      );
      const latestCampuses = getUniqueSortedValues(
        latestRecords.map((record) => record.campus),
      );
      const latestMethods = getUniqueSortedValues(
        latestRecords.map((record) => record.method),
      );

      return {
        site,
        siteName: group.siteName,
        mpaStatuses: [...group.mpaStatuses].sort((a, b) => a.localeCompare(b)),
        years,
        campuses: [...group.campuses].sort((a, b) => a.localeCompare(b)),
        methods: [...group.methods].sort((a, b) => a.localeCompare(b)),
        species: getSurveyedSpecies(
          taxonRows,
          latestYear,
          latestCampuses,
          latestMethods,
        ),
      };
    })
    .sort(
      (a, b) =>
        a.siteName.localeCompare(b.siteName) || a.site.localeCompare(b.site),
    );
}

function getSurveyedSpecies(
  taxonRows: KelpForestTaxonRow[],
  year: number | undefined,
  campuses: string[],
  methods: string[],
): string[] {
  if (year === undefined || campuses.length === 0 || methods.length === 0)
    return [];

  const lookedYearKey = `LOOKED${year}`;
  const campusSet = new Set(campuses.map((campus) => campus.toUpperCase()));
  const sampleTypes = new Set(
    methods
      .map(getMethodSampleType)
      .filter((sampleType): sampleType is string => Boolean(sampleType)),
  );

  if (sampleTypes.size === 0) return [];

  return [
    ...new Set(
      taxonRows
        .filter((row) => {
          const campus = normalizeLabel(row.campus)?.toUpperCase();
          const sampleType = normalizeLabel(row.sample_type)?.toUpperCase();
          const wasLookedFor = row[lookedYearKey]?.toLowerCase() === "yes";

          return Boolean(
            campus &&
              sampleType &&
              campusSet.has(campus) &&
              sampleTypes.has(sampleType) &&
              wasLookedFor,
          );
        })
        .map(
          (row) =>
            normalizeLabel(row.common_name) ??
            normalizeLabel(row.species_definition),
        )
        .filter((species): species is string => Boolean(species)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function getMethodSampleType(method: string | undefined): string | undefined {
  if (!method) return undefined;
  const methodParts = method.toUpperCase().split("_");
  return SAMPLE_TYPES.find((sampleType) => methodParts.includes(sampleType));
}

function getTaxonRows(): KelpForestTaxonRow[] {
  if (!taxonRowsCache) {
    taxonRowsCache = readCsvRows<KelpForestTaxonRow>(TAXON_TABLE_PATH);
  }

  return taxonRowsCache;
}

function getFeatureYear(
  feature: KelpForestOverviewFeature,
): number | undefined {
  const year = Number(feature.properties.survey_year);
  return Number.isFinite(year) ? year : undefined;
}

function formatSiteName(siteName: string): string {
  return siteName
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(formatSiteNamePart)
    .join(" ");
}

function formatSiteNamePart(part: string): string {
  const upperPart = part.toUpperCase();
  const directionLabels: Record<string, string> = {
    N: "North",
    S: "South",
    E: "East",
    W: "West",
    NE: "Northeast",
    NW: "Northwest",
    SE: "Southeast",
    SW: "Southwest",
    CEN: "Center",
  };

  if (directionLabels[upperPart]) return directionLabels[upperPart];
  if (/^\d+$/.test(part)) return part;

  return upperPart.charAt(0) + upperPart.slice(1).toLowerCase();
}

export default new GeoprocessingHandler(kelpForestOverview, {
  title: "kelpForestOverview",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
