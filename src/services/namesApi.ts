import {
  generateGemmaNameSuggestions,
  GemmaNameSuggestion,
  GemmaRecommendationRequest,
} from './gemmaService';

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

// Find similar names based on phonetic and structural similarity
export async function findSimilarNames(
  targetName: string,
  targetSex: 'M' | 'F',
  limit: number = 8
): Promise<NameData[]> {
  const data = await loadProcessedData();

  // Filter names of the same gender
  const sameGenderNames = data.names.filter(
    (name) =>
      name.sex === targetSex &&
      name.name.toLowerCase() !== targetName.toLowerCase() &&
      (name.yearlyData['2024'] || 0) > 0 // Only include names with recent usage
  );

  // Calculate similarity scores
  const namesWithSimilarity = sameGenderNames.map((name) => ({
    ...name,
    similarity: calculateNameSimilarity(targetName, name.name),
  }));

  // Sort by similarity and popularity
  namesWithSimilarity.sort((a, b) => {
    // Primary sort: similarity score
    const similarityDiff = b.similarity - a.similarity;
    if (Math.abs(similarityDiff) > 0.1) return similarityDiff;

    // Secondary sort: 2024 popularity for ties
    const aCount2024 = a.yearlyData['2024'] || 0;
    const bCount2024 = b.yearlyData['2024'] || 0;
    return bCount2024 - aCount2024;
  });

  return namesWithSimilarity.slice(0, limit);
}

// Find names with similar characteristics (letters, syllables, trending)
export async function findNamesWithSimilarCharacteristics(
  targetName: string,
  targetSex: 'M' | 'F',
  limit: number = 8
): Promise<NameData[]> {
  const data = await loadProcessedData();
  const targetLetters = countLetters(targetName);
  const targetSyllables = countSyllables(targetName);

  // Filter names of the same gender with similar characteristics
  const candidateNames = data.names.filter(
    (name) =>
      name.sex === targetSex &&
      name.name.toLowerCase() !== targetName.toLowerCase() &&
      (name.yearlyData['2024'] || 0) > 0 && // Only include names with recent usage
      Math.abs(countLetters(name.name) - targetLetters) <= 2 && // Similar length
      Math.abs(countSyllables(name.name) - targetSyllables) <= 1 // Similar syllables
  );

  // Sort by 2024 popularity
  candidateNames.sort((a, b) => {
    const aCount2024 = a.yearlyData['2024'] || 0;
    const bCount2024 = b.yearlyData['2024'] || 0;
    return bCount2024 - aCount2024;
  });

  return candidateNames.slice(0, limit);
}

// AI-powered family name recommendations
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

// Analyze family naming patterns
function analyzeFamilyPatterns(
  children: Array<{ name: string; gender: 'M' | 'F' }>
) {
  if (children.length === 0) return null;

  const lengths = children.map((child) => countLetters(child.name));
  const syllables = children.map((child) => countSyllables(child.name));

  return {
    averageLength: lengths.reduce((sum, len) => sum + len, 0) / lengths.length,
    averageSyllables:
      syllables.reduce((sum, syl) => sum + syl, 0) / syllables.length,
    lengthRange: { min: Math.min(...lengths), max: Math.max(...lengths) },
    syllableRange: { min: Math.min(...syllables), max: Math.max(...syllables) },
    commonStartingLetters: children.map((child) =>
      child.name.charAt(0).toLowerCase()
    ),
    commonEndings: children.map((child) => child.name.slice(-2).toLowerCase()),
  };
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
    // Some alliterations work well, others don't
    const goodAlliterations = ['b', 'c', 'd', 'j', 'l', 'm', 'r', 's'];
    score += goodAlliterations.includes(first.charAt(0)) ? 0.3 : 0.1;
  } else {
    score += 0.25; // Slightly prefer non-alliterative
  }

  // 2. Flow and rhythm (40% weight)
  const firstEndsVowel = /[aeiouy]$/i.test(first);
  const lastStartsVowel = /^[aeiouy]/i.test(last);

  // Avoid vowel-vowel collision
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
  if (siblings.length === 0) return 0.5; // Neutral score

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
      siblingScore += 0.2; // Neutral
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
      siblingScore += 0.2; // Neutral
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
      siblingScore += 0.15; // Neutral
    }

    // Avoid too similar names
    const similarity = calculateNameSimilarity(targetName, sibling.name);
    if (similarity > 0.7) {
      siblingScore *= 0.5; // Penalty for too similar
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
      return 0.5; // Neutral for 'any'
  }
}

