import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface FrenchName {
  id: string;
  first_name: string;
  geo: string;
  geo_object: 'FRANCE' | 'REG' | 'DEP';
  sex: 'M' | 'F';
  time_period: number;
  obs_value: number;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  region_code?: string;
  region_name?: string;
  created_at: string;
}

export interface NameStatistics {
  id: string;
  first_name: string;
  sex: 'M' | 'F';
  total_births: number;
  first_year?: number;
  last_year?: number;
  peak_year?: number;
  peak_births?: number;
  current_rank?: number;
  trend_direction?: 'rising' | 'falling' | 'stable';
  created_at: string;
  updated_at: string;
}
