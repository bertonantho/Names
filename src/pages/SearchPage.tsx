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
} from '../services/splitJsonApi';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<NameData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    gender: searchParams.get('gender') || 'all',
    minLetters: parseInt(searchParams.get('minLetters') || '0') || undefined,
    maxLetters: parseInt(searchParams.get('maxLetters') || '0') || undefined,
    minSyllables:
      parseInt(searchParams.get('minSyllables') || '0') || undefined,
    maxSyllables:
      parseInt(searchParams.get('maxSyllables') || '0') || undefined,
    minBirths2024:
      parseInt(searchParams.get('minBirths2024') || '0') || undefined,
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
        minLetters: filters.minLetters,
        maxLetters: filters.maxLetters,
        minSyllables: filters.minSyllables,
        maxSyllables: filters.maxSyllables,
        minBirths2024: filters.minBirths2024,
        sortBy: filters.sortBy as
          | 'popularity'
          | 'alphabetical'
          | 'rarity'
          | 'trending',
        limit: 300,
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
    if (filters.sortBy !== 'popularity') params.set('sortBy', filters.sortBy);

    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getTrendData = (name: NameData) => {
    const count2024 = name.yearlyData['2024'] || 0;
    const count2023 = name.yearlyData['2023'] || 0;
    const count2022 = name.yearlyData['2022'] || 0;

    const growthRate = count2023 > 0 ? count2024 / count2023 : 0;
    const absoluteChange = count2024 - count2023;
    const percentageChange =
      count2023 > 0 ? ((count2024 - count2023) / count2023) * 100 : 0;

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
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for names..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Controls Row */}
          <div className="flex gap-4">
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

          {/* Modern Mobile-Friendly Filters */}
          {showFilters && (
            <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
              {/* Basic Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) =>
                      handleFilterChange('gender', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All Genders</option>
                    <option value="M">Boys Only</option>
                    <option value="F">Girls Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      handleFilterChange('sortBy', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="popularity">Most Popular 2024</option>
                    <option value="trending">Trending Up</option>
                    <option value="rarity">Most Rare</option>
                    <option value="alphabetical">A-Z</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    placeholder="e.g. 100"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Mobile-Optimized Range Sliders */}
              <div className="space-y-6">
                {/* Name Length Slider */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-3">
                    <span>Name Length (Letters)</span>
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {filters.minLetters || 1} - {filters.maxLetters || 20}
                    </span>
                  </label>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8 font-medium">
                          Min
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={filters.minLetters || 1}
                          onChange={(e) =>
                            handleFilterChange(
                              'minLetters',
                              parseInt(e.target.value)
                            )
                          }
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900 w-8 text-right font-semibold">
                          {filters.minLetters || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8 font-medium">
                          Max
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={filters.maxLetters || 20}
                          onChange={(e) =>
                            handleFilterChange(
                              'maxLetters',
                              parseInt(e.target.value)
                            )
                          }
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900 w-8 text-right font-semibold">
                          {filters.maxLetters || 20}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Syllables Slider */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-3">
                    <span>Number of Syllables</span>
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {filters.minSyllables || 1} - {filters.maxSyllables || 10}
                    </span>
                  </label>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8 font-medium">
                          Min
                        </span>
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
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900 w-8 text-right font-semibold">
                          {filters.minSyllables || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8 font-medium">
                          Max
                        </span>
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
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900 w-8 text-right font-semibold">
                          {filters.maxSyllables || 10}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                results.map((name) => {
                  const trend = getTrendData(name);
                  const letters = countLetters(name.name);
                  const syllables = countSyllables(name.name);

                  return (
                    <div
                      key={`${name.name}-${name.sex}`}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                              name.sex === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                            }`}
                          >
                            {name.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              to={`/name/${name.name}`}
                              className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                            >
                              {name.name}
                            </Link>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>{name.sex === 'M' ? 'Boy' : 'Girl'}</span>
                              <span>{letters} letters</span>
                              <span>{syllables} syllables</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {trend.count2024.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            2024 births
                          </div>
                          {trend.count2023 > 0 && (
                            <div
                              className={`text-sm ${trend.trendColor} flex items-center justify-end gap-1`}
                            >
                              <span>{trend.trendIcon}</span>
                              <span>
                                {trend.percentageChange > 0 ? '+' : ''}
                                {trend.percentageChange.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
