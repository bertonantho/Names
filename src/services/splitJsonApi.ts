// Service for working with split JSON data files
import {
  NameData,
  NameSummary,
  ProcessedNamesData,
  countLetters,
  countSyllables,
} from './namesApi';

// Re-export types for convenience
export type { NameData, NameSummary, ProcessedNamesData };

// Re-export utility functions that may be needed
export {
  countLetters,
  countSyllables,
  findSimilarNames,
  findNamesWithSimilarCharacteristics,
  generateGemmaEnhancedRecommendations,
} from './namesApi';
export type { EnhancedRecommendation, FamilyContext } from './namesApi';

// Utility function to calculate trending ratio (same logic as namesApi)
export function calculateTrendingRatio(name: NameData): number {
  const births2024 = name.yearlyData['2024'] || 0;
  const births2023 = name.yearlyData['2023'] || 0;

  if (births2023 === 0) {
    return births2024 > 0 ? 10 : 0; // New name = 10x growth (same as namesApi)
  }

  return births2024 / births2023;
}

// Utility function to calculate trending percentage for display
export function calculateTrendingPercentage(name: NameData): number {
  const births2024 = name.yearlyData['2024'] || 0;
  const births2023 = name.yearlyData['2023'] || 0;

  if (births2023 === 0) {
    return births2024 > 0 ? 100 : 0; // New name = 100% growth
  }

  return ((births2024 - births2023) / births2023) * 100;
}

// Cache for loaded data
const dataCache = new Map<string, any>();

// Base URL for data files
const DATA_BASE_URL = '/data';

