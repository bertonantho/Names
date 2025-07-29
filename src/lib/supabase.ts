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

// Authentication and user-related types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Collection system types
export type CollectionRole = 'owner' | 'collaborator' | 'viewer';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: Profile;
  member_count?: number;
  favorite_count?: number;
}

export interface CollectionMember {
  id: string;
  collection_id: string;
  user_id: string;
  role: CollectionRole;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  // Joined data
  user?: Profile;
  inviter?: Profile;
}

export interface CollectionInvitation {
  id: string;
  collection_id: string;
  invited_email: string;
  invited_by: string;
  role: CollectionRole;
  invitation_token: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  // Joined data
  collection?: Collection;
  inviter?: Profile;
}

export interface Favorite {
  id: string;
  user_id: string;
  name_text: string; // The actual name string (e.g., "Emma")
  name_gender: string; // 'M' or 'F' to distinguish same names with different genders
  collection_id?: string; // Now properly linked to collections
  notes?: string; // Personal notes about the name
  added_by?: string; // Who added this to the collection
  created_at: string;
  // Joined data
  collection?: Collection;
  added_by_user?: Profile;
}

export interface Dislike {
  id: string;
  user_id: string;
  name_text: string; // The actual name string (e.g., "Emma")
  name_gender: string; // 'M' or 'F' to distinguish same names with different genders
  reason?: string;
  created_at: string;
}

// Type for name data from JSON files (NameData from splitJsonApi)
export interface NameFromJson {
  name: string;
  sex: 'M' | 'F';
  totalCount: number;
  firstYear: number;
  lastYear: number;
  yearlyData: Record<string, number>;
}

// Type for combined name with user interaction status
export interface NameWithInteraction extends NameFromJson {
  is_favorited?: boolean;
  is_disliked?: boolean;
  favorite_id?: string;
  dislike_id?: string;
  collections?: Collection[]; // Which collections this name is in
}

// Collection with detailed information
export interface CollectionWithDetails extends Collection {
  members: CollectionMember[];
  favorites: Favorite[];
  pending_invitations: CollectionInvitation[];
  user_role?: CollectionRole;
}
