import {
  supabase,
  isConfigured,
  FrenchName,
  Department,
  NameStatistics,
} from '../lib/supabase';
import {
  searchNamesFallback,
  getNameDetailsFallback,
  getTrendingNamesFallback,
  getDepartmentDataFallback,
  getAvailableYearsForNameFallback,
  getPopularNamesFallback,
  getSimilarNamesFallback,
  getAppStatisticsFallback,
} from './fallbackData';
import {
  generateGemmaNameSuggestions,
  GemmaNameSuggestion,
  GemmaRecommendationRequest,
} from './gemmaService';

// Legacy interface compatibility (to avoid breaking existing components)
export interface NameData {
  name: string;
  sex: 'M' | 'F';
  yearlyData: Record<string, number>; // year -> birth count
  rankings: Record<string, number>; // year -> rank
  totalBirths: number;
  firstYear: number;
  lastYear: number;
  peakYear: number;
  peakBirths: number;
  trend: 'rising' | 'falling' | 'stable';
  totalCount?: number; // For compatibility
}

export interface SearchResult {
  name: string;
  sex: 'M' | 'F';
  totalBirths: number;
  rank: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface TrendingName {
  name: string;
  sex: 'M' | 'F';
  currentBirths: number;
  previousBirths: number;
  trendPercentage: number;
}

// New interfaces for compatibility with namesApi
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

export interface FamilyContext {
  lastName: string;
  existingChildren: Array<{ name: string; gender: 'M' | 'F' }>;
  preferences: {
    gender: 'M' | 'F' | 'any';
    popularityLevel: 'rare' | 'uncommon' | 'moderate' | 'popular' | 'any';
    maxLetters: number;
    meaningImportance: 'low' | 'medium' | 'high';
  };
}

export interface EnhancedRecommendation {
  name: NameData;
  aiScore: number;
  gemmaInsights?: GemmaNameSuggestion;
  isGemmaRecommended: boolean;
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

// Calculate similarity score between two names
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  if (n1 === n2) return 1.0;

  // Calculate various similarity metrics
  let score = 0;

  // 1. Length similarity (20% weight)
  const lengthSimilarity =
    1 - Math.abs(n1.length - n2.length) / Math.max(n1.length, n2.length);
  score += lengthSimilarity * 0.2;

  // 2. Starting letters similarity (30% weight)
  const startSimilarity = n1.charAt(0) === n2.charAt(0) ? 1 : 0;
  score += startSimilarity * 0.3;

  // 3. Ending similarity (25% weight)
  const endLength = Math.min(3, Math.min(n1.length, n2.length));
  const end1 = n1.slice(-endLength);
  const end2 = n2.slice(-endLength);
  const endSimilarity =
    end1 === end2 ? 1 : end1.slice(-2) === end2.slice(-2) ? 0.5 : 0;
  score += endSimilarity * 0.25;

  // 4. Common letters similarity (25% weight)
  const letters1 = new Set(n1.split(''));
  const letters2 = new Set(n2.split(''));
  const commonLetters = new Set([...letters1].filter((x) => letters2.has(x)));
  const letterSimilarity =
    commonLetters.size / Math.max(letters1.size, letters2.size);
  score += letterSimilarity * 0.25;

