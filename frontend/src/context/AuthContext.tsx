import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'student' | 'teacher' | 'admin' | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {}
});

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const syncProfile = async (currentSession: Session | null) => {
    if (currentSession?.user) {
      try {
        // Use the token to fetch the profile from our Backend
        // This also triggers the backend logic to sync/create the user in the public schema
        const response = await fetch(`${VITE_API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });

        if (response.ok) {
          const profile = await response.json();
          // Use the role from our local Database (the source of truth)
          const normalizedRole = profile.role?.toLowerCase() as any;
          setRole(normalizedRole);
          console.log('DEBUG: Role synced from backend:', normalizedRole);
        } else {
          // Fallback to Supabase metadata if backend is unreachable
          setRole(currentSession.user.user_metadata?.role || 'student');
        }
      } catch (err) {
        console.error('DEBUG: Profile sync error:', err);
        setRole(currentSession.user.user_metadata?.role || 'student');
      }
    } else {
      setRole(null);
    }
  };

  useEffect(() => {
    console.log('DEBUG: AuthProvider initialized');
    
    // 1. Get initial session and sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('DEBUG: Initial session retrieved:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      syncProfile(session).finally(() => setLoading(false));
    }).catch(err => {
      console.error('DEBUG: Error getting session:', err);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('DEBUG: Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await syncProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
      }
      
      setLoading(false);
    });

    // Safety timeout: 5 seconds max loading
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('DEBUG: Auth loading timed out');
        return false;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
