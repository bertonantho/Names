import { useState, useEffect } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // If Supabase is not configured, set loading to false and return
    if (!isConfigured || !supabase) {
      setAuthState({
        user: null,
        session: null,
        loading: false,
      });
      return;
    }

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      })
      .catch(() => {
        // Fallback for development when Supabase is not configured
        setAuthState({
          user: null,
          session: null,
          loading: false,
        });
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Authentication not configured' },
      };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Authentication not configured' },
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isConfigured || !supabase) {
      return { error: { message: 'Authentication not configured' } };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Authentication not configured' },
      };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  };

  const updatePassword = async (password: string) => {
    if (!isConfigured || !supabase) {
      return {
        data: null,
        error: { message: 'Authentication not configured' },
      };
    }
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    return { data, error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
};
