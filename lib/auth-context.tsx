'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import PocketBase from 'pocketbase';
import { Employee, User } from './types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pb: PocketBase | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  employee: Employee | null;
  employeeRole: Employee['role'] | null;
  isViewOnlyRole: boolean;
  reloadEmployee: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pb, setPb] = useState<PocketBase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);

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

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!pb || !user) {
        setEmployee(null);
        return;
      }
      try {
        const res = await pb
          .collection('employees')
          .getList<Employee>(1, 1, {
            filter: `user = "${user.id}" && status = "active"`,
            sort: '-created',
          });
        setEmployee(res.items[0] || null);
      } catch (err) {
        console.error('[v0] Fetch employee for auth error:', err);
        setEmployee(null);
      }
    };

    fetchEmployee();
  }, [pb, user]);

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

      try {
        const res = await pb
          .collection('employees')
          .getList<Employee>(1, 1, {
            filter: `user = "${authData.record.id}" && status = "active"`,
            sort: '-created',
          });
        setEmployee(res.items[0] || null);
      } catch (err) {
        console.error('[v0] Fetch employee after login error:', err);
        setEmployee(null);
      }
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
      setEmployee(null);
      localStorage.removeItem('pb_auth');
    } catch (err) {
      console.error('[v0] Logout error:', err);
      throw err;
    }
  };

  const employeeRole = employee?.role ?? null;
  const isViewOnlyRole =
    employeeRole === 'waiter' || employeeRole === 'driver';

  const reloadEmployee = async () => {
    if (!pb || !user) {
      setEmployee(null);
      return;
    }
    try {
      const res = await pb
        .collection('employees')
        .getList<Employee>(1, 1, {
          filter: `user = "${user.id}" && status = "active"`,
          sort: '-created',
        });
      setEmployee(res.items[0] || null);
    } catch (err) {
      console.error('[v0] Reload employee error:', err);
      setEmployee(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    pb,
    login,
    logout,
    employee,
    employeeRole,
    isViewOnlyRole,
    reloadEmployee,
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