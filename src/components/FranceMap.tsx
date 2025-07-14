import React, { useState, useEffect } from 'react';
import { NameData } from '../services/namesApi';
import {
  getDepartmentData,
  getAvailableYearsForName,
} from '../services/supabaseDepartmentService';

interface FranceMapProps {
  nameData?: NameData;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

// Enhanced green color scale with better gradient
function getColor(value: number, min: number, max: number) {
  if (max === min) return '#e0f7e9'; // lightest green if no variation

  const normalized = (value - min) / (max - min);

  // More granular color scale
  if (normalized >= 0.9) return '#064e3b'; // very dark green
  if (normalized >= 0.7) return '#065f46'; // dark green
  if (normalized >= 0.5) return '#047857'; // medium-dark green
  if (normalized >= 0.3) return '#059669'; // medium green
  if (normalized >= 0.1) return '#10b981'; // light-medium green
  return '#d1fae5'; // light green
}

// Project geographic coordinates to SVG coordinates
function projectCoordinates(lon: number, lat: number): [number, number] {
  // France bounding box (approximate)
  const bounds = {
    minLon: -5.5,
    maxLon: 9.5,
    minLat: 41.0,
    maxLat: 51.5,
  };

  // Map to SVG coordinates (800x600 with padding)
  const padding = 20;
  const width = 800 - 2 * padding;
  const height = 600 - 2 * padding;

  const x =
    padding + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
  const y =
    padding +
    ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;

  return [x, y];
}

// Create SVG path from GeoJSON coordinates
function createSVGPath(coordinates: any): string {
  if (!coordinates || coordinates.length === 0) return '';

  const processRing = (ring: number[][]): string => {
    if (!ring || ring.length === 0) return '';

    const pathParts: string[] = [];

    ring.forEach((coord, index) => {
      if (coord.length >= 2) {
        const [x, y] = projectCoordinates(coord[0], coord[1]);
        if (index === 0) {
          pathParts.push(`M ${x} ${y}`);
        } else {
          pathParts.push(`L ${x} ${y}`);
        }
      }
    });

    if (pathParts.length > 0) {
      pathParts.push('Z');
    }

    return pathParts.join(' ');
  };

  // Handle different coordinate structures
  if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    if (Array.isArray(coordinates[0][0][0])) {
      // MultiPolygon: [[[ring1], [ring2]], [[ring3]]]
      return coordinates
        .map((polygon: number[][][]) => polygon.map(processRing).join(' '))
        .join(' ');
    } else {
      // Polygon: [[ring1], [ring2]]
      return coordinates.map(processRing).join(' ');
    }
  }

  return '';
}

export default function FranceMap({
  nameData,
  selectedYear = 2024,
  onYearChange,
}: FranceMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<Record<string, number>>(
    {}
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch(
          '/data/departements-version-simplifiee.geojson'
        );
        if (!response.ok) {
          throw new Error('Failed to load map data');
        }
        const data = await response.json();
        setGeoData(data);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        setError('Erreur lors du chargement de la carte');
      }
    };

    loadGeoData();
  }, []);

  // Load available years when nameData changes
  useEffect(() => {
    if (nameData?.name && nameData?.sex) {
      const loadAvailableYears = async () => {
        try {
          const years = await getAvailableYearsForName(
            nameData.name,
            nameData.sex
          );
          setAvailableYears(years);

          // If current selected year is not available, select the most recent one
          if (years.length > 0 && !years.includes(selectedYear)) {
            onYearChange?.(years[0]);
          }
        } catch (err) {
          console.error('Error loading available years:', err);
          setAvailableYears([]);
        }
      };

      loadAvailableYears();
    }
  }, [nameData, selectedYear, onYearChange]);

  // Load department data for the selected year
  useEffect(() => {
    if (nameData?.name && nameData?.sex && selectedYear) {
      const loadDepartmentData = async () => {
        setLoading(true);
        setError(null);

        try {
          const yearData = await getDepartmentData(
            nameData.name,
            nameData.sex,
            selectedYear
          );
          setDepartmentData(yearData);
        } catch (err) {
          console.error('Error loading department data:', err);
          setError('Erreur lors du chargement des données');
          setDepartmentData({});
        } finally {
          setLoading(false);
        }
      };

      loadDepartmentData();
    }
  }, [nameData, selectedYear]);

  if (!nameData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          Répartition par département
        </h3>
        <p className="text-gray-500">
          Sélectionnez un prénom pour voir sa répartition géographique
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          Répartition par département
        </h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          Répartition par département
        </h3>
        <p className="text-gray-500">Chargement de la carte...</p>
      </div>
    );
  }

  // Calculate color scale based on birth counts
  const birthCounts = Object.values(departmentData);
  const minBirths = Math.min(...birthCounts, 0);
  const maxBirths = Math.max(...birthCounts, 0);
  const totalBirths = birthCounts.reduce((sum, count) => sum + count, 0);
  const totalFranceBirths = nameData?.yearlyData[selectedYear.toString()] || 0;

  // Use available years from department data, fallback to nameData years
  const yearsToShow =
    availableYears.length > 0
      ? availableYears
      : nameData
        ? Object.keys(nameData.yearlyData)
            .map((year) => parseInt(year))
            .sort((a, b) => b - a)
        : [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Répartition par département</h3>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Année:</label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange?.(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          >
            {yearsToShow.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>
          Total France en {selectedYear}:{' '}
          <span className="font-semibold">
            {totalFranceBirths.toLocaleString()}
          </span>
          {totalBirths > 0 && (
            <span className="ml-2 text-gray-500">
              (Départements: {totalBirths.toLocaleString()})
            </span>
          )}
        </p>
        {totalBirths === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Aucune donnée départementale disponible pour cette année
          </p>
        )}
      </div>

      {loading && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Chargement des données...
          </div>
        </div>
      )}

      {/* Map */}
      <div className="mb-4">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-auto border border-gray-200 rounded-lg"
          style={{ maxHeight: '500px' }}
        >
          {geoData.features
            .filter((feature: any) => {
              const code = feature.properties?.code;
              return (
                code &&
                /^[0-9]{2}$/.test(code) &&
                parseInt(code) >= 1 &&
                parseInt(code) <= 95
              );
            })
            .map((feature: any) => {
              const deptCode = feature.properties?.code;
              const deptName = feature.properties?.nom;
              const birthCount = departmentData[deptCode] || 0;
              const color = getColor(birthCount, minBirths, maxBirths);

              return (
                <g key={deptCode}>
                  <path
                    d={createSVGPath(feature.geometry.coordinates)}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="hover:stroke-2 cursor-pointer transition-all duration-200"
                  >
                    <title>
                      {deptName} ({deptCode}): {birthCount.toLocaleString()}{' '}
                      naissances en {selectedYear}
                    </title>
                  </path>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Moins de naissances</span>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gradient-to-r from-green-100 to-green-900 rounded"></div>
        </div>
        <span>Plus de naissances</span>
      </div>

      {maxBirths > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Échelle: {minBirths.toLocaleString()} - {maxBirths.toLocaleString()}{' '}
          naissances
        </div>
      )}
    </div>
  );
}
