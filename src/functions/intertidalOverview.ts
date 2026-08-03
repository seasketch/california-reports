import { GeoprocessingHandler } from "@seasketch/geoprocessing";
import { toSketchArray } from "@seasketch/geoprocessing/client-core";
import { bbox } from "@turf/turf";
import {
  addIfPresent,
  getDatasourceFeatures,
  getFeaturesWithinSketch,
  getUniqueNormalizedValues,
  getYearRange,
  type MonitoringSketch,
  normalizeLabel,
  type PointFeature,
  readCsvRows,
} from "./monitoringOverviewHelpers.js";

type IntertidalOverviewSiteProperties = {
  marine_site_code?: string;
  marine_site_name?: string;
  marine_sort_order?: number | string;
  island?: string;
  state_province?: string;
  country?: string;
  pisco_code?: string;
  mpa_region?: string;
  mpa_lt_region?: string;
  mpa_designation?: string;
  mpa_name?: string;
  LTM_project_short_code?: string;
  georegion?: string;
  bioregion?: string;
};

type IntertidalOverviewSurveyProperties = {
  marine_site_name?: string;
  marine_site_code?: string;
  cbs_site_code?: number | string;
  year?: number | string;
};

export interface IntertidalSiteSummary {
  siteCode: string;
  siteName: string;
  island?: string;
  region?: string;
  mpaName?: string;
  mpaDesignation?: string;
  mpaStatuses: string[];
  years: number[];
}

export interface IntertidalOverviewResults {
  siteCount: number;
  yearRange: {
    min: number;
    max: number;
  } | null;
  genera: IntertidalGeneraMethodSummary[];
  sites: IntertidalSiteSummary[];
}

export interface IntertidalGeneraMethodSummary {
  method: string;
  genera: string[];
}

type IntertidalOverviewSiteFeature =
  PointFeature<IntertidalOverviewSiteProperties>;
type IntertidalOverviewSurveyFeature =
  PointFeature<IntertidalOverviewSurveyProperties>;
type IntertidalSpeciesTableRow = Record<string, string | undefined>;

const SPECIES_TABLE_PATH = "data/monitoring/intertidal_species_table.csv";
let speciesTableRowsCache: IntertidalSpeciesTableRow[] | undefined;

/**
 * @param sketch - A sketch or collection of sketches
 * @returns Rocky intertidal monitoring site summaries
 */
export async function intertidalOverview(
  sketch: MonitoringSketch,
): Promise<IntertidalOverviewResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch);
  const [siteFeatures, surveyFeatures] = await Promise.all([
    getDatasourceFeatures<IntertidalOverviewSiteFeature>(
      "intertidalBiodiversity_sites",
      sketchBbox,
    ),
    getDatasourceFeatures<IntertidalOverviewSurveyFeature>(
      "intertidal",
      sketchBbox,
    ),
  ]);
  const sitesInSketch = getFeaturesWithinSketch(siteFeatures, sketchArray);
  const surveysInSketch = getFeaturesWithinSketch(surveyFeatures, sketchArray);

  return summarizeSites(sitesInSketch, surveysInSketch);
}

function summarizeSites(
  siteFeatures: IntertidalOverviewSiteFeature[],
  surveyFeatures: IntertidalOverviewSurveyFeature[],
): IntertidalOverviewResults {
  const surveySummaryBySite = getSurveySummaryBySite(surveyFeatures);
  const sites = getSiteSummaries(siteFeatures, surveySummaryBySite);
  const genera = sites.length === 0 ? [] : getGeneraSurveyed();
  const years = sites.flatMap((site) => site.years);

  return {
    siteCount: sites.length,
    yearRange: getYearRange(years),
    genera,
    sites,
  };
}

function getSurveySummaryBySite(
  surveyFeatures: IntertidalOverviewSurveyFeature[],
): Map<string, { years: Set<number> }> {
  const surveySummaryBySite = new Map<string, { years: Set<number> }>();

  surveyFeatures.forEach((feature) => {
    const siteKeys = getSurveySiteKeys(feature);
    const year = getFeatureYear(feature);
    if (siteKeys.length === 0) return;

    siteKeys.forEach((siteKey) => {
      const summary = surveySummaryBySite.get(siteKey) ?? {
        years: new Set<number>(),
      };

      if (year !== undefined) summary.years.add(year);
      surveySummaryBySite.set(siteKey, summary);
    });
  });

  return surveySummaryBySite;
}

