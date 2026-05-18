import React, { createContext, useContext, useState, useEffect } from 'react';
import { professional as proApi, shifts as shiftApi, wallet as walletApi } from '@/lib/staffingApi';
import { ProfessionalProfile } from '@/types/staffing';

interface DashboardState {
  profile: ProfessionalProfile | null;
  summary: {
    wallet: { balance: number; totalEarned: number };
    stats: { upcoming: number; completed: number; applications: number };
  };
  activeShift: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [summary, setSummary] = useState({
    wallet: { balance: 0, totalEarned: 0 },
    stats: { upcoming: 0, completed: 0, applications: 0 }
  });
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [p, w, active, ov] = await Promise.all([
        proApi.me(),
        walletApi.get(),
        shiftApi.getActive(),
        shiftApi.getOverview()
      ]);

      setProfile(p);
      setSummary({
        wallet: { balance: w.balance, totalEarned: w.totalEarned },
        stats: {
          upcoming: ov.stats?.upcoming || 0,
          applications: ov.stats?.applications || 0,
          completed: ov.stats?.completed || 0
        }
      });
      setActiveShift(active.shift);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardContext.Provider value={{ 
      profile, 
      summary, 
      activeShift, 
      loading, 
      refresh: loadData 
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
