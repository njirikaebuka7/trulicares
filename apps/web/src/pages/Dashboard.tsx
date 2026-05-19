import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import FamilyDashboard from '@/pages/dashboards/FamilyDashboard';
import CaregiverDashboard from '@/pages/dashboards/CaregiverDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import ProfessionalDashboard from '@/pages/staffing/ProfessionalDashboard';
import FacilityDashboard from '@/pages/staffing/FacilityDashboard';
import Button from '@/components/ui/Button';
import logoImg from '@/assets/logo.png';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute -inset-4 rounded-3xl bg-brand-500/10 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 bg-white rounded-3xl shadow-xl flex items-center justify-center p-4 border border-brand-100/50">
            <img src={logoImg} alt="TruliCares Logo" className="w-full h-full object-contain" />
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
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Please log in to access your dashboard</h2>
        <p className="text-gray-500 text-sm">You need an account to view this page.</p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => navigate('/login')}>Log In</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'caregiver') return <CaregiverDashboard />;
  if (user.role === 'professional') return <ProfessionalDashboard />;
  if (user.role === 'facility') return <FacilityDashboard />;
  
  return <FamilyDashboard />;
}
