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
 * Search for names based on query and filters
 */
export async function searchNames(
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
