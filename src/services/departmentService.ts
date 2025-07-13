// Service to fetch department-level birth data from CSV
export interface DepartmentBirthData {
  [departmentCode: string]: number;
}

// Parse CSV line (handles quoted fields separated by semicolons)
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

// Normalize name by removing _1, _2, etc. suffixes
function normalizeName(name: string): string {
  return name.replace(/_\d+$/, '').trim();
}

// Fetch department data for a specific name and year
export async function getDepartmentData(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<DepartmentBirthData> {
  try {
    // Fetch the CSV file
    const response = await fetch('/data/DS_PRENOM_2024_DATA.CSV');
    if (!response.ok) {
      throw new Error('Failed to fetch CSV data');
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');

    // Skip header line
    const dataLines = lines.slice(1);

    const departmentData: DepartmentBirthData = {};
    const normalizedTargetName = normalizeName(name.toUpperCase());

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      if (values.length < 6) continue;

      // Parse the record: "FIRST_NAME";"GEO";"GEO_OBJECT";"SEX";"TIME_PERIOD";"OBS_VALUE"
      const record = {
        firstName: values[0],
        geo: values[1],
        geoObject: values[2],
        sex: values[3],
        timePeriod: parseInt(values[4]),
        obsValue: parseInt(values[5]) || 0,
      };

      // Skip invalid records
      if (
        !record.firstName ||
        !record.sex ||
        !record.timePeriod ||
        record.obsValue <= 0
      ) {
        continue;
      }

      // Only process department-level data
      if (record.geoObject !== 'DEP') {
        continue;
      }

      // Match the target name, sex, and year
      const normalizedRecordName = normalizeName(record.firstName);
      if (
        normalizedRecordName === normalizedTargetName &&
        record.sex === sex &&
        record.timePeriod === year
      ) {
        // Only include metropolitan departments (01-95)
        const deptCode = record.geo;
        if (/^[0-9]{2}$/.test(deptCode)) {
          const deptNum = parseInt(deptCode);
          if (deptNum >= 1 && deptNum <= 95) {
            departmentData[deptCode] =
              (departmentData[deptCode] || 0) + record.obsValue;
          }
        }
      }
    }

    return departmentData;
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
    const response = await fetch('/data/DS_PRENOM_2024_DATA.CSV');
    if (!response.ok) {
      throw new Error('Failed to fetch CSV data');
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    const dataLines = lines.slice(1);

    const years = new Set<number>();
    const normalizedTargetName = normalizeName(name.toUpperCase());

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      if (values.length < 6) continue;

      const record = {
        firstName: values[0],
        geoObject: values[2],
        sex: values[3],
        timePeriod: parseInt(values[4]),
        obsValue: parseInt(values[5]) || 0,
      };

      if (
        !record.firstName ||
        !record.sex ||
        !record.timePeriod ||
        record.obsValue <= 0
      ) {
        continue;
      }

      if (record.geoObject !== 'DEP') {
        continue;
      }

      const normalizedRecordName = normalizeName(record.firstName);
      if (normalizedRecordName === normalizedTargetName && record.sex === sex) {
        years.add(record.timePeriod);
      }
    }

    return Array.from(years).sort((a, b) => b - a); // Most recent first
  } catch (error) {
    console.error('Error fetching years for name:', error);
    return [];
  }
}
