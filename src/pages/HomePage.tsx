import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  HeartIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  getSummary,
  getPopularNamesByYear,
  NameSummary,
  NameData,
} from '../services/splitJsonApi';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<NameSummary | null>(null);
  const [popularNames, setPopularNames] = useState<{
    boys: NameData[];
    girls: NameData[];
  }>({ boys: [], girls: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryData, boysData, girlsData] = await Promise.all([
          getSummary(),
          getPopularNamesByYear(2024, 'M'),
          getPopularNamesByYear(2024, 'F'),
        ]);

        setSummary(summaryData);
        setPopularNames({
          boys: boysData.slice(0, 5),
          girls: girlsData.slice(0, 5),
        });
      } catch (error) {
        console.error('Error loading homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Find the Perfect Name
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover beautiful French names with rich history and meaning. Search
          through our comprehensive database.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for names..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary text-white px-4 py-1.5 rounded-md hover:bg-primary-600 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Statistics */}
        {summary && (
          <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <span>
                {summary.yearRange.min} - {summary.yearRange.max}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              <span>{summary.totalNames.toLocaleString()} names</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5" />
              <span>
                {summary.totalBirths.toLocaleString()} births recorded
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Explore Names Like Never Before
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link
            to="/search"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <MagnifyingGlassIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Advanced Search
            </h3>
            <p className="text-gray-600">
              Filter by gender, origin, popularity, and meaning to find the
              perfect name for your baby.
            </p>
          </Link>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Popularity Trends
            </h3>
            <p className="text-gray-600">
              See how names have evolved over time with detailed popularity
              charts and statistics.
            </p>
          </div>

          <Link
            to="/favorites"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <HeartIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Save Favorites
            </h3>
            <p className="text-gray-600">
              Create collections of your favorite names and share them with
              family and friends.
            </p>
          </Link>
        </div>
      </section>

      {/* Popular Names Section */}
      <section>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Popular Names in 2024
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Boys Names */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-blue-600 mb-4">
              Popular Boys Names
            </h3>
            <div className="space-y-3">
              {popularNames.boys.map((name, index) => (
                <div
                  key={`${name.name}-${name.sex}`}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <Link
                      to={`/name/${name.name}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {name.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {name.yearlyData['2024']?.toLocaleString() || 0} births
                    </span>
                    <Link
                      to={`/name/${name.name}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Girls Names */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-pink-600 mb-4">
              Popular Girls Names
            </h3>
            <div className="space-y-3">
              {popularNames.girls.map((name, index) => (
                <div
                  key={`${name.name}-${name.sex}`}
                  className="flex items-center justify-between p-3 bg-pink-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <Link
                      to={`/name/${name.name}`}
                      className="font-medium text-gray-900 hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      {name.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {name.yearlyData['2024']?.toLocaleString() || 0} births
                    </span>
                    <Link
                      to={`/name/${name.name}`}
                      className="text-pink-600 hover:text-pink-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl text-white">
        <SparklesIcon className="w-16 h-16 mx-auto mb-6 opacity-80" />
        <h2 className="text-3xl font-bold mb-4 text-white">
          Ready to Find Your Perfect Name?
        </h2>
        <p className="text-xl mb-8 opacity-90 text-white">
          Start exploring our comprehensive database of French names today.
        </p>
        <Link
          to="/search"
          className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Start Searching
        </Link>
      </section>
    </div>
  );
};
