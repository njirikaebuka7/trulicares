import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import FamilyDashboard from '@/pages/dashboards/FamilyDashboard';
import CaregiverDashboard from '@/pages/dashboards/CaregiverDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import ProfessionalDashboard from '@/pages/staffing/ProfessionalDashboard';
import FacilityDashboard from '@/pages/staffing/FacilityDashboard';
import heartLogoImg from '@/assets/heart-logo.png';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute -inset-4 rounded-3xl bg-brand-500/10 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 bg-white rounded-3xl shadow-xl flex items-center justify-center p-4 border border-brand-100/50">
            <img src={heartLogoImg} alt="TruliCares Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 bg-coral-400 rounded-full animate-bounce" />
            </div>
            <p className="text-sm font-semibold text-brand-900/80 tracking-wide uppercase">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }
  // Logged out → send straight to the login page (no interstitial screen).
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'caregiver') return <CaregiverDashboard />;
  if (user.role === 'professional') return <ProfessionalDashboard />;
  if (user.role === 'facility') return <FacilityDashboard />;
  
  return <FamilyDashboard />;
}