  return score;
}

// Convert database sex format to display format
// Helper function to check if Supabase is available
function checkSupabaseConfig(): boolean {
  if (!isConfigured || !supabase) {
    console.warn(
      'Supabase is not configured. Please set environment variables.'
    );
    return false;
  }
  return true;
}

export function convertSex(dbSex: 'M' | 'F'): 'M' | 'F' {
  return dbSex;
}

// Convert display sex format to database format
export function convertSexToDb(displaySex: 'M' | 'F'): 'M' | 'F' {
  return displaySex;
}

/**
 * Load processed data equivalent - aggregates all data into the namesApi format
 */
export async function loadProcessedData(): Promise<ProcessedNamesData> {
  if (!checkSupabaseConfig()) {
    // Return fallback mock data
    return getMockData();
  }

  try {
    // Get all name statistics
    const { data: nameStats, error: statsError } = await supabase
      .from('name_statistics')
      .select('*')
      .order('total_births', { ascending: false });

    if (statsError) throw statsError;

    if (!nameStats || nameStats.length === 0) {
      return getMockData();
    }

    // Convert to NameData format
    const names: NameData[] = [];

    for (const stat of nameStats) {
      // Get yearly data for this name
      const { data: yearlyData, error: yearlyError } = await supabase.rpc(
        'get_name_details',
        {
          p_name: stat.first_name,
          p_sex: stat.sex,
        }
      );

      if (yearlyError) {
        console.error(
          `Error getting yearly data for ${stat.first_name}:`,
          yearlyError
        );
        continue;
      }

      // Build yearly data and rankings
      const yearlyBirths: Record<string, number> = {};
      const rankings: Record<string, number> = {};

      if (yearlyData) {
        yearlyData.forEach((item: any) => {
          const year = item.year.toString();
          yearlyBirths[year] = item.births;
          rankings[year] = item.rank;
        });
      }

      const nameData: NameData = {
        name: stat.first_name,
        sex: convertSex(stat.sex),
        yearlyData: yearlyBirths,
        rankings,
        totalBirths: stat.total_births,
        totalCount: stat.total_births, // For compatibility
        firstYear: stat.first_year || 2000,
        lastYear: stat.last_year || 2024,
        peakYear: stat.peak_year || 2024,
        peakBirths: stat.peak_births || 0,
        trend:
          (stat.trend_direction as 'rising' | 'falling' | 'stable') || 'stable',
      };

      names.push(nameData);
    }

    // Generate summary
    const summary: NameSummary = {
      totalNames: names.length,
      totalBirths: names.reduce((sum, name) => sum + name.totalBirths, 0),
      yearRange: {
        min: Math.min(...names.map((n) => n.firstYear)),
        max: Math.max(...names.map((n) => n.lastYear)),
      },
      topNames: {
        boys: names.filter((n) => n.sex === 'M').slice(0, 100),
        girls: names.filter((n) => n.sex === 'F').slice(0, 100),
      },
    };

    return {
      summary,
      names,
    };
  } catch (error) {
    console.error('Error loading processed data from Supabase:', error);
    return getMockData();
  }
}

/**
 * Search for names based on query and filters (enhanced version)
 */
export async function searchNames(
  options: {
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
  } = {}
): Promise<NameData[]> {
  if (!checkSupabaseConfig()) {
    const fallbackResults = await searchNamesFallback(
      options.query || '',
      options.sex as 'M' | 'F',
      options.limit || 50
    );
    // Convert SearchResult[] to NameData[] for consistency
    return fallbackResults.map((result: SearchResult) => ({
      name: result.name,
      sex: result.sex,
      yearlyData: {},
      rankings: {},
      totalBirths: result.totalBirths,
      totalCount: result.totalBirths,
      firstYear: 2000,
      lastYear: 2024,
      peakYear: 2024,
      peakBirths: result.totalBirths,
      trend: result.trend,
    }));
  }

  try {
    // Start with basic search
    let query = supabase.from('name_statistics').select('*');

    // Apply filters
    if (options.sex && options.sex !== 'all') {
      query = query.eq('sex', convertSexToDb(options.sex as 'M' | 'F'));
    }

    if (options.query) {
      query = query.or(
        `first_name.ilike.%${options.query}%,first_name.ilike.${options.query}%`
      );
    }

    if (options.minCount) {
      query = query.gte('total_births', options.minCount);
    }

    const { data: results, error } = await query;

    if (error) throw error;

    if (!results) return [];

    // Convert to NameData and apply additional filters
    let nameDataResults: NameData[] = [];

    for (const result of results) {
      // Get yearly data for advanced filtering
      const { data: yearlyData } = await supabase.rpc('get_name_details', {
        p_name: result.first_name,
        p_sex: result.sex,
      });

      const yearlyBirths: Record<string, number> = {};
      const rankings: Record<string, number> = {};

      if (yearlyData) {
        yearlyData.forEach((item: any) => {
          const year = item.year.toString();
          yearlyBirths[year] = item.births;
          rankings[year] = item.rank;
        });
      }

      const nameData: NameData = {
        name: result.first_name,
        sex: convertSex(result.sex),
        yearlyData: yearlyBirths,
        rankings,
        totalBirths: result.total_births,
        totalCount: result.total_births,
        firstYear: result.first_year || 2000,
        lastYear: result.last_year || 2024,
        peakYear: result.peak_year || 2024,
        peakBirths: result.peak_births || 0,
        trend:
          (result.trend_direction as 'rising' | 'falling' | 'stable') ||
          'stable',
      };

      // Apply advanced filters
      if (options.minYear && nameData.lastYear < options.minYear) continue;
      if (options.maxYear && nameData.firstYear > options.maxYear) continue;
      if (
        options.minLetters &&
        countLetters(nameData.name) < options.minLetters
      )
        continue;
      if (
        options.maxLetters &&
        countLetters(nameData.name) > options.maxLetters
      )
        continue;
      if (
        options.minSyllables &&
        countSyllables(nameData.name) < options.minSyllables
      )
        continue;
      if (
        options.maxSyllables &&
        countSyllables(nameData.name) > options.maxSyllables
      )
        continue;
      if (
        options.minBirths2024 &&
        (nameData.yearlyData['2024'] || 0) < options.minBirths2024
      )
        continue;

      // Trending rate filter
      if (
        options.minTrendingRate !== undefined ||
        options.maxTrendingRate !== undefined
      ) {
        const count2024 = nameData.yearlyData['2024'] || 0;
        const count2023 = nameData.yearlyData['2023'] || 0;

        let growthRate: number;
        if (count2023 === 0) {
          growthRate = count2024 > 0 ? 10 : 0;
        } else {
          growthRate = count2024 / count2023;
        }

        if (
          options.minTrendingRate !== undefined &&
          growthRate < options.minTrendingRate
        )
          continue;
        if (
          options.maxTrendingRate !== undefined &&
          growthRate > options.maxTrendingRate
        )
          continue;
      }

      nameDataResults.push(nameData);
    }

    // Apply sorting
    if (options.sortBy === 'alphabetical') {
      nameDataResults.sort((a, b) => a.name.localeCompare(b.name));
    } else if (options.sortBy === 'rarity') {
      nameDataResults = nameDataResults.filter(
        (name) => (name.yearlyData['2024'] || 0) > 0
      );
      nameDataResults.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;
        return aCount2024 - bCount2024;
      });
    } else if (options.sortBy === 'trending') {
      nameDataResults.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const aCount2023 = a.yearlyData['2023'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;
        const bCount2023 = b.yearlyData['2023'] || 0;

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

        if (aGrowthRate !== bGrowthRate) {
          return bGrowthRate - aGrowthRate;
        }
        return bCount2024 - aCount2024;
      });
    } else {
      // Default popularity sorting
      nameDataResults.sort((a, b) => {
        const aCount2024 = a.yearlyData['2024'] || 0;
        const bCount2024 = b.yearlyData['2024'] || 0;

        if (aCount2024 > 0 || bCount2024 > 0) {
          return bCount2024 - aCount2024;
        }

        const aRecentCount = a.yearlyData['2023'] || a.yearlyData['2022'] || 0;
        const bRecentCount = b.yearlyData['2023'] || b.yearlyData['2022'] || 0;
        return bRecentCount - aRecentCount;
      });
    }

    // Apply limit
    if (options.limit) {
      nameDataResults = nameDataResults.slice(0, options.limit);
    }

    return nameDataResults;
  } catch (error) {
    console.error('Error searching names:', error);
    return [];
  }
}

