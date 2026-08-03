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

export interface KelpForestOverviewProperties {
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
}

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

type KelpForestOverviewFeature = Feature<Point, KelpForestOverviewProperties>;
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
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
): Promise<KelpForestOverviewResults> {
  const sketchArray = toSketchArray(sketch);
  const sketchBbox = bbox(sketch) as BBox;
  const ds = project.getDatasourceById("kelpforest_sites");
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);
  const features = (await loadFgb<Feature<Point>>(
    url,
    sketchBbox,
  )) as KelpForestOverviewFeature[];

  const pointsInSketch = features.filter((feature) =>
    sketchArray.some((sketchFeature) =>
      booleanPointInPolygon(feature, sketchFeature),
    ),
  );

  return summarizeSites(pointsInSketch);
}

function summarizeSites(
  features: KelpForestOverviewFeature[],
): KelpForestOverviewResults {
  const siteSummaries = getSiteSummaries(features);
  const years = features
    .map(getFeatureYear)
    .filter((year): year is number => year !== undefined)
    .sort((a, b) => a - b);

  return {
    siteCount: siteSummaries.length,
    yearRange:
      years.length === 0
        ? null
        : {
            min: years[0],
            max: years[years.length - 1],
          },
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

function getUniqueSortedValues(values: (string | undefined)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((a, b) => a.localeCompare(b));
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
    taxonRowsCache = parseCsv(
      readFileSync(
        `${process.env.PROJECT_PATH ?? process.cwd()}/${TAXON_TABLE_PATH}`,
        "utf8",
      ),
    );
  }

  return taxonRowsCache;
}

function parseCsv(csv: string): KelpForestTaxonRow[] {
  const [headerLine, ...recordLines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return recordLines.map((line) => {
    const values = parseCsvLine(line);
    const row: KelpForestTaxonRow = {};

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

function getFeatureYear(
  feature: KelpForestOverviewFeature,
): number | undefined {
  const year = Number(feature.properties.survey_year);
  return Number.isFinite(year) ? year : undefined;
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
