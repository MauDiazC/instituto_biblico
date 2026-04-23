import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'student' | 'teacher' | 'admin' | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  useEffect(() => {
    console.log('DEBUG: AuthProvider initialized');
    
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('DEBUG: Initial session retrieved:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole(session.user.user_metadata?.role || 'student');
      }
      setLoading(false);
    }).catch(err => {
      console.error('DEBUG: Error getting session:', err);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('DEBUG: Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole(session.user.user_metadata?.role || 'student');
      } else {
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
    <AuthContext.Provider value={{ user, session, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
