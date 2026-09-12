'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Shop } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/auth.service';
import { shopService } from '../services/shop.service';
import { getAuthToken, setAuthToken } from './api-client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  shop: Shop | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshShop: () => Promise<Shop | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchShop = useCallback(async (): Promise<Shop | null> => {
    try {
      const s = await shopService.getMyShop();
      setShop(s);
      return s;
    } catch {
      setShop(null);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      setUser(null);
      setShop(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      setTokenState(storedToken);
      const me = await authService.getMe();
      setUser(me);
      await fetchShop();
    } catch {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchShop]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      setUser(res.user);
      setTokenState(res.accessToken);
      await fetchShop();
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      await authService.register(payload);
      // Auto login after registration
      const res = await authService.login({
        email: payload.email,
        password: payload.password,
      });
      setUser(res.user);
      setTokenState(res.accessToken);
      await fetchShop();
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setShop(null);
    setTokenState(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        shop,
        isLoading,
        login,
        register,
        logout,
        refreshShop: fetchShop,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
