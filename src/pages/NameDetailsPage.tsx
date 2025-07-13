import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  HeartIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  searchNames,
  NameData,
  findSimilarNames,
  findNamesWithSimilarCharacteristics,
} from '../services/namesApi';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Simple line chart component
const TrendChart: React.FC<{ data: NameData; color: string }> = ({
  data,
  color,
}) => {
  const years = Object.keys(data.yearlyData).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );
  const values = years.map((year) => data.yearlyData[year] || 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  if (years.length < 2) return null;

  const width = 800;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Create points for the line
  const points = years.map((year, index) => {
    const x = padding + (index / (years.length - 1)) * chartWidth;
    const y =
      padding +
      (1 - (values[index] - minValue) / (maxValue - minValue || 1)) *
        chartHeight;
    return { x, y, year, value: values[index] };
  });

  // Create the path string
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Create area fill path
  const areaPath =
    pathData +
    ` L ${points[points.length - 1].x} ${height - padding}` +
    ` L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-white"
      >
        {/* Grid lines */}
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Area fill */}
        <path d={areaPath} fill={color} fillOpacity="0.1" />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
            {/* Show values for every 10th point or significant peaks */}
            {(index % Math.max(1, Math.floor(points.length / 10)) === 0 ||
              point.value === maxValue) && (
              <g>
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  fontWeight="500"
                >
                  {point.value}
                </text>
                <text
                  x={point.x}
                  y={height - padding + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {point.year}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Y-axis labels */}
        <text
          x="10"
          y={padding}
          fontSize="12"
          fill="#6b7280"
          textAnchor="middle"
        >
          {maxValue}
        </text>
        <text
          x="10"
          y={height - padding}
          fontSize="12"
          fill="#6b7280"
          textAnchor="middle"
        >
          {minValue}
        </text>

        {/* Title */}
        <text
          x={width / 2}
          y="20"
          fontSize="14"
          fill="#374151"
          textAnchor="middle"
          fontWeight="600"
        >
          Popularity Trend Over Time
        </text>
      </svg>
    </div>
  );
};

export const NameDetailsPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [nameData, setNameData] = useState<NameData[]>([]);
  const [similarNames, setSimilarNames] = useState<NameData[]>([]);
  const [similarCharacteristics, setSimilarCharacteristics] = useState<
    NameData[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNameData = async () => {
      if (!name) return;

      setLoading(true);
      try {
        // Search for exact matches of this name
        const results = await searchNames({
          query: name,
          limit: 10,
        });

        // Filter for exact matches
        const exactMatches = results.filter(
          (n) => n.name.toLowerCase() === name.toLowerCase()
        );

        setNameData(exactMatches);

        // Load similar names if we have at least one exact match
        if (exactMatches.length > 0) {
          const primaryName = exactMatches[0];

          // Load similar names and names with similar characteristics in parallel
          const [similarNamesResults, similarCharacteristicsResults] =
            await Promise.all([
              findSimilarNames(name, primaryName.sex, 6),
              findNamesWithSimilarCharacteristics(name, primaryName.sex, 6),
            ]);

          setSimilarNames(similarNamesResults);
          setSimilarCharacteristics(similarCharacteristicsResults);
        }
      } catch (error) {
        console.error('Error loading name data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNameData();
  }, [name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (nameData.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Name Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn't find any data for the name "{name}".
        </p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Search
        </Link>
      </div>
    );
  }

  const getTotalBirths = (data: NameData) => {
    return Object.values(data.yearlyData).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  const getYearlyTrend = (data: NameData) => {
    const years = Object.keys(data.yearlyData).sort();
    const recent = years.slice(-5);
    const values = recent.map((year) => data.yearlyData[year] || 0);
    const trend = values[values.length - 1] - values[0];
    return { trend, recent: values };
  };

  const getPeakYear = (data: NameData) => {
    const entries = Object.entries(data.yearlyData);
    const peak = entries.reduce(
      (max, [year, count]) => (count > max.count ? { year, count } : max),
      { year: '', count: 0 }
    );
    return peak;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/search"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">{name}</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <HeartIcon className="w-5 h-5" />
          Save to Favorites
        </button>
      </div>

      {/* Name Variants */}
      <div className="space-y-8">
        {nameData.map((data) => (
          <div
            key={`${data.name}-${data.sex}`}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                  data.sex === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                }`}
              >
                {data.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {data.name}
                </h2>
                <p className="text-lg text-gray-600">
                  {data.sex === 'M' ? 'Boy Name' : 'Girl Name'}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {getTotalBirths(data).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Births</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {data.yearlyData['2024'] || data.yearlyData['2023'] || 0}
                </div>
                <div className="text-sm text-gray-600">Recent (2024)</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">
                  Active from {data.firstYear} to {data.lastYear}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">
                  Peak year: {getPeakYear(data).year} (
                  {getPeakYear(data).count.toLocaleString()} births)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <UserGroupIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">
                  {(() => {
                    const { trend } = getYearlyTrend(data);
                    return trend > 0
                      ? 'Trending up'
                      : trend < 0
                        ? 'Trending down'
                        : 'Stable';
                  })()}
                </span>
              </div>
            </div>

            {/* Historical Trend Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Historical Popularity Trend
              </h3>
              <TrendChart
                data={data}
                color={data.sex === 'M' ? '#2563eb' : '#dc2626'}
              />
            </div>

            {/* Recent Years Chart */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recent Years Detail
              </h3>
              <div className="space-y-2">
                {Object.entries(data.yearlyData)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .slice(0, 5)
                  .map(([year, count]) => (
                    <div
                      key={year}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-600">{year}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              data.sex === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                            }`}
                            style={{
                              width: `${Math.min(100, (count / Math.max(...Object.values(data.yearlyData))) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Similar Names */}
      {similarNames.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Names Similar to {name}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Names with similar sounds, structure, and phonetic patterns
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similarNames.map((similarName) => (
              <Link
                key={`${similarName.name}-${similarName.sex}`}
                to={`/name/${similarName.name}`}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      similarName.sex === 'M' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}
                  >
                    {similarName.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {similarName.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {(similarName.yearlyData['2024'] || 0).toLocaleString()}{' '}
                  births
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Names with Similar Characteristics */}
      {similarCharacteristics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Names with Similar Style
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Names with similar length, syllables, and contemporary appeal
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similarCharacteristics.map((characteristicName) => (
              <Link
                key={`${characteristicName.name}-${characteristicName.sex}`}
                to={`/name/${characteristicName.name}`}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      characteristicName.sex === 'M'
                        ? 'bg-blue-500'
                        : 'bg-pink-500'
                    }`}
                  >
                    {characteristicName.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {characteristicName.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {(
                    characteristicName.yearlyData['2024'] || 0
                  ).toLocaleString()}{' '}
                  births
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
