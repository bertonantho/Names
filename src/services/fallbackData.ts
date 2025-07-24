// Fallback data service for when Supabase is not configured
import { SearchResult, NameData, TrendingName } from './supabaseApi';

// Mock data for testing/fallback
const MOCK_NAMES: SearchResult[] = [
  { name: 'Emma', sex: 'F', totalBirths: 125000, rank: 1, trend: 'stable' },
  { name: 'Gabriel', sex: 'M', totalBirths: 118000, rank: 1, trend: 'rising' },
  { name: 'Louise', sex: 'F', totalBirths: 115000, rank: 2, trend: 'rising' },
  { name: 'Raphaël', sex: 'M', totalBirths: 112000, rank: 2, trend: 'stable' },
  { name: 'Jade', sex: 'F', totalBirths: 110000, rank: 3, trend: 'falling' },
  { name: 'Léo', sex: 'M', totalBirths: 108000, rank: 3, trend: 'stable' },
  { name: 'Alice', sex: 'F', totalBirths: 105000, rank: 4, trend: 'rising' },
  { name: 'Louis', sex: 'M', totalBirths: 102000, rank: 4, trend: 'stable' },
];

export function searchNamesFallback(
  query: string = '',
  gender?: 'M' | 'F',
  limit: number = 50
): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results = MOCK_NAMES;

      if (gender) {
        results = results.filter((name) => name.sex === gender);
      }

      if (query) {
        results = results.filter((name) =>
          name.name.toLowerCase().includes(query.toLowerCase())
        );
      }

      resolve(results.slice(0, limit));
    }, 500); // Simulate network delay
  });
}

export function getNameDetailsFallback(
  name: string,
  sex: 'M' | 'F'
): Promise<NameData | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: NameData = {
        name,
        sex,
        yearlyData: {
          '2020': 1200,
          '2021': 1150,
          '2022': 1300,
          '2023': 1250,
        },
        rankings: {
          '2020': 15,
          '2021': 18,
          '2022': 12,
          '2023': 14,
        },
        totalBirths: 45000,
        firstYear: 1900,
        lastYear: 2023,
        peakYear: 2010,
        peakBirths: 2500,
        totalCount: 45000,
        trend: 'stable' as const,
      };
      resolve(mockData);
    }, 500);
  });
}

export function getTrendingNamesFallback(
  gender?: 'M' | 'F',
  limit: number = 20
): Promise<TrendingName[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const trending: TrendingName[] = [
        {
          name: 'Maëlys',
          sex: 'F',
          currentBirths: 1850,
          previousBirths: 1650,
          trendPercentage: 12.1,
        },
        {
          name: 'Elio',
          sex: 'M',
          currentBirths: 1750,
          previousBirths: 1500,
          trendPercentage: 16.7,
        },
        {
          name: 'Iris',
          sex: 'F',
          currentBirths: 1650,
          previousBirths: 1400,
          trendPercentage: 17.9,
        },
        {
          name: 'Milo',
          sex: 'M',
          currentBirths: 1550,
          previousBirths: 1300,
          trendPercentage: 19.2,
        },
      ];

      let results = trending;
      if (gender) {
        results = results.filter((name) => name.sex === gender);
      }

      resolve(results.slice(0, limit));
    }, 500);
  });
}

export function getDepartmentDataFallback(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock department data
      const mockData: Record<string, number> = {
        '75': 1200, // Paris
        '13': 800, // Bouches-du-Rhône
        '69': 750, // Rhône
        '59': 650, // Nord
        '92': 600, // Hauts-de-Seine
        '93': 550, // Seine-Saint-Denis
        '94': 500, // Val-de-Marne
        '95': 480, // Val-d'Oise
      };
      resolve(mockData);
    }, 500);
  });
}

export function getAvailableYearsForNameFallback(
  name: string,
  sex: 'M' | 'F'
): Promise<number[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const years: number[] = [];
      for (let year = 1900; year <= 2023; year++) {
        years.push(year);
      }
      resolve(years);
    }, 300);
  });
}

export function getPopularNamesFallback(
  year: number,
  gender?: 'M' | 'F',
  limit: number = 50
): Promise<SearchResult[]> {
  return searchNamesFallback('', gender, limit);
}

export function getSimilarNamesFallback(
  name: string,
  sex: 'M' | 'F',
  limit: number = 10
): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const similar = MOCK_NAMES.filter(
        (n) => n.sex === sex && n.name !== name
      ).slice(0, limit);
      resolve(similar);
    }, 400);
  });
}

export function getAppStatisticsFallback() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalNames: 15000,
        totalBirths: 25000000,
        yearRange: { min: 1900, max: 2023 },
        departments: 101,
      });
    }, 300);
  });
}
