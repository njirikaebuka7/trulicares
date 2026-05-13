// @refresh reset
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { auth as authApi, setToken, clearToken, getToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'family' | 'caregiver', caregiverData?: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    authApi.me()
      .then((data: any) => {
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          verified: data.status === 'active',
          photoUrl: data.photoUrl,
        });
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data: any = await authApi.login(email, password);
    setToken(data.token);
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      verified: true,
      photoUrl: data.user.photoUrl,
    });
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: 'family' | 'caregiver',
    caregiverData?: any
  ) => {
    const data: any = await authApi.register(name, email, password, role, caregiverData);
    setToken(data.token);
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      verified: false,
      photoUrl: data.user.photoUrl,
    });
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