// Main AI recommendation function
export async function generateAIRecommendations(
  context: FamilyContext
): Promise<NameData[]> {
  const data = await loadProcessedData();

  // Filter by gender preference
  let candidates = data.names.filter((name) => {
    if (context.preferences.gender === 'any') return true;
    return name.sex === context.preferences.gender;
  });

  // Only include names with recent usage
  candidates = candidates.filter((name) => (name.yearlyData['2024'] || 0) > 0);

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
      'any' // Default to any style since we removed style preference
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
      lastNameCompatibility: lastNameScore,
      siblingCompatibility: siblingScore,
      popularityMatch: popularityScore,
      trendScore: trendScore,
    };
  });

  // Sort by AI score
  scoredCandidates.sort((a, b) => b.aiScore - a.aiScore);

  // Return top 12 recommendations
  return scoredCandidates.slice(0, 12);
}

// Enhanced AI recommendations with Gemma 3 integration
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
    console.log(`Loaded ${data.names.length} names from database`);
    console.log(
      'Sample names:',
      data.names.slice(0, 10).map((n) => `${n.name} (${n.sex})`)
    );

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
        // Check if the name exists but with different gender
        const nameExists = data.names.find(
          (name) =>
            name.name.toLowerCase() === gemmaSuggestion.name.toLowerCase()
        );
        if (nameExists) {
          console.log(
            `Name exists but with different gender: "${nameExists.name}" (${nameExists.sex})`
          );
        }

        // Create a mock entry for Gemma suggestions that don't exist in our database
        const mockName: NameData = {
          name: gemmaSuggestion.name,
          sex:
            context.preferences.gender === 'any'
              ? 'M'
              : context.preferences.gender,
          totalCount: 100, // Default values
          firstYear: 2020,
          lastYear: 2024,
          yearlyData: {
            '2024': 50,
            '2023': 45,
            '2022': 40,
            '2021': 35,
            '2020': 30,
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

export async function getDepartmentData(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<Record<string, number>> {
  try {
    // In a real implementation, this would query the CSV file or a database
    // For now, we'll simulate fetching department data from the CSV

    // This is a placeholder - in a real app, you'd want to:
    // 1. Parse the CSV file server-side
    // 2. Create an API endpoint to fetch department data
    // 3. Or pre-process department data into a separate JSON file

    // For demonstration, let's create a mock implementation that simulates
    // realistic department distribution based on the name's popularity
    const nameData = await getNameDetails(name, sex);
    if (!nameData) return {};

    const yearlyBirths = nameData.yearlyData[year.toString()] || 0;
    if (yearlyBirths === 0) return {};

    // Simulate department distribution based on real population patterns
    const departments: Record<string, number> = {};

    // French department codes (01-95 for metropolitan France)
    const metroDepCodes = Array.from({ length: 95 }, (_, i) =>
      (i + 1).toString().padStart(2, '0')
    );

    // Population weights for different department types
    const populationWeights: Record<string, number> = {
      // Île-de-France (Paris region) - highest population
      '75': 3.0,
      '92': 2.5,
      '93': 2.2,
      '94': 2.0,
      '95': 1.8,
      '77': 1.5,
      '78': 1.6,
      '91': 1.4,

      // Major cities
      '13': 2.0, // Marseille
      '69': 1.8, // Lyon
      '59': 1.6, // Lille
      '33': 1.4, // Bordeaux
      '44': 1.2, // Nantes
      '67': 1.1, // Strasbourg
      '31': 1.3, // Toulouse
      '06': 1.2, // Nice
      '34': 1.1, // Montpellier
      '35': 1.0, // Rennes

      // Other departments get base weight
    };

    let totalWeight = 0;
    metroDepCodes.forEach((code) => {
      const weight = populationWeights[code] || 0.3 + Math.random() * 0.7;
      totalWeight += weight;
    });

    // Distribute births across departments
    metroDepCodes.forEach((code) => {
      const weight = populationWeights[code] || 0.3 + Math.random() * 0.7;
      const proportion = weight / totalWeight;
      const deptBirths = Math.floor(yearlyBirths * proportion);

      if (deptBirths > 0) {
        departments[code] = deptBirths;
      }
    });

    return departments;
  } catch (error) {
    console.error('Error fetching department data:', error);
    return {};
  }
}