// Helper function to fetch and cache JSON data
async function fetchAndCache<T>(filename: string): Promise<T> {
  if (dataCache.has(filename)) {
    return dataCache.get(filename);
  }

  try {
    const response = await fetch(`${DATA_BASE_URL}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }

    const data = await response.json();
    dataCache.set(filename, data);
    return data;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}

// Load manifest to understand available files
export async function loadManifest() {
  return fetchAndCache<{
    version: string;
    timestamp: string;
    files: Record<string, string>;
    chunks: {
      boys: { count: number; pattern: string };
      girls: { count: number; pattern: string };
    };
    stats: {
      originalSize: number;
      totalNames: number;
      boysNames: number;
      girlsNames: number;
    };
  }>('manifest.json');
}

// Load summary data (lightweight, for homepage)
export async function getSummary(): Promise<NameSummary> {
  const summaryData = await fetchAndCache<
    NameSummary & { timestamp: string; version: string }
  >('summary.json');
  return {
    totalNames: summaryData.totalNames,
    totalBirths: summaryData.totalBirths,
    yearRange: summaryData.yearRange,
    topNames: summaryData.topNames,
  };
}

// Load popular names by year (quick access for recent years)
export async function getPopularNamesByYear(
  year: number,
  sex?: 'M' | 'F'
): Promise<NameData[]> {
  const popularData = await fetchAndCache<
    Record<string, { boys: any[]; girls: any[] }>
  >('popular_by_year.json');

  const yearData = popularData[year.toString()];
  if (!yearData) {
    console.warn(`No data available for year ${year}`);
    return [];
  }

  let results: any[] = [];

  if (!sex || sex === 'M') {
    results = results.concat(yearData.boys);
  }
  if (!sex || sex === 'F') {
    results = results.concat(yearData.girls);
  }

  // Convert to full NameData format
  return results.map((item) => ({
    name: item.name,
    sex: item.sex,
    totalCount: item.totalCount,
    firstYear: 2000, // Default, would need full data for exact
    lastYear: year,
    yearlyData: { [year.toString()]: item.births },
  }));
}

// Load trending names
export async function getTrendingNames(sex?: 'M' | 'F'): Promise<NameData[]> {
  const trendingData = await fetchAndCache<{ boys: any[]; girls: any[] }>(
    'trending_names.json'
  );

  let results: any[] = [];

  if (!sex || sex === 'M') {
    results = results.concat(trendingData.boys);
  }
  if (!sex || sex === 'F') {
    results = results.concat(trendingData.girls);
  }

  // Convert to NameData format
  return results.map((item) => ({
    name: item.name,
    sex: item.sex,
    totalCount: item.totalCount,
    firstYear: 2000, // Default
    lastYear: 2024,
    yearlyData: {
      '2024': item.current,
      '2023': item.previous,
    },
  }));
}

// Load search index (lightweight for quick search)
export async function getSearchIndex(): Promise<
  Array<{
    name: string;
    sex: 'M' | 'F';
    totalCount: number;
    recent: number;
    firstYear: number;
    lastYear: number;
  }>
> {
  return fetchAndCache('search_index.json');
}

// Search names using the lightweight index first, then load full data
export async function searchNames(options: {
  query?: string;
  sex?: 'M' | 'F' | 'all';
  minYear?: number;
  maxYear?: number;
  minCount?: number;
  minLetters?: number;
  maxLetters?: number;
  minSyllables?: number;
  maxSyllables?: number;
  minBirths2024?: number;
  minTrendingRate?: number;
  maxTrendingRate?: number;
  sortBy?: 'popularity' | 'alphabetical' | 'rarity' | 'trending';
  limit?: number;
}): Promise<NameData[]> {
  // First, use search index for quick filtering
  const searchIndex = await getSearchIndex();

  let results = searchIndex;

  // Apply basic filters using the index
  if (options.query) {
    const query = options.query.toLowerCase();
    results = results.filter((name) => name.name.toLowerCase().includes(query));
  }

  if (options.sex && options.sex !== 'all') {
    results = results.filter((name) => name.sex === options.sex);
  }

  if (options.minCount) {
    results = results.filter((name) => name.totalCount >= options.minCount!);
  }

  // For more detailed searches, we need to load full data
  const needsFullData =
    options.minLetters ||
    options.maxLetters ||
    options.minSyllables ||
    options.maxSyllables ||
    options.minBirths2024 ||
    options.minTrendingRate;
  const needsTrendingData = options.sortBy === 'trending';

  if (needsFullData || needsTrendingData) {
    // Determine which full datasets to load
    const needsBoys =
      !options.sex || options.sex === 'all' || options.sex === 'M';
    const needsGirls =
      !options.sex || options.sex === 'all' || options.sex === 'F';

    const fullData: NameData[] = [];

    if (needsBoys) {
      const boysData = await fetchAndCache<{ names: NameData[] }>(
        'boys_names.json'
      );
      fullData.push(...boysData.names);
    }

    if (needsGirls) {
      const girlsData = await fetchAndCache<{ names: NameData[] }>(
        'girls_names.json'
      );
      fullData.push(...girlsData.names);
    }

    // Apply advanced filters on full data
    let filteredData = fullData;

    if (options.query) {
      const query = options.query.toLowerCase();
      filteredData = filteredData.filter((name) =>
        name.name.toLowerCase().includes(query)
      );
    }

    if (options.sex && options.sex !== 'all') {
      filteredData = filteredData.filter((name) => name.sex === options.sex);
    }

    // Filter by year range
    if (options.minYear) {
      filteredData = filteredData.filter(
        (name) => name.lastYear >= options.minYear!
      );
    }
    if (options.maxYear) {
      filteredData = filteredData.filter(
        (name) => name.firstYear <= options.maxYear!
      );
    }

    // Filter by minimum count
    if (options.minCount) {
      filteredData = filteredData.filter(
        (name) => name.totalCount >= options.minCount!
      );
    }

    // Filter by letter count
    if (options.minLetters) {
      filteredData = filteredData.filter(
        (name) => countLetters(name.name) >= options.minLetters!
      );
    }
    if (options.maxLetters) {
      filteredData = filteredData.filter(
        (name) => countLetters(name.name) <= options.maxLetters!
      );
    }

    // Filter by syllable count
    if (options.minSyllables) {
      filteredData = filteredData.filter(
        (name) => countSyllables(name.name) >= options.minSyllables!
      );
    }
    if (options.maxSyllables) {
      filteredData = filteredData.filter(
        (name) => countSyllables(name.name) <= options.maxSyllables!
      );
    }

    // Filter by minimum births in 2024
    if (options.minBirths2024) {
      filteredData = filteredData.filter(
        (name) => (name.yearlyData['2024'] || 0) >= options.minBirths2024!
      );
    }

    // Filter by trending rate (growth rate from 2023 to 2024)
    if (
      options.minTrendingRate !== undefined ||
      options.maxTrendingRate !== undefined
    ) {
      filteredData = filteredData.filter((name) => {
        const count2024 = name.yearlyData['2024'] || 0;
        const count2023 = name.yearlyData['2023'] || 0;

        // Calculate growth rate (same logic as namesApi)
        let growthRate: number;
        if (count2023 === 0) {
          growthRate = count2024 > 0 ? 10 : 0; // Treat new names as 10x growth
        } else {
          growthRate = count2024 / count2023;
        }

        // Apply min filter
        if (
          options.minTrendingRate !== undefined &&
          growthRate < options.minTrendingRate
        ) {
          return false;
        }

        // Apply max filter
        if (
          options.maxTrendingRate !== undefined &&
          growthRate > options.maxTrendingRate
        ) {
          return false;
        }

        return true;
      });
    }

    // Sort results (same logic as namesApi)
    if (options.sortBy === 'alphabetical') {
      filteredData.sort((a, b) => a.name.localeCompare(b.name));
    } else if (options.sortBy === 'rarity') {
      // Rarity sorting: least popular names in 2024 first (exclude 0 births)
      filteredData = filteredData.filter(
        (name) => (name.yearlyData['2024'] || 0) > 0
      );
      filteredData.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;
        return aCount2024 - bCount2024; // Ascending - least popular first
      });
    } else if (options.sortBy === 'trending') {
      // Trending sorting: highest growth rate from 2023 to 2024 first
      filteredData.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const aCount2023 = a.yearlyData['2023'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;
        const bCount2023 = b.yearlyData['2023'] || 0;

        // Calculate growth rates (2024 births / 2023 births)
        const aGrowthRate =
          aCount2023 > 0
            ? aCount2024 / aCount2023
            : aCount2024 > 0
              ? Infinity
              : 0;
        const bGrowthRate =
          bCount2023 > 0
            ? bCount2024 / bCount2023
            : bCount2024 > 0
              ? Infinity
              : 0;

        // Sort by growth rate (descending)
        if (aGrowthRate !== bGrowthRate) {
          return bGrowthRate - aGrowthRate;
        }

        // If growth rates are equal, sort by 2024 popularity as tiebreaker
        return bCount2024 - aCount2024;
      });
    } else {
      // Default to popularity sorting based on 2024 data (same as namesApi)
      filteredData.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;

        // If both have 2024 data, sort by 2024 popularity
        if (aCount2024 > 0 || bCount2024 > 0) {
          return bCount2024 - aCount2024;
        }

        // If neither has 2024 data, fall back to most recent year available
        const aRecentCount = a.yearlyData['2023'] || a.yearlyData['2022'] || 0;
        const bRecentCount = b.yearlyData['2023'] || b.yearlyData['2022'] || 0;

        return bRecentCount - aRecentCount;
      });
    }

    // Apply limit
    if (options.limit) {
      filteredData = filteredData.slice(0, options.limit);
    }

    return filteredData;
  }

  // For simple searches, convert index results to NameData format
  const convertedResults: NameData[] = results.map((item) => ({
    name: item.name,
    sex: item.sex,
    totalCount: item.totalCount,
    firstYear: item.firstYear,
    lastYear: item.lastYear,
    yearlyData: { [item.lastYear.toString()]: item.recent },
  }));

  // Sort and limit
  if (options.sortBy === 'alphabetical') {
    convertedResults.sort((a, b) => a.name.localeCompare(b.name));
  } else if (options.sortBy === 'rarity') {
    convertedResults.sort((a, b) => a.totalCount - b.totalCount);
  } else if (options.sortBy === 'trending') {
    // For simple search (search index), we need to load full data for trending calculation
    // Fall back to popularity sorting for now, or trigger advanced search
    convertedResults.sort((a, b) => {
      const aRecent = Object.values(a.yearlyData)[0] || 0;
      const bRecent = Object.values(b.yearlyData)[0] || 0;
      return bRecent - aRecent;
    });
  } else {
    // Default popularity sorting by recent births (from yearlyData)
    convertedResults.sort((a, b) => {
      const aRecent = Object.values(a.yearlyData)[0] || 0;
      const bRecent = Object.values(b.yearlyData)[0] || 0;
      return bRecent - aRecent;
    });
  }

  return options.limit
    ? convertedResults.slice(0, options.limit)
    : convertedResults;
}

// Load specific name details (will search across gender files if needed)
export async function getNameDetails(
  name: string,
  sex: 'M' | 'F'
): Promise<NameData | null> {
  try {
    const filename = sex === 'M' ? 'boys_names.json' : 'girls_names.json';
    const data = await fetchAndCache<{ names: NameData[] }>(filename);

    const nameData = data.names.find((n) => n.name === name && n.sex === sex);
    return nameData || null;
  } catch (error) {
    console.error(`Error loading name details for ${name}:`, error);
    return null;
  }
}

// Load names by gender (with lazy loading option)
export async function loadNamesByGender(
  gender: 'M' | 'F',
  chunk?: number
): Promise<{ names: NameData[]; hasMore: boolean }> {
  if (chunk !== undefined) {
    // Load specific chunk
    const filename =
      gender === 'M' ? `boys_chunk_${chunk}.json` : `girls_chunk_${chunk}.json`;

    try {
      const chunkData = await fetchAndCache<NameData[]>(filename);
      const manifest = await loadManifest();
      const totalChunks =
        gender === 'M'
          ? manifest.chunks.boys.count
          : manifest.chunks.girls.count;

      return {
        names: chunkData,
        hasMore: chunk < totalChunks - 1,
      };
    } catch (error) {
      return { names: [], hasMore: false };
    }
  } else {
    // Load all names for gender
    const filename = gender === 'M' ? 'boys_names.json' : 'girls_names.json';
    const data = await fetchAndCache<{ names: NameData[] }>(filename);

    return {
      names: data.names,
      hasMore: false,
    };
  }
}

// Compatibility function - loads all data (fallback to original behavior)
export async function loadProcessedData(): Promise<ProcessedNamesData> {
  console.warn(
    'loadProcessedData is loading all data - consider using specific functions for better performance'
  );

  const [summary, boysData, girlsData] = await Promise.all([
    getSummary(),
    fetchAndCache<{ names: NameData[] }>('boys_names.json'),
    fetchAndCache<{ names: NameData[] }>('girls_names.json'),
  ]);

  const allNames = [...boysData.names, ...girlsData.names];

  return {
    summary,
    names: allNames,
  };
}

// Clear cache (useful for development)
export function clearCache() {
  dataCache.clear();
  console.log('Data cache cleared');
}

// Get cache status
export function getCacheStatus() {
  return {
    size: dataCache.size,
    keys: Array.from(dataCache.keys()),
  };
}

// Get trending names (most growing between 2023 and 2024)
export async function getTrendingNamesAdvanced(
  sex?: 'M' | 'F',
  limit: number = 20
): Promise<NameData[]> {
  return searchNames({
    sex: sex,
    sortBy: 'trending',
    limit: limit,
  });
}
