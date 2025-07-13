import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For development, use placeholder values if environment variables are not set
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(url, key);

// Database types
export interface Database {
  public: {
    Tables: {
      names: {
        Row: {
          id: string;
          name: string;
          gender: 'boy' | 'girl' | 'unisex';
          origin: string;
          meaning: string;
          popularity_rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          gender: 'boy' | 'girl' | 'unisex';
          origin: string;
          meaning: string;
          popularity_rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          gender?: 'boy' | 'girl' | 'unisex';
          origin?: string;
          meaning?: string;
          popularity_rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          name_id: string;
          collection_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name_id: string;
          collection_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name_id?: string;
          collection_name?: string | null;
          created_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Helper types
export type Name = Tables<'names'>;
export type Profile = Tables<'profiles'>;
export type Favorite = Tables<'favorites'>;
export type Collection = Tables<'collections'>;
