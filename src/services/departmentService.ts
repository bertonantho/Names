// Service to fetch department-level birth data from JSON
export interface DepartmentBirthData {
  [departmentCode: string]: number;
}

// Cache for department data
let departmentDataCache: any = null;

// Load department data from JSON file
async function loadDepartmentData(): Promise<any> {
  if (departmentDataCache) {
    return departmentDataCache;
  }

  try {
    const response = await fetch('/data/department_data.json');
    if (!response.ok) {
      throw new Error('Failed to fetch department data');
    }
    departmentDataCache = await response.json();
    return departmentDataCache;
  } catch (error) {
    console.warn('Department data not available:', error);
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
    const departmentData = await loadDepartmentData();
    if (!departmentData) {
      return {};
    }

    const normalizedName = normalizeName(name);
    const yearStr = year.toString();

    // Check if we have data for this name/sex/year combination
    if (
      departmentData[normalizedName] &&
      departmentData[normalizedName][sex] &&
      departmentData[normalizedName][sex][yearStr]
    ) {
      return departmentData[normalizedName][sex][yearStr];
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
    const departmentData = await loadDepartmentData();
    if (!departmentData) {
      return [];
    }

    const normalizedName = normalizeName(name);

    // Check if we have data for this name/sex combination
    if (departmentData[normalizedName] && departmentData[normalizedName][sex]) {
      const years = Object.keys(departmentData[normalizedName][sex])
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
