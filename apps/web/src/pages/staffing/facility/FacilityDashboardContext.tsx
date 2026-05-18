import React, { createContext, useContext, useState, useEffect } from 'react';
import { facility as facApi, shifts as shiftApi } from '@/lib/staffingApi';
import { FacilityProfile } from '@/types/staffing';

interface FacilityDashboardState {
  profile: FacilityProfile | null;
  summary: {
    stats: { openShifts: number; filledShifts: number; totalProfessionals: number };
  };
  loading: boolean;
  refresh: () => Promise<void>;
}

const FacilityDashboardContext = createContext<FacilityDashboardState | undefined>(undefined);

export function FacilityDashboardProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<FacilityProfile | null>(null);
  const [summary, setSummary] = useState({
    stats: { openShifts: 0, filledShifts: 0, totalProfessionals: 0 }
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [p, ov] = await Promise.all([
        facApi.me(),
        shiftApi.getFacilityOverview()
      ]);

      setProfile(p);
      setSummary({
        stats: {
          openShifts: ov.stats?.open || 0,
          filledShifts: ov.stats?.filled || 0,
          totalProfessionals: ov.stats?.totalPros || 0
        }
      });
    } catch (err) {
      console.error('Failed to load facility dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <FacilityDashboardContext.Provider value={{ 
      profile, 
      summary, 
      loading, 
      refresh: loadData 
    }}>
      {children}
    </FacilityDashboardContext.Provider>
  );
}

export function useFacilityDashboard() {
  const context = useContext(FacilityDashboardContext);
  if (context === undefined) {
    throw new Error('useFacilityDashboard must be used within a FacilityDashboardProvider');
  }
  return context;
}
