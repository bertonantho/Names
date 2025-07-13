import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import {
  searchNames,
  NameData,
  countLetters,
  countSyllables,
} from '../services/namesApi';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<NameData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    gender: searchParams.get('gender') || 'all',
    minYear: parseInt(searchParams.get('minYear') || '1901'),
    maxYear: parseInt(searchParams.get('maxYear') || '2024'),
    minLetters: parseInt(searchParams.get('minLetters') || '0') || undefined,
    maxLetters: parseInt(searchParams.get('maxLetters') || '0') || undefined,
    minSyllables:
      parseInt(searchParams.get('minSyllables') || '0') || undefined,
    maxSyllables:
      parseInt(searchParams.get('maxSyllables') || '0') || undefined,
    minBirths2024:
      parseInt(searchParams.get('minBirths2024') || '0') || undefined,
    minTrendingRate:
      parseFloat(searchParams.get('minTrendingRate') || '0') || undefined,
    maxTrendingRate:
      parseFloat(searchParams.get('maxTrendingRate') || '0') || undefined,
    sortBy: searchParams.get('sortBy') || 'popularity',
  });
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults = await searchNames({
        query: searchQuery.trim() || undefined,
        sex:
          filters.gender === 'all' ? undefined : (filters.gender as 'M' | 'F'),
        minYear: filters.minYear,
        maxYear: filters.maxYear,
        minLetters: filters.minLetters,
        maxLetters: filters.maxLetters,
        minSyllables: filters.minSyllables,
        maxSyllables: filters.maxSyllables,
        minBirths2024: filters.minBirths2024,
        minTrendingRate: filters.minTrendingRate,
        maxTrendingRate: filters.maxTrendingRate,
        sortBy: filters.sortBy as
          | 'popularity'
          | 'alphabetical'
          | 'rarity'
          | 'trending',
        limit: searchQuery.trim() ? 50 : 100,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [searchQuery, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL params
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.gender !== 'all') params.set('gender', filters.gender);
    if (filters.minYear !== 1901)
      params.set('minYear', filters.minYear.toString());
    if (filters.maxYear !== 2024)
      params.set('maxYear', filters.maxYear.toString());
    if (filters.minLetters)
      params.set('minLetters', filters.minLetters.toString());
    if (filters.maxLetters)
      params.set('maxLetters', filters.maxLetters.toString());
    if (filters.minSyllables)
      params.set('minSyllables', filters.minSyllables.toString());
    if (filters.maxSyllables)
      params.set('maxSyllables', filters.maxSyllables.toString());
    if (filters.minBirths2024)
      params.set('minBirths2024', filters.minBirths2024.toString());
    if (filters.minTrendingRate)
      params.set('minTrendingRate', filters.minTrendingRate.toString());
    if (filters.maxTrendingRate)
      params.set('maxTrendingRate', filters.maxTrendingRate.toString());
    if (filters.sortBy !== 'popularity') params.set('sortBy', filters.sortBy);
    setSearchParams(params);
  };

  const handleFilterChange = (
    key: string,
    value: string | number | undefined
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      // Ensure min doesn't exceed max for letters
      if (
        key === 'minLetters' &&
        newFilters.maxLetters &&
        typeof value === 'number' &&
        value > newFilters.maxLetters
      ) {
        newFilters.maxLetters = value;
      }
      if (
        key === 'maxLetters' &&
        newFilters.minLetters &&
        typeof value === 'number' &&
        value < newFilters.minLetters
      ) {
        newFilters.minLetters = value;
      }

      // Ensure min doesn't exceed max for syllables
      if (
        key === 'minSyllables' &&
        newFilters.maxSyllables &&
        typeof value === 'number' &&
        value > newFilters.maxSyllables
      ) {
        newFilters.maxSyllables = value;
      }
      if (
        key === 'maxSyllables' &&
        newFilters.minSyllables &&
        typeof value === 'number' &&
        value < newFilters.minSyllables
      ) {
        newFilters.minSyllables = value;
      }

      // Ensure min doesn't exceed max for trending rate
      if (
        key === 'minTrendingRate' &&
        newFilters.maxTrendingRate &&
        typeof value === 'number' &&
        value > newFilters.maxTrendingRate
      ) {
        newFilters.maxTrendingRate = value;
      }
      if (
        key === 'maxTrendingRate' &&
        newFilters.minTrendingRate &&
        typeof value === 'number' &&
        value < newFilters.minTrendingRate
      ) {
        newFilters.minTrendingRate = value;
      }

      return newFilters;
    });
  };

  const getTotalBirths = (name: NameData) => {
    return Object.values(name.yearlyData).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  const getRecentBirths = (name: NameData) => {
    return name.yearlyData['2024'] || name.yearlyData['2023'] || 0;
  };

  const getTrendingKPIs = (name: NameData) => {
    const count2024 = name.yearlyData['2024'] || 0;
    const count2023 = name.yearlyData['2023'] || 0;
    const count2022 = name.yearlyData['2022'] || 0;

    // Calculate growth rate (2024 vs 2023)
    const growthRate =
      count2023 > 0 ? count2024 / count2023 : count2024 > 0 ? Infinity : 0;

    // Calculate absolute change
    const absoluteChange = count2024 - count2023;

    // Calculate percentage change
    const percentageChange =
      count2023 > 0
        ? ((count2024 - count2023) / count2023) * 100
        : count2024 > 0
          ? Infinity
          : 0;

    // Determine trend direction
    let trendDirection = 'stable';
    let trendColor = 'text-gray-500';
    let trendIcon = '→';

    if (count2024 > count2023) {
      trendDirection = 'up';
      trendColor = 'text-green-600';
      trendIcon = '↗';
    } else if (count2024 < count2023) {
      trendDirection = 'down';
      trendColor = 'text-red-600';
      trendIcon = '↘';
    }

    return {
      growthRate,
      absoluteChange,
      percentageChange,
      trendDirection,
      trendColor,
      trendIcon,
      count2024,
      count2023,
      count2022,
    };
  };

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for names..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              Filters
            </button>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="M">Boys</option>
                  <option value="F">Girls</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Year
                </label>
                <input
                  type="number"
                  min="1901"
                  max="2024"
                  value={filters.minYear}
                  onChange={(e) =>
                    handleFilterChange('minYear', parseInt(e.target.value))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Year
                </label>
                <input
                  type="number"
                  min="1901"
                  max="2024"
                  value={filters.maxYear}
                  onChange={(e) =>
                    handleFilterChange('maxYear', parseInt(e.target.value))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Letters ({filters.minLetters || 1} -{' '}
                  {filters.maxLetters || 20})
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={filters.minLetters || 1}
                    onChange={(e) =>
                      handleFilterChange('minLetters', parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(((filters.minLetters || 1) - 1) * 100) / 19}%, #E5E7EB ${(((filters.minLetters || 1) - 1) * 100) / 19}%, #E5E7EB 100%)`,
                    }}
                  />
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={filters.maxLetters || 20}
                    onChange={(e) =>
                      handleFilterChange('maxLetters', parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #E5E7EB 0%, #E5E7EB ${(((filters.maxLetters || 20) - 1) * 100) / 19}%, #3B82F6 ${(((filters.maxLetters || 20) - 1) * 100) / 19}%, #3B82F6 100%)`,
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Syllables ({filters.minSyllables || 1} -{' '}
                  {filters.maxSyllables || 10})
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.minSyllables || 1}
                    onChange={(e) =>
                      handleFilterChange(
                        'minSyllables',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(((filters.minSyllables || 1) - 1) * 100) / 9}%, #E5E7EB ${(((filters.minSyllables || 1) - 1) * 100) / 9}%, #E5E7EB 100%)`,
                    }}
                  />
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.maxSyllables || 10}
                    onChange={(e) =>
                      handleFilterChange(
                        'maxSyllables',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #E5E7EB 0%, #E5E7EB ${(((filters.maxSyllables || 10) - 1) * 100) / 9}%, #3B82F6 ${(((filters.maxSyllables || 10) - 1) * 100) / 9}%, #3B82F6 100%)`,
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Births 2024
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={filters.minBirths2024 || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'minBirths2024',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="Min births"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trending ({(filters.minTrendingRate || 0).toFixed(1)}x -{' '}
                  {(filters.maxTrendingRate || 5).toFixed(1)}x)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.minTrendingRate || 0}
                    onChange={(e) =>
                      handleFilterChange(
                        'minTrendingRate',
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #10B981 0%, #10B981 ${((filters.minTrendingRate || 0) * 100) / 5}%, #E5E7EB ${((filters.minTrendingRate || 0) * 100) / 5}%, #E5E7EB 100%)`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.maxTrendingRate || 5}
                    onChange={(e) =>
                      handleFilterChange(
                        'maxTrendingRate',
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #E5E7EB 0%, #E5E7EB ${((filters.maxTrendingRate || 5) * 100) / 5}%, #10B981 ${((filters.maxTrendingRate || 5) * 100) / 5}%, #10B981 100%)`,
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="popularity">Popularity</option>
                  <option value="trending">Trending</option>
                  <option value="rarity">Rarity</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div>
            {/* Results Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {searchQuery ? (
                  <>
                    Search Results for "{searchQuery}" ({results.length} found)
                  </>
                ) : (
                  <>All Names ({results.length} found)</>
                )}
              </h2>
            </div>

            {/* Results List */}
            <div className="divide-y divide-gray-200">
              {results.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? (
                    <>
                      No names found matching "{searchQuery}". Try adjusting
                      your search or filters.
                    </>
                  ) : (
                    <>
                      No names found with the current filters. Try adjusting
                      your filters.
                    </>
                  )}
                </div>
              ) : (
                results.map((name) => (
                  <div
                    key={`${name.name}-${name.sex}`}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              name.sex === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                            }`}
                          >
                            {name.name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {name.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-1">
                            <span>{name.sex === 'M' ? 'Boy' : 'Girl'}</span>
                            <span>{countLetters(name.name)} letters</span>
                            <span>{countSyllables(name.name)} syllables</span>
                            <span>
                              Total births:{' '}
                              {getTotalBirths(name).toLocaleString()}
                            </span>
                            <span>
                              2024: {getRecentBirths(name).toLocaleString()}
                            </span>
                          </div>
                          {(() => {
                            const trendKPIs = getTrendingKPIs(name);
                            return (
                              <div className="flex items-center gap-4 text-xs">
                                <span
                                  className={`flex items-center gap-1 ${trendKPIs.trendColor}`}
                                >
                                  <span>{trendKPIs.trendIcon}</span>
                                  <span>
                                    {trendKPIs.percentageChange === Infinity
                                      ? 'New'
                                      : trendKPIs.percentageChange === 0
                                        ? 'Stable'
                                        : `${trendKPIs.percentageChange > 0 ? '+' : ''}${trendKPIs.percentageChange.toFixed(1)}%`}
                                  </span>
                                </span>
                                <span className="text-gray-400">
                                  2023: {trendKPIs.count2023.toLocaleString()}
                                </span>
                                <span className="text-gray-400">
                                  Change:{' '}
                                  {trendKPIs.absoluteChange > 0 ? '+' : ''}
                                  {trendKPIs.absoluteChange.toLocaleString()}
                                </span>
                                {trendKPIs.growthRate !== Infinity &&
                                  trendKPIs.growthRate > 0 && (
                                    <span className="text-gray-400">
                                      Growth: {trendKPIs.growthRate.toFixed(2)}x
                                    </span>
                                  )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <HeartIcon className="w-5 h-5" />
                        </button>
                        <Link
                          to={`/name/${name.name}`}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
