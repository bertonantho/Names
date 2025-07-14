import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Handle missing environment variables gracefully
let supabase: any = null;
let isConfigured = false;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isConfigured = true;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    isConfigured = false;
  }
} else {
  console.warn(
    'Supabase environment variables are not configured. Some features may not work. ' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
  );
  isConfigured = false;
}

// Export both the client and configuration status
export { supabase, isConfigured };

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