/**
 * Find similar names based on phonetic and structural similarity
 */
export async function findSimilarNames(
  targetName: string,
  targetSex: 'M' | 'F',
  limit: number = 8
): Promise<NameData[]> {
  if (!checkSupabaseConfig()) {
    const fallbackResults = await getSimilarNamesFallback(
      targetName,
      targetSex,
      limit
    );
    // Convert SearchResult[] to NameData[] for consistency
    return fallbackResults.map((result: SearchResult) => ({
      name: result.name,
      sex: result.sex,
      yearlyData: {},
      rankings: {},
      totalBirths: result.totalBirths,
      totalCount: result.totalBirths,
      firstYear: 2000,
      lastYear: 2024,
      peakYear: 2024,
      peakBirths: result.totalBirths,
      trend: result.trend,
    }));
  }

  try {
    // Get all names of the same gender
    const { data: nameStats, error } = await supabase
      .from('name_statistics')
      .select('*')
      .eq('sex', convertSexToDb(targetSex))
      .neq('first_name', targetName);

    if (error) throw error;

    if (!nameStats) return [];

    // Convert to NameData and calculate similarity
    const namesWithSimilarity: Array<NameData & { similarity: number }> = [];

    for (const stat of nameStats) {
      // Get yearly data
      const { data: yearlyData } = await supabase.rpc('get_name_details', {
        p_name: stat.first_name,
        p_sex: stat.sex,
      });

      const yearlyBirths: Record<string, number> = {};
      const rankings: Record<string, number> = {};

      if (yearlyData) {
        yearlyData.forEach((item: any) => {
          const year = item.year.toString();
          yearlyBirths[year] = item.births;
          rankings[year] = item.rank;
        });
      }

      // Only include names with recent usage
      if ((yearlyBirths['2024'] || 0) === 0) continue;

      const nameData: NameData = {
        name: stat.first_name,
        sex: convertSex(stat.sex),
        yearlyData: yearlyBirths,
        rankings,
        totalBirths: stat.total_births,
        totalCount: stat.total_births,
        firstYear: stat.first_year || 2000,
        lastYear: stat.last_year || 2024,
        peakYear: stat.peak_year || 2024,
        peakBirths: stat.peak_births || 0,
        trend:
          (stat.trend_direction as 'rising' | 'falling' | 'stable') || 'stable',
      };

      const similarity = calculateNameSimilarity(targetName, nameData.name);

      namesWithSimilarity.push({
        ...nameData,
        similarity,
      });
    }

    // Sort by similarity and popularity
    namesWithSimilarity.sort((a, b) => {
      const similarityDiff = b.similarity - a.similarity;
      if (Math.abs(similarityDiff) > 0.1) return similarityDiff;

      const aCount2024 = a.yearlyData['2024'] || 0;
      const bCount2024 = b.yearlyData['2024'] || 0;
      return bCount2024 - aCount2024;
    });

    return namesWithSimilarity.slice(0, limit);
  } catch (error) {
    console.error('Error finding similar names:', error);
    return [];
  }
}

