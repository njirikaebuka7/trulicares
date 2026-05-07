import { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'family' | 'caregiver') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 800));
    const isAdmin = email.toLowerCase().includes('admin');
    const isCaregiver = email.toLowerCase().includes('caregiver') || email.toLowerCase().includes('provider');
    const role: 'family' | 'caregiver' | 'admin' = isAdmin ? 'admin' : isCaregiver ? 'caregiver' : 'family';
    setUser({
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      email,
      name: isAdmin ? 'Admin User' : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      role,
      verified: true,
    });
  };

  const signup = async (email: string, _password: string, name: string, role: 'family' | 'caregiver') => {
    await new Promise(r => setTimeout(r, 800));
    setUser({
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      email,
      name,
      role,
      verified: false,
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