function getSiteSummaries(
  siteFeatures: IntertidalOverviewSiteFeature[],
  surveySummaryBySite: Map<string, { years: Set<number> }>,
): IntertidalSiteSummary[] {
  const siteGroups = new Map<
    string,
    {
      siteCode: string;
      siteName: string;
      sortOrder: number;
      islands: Set<string>;
      regions: Set<string>;
      mpaNames: Set<string>;
      mpaDesignations: Set<string>;
      mpaStatuses: Set<string>;
      years: Set<number>;
    }
  >();

  siteFeatures.forEach((feature) => {
    const siteCode = normalizeIntertidalLabel(
      feature.properties.marine_site_code,
    );
    const siteName = normalizeIntertidalLabel(
      feature.properties.marine_site_name,
    );
    const siteId = siteCode ?? siteName;
    if (!siteId) return;

    const group = siteGroups.get(siteId) ?? {
      siteCode: siteCode ?? siteId,
      siteName: siteName ?? siteId,
      sortOrder: getSortOrder(feature),
      islands: new Set<string>(),
      regions: new Set<string>(),
      mpaNames: new Set<string>(),
      mpaDesignations: new Set<string>(),
      mpaStatuses: new Set<string>(),
      years: new Set<number>(),
    };

    addIfPresent(group.islands, feature.properties.island);
    addIfPresent(
      group.regions,
      feature.properties.mpa_lt_region ?? feature.properties.mpa_region,
    );
    addIfPresent(group.mpaNames, feature.properties.mpa_name);
    addIfPresent(group.mpaDesignations, feature.properties.mpa_designation);

    const mpaStatus = normalizeMpaStatus(feature.properties.mpa_designation);
    if (mpaStatus) group.mpaStatuses.add(mpaStatus);

    getSiteKeys(feature).forEach((siteKey) => {
      surveySummaryBySite.get(siteKey)?.years.forEach((year) => {
        group.years.add(year);
      });
    });

    siteGroups.set(siteId, group);
  });

  return [...siteGroups.values()]
    .map((group) => ({
      siteCode: group.siteCode,
      siteName: group.siteName,
      island: formatList([...group.islands]),
      region: formatList([...group.regions]),
      mpaName: formatList([...group.mpaNames]),
      mpaDesignation: formatList([...group.mpaDesignations]),
      mpaStatuses: [...group.mpaStatuses].sort((a, b) => a.localeCompare(b)),
      years: [...group.years].sort((a, b) => a - b),
    }))
    .sort((a, b) => {
      const aSortOrder = siteGroups.get(a.siteCode)?.sortOrder ?? Infinity;
      const bSortOrder = siteGroups.get(b.siteCode)?.sortOrder ?? Infinity;

      return (
        aSortOrder - bSortOrder ||
        a.siteName.localeCompare(b.siteName) ||
        a.siteCode.localeCompare(b.siteCode)
      );
    });
}

function getGeneraSurveyed(): IntertidalGeneraMethodSummary[] {
  const generaByMethod = new Map<string, Set<string>>();

  getSpeciesTableRows().forEach((row) => {
    const method = normalizeIntertidalLabel(row.primary_survey_type);
    const genus = normalizeIntertidalLabel(row.genus);
    if (
      !method ||
      !genus ||
      genus.toUpperCase() === "DROP" ||
      genus.toUpperCase() === "NULL"
    )
      return;

    const generaSet = generaByMethod.get(method) ?? new Set<string>();
    generaSet.add(genus);
    generaByMethod.set(method, generaSet);
  });

  return [...generaByMethod.entries()]
    .map(([method, genera]) => ({
      method,
      genera: [...genera].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.method.localeCompare(b.method));
}

function getSpeciesTableRows(): IntertidalSpeciesTableRow[] {
  if (!speciesTableRowsCache) {
    speciesTableRowsCache =
      readCsvRows<IntertidalSpeciesTableRow>(SPECIES_TABLE_PATH);
  }

  return speciesTableRowsCache;
}

function getSiteKeys(feature: IntertidalOverviewSiteFeature): string[] {
  return getUniqueNormalizedValues([
    feature.properties.marine_site_code,
    feature.properties.marine_site_name,
  ]);
}

function getSurveySiteKeys(feature: IntertidalOverviewSurveyFeature): string[] {
  return getUniqueNormalizedValues([
    feature.properties.marine_site_code,
    feature.properties.marine_site_name,
    feature.properties.cbs_site_code,
  ]);
}

function getFeatureYear(
  feature: IntertidalOverviewSurveyFeature,
): number | undefined {
  const year = Number(feature.properties.year);
  return Number.isFinite(year) ? year : undefined;
}

function getSortOrder(feature: IntertidalOverviewSiteFeature): number {
  const sortOrder = Number(feature.properties.marine_sort_order);
  return Number.isFinite(sortOrder) ? sortOrder : Infinity;
}

const normalizeIntertidalLabel = (value: unknown) =>
  normalizeLabel(value, ["NA", "NONE"]);

function normalizeMpaStatus(value: unknown): string | undefined {
  const designation = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!designation || designation === "NA") return undefined;
  return designation === "NONE" ? "Non-MPA" : "MPA";
}

function formatList(values: string[]): string | undefined {
  return values.length === 0
    ? undefined
    : values.sort((a, b) => a.localeCompare(b)).join(", ");
}

export default new GeoprocessingHandler(intertidalOverview, {
  title: "intertidalOverview",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
});