/**
 * Find names with similar characteristics (letters, syllables)
 */
export async function findNamesWithSimilarCharacteristics(
  targetName: string,
  targetSex: 'M' | 'F',
  limit: number = 8
): Promise<NameData[]> {
  if (!checkSupabaseConfig()) {
    return [];
  }

  try {
    const targetLetters = countLetters(targetName);
    const targetSyllables = countSyllables(targetName);

    // Get all names of the same gender
    const { data: nameStats, error } = await supabase
      .from('name_statistics')
      .select('*')
      .eq('sex', convertSexToDb(targetSex))
      .neq('first_name', targetName);

    if (error) throw error;

    if (!nameStats) return [];

    const candidateNames: NameData[] = [];

    for (const stat of nameStats) {
      // Check if characteristics are similar
      const nameLetters = countLetters(stat.first_name);
      const nameSyllables = countSyllables(stat.first_name);

      if (Math.abs(nameLetters - targetLetters) > 2) continue;
      if (Math.abs(nameSyllables - targetSyllables) > 1) continue;

      // Get yearly data
      const { data: yearlyData } = await supabase.rpc('get_name_details', {
        p_name: stat.first_name,
        p_sex: stat.sex,
      });

      const yearlyBirths: Record<string, number> = {};
      const rankings: Record<string, number> = {};

      if (yearlyData) {
        yearlyData.forEach((item: any) => {
          const year = item.year.toString();
          yearlyBirths[year] = item.births;
          rankings[year] = item.rank;
        });
      }

      // Only include names with recent usage
      if ((yearlyBirths['2024'] || 0) === 0) continue;

      const nameData: NameData = {
        name: stat.first_name,
        sex: convertSex(stat.sex),
        yearlyData: yearlyBirths,
        rankings,
        totalBirths: stat.total_births,
        totalCount: stat.total_births,
        firstYear: stat.first_year || 2000,
        lastYear: stat.last_year || 2024,
        peakYear: stat.peak_year || 2024,
        peakBirths: stat.peak_births || 0,
        trend:
          (stat.trend_direction as 'rising' | 'falling' | 'stable') || 'stable',
      };

      candidateNames.push(nameData);
    }

    // Sort by 2024 popularity
    candidateNames.sort((a, b) => {
      const aCount2024 = a.yearlyData['2024'] || 0;
      const bCount2024 = b.yearlyData['2024'] || 0;
      return bCount2024 - aCount2024;
    });

    return candidateNames.slice(0, limit);
  } catch (error) {
    console.error('Error finding names with similar characteristics:', error);
    return [];
  }
}

// Calculate phonetic compatibility with last name
function calculateLastNameCompatibility(
  firstName: string,
  lastName: string
): number {
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();

  let score = 0;

  // 1. Avoid alliteration unless it sounds good (30% weight)
  const sameStart = first.charAt(0) === last.charAt(0);
  if (sameStart) {
    const goodAlliterations = ['b', 'c', 'd', 'j', 'l', 'm', 'r', 's'];
    score += goodAlliterations.includes(first.charAt(0)) ? 0.3 : 0.1;
  } else {
    score += 0.25;
  }

  // 2. Flow and rhythm (40% weight)
  const firstEndsVowel = /[aeiouy]$/i.test(first);
  const lastStartsVowel = /^[aeiouy]/i.test(last);

  if (firstEndsVowel && lastStartsVowel) {
    score += 0.1;
  } else {
    score += 0.4;
  }

  // 3. Length balance (30% weight)
  const totalLength = first.length + last.length;
  if (totalLength >= 8 && totalLength <= 16) {
    score += 0.3;
  } else if (totalLength >= 6 && totalLength <= 20) {
    score += 0.2;
  } else {
    score += 0.1;
  }

  return Math.min(1, score);
}

// Calculate sibling compatibility score
function calculateSiblingCompatibility(
  targetName: string,
  siblings: Array<{ name: string; gender: 'M' | 'F' }>,
  stylePreference: 'similar' | 'complementary' | 'any'
): number {
  if (siblings.length === 0) return 0.5;

  let totalScore = 0;

  for (const sibling of siblings) {
    let siblingScore = 0;

    // Length compatibility
    const lengthDiff = Math.abs(
      countLetters(targetName) - countLetters(sibling.name)
    );
    if (stylePreference === 'similar') {
      siblingScore += lengthDiff <= 2 ? 0.3 : 0.1;
    } else if (stylePreference === 'complementary') {
      siblingScore += lengthDiff >= 2 && lengthDiff <= 4 ? 0.3 : 0.1;
    } else {
      siblingScore += 0.2;
    }

    // Syllable compatibility
    const syllableDiff = Math.abs(
      countSyllables(targetName) - countSyllables(sibling.name)
    );
    if (stylePreference === 'similar') {
      siblingScore += syllableDiff <= 1 ? 0.3 : 0.1;
    } else if (stylePreference === 'complementary') {
      siblingScore += syllableDiff >= 1 && syllableDiff <= 2 ? 0.3 : 0.1;
    } else {
      siblingScore += 0.2;
    }

    // Starting letter pattern
    const sameStart =
      targetName.charAt(0).toLowerCase() ===
      sibling.name.charAt(0).toLowerCase();
    if (stylePreference === 'similar') {
      siblingScore += sameStart ? 0.2 : 0.1;
    } else if (stylePreference === 'complementary') {
      siblingScore += !sameStart ? 0.2 : 0.1;
    } else {
      siblingScore += 0.15;
    }

    // Avoid too similar names
    const similarity = calculateNameSimilarity(targetName, sibling.name);
    if (similarity > 0.7) {
      siblingScore *= 0.5;
    }

    totalScore += siblingScore;
  }

  return totalScore / siblings.length;
}

