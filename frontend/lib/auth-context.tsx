'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Shop } from '../types';
import { authService, LoginPayload, RegisterPayload, RequestOtpPayload, VerifyOtpPayload, OtpResponse } from '../services/auth.service';
import { shopService } from '../services/shop.service';
import { getAuthToken, setAuthToken } from './api-client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  shop: Shop | null;
  isLoading: boolean;
  login: (payload: LoginPayload, role?: 'OWNER' | 'CUSTOMER') => Promise<void>;
  register: (payload: RegisterPayload, role?: 'OWNER' | 'CUSTOMER') => Promise<void>;
  requestOtp: (target: RequestOtpPayload | string) => Promise<OtpResponse>;
  verifyOtp: (target: VerifyOtpPayload | string, code?: string, name?: string) => Promise<User>;
  verifyFirebaseToken: (idToken: string, name?: string) => Promise<User>;
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
      if (me.role === 'OWNER') {
        await fetchShop();
      } else {
        setShop(null);
      }
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

  const login = async (payload: LoginPayload, role: 'OWNER' | 'CUSTOMER' = 'OWNER') => {
    setIsLoading(true);
    try {
      const res =
        role === 'CUSTOMER'
          ? await authService.loginCustomer(payload)
          : await authService.login(payload);
      setUser(res.user);
      setTokenState(res.accessToken);
      if (res.user.role === 'OWNER') {
        await fetchShop();
        router.push('/dashboard');
      } else {
        setShop(null);
        router.push('/customer/profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload, role: 'OWNER' | 'CUSTOMER' = 'OWNER') => {
    setIsLoading(true);
    try {
      if (role === 'CUSTOMER') {
        await authService.registerCustomer(payload);
        const res = await authService.loginCustomer({
          email: payload.email,
          password: payload.password,
        });
        setUser(res.user);
        setTokenState(res.accessToken);
        setShop(null);
        router.push('/customer/profile');
      } else {
        await authService.register(payload);
        const res = await authService.login({
          email: payload.email,
          password: payload.password,
        });
        setUser(res.user);
        setTokenState(res.accessToken);
        await fetchShop();
        router.push('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (target: RequestOtpPayload | string) => {
    return authService.requestCustomerOtp(target);
  };

  const verifyOtp = async (
    target: VerifyOtpPayload | string,
    code?: string,
    name?: string,
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.verifyCustomerOtp(target, code, name);
      setUser(res.user);
      setTokenState(res.accessToken);
      setShop(null);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFirebaseToken = async (idToken: string, name?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.verifyFirebaseCustomer(idToken, name);
      setUser(res.user);
      setTokenState(res.accessToken);
      setShop(null);
      return res.user;
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
        requestOtp,
        verifyOtp,
        verifyFirebaseToken,
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
