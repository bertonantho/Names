// Types for the French names data
export interface NameData {
  name: string;
  sex: 'M' | 'F';
  totalCount: number;
  firstYear: number;
  lastYear: number;
  yearlyData: Record<string, number>;
}

// Utility functions for name analysis
export function countLetters(name: string): number {
  return name.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
}

export function countSyllables(name: string): number {
  // French syllable counting rules (simplified)
  const cleanName = name.toLowerCase().replace(/[^a-zA-ZÀ-ÿ]/g, '');

  // Count vowel groups (including French accented vowels)
  const vowelGroups =
    cleanName.match(/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüÿ]+/g) || [];
  let syllableCount = vowelGroups.length;

  // Adjust for common French patterns
  // Silent 'e' at the end (except for short names)
  if (cleanName.endsWith('e') && cleanName.length > 2) {
    syllableCount--;
  }

  // Double vowels that form one syllable
  const doubleVowelReductions =
    cleanName.match(/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüÿ]{2,}/g) || [];
  syllableCount -= doubleVowelReductions.length * 0.5;

  // Ensure minimum of 1 syllable
  return Math.max(1, Math.round(syllableCount));
}

export interface NameSummary {
  totalNames: number;
  totalBirths: number;
  yearRange: {
    min: number;
    max: number;
  };
  topNames: {
    boys: NameData[];
    girls: NameData[];
  };
}

export interface ProcessedNamesData {
  summary: NameSummary;
  names: NameData[];
}

// In-memory cache for processed data
let processedData: ProcessedNamesData | null = null;

// Load processed data from JSON file
export async function loadProcessedData(): Promise<ProcessedNamesData> {
  if (processedData) {
    return processedData;
  }

  try {
    // In a real app, this would be an API call
    // For now, we'll simulate loading from a processed file
    const response = await fetch('/data/processed_names.json');
    if (!response.ok) {
      throw new Error('Failed to load processed names data');
    }

    processedData = await response.json();
    return processedData!;
  } catch (error) {
    console.error('Error loading processed data:', error);

    // Fallback to mock data for development
    return getMockData();
  }
}

