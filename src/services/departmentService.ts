// Service to fetch department-level birth data from JSON
export interface DepartmentBirthData {
  [departmentCode: string]: number;
}

// Cache for individual name data
const nameDataCache = new Map<string, any>();

// Cache for manifest data
let manifestCache: any = null;

// Load department manifest to check data availability
async function loadManifest(): Promise<any> {
  if (manifestCache) {
    return manifestCache;
  }

  try {
    const response = await fetch('/data/department_manifest.json');
    if (!response.ok) {
      throw new Error('Manifest not found');
    }
    manifestCache = await response.json();
    return manifestCache;
  } catch (error) {
    console.warn(
      'Department manifest not available, falling back to single file:',
      error
    );
    return null;
  }
}

// Load department data for a specific name
async function loadNameDepartmentData(name: string): Promise<any> {
  const normalizedName = normalizeName(name);
  const cacheKey = normalizedName;

  if (nameDataCache.has(cacheKey)) {
    return nameDataCache.get(cacheKey);
  }

  try {
    // Try to load from split data first
    const manifest = await loadManifest();
    if (manifest && manifest.type === 'split_by_name') {
      const filename = `${normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      const response = await fetch(`/data/departments/${filename}`);
      if (response.ok) {
        const data = await response.json();
        nameDataCache.set(cacheKey, data);
        return data;
      }
    }

    // Fallback to original single file approach
    const response = await fetch('/data/department_data.json');
    if (!response.ok) {
      throw new Error('Failed to fetch department data');
    }
    const fullData = await response.json();
    const nameData = fullData[normalizedName] || null;
    nameDataCache.set(cacheKey, nameData);
    return nameData;
  } catch (error) {
    console.warn('Department data not available for', name, ':', error);
    nameDataCache.set(cacheKey, null);
    return null;
  }
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.replace(/_\d+$/, '').trim().toUpperCase();
}

// Get department data for a specific name and year
export async function getDepartmentData(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<DepartmentBirthData> {
  try {
    const nameData = await loadNameDepartmentData(name);
    if (!nameData) {
      return {};
    }

    const yearStr = year.toString();

    // Check if we have data for this sex/year combination
    if (nameData[sex] && nameData[sex][yearStr]) {
      return nameData[sex][yearStr];
    }

    return {};
  } catch (error) {
    console.error('Error fetching department data:', error);
    return {};
  }
}

// Get all available years for a specific name from department data
export async function getAvailableYearsForName(
  name: string,
  sex: 'M' | 'F'
): Promise<number[]> {
  try {
    const nameData = await loadNameDepartmentData(name);
    if (!nameData) {
      return [];
    }

    // Check if we have data for this sex combination
    if (nameData[sex]) {
      const years = Object.keys(nameData[sex])
        .map((year) => parseInt(year))
        .sort((a, b) => b - a); // Most recent first

      return years;
    }

    return [];
  } catch (error) {
    console.error('Error fetching years for name:', error);
    return [];
  }
}