// Get popularity score based on preference
function getPopularityScore(name: NameData, preference: string): number {
  const count2024 = name.yearlyData['2024'] || 0;

  switch (preference) {
    case 'rare':
      return count2024 <= 50 ? 1 : count2024 <= 100 ? 0.7 : 0.3;
    case 'uncommon':
      return count2024 > 50 && count2024 <= 200
        ? 1
        : count2024 <= 300
          ? 0.7
          : 0.4;
    case 'moderate':
      return count2024 > 200 && count2024 <= 800
        ? 1
        : count2024 <= 1000
          ? 0.8
          : 0.5;
    case 'popular':
      return count2024 > 800 ? 1 : count2024 > 500 ? 0.8 : 0.4;
    default:
      return 0.5;
  }
}

/**
 * Generate AI recommendations based on family context
 */
export async function generateAIRecommendations(
  context: FamilyContext
): Promise<NameData[]> {
  if (!checkSupabaseConfig()) {
    return [];
  }

  try {
    const data = await loadProcessedData();

    // Filter by gender preference
    let candidates = data.names.filter((name) => {
      if (context.preferences.gender === 'any') return true;
      return name.sex === context.preferences.gender;
    });

    // Only include names with recent usage
    candidates = candidates.filter(
      (name) => (name.yearlyData['2024'] || 0) > 0
    );

    // Exclude existing family names
    const existingNames = context.existingChildren.map((child) =>
      child.name.toLowerCase()
    );
    candidates = candidates.filter(
      (name) => !existingNames.includes(name.name.toLowerCase())
    );

    // Filter by max letters if specified
    if (context.preferences.maxLetters) {
      candidates = candidates.filter(
        (name) => countLetters(name.name) <= context.preferences.maxLetters
      );
    }

    // Calculate scores for each candidate
    const scoredCandidates = candidates.map((name) => {
      let totalScore = 0;

      // 1. Last name compatibility (25% weight)
      const lastNameScore = calculateLastNameCompatibility(
        name.name,
        context.lastName
      );
      totalScore += lastNameScore * 0.25;

      // 2. Sibling compatibility (30% weight)
      const siblingScore = calculateSiblingCompatibility(
        name.name,
        context.existingChildren,
        'any'
      );
      totalScore += siblingScore * 0.3;

      // 3. Popularity preference (25% weight)
      const popularityScore = getPopularityScore(
        name,
        context.preferences.popularityLevel
      );
      totalScore += popularityScore * 0.25;

      // 4. General appeal and trending (20% weight)
      const count2024 = name.yearlyData['2024'] || 0;
      const count2023 = name.yearlyData['2023'] || 0;
      const trendScore =
        count2023 > 0 ? Math.min(2, count2024 / count2023) / 2 : 0.5;
      totalScore += trendScore * 0.2;

      return {
        ...name,
        aiScore: totalScore,
      };
    });

    // Sort by AI score
    scoredCandidates.sort((a: any, b: any) => b.aiScore - a.aiScore);

    // Return top 12 recommendations
    return scoredCandidates.slice(0, 12);
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [];
  }
}

/**
 * Enhanced AI recommendations with Gemma integration
 */