// Search names with filters
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
  const data = await loadProcessedData();
  let results = data.names;

  // Filter by query
  if (options.query) {
    const query = options.query.toLowerCase();
    results = results.filter((name) => name.name.toLowerCase().includes(query));
  }

  // Filter by sex
  if (options.sex && options.sex !== 'all') {
    results = results.filter((name) => name.sex === options.sex);
  }

  // Filter by year range
  if (options.minYear) {
    results = results.filter((name) => name.lastYear >= options.minYear!);
  }
  if (options.maxYear) {
    results = results.filter((name) => name.firstYear <= options.maxYear!);
  }

  // Filter by minimum count
  if (options.minCount) {
    results = results.filter((name) => name.totalCount >= options.minCount!);
  }

  // Filter by letter count
  if (options.minLetters) {
    results = results.filter(
      (name) => countLetters(name.name) >= options.minLetters!
    );
  }
  if (options.maxLetters) {
    results = results.filter(
      (name) => countLetters(name.name) <= options.maxLetters!
    );
  }

  // Filter by syllable count
  if (options.minSyllables) {
    results = results.filter(
      (name) => countSyllables(name.name) >= options.minSyllables!
    );
  }
  if (options.maxSyllables) {
    results = results.filter(
      (name) => countSyllables(name.name) <= options.maxSyllables!
    );
  }

  // Filter by minimum births in 2024
  if (options.minBirths2024) {
    results = results.filter(
      (name) => (name.yearlyData['2024'] || 0) >= options.minBirths2024!
    );
  }

  // Filter by trending rate (growth rate from 2023 to 2024)
  if (
    options.minTrendingRate !== undefined ||
    options.maxTrendingRate !== undefined
  ) {
    results = results.filter((name) => {
      const count2024 = name.yearlyData['2024'] || 0;
      const count2023 = name.yearlyData['2023'] || 0;

      // Calculate growth rate
      let growthRate: number;
      if (count2023 === 0) {
        growthRate = count2024 > 0 ? 10 : 0; // Treat new names as 10x growth, no data as 0
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

  // Sort results
  if (options.sortBy === 'alphabetical') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (options.sortBy === 'rarity') {
    // Rarity sorting: least popular names in 2024 first (inverse of popularity)
    // Exclude names with 0 births in 2024
    results = results.filter((name) => (name.yearlyData['2024'] || 0) > 0);

    results.sort((a, b) => {
      const aCount2024 = a.yearlyData['2024'] || 0;
      const bCount2024 = b.yearlyData['2024'] || 0;

      // Sort by 2024 rarity (ascending - least popular first)
      return aCount2024 - bCount2024;
    });
  } else if (options.sortBy === 'trending') {
    // Trending sorting: highest growth rate from 2023 to 2024 first
    results.sort((a, b) => {
      const aCount2024 = a.yearlyData['2024'] || 0;
      const aCount2023 = a.yearlyData['2023'] || 0;
      const bCount2024 = b.yearlyData['2024'] || 0;
      const bCount2023 = b.yearlyData['2023'] || 0;

      // Calculate growth rates (2024 births / 2023 births)
      // Handle cases where 2023 count is 0 to avoid division by zero
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

      // Sort by growth rate (descending - highest growth first)
      if (aGrowthRate !== bGrowthRate) {
        return bGrowthRate - aGrowthRate;
      }

      // If growth rates are equal, sort by 2024 popularity as tiebreaker
      return bCount2024 - aCount2024;
    });
  } else {
    // Default to popularity sorting based on 2024 data
    results.sort((a, b) => {
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
    results = results.slice(0, options.limit);
  }

  return results;
}

// Get name details by name and sex
export async function getNameDetails(
  name: string,
  sex: 'M' | 'F'
): Promise<NameData | null> {
  const data = await loadProcessedData();
  return data.names.find((n) => n.name === name && n.sex === sex) || null;
}

// Get popular names for a specific year
export async function getPopularNamesByYear(
  year: number,
  sex?: 'M' | 'F'
): Promise<NameData[]> {
  const data = await loadProcessedData();

  let results = data.names.filter(
    (name) =>
      name.yearlyData[year.toString()] && name.yearlyData[year.toString()] > 0
  );

  if (sex) {
    results = results.filter((name) => name.sex === sex);
  }

  // Sort by count for that year
  results.sort(
    (a, b) =>
      (b.yearlyData[year.toString()] || 0) -
      (a.yearlyData[year.toString()] || 0)
  );

  return results.slice(0, 50); // Top 50 for the year
}

// Get trending names (names with increasing popularity)
export async function getTrendingNames(sex?: 'M' | 'F'): Promise<NameData[]> {
  const data = await loadProcessedData();
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  let results = data.names.filter((name) => {
    if (sex && name.sex !== sex) return false;

    // Check if name has data for recent years
    const recentCounts = recentYears.map(
      (year) => name.yearlyData[year.toString()] || 0
    );
    return recentCounts.some((count) => count > 0);
  });

  // Calculate trend (simple: recent years average vs older years average)
  results = results.map((name) => {
    const recentAvg =
      recentYears.reduce(
        (sum, year) => sum + (name.yearlyData[year.toString()] || 0),
        0
      ) / recentYears.length;

    const olderYears = [currentYear - 4, currentYear - 5, currentYear - 6];
    const olderAvg =
      olderYears.reduce(
        (sum, year) => sum + (name.yearlyData[year.toString()] || 0),
        0
      ) / olderYears.length;

    return {
      ...name,
      trendScore: olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0,
    };
  });

  // Sort by trend score
  results.sort((a: any, b: any) => b.trendScore - a.trendScore);

  return results.slice(0, 20);
}

// Get summary statistics
export async function getSummary(): Promise<NameSummary> {
  const data = await loadProcessedData();
  return data.summary;
}

// Mock data for development when processed data is not available
function getMockData(): ProcessedNamesData {
  const mockNames: NameData[] = [
    {
      name: 'Emma',
      sex: 'F',
      totalCount: 45000,
      firstYear: 1990,
      lastYear: 2024,
      yearlyData: {
        '2020': 2500,
        '2021': 2600,
        '2022': 2700,
        '2023': 2800,
        '2024': 2900,
      },
    },
    {
      name: 'Gabriel',
      sex: 'M',
      totalCount: 42000,
      firstYear: 1985,
      lastYear: 2024,
      yearlyData: {
        '2020': 2300,
        '2021': 2400,
        '2022': 2500,
        '2023': 2600,
        '2024': 2700,
      },
    },
    {
      name: 'Louise',
      sex: 'F',
      totalCount: 38000,
      firstYear: 1995,
      lastYear: 2024,
      yearlyData: {
        '2020': 2100,
        '2021': 2200,
        '2022': 2300,
        '2023': 2400,
        '2024': 2500,
      },
    },
    {
      name: 'Raphaël',
      sex: 'M',
      totalCount: 35000,
      firstYear: 1988,
      lastYear: 2024,
      yearlyData: {
        '2020': 1900,
        '2021': 2000,
        '2022': 2100,
        '2023': 2200,
        '2024': 2300,
      },
    },
  ];

  return {
    summary: {
      totalNames: mockNames.length,
      totalBirths: mockNames.reduce((sum, name) => sum + name.totalCount, 0),
      yearRange: { min: 1985, max: 2024 },
      topNames: {
        boys: mockNames.filter((n) => n.sex === 'M'),
        girls: mockNames.filter((n) => n.sex === 'F'),
      },
    },
    names: mockNames,
  };
}
