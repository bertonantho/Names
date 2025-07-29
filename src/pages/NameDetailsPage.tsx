import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  getNameDetails,
  findSimilarNames,
  findNamesWithSimilarCharacteristics,
} from '../services/splitJsonApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NameInteractionButtons } from '../components/NameInteractionButtons';
import FranceMap from '../components/FranceMap';

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
            {/* Hover tooltip */}
            <title>{`${point.year}: ${point.value.toLocaleString()} births`}</title>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={padding}
          y={height - 10}
          fontSize="12"
          fill="#6b7280"
          textAnchor="start"
        >
          {years[0]}
        </text>
        <text
          x={width - padding}
          y={height - 10}
          fontSize="12"
          fill="#6b7280"
          textAnchor="end"
        >
          {years[years.length - 1]}
        </text>
        <text
          x={10}
          y={padding}
          fontSize="12"
          fill="#6b7280"
          textAnchor="start"
        >
          {maxValue.toLocaleString()}
        </text>
        <text
          x={10}
          y={height - padding + 5}
          fontSize="12"
          fill="#6b7280"
          textAnchor="start"
        >
          {minValue.toLocaleString()}
        </text>
      </svg>
    </div>
  );
};

export const NameDetailsPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [nameData, setNameData] = useState<NameData[]>([]);
  const [similarNames, setSimilarNames] = useState<NameData[]>([]);
  const [similarCharacteristics, setSimilarCharacteristics] = useState<
    NameData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2024);

  useEffect(() => {
    const loadNameData = async () => {
      if (!name) return;

      setLoading(true);
      try {
        // First, search for the name to get possible variants
        const searchResults = await searchNames({
          query: name,
          limit: 10,
        });

        // Filter for exact matches
        const exactMatches = searchResults.filter(
          (n) => n.name.toLowerCase() === name.toLowerCase()
        );

        // Load full details for each exact match using getNameDetails
        const fullDetails = await Promise.all(
          exactMatches.map(async (match) => {
            const fullData = await getNameDetails(match.name, match.sex);
            return fullData || match; // Fallback to search result if getNameDetails fails
          })
        );

        setNameData(fullDetails.filter(Boolean));

        // Load similar names if we have at least one exact match
        if (fullDetails.length > 0) {
          const primaryName = fullDetails[0];

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

  const handleAuthRequired = () => {
    navigate('/login', { state: { from: { pathname: `/name/${name}` } } });
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
        {nameData.length > 0 && (
          <NameInteractionButtons
            nameText={nameData[0].name}
            nameGender={nameData[0].sex}
            size="large"
            showLabels={true}
            onAuthRequired={handleAuthRequired}
          />
        )}
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
                  {data.sex === 'M' ? 'Masculine' : 'Feminine'} name
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">
                    Total births: {getTotalBirths(data).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Period: {data.firstYear} - {data.lastYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedYear} Births
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {(data.yearlyData[selectedYear] || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Peak Year
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {getPeakYear(data).year}
                </div>
                <div className="text-sm text-green-600">
                  {getPeakYear(data).count.toLocaleString()} births
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserGroupIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">
                    Total Births
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {getTotalBirths(data).toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">
                    5-Year Trend
                  </span>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    getYearlyTrend(data).trend > 0
                      ? 'text-green-600'
                      : getYearlyTrend(data).trend < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {getYearlyTrend(data).trend > 0 ? '+' : ''}
                  {getYearlyTrend(data).trend}
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Birth Trend Over Time
              </h3>
              <TrendChart
                data={data}
                color={data.sex === 'M' ? '#2563eb' : '#dc2626'}
              />
            </div>

            {/* Year Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Year for Detailed View
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {Object.keys(data.yearlyData)
                  .sort((a, b) => parseInt(b) - parseInt(a))
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>

            {/* Regional Map */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Regional Distribution in {selectedYear}
              </h3>
              <FranceMap nameData={data} selectedYear={selectedYear} />
            </div>
          </div>
        ))}
      </div>

      {/* Similar Names Section */}
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

      {/* Similar Characteristics Section */}
      {similarCharacteristics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Names with Similar Characteristics
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Names that share similar patterns in popularity, timing, and usage
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