export async function generateGemmaEnhancedRecommendations(
  context: FamilyContext
): Promise<EnhancedRecommendation[]> {
  try {
    // Get traditional AI recommendations
    const traditionalRecommendations = await generateAIRecommendations(context);

    // Prepare Gemma request
    const gemmaRequest: GemmaRecommendationRequest = {
      lastName: context.lastName,
      existingChildren: context.existingChildren,
      targetGender: context.preferences.gender,
      preferences: {
        popularityLevel: context.preferences.popularityLevel,
        maxLetters: context.preferences.maxLetters,
        meaningImportance: context.preferences.meaningImportance,
      },
    };

    // Get Gemma suggestions
    const gemmaSuggestions = await generateGemmaNameSuggestions(gemmaRequest);
    console.log('Gemma suggestions received:', gemmaSuggestions);

    // Load processed data to find matching names
    const data = await loadProcessedData();

    // Create a map of traditional recommendations
    const traditionalMap = new Map<string, NameData>();
    traditionalRecommendations.forEach((name) => {
      traditionalMap.set(name.name.toLowerCase(), name);
    });

    // Create enhanced recommendations
    const enhancedRecommendations: EnhancedRecommendation[] = [];

    // Add Gemma-recommended names first
    for (const gemmaSuggestion of gemmaSuggestions) {
      console.log(`Looking for Gemma suggestion: "${gemmaSuggestion.name}"`);

      // Try exact match first
      let matchingName = data.names.find(
        (name) =>
          name.name.toLowerCase() === gemmaSuggestion.name.toLowerCase() &&
          (context.preferences.gender === 'any' ||
            name.sex === context.preferences.gender)
      );

      // If no exact match, try without accents
      if (!matchingName) {
        const normalizedSuggestion = gemmaSuggestion.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        matchingName = data.names.find((name) => {
          const normalizedName = name.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return (
            normalizedName === normalizedSuggestion &&
            (context.preferences.gender === 'any' ||
              name.sex === context.preferences.gender)
          );
        });
      }

      if (matchingName) {
        console.log(`Found matching name: "${matchingName.name}"`);
        const traditionalMatch = traditionalMap.get(
          matchingName.name.toLowerCase()
        );

        enhancedRecommendations.push({
          name: matchingName,
          aiScore: traditionalMatch
            ? (traditionalMatch as any).aiScore
            : gemmaSuggestion.compatibility.overall,
          gemmaInsights: gemmaSuggestion,
          isGemmaRecommended: true,
        });

        // Remove from traditional map to avoid duplicates
        traditionalMap.delete(matchingName.name.toLowerCase());
      } else {
        console.log(`No matching name found for: "${gemmaSuggestion.name}"`);

        // Create a mock entry for Gemma suggestions that don't exist in our database
        const mockName: NameData = {
          name: gemmaSuggestion.name,
          sex:
            context.preferences.gender === 'any'
              ? 'M'
              : context.preferences.gender,
          totalCount: 100,
          totalBirths: 100,
          firstYear: 2020,
          lastYear: 2024,
          peakYear: 2024,
          peakBirths: 50,
          trend: 'stable',
          yearlyData: {
            '2024': 50,
            '2023': 45,
            '2022': 40,
            '2021': 35,
            '2020': 30,
          },
          rankings: {
            '2024': 500,
            '2023': 510,
            '2022': 520,
            '2021': 530,
            '2020': 540,
          },
        };

        console.log(`Created mock entry for: "${gemmaSuggestion.name}"`);
        enhancedRecommendations.push({
          name: mockName,
          aiScore: gemmaSuggestion.compatibility.overall,
          gemmaInsights: gemmaSuggestion,
          isGemmaRecommended: true,
        });
      }
    }

    // Add remaining traditional recommendations
    for (const traditionalName of traditionalMap.values()) {
      enhancedRecommendations.push({
        name: traditionalName,
        aiScore: (traditionalName as any).aiScore,
        gemmaInsights: undefined,
        isGemmaRecommended: false,
      });
    }

    // Sort by AI score and Gemma priority
    enhancedRecommendations.sort((a, b) => {
      // Prioritize Gemma recommendations
      if (a.isGemmaRecommended && !b.isGemmaRecommended) return -1;
      if (!a.isGemmaRecommended && b.isGemmaRecommended) return 1;

      // Within each category, sort by score
      if (a.isGemmaRecommended && b.isGemmaRecommended) {
        return (
          (b.gemmaInsights?.confidence || 0) -
          (a.gemmaInsights?.confidence || 0)
        );
      }

      return b.aiScore - a.aiScore;
    });

    // Return top 12 enhanced recommendations
    return enhancedRecommendations.slice(0, 12);
  } catch (error) {
    console.error('Error generating Gemma-enhanced recommendations:', error);

    // Fallback to traditional recommendations if Gemma fails
    const traditionalRecommendations = await generateAIRecommendations(context);
    return traditionalRecommendations.map((name) => ({
      name,
      aiScore: (name as any).aiScore,
      gemmaInsights: undefined,
      isGemmaRecommended: false,
    }));
  }
}

/**
 * Get summary statistics (enhanced version)
 */
export async function getSummary(): Promise<NameSummary> {
  if (!checkSupabaseConfig()) {
    return getAppStatisticsFallback() as any;
  }

  try {
    const data = await loadProcessedData();
    return data.summary;
  } catch (error) {
    console.error('Error getting summary:', error);
    return {
      totalNames: 0,
      totalBirths: 0,
      yearRange: { min: 2000, max: 2024 },
      topNames: { boys: [], girls: [] },
    };
  }
}

/**
 * Get popular names for a specific year (enhanced version)
 */
