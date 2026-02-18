'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import PocketBase from 'pocketbase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pb: PocketBase | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pb, setPb] = useState<PocketBase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize PocketBase on mount
  useEffect(() => {
    if (!POCKETBASE_URL) {
      console.error('[v0] NEXT_PUBLIC_POCKETBASE_URL is not configured');
      setIsLoading(false);
      return;
    }

    try {
      const pbInstance = new PocketBase(POCKETBASE_URL);
      pbInstance.autoCancellation(false);
      setPb(pbInstance);

      const savedAuth = localStorage.getItem('pb_auth');
      if (savedAuth) {
        try {
          const authData = JSON.parse(savedAuth);
          pbInstance.authStore.save(authData.token, authData.record);
          setUser(authData.record as User);
        } catch (err) {
          console.log('[v0] Could not restore auth');
          localStorage.removeItem('pb_auth');
        }
      }
    } catch (err) {
      console.error('[v0] Error initializing PocketBase:', err);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (!pb) throw new Error('PocketBase not initialized');

    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record as User);

      // Save auth data to localStorage
      localStorage.setItem(
        'pb_auth',
        JSON.stringify({
          token: pb.authStore.token,
          record: authData.record,
        })
      );
    } catch (err) {
      console.error('[v0] Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    if (!pb) throw new Error('PocketBase not initialized');

    try {
      pb.authStore.clear();
      setUser(null);
      localStorage.removeItem('pb_auth');
    } catch (err) {
      console.error('[v0] Logout error:', err);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    pb,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
