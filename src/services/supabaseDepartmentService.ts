import { supabase } from '../lib/supabase';

export interface DepartmentBirthData {
  [departmentCode: string]: number;
}

/**
 * Get department-level birth data for a specific name, sex, and year from Supabase
 */
export async function getDepartmentData(
  name: string,
  sex: 'M' | 'F',
  year: number
): Promise<DepartmentBirthData> {
  try {
    const { data, error } = await supabase.rpc('get_department_data', {
      p_name: name,
      p_sex: sex,
      p_year: year,
    });

    if (error) {
      console.error('Error fetching department data:', error);
      throw error;
    }

    const result: DepartmentBirthData = {};
    (data || []).forEach((item: any) => {
      result[item.department_code] = item.births;
    });

    return result;
  } catch (error) {
    console.error('Error fetching department data:', error);
    return {};
  }
}

/**
 * Get available years for a specific name and sex from Supabase
 */
export async function getAvailableYearsForName(
  name: string,
  sex: 'M' | 'F'
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('french_names')
      .select('time_period')
      .eq('first_name', name)
      .eq('sex', sex)
      .eq('geo_object', 'DEP')
      .order('time_period', { ascending: false })
      .limit(100); // Get up to 100 years

    if (error) {
      console.error('Error fetching available years:', error);
      throw error;
    }

    // Get unique years
    const years = [...new Set((data || []).map((item) => item.time_period))];
    return years.sort((a, b) => b - a); // Sort descending
  } catch (error) {
    console.error('Error fetching available years:', error);
    return [];
  }
}

/**
 * Get all department information from Supabase
 */
export async function getDepartments() {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}