export async function getPopularNamesByYear(
  year: number,
  sex?: 'M' | 'F'
): Promise<NameData[]> {
  if (!checkSupabaseConfig()) {
    const fallbackResults = await getPopularNamesFallback(year, sex, 50);
    // Convert SearchResult[] to NameData[] for consistency
    return fallbackResults.map((result: SearchResult) => ({
      name: result.name,
      sex: result.sex,
      yearlyData: { [year.toString()]: result.totalBirths },
      rankings: { [year.toString()]: result.rank },
      totalBirths: result.totalBirths,
      totalCount: result.totalBirths,
      firstYear: year,
      lastYear: year,
      peakYear: year,
      peakBirths: result.totalBirths,
      trend: result.trend,
    }));
  }

  try {
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

    return results.slice(0, 50);
  } catch (error) {
    console.error('Error getting popular names by year:', error);
    return [];
  }
}

// Mock data for development when Supabase is not available
function getMockData(): ProcessedNamesData {
  const mockNames: NameData[] = [
    {
      name: 'Emma',
      sex: 'F',
      totalCount: 45000,
      totalBirths: 45000,
      firstYear: 1990,
      lastYear: 2024,
      peakYear: 2024,
      peakBirths: 2900,
      trend: 'rising',
      yearlyData: {
        '2020': 2500,
        '2021': 2600,
        '2022': 2700,
        '2023': 2800,
        '2024': 2900,
      },
      rankings: {
        '2020': 3,
        '2021': 2,
        '2022': 2,
        '2023': 1,
        '2024': 1,
      },
    },
    {
      name: 'Gabriel',
      sex: 'M',
      totalCount: 42000,
      totalBirths: 42000,
      firstYear: 1985,
      lastYear: 2024,
      peakYear: 2024,
      peakBirths: 2700,
      trend: 'rising',
      yearlyData: {
        '2020': 2300,
        '2021': 2400,
        '2022': 2500,
        '2023': 2600,
        '2024': 2700,
      },
      rankings: {
        '2020': 2,
        '2021': 2,
        '2022': 1,
        '2023': 1,
        '2024': 1,
      },
    },
  ];

  return {
    summary: {
      totalNames: mockNames.length,
      totalBirths: mockNames.reduce((sum, name) => sum + name.totalBirths, 0),
      yearRange: { min: 1985, max: 2024 },
      topNames: {
        boys: mockNames.filter((n) => n.sex === 'M'),
        girls: mockNames.filter((n) => n.sex === 'F'),
      },
    },
    names: mockNames,
  };
}

/**
 * Search for names (basic version for backwards compatibility)
 */
export async function searchNamesBasic(
  query: string = '',
  gender?: 'M' | 'F',
  limit: number = 50
): Promise<SearchResult[]> {
  if (!checkSupabaseConfig()) {
    return searchNamesFallback(query, gender, limit);
  }

  try {
    const { data, error } = await supabase.rpc('search_names', {
      p_query: query,
      p_sex: gender || null,
      p_limit: limit,
    });

    if (error) {
      console.error('Error searching names:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      name: item.name,
      sex: convertSex(item.sex),
      totalBirths: item.total_births,
      rank: item.current_rank || 999999,
      trend: item.trend_direction || 'stable',
    }));
  } catch (error) {
    console.error('Error searching names:', error);
    return [];
  }
}

/**
 * Get detailed information for a specific name
 */
export async function getNameDetails(
  name: string,
  sex: 'M' | 'F'
): Promise<NameData | null> {
  if (!checkSupabaseConfig()) {
    return getNameDetailsFallback(name, sex);
  }

  try {
    // Get yearly data using the database function
    const { data: yearlyData, error: yearlyError } = await supabase.rpc(
      'get_name_details',
      {
        p_name: name,
        p_sex: convertSexToDb(sex),
      }
    );

    if (yearlyError) {
      console.error('Error fetching yearly data:', yearlyError);
      throw yearlyError;
    }

    if (!yearlyData || yearlyData.length === 0) {
      return null;
    }

    // Get statistics
    const { data: statsData, error: statsError } = await supabase
      .from('name_statistics')
      .select('*')
      .eq('first_name', name)
      .eq('sex', convertSexToDb(sex))
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching statistics:', statsError);
    }

    // Build yearly data and rankings
    const yearlyBirths: Record<string, number> = {};
    const rankings: Record<string, number> = {};

    let totalBirths = 0;
    let firstYear = Infinity;
    let lastYear = -Infinity;
    let peakYear = 0;
    let peakBirths = 0;

    yearlyData.forEach((item: any) => {
      const year = item.year.toString();
      const births = item.births;
      const rank = item.rank;

      yearlyBirths[year] = births;
      rankings[year] = rank;

      totalBirths += births;
      firstYear = Math.min(firstYear, item.year);
      lastYear = Math.max(lastYear, item.year);

      if (births > peakBirths) {
        peakBirths = births;
        peakYear = item.year;
      }
    });

    // Use statistics data if available, otherwise calculate from yearly data
    const result: NameData = {
      name,
      sex: convertSex(sex),
      yearlyData: yearlyBirths,
      rankings,
      totalBirths: statsData?.total_births || totalBirths,
      totalCount: statsData?.total_births || totalBirths,
      firstYear: statsData?.first_year || firstYear,
      lastYear: statsData?.last_year || lastYear,
      peakYear: statsData?.peak_year || peakYear,
      peakBirths: statsData?.peak_births || peakBirths,
      trend: statsData?.trend_direction || 'stable',
    };

    return result;
  } catch (error) {
    console.error('Error fetching name details:', error);
    return null;
  }
}

/**
 * Get trending names (names with highest growth)
 */
export async function getTrendingNames(
  gender?: 'M' | 'F',
  limit: number = 20
): Promise<TrendingName[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_names', {
      p_sex: gender ? convertSexToDb(gender) : null,
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching trending names:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      name: item.name,
      sex: convertSex(item.sex),
      currentBirths: item.current_births,
      previousBirths: item.previous_births,
      trendPercentage: parseFloat(item.trend_percentage),
    }));
  } catch (error) {
    console.error('Error fetching trending names:', error);
    return [];
  }
}

/**
 * Get department-level birth data for a specific name and year
 */
export async function getDepartmentData(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase.rpc('get_department_data', {
      p_name: name,
      p_sex: convertSexToDb(sex),
      p_year: year,
    });

    if (error) {
      console.error('Error fetching department data:', error);
      throw error;
    }

    const result: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      result[item.department_code] = item.births;
    });

    return result;
  } catch (error) {
    console.error('Error fetching department data:', error);
    return {};
  }
}

/**
 * Get available years for a specific name
 */
export async function getAvailableYearsForName(
  name: string,
  sex: 'M' | 'F'
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('french_names')
      .select('time_period')
      .eq('first_name', name)
      .eq('sex', convertSexToDb(sex))
      .eq('geo_object', 'FRANCE')
      .order('time_period', { ascending: false });

    if (error) {
      console.error('Error fetching available years:', error);
      throw error;
    }

    return (data || []).map((item: any) => item.time_period);
  } catch (error) {
    console.error('Error fetching available years:', error);
    return [];
  }
}

/**
 * Get popular names by year and gender
 */
export async function getPopularNames(
  year: number,
  gender?: 'M' | 'F',
  limit: number = 50
): Promise<SearchResult[]> {
  try {
    let query = supabase
      .from('french_names')
      .select('first_name, sex, obs_value')
      .eq('time_period', year)
      .eq('geo_object', 'FRANCE')
      .order('obs_value', { ascending: false })
      .limit(limit);

    if (gender) {
      query = query.eq('sex', convertSexToDb(gender));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching popular names:', error);
      throw error;
    }

    return (data || []).map((item: any, index: number) => ({
      name: item.first_name,
      sex: convertSex(item.sex),
      totalBirths: item.obs_value,
      rank: index + 1,
      trend: 'stable' as const,
    }));
  } catch (error) {
    console.error('Error fetching popular names:', error);
    return [];
  }
}

/**
 * Get similar names (names that sound similar or have similar patterns)
 */
export async function getSimilarNames(
  name: string,
  sex: 'M' | 'F',
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    // Use fuzzy search to find similar names
    const similarQueries = [
      name.slice(0, -1), // Remove last character
      name.slice(1), // Remove first character
      name.slice(0, 3), // First 3 characters
      name.slice(-3), // Last 3 characters
    ].filter((q) => q.length >= 2);

    const { data, error } = await supabase
      .from('name_statistics')
      .select('first_name, sex, total_births, current_rank, trend_direction')
      .eq('sex', convertSexToDb(sex))
      .neq('first_name', name)
      .or(similarQueries.map((q) => `first_name.ilike.%${q}%`).join(','))
      .order('total_births', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching similar names:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      name: item.first_name,
      sex: convertSex(item.sex),
      totalBirths: item.total_births,
      rank: item.current_rank || 999999,
      trend: item.trend_direction || 'stable',
    }));
  } catch (error) {
    console.error('Error fetching similar names:', error);
    return [];
  }
}

/**
 * Get statistics for the application
 */
export async function getAppStatistics() {
  try {
    const [
      { count: totalNames },
      { count: totalRecords },
      { data: latestYear },
    ] = await Promise.all([
      supabase
        .from('name_statistics')
        .select('*', { count: 'exact', head: true }),
      supabase.from('french_names').select('*', { count: 'exact', head: true }),
      supabase
        .from('french_names')
        .select('time_period')
        .order('time_period', { ascending: false })
        .limit(1),
    ]);

    return {
      totalNames: totalNames || 0,
      totalRecords: totalRecords || 0,
      latestYear: latestYear?.[0]?.time_period || new Date().getFullYear(),
      yearsOfData: 25, // 2000-2024
    };
  } catch (error) {
    console.error('Error fetching app statistics:', error);
    return {
      totalNames: 0,
      totalRecords: 0,
      latestYear: new Date().getFullYear(),
      yearsOfData: 0,
    };
  }
}
