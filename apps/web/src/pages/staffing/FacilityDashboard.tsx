import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Routes, Route } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Calendar, PlusCircle, 
  Settings, Bell, Menu, X, LogOut, ChevronRight,
  Shield, CheckCircle, Briefcase, Clock, Building,
  ChevronLeft, Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { facility as facApi, shifts as shiftApi } from '@/lib/staffingApi';
import { FacilityProfile } from '@/types/staffing';
import logoImg from '@/assets/logo.png';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';

// Sub-views
import PostShift from './facility/PostShift';
import FacilityShifts from './facility/ShiftManagement';
import FacilitySchedule from './facility/FacilitySchedule';
import FacilityProfileView from './facility/FacilityProfileView';
import { FacilityDashboardProvider, useFacilityDashboard } from './facility/FacilityDashboardContext';

export default function FacilityDashboard() {
  return (
    <FacilityDashboardProvider>
      <FacilityDashboardInner />
    </FacilityDashboardProvider>
  );
}

function FacilityDashboardInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { profile, loading, summary, refresh } = useFacilityDashboard();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Global Realtime Listeners
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`facility:${user.id}`)
      .on('broadcast', { event: '*' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/facility-dashboard' },
    { label: 'My Shifts', icon: Search, path: '/facility-dashboard/shifts' },
    { label: 'Schedule', icon: Calendar, path: '/facility-dashboard/schedule' },
    { label: 'Post a Shift', icon: PlusCircle, path: '/facility-dashboard/post' },
    { label: 'Facility Profile', icon: Building, path: '/facility-dashboard/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={logoImg} alt="TruliCares" className="h-10 w-auto brightness-0 invert opacity-50" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            <p className="text-gray-400 font-bold tracking-tight text-xl">Syncing Facility Hub...</p>
            <p className="text-gray-600 text-xs font-medium">Loading your operational metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans overflow-x-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-gray-950 border-r border-white/5 z-50 transition-all duration-500 transform lg:translate-x-0 shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-24" : "lg:w-72"
      )}>
        <div className="h-full flex flex-col">
          <div className={cn(
            "p-6 border-b border-white/5 flex items-center mb-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                <img src={logoImg} alt="" className="w-6 h-6 brightness-0 invert" />
              </div>
              {!isCollapsed && <span className="font-black text-white text-xl tracking-tighter">TruliCares</span>}
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/facility-dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group",
                    isActive 
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-gray-500 group-hover:text-brand-400")} />
                  {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                  {!isCollapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-white/5">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all w-full",
                isCollapsed && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span className="font-bold text-sm">Logout</span>}
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-24 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-brand-700 transition-all z-50 border-4 border-gray-50 hidden lg:flex"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-500 relative",
        isCollapsed ? "lg:ml-24" : "lg:ml-72"
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40 pointer-events-none" />

        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2.5 hover:bg-gray-100 rounded-xl" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {navItems.find(i => location.pathname === i.path || (i.path !== '/facility-dashboard' && location.pathname.startsWith(i.path)))?.label || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-gray-50 border border-gray-100 p-1.5 rounded-2xl pr-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-xs">
                {profile?.name?.charAt(0)}
              </div>
              <span className="text-xs font-black text-gray-900 truncate max-w-[120px]">{profile?.name}</span>
            </div>
            <button className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center relative hover:bg-white hover:shadow-lg transition-all">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-8 lg:p-12 relative">
          <Routes>
            <Route index element={<FacilityOverview profile={profile} summary={summary} />} />
            <Route path="post" element={<PostShift />} />
            <Route path="shifts" element={<FacilityShifts />} />
            <Route path="schedule" element={<FacilitySchedule />} />
            <Route path="profile" element={<FacilityProfileView />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function FacilityOverview({ profile, summary }: { profile: FacilityProfile | null, summary: any }) {
  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome back, {profile?.name}!</h2>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            {profile?.type} Hub • {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>
        <Link 
          to="/facility-dashboard/post"
          className="inline-flex items-center justify-center gap-2 bg-brand-900 hover:bg-brand-950 text-white px-8 py-4 rounded-3xl font-black transition-all shadow-xl hover:-translate-y-1"
        >
          <PlusCircle className="w-5 h-5" />
          Post New Shift
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Open Shifts', value: summary.stats.openShifts, icon: Search, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
          { label: 'Filled Shifts', value: summary.stats.filledShifts, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Total Professionals', value: summary.stats.totalProfessionals, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group relative overflow-hidden",
            stat.border
          )}>
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-950 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <h4 className="text-3xl font-black mb-6 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-brand-400" />
            Verified Marketplace
          </h4>
          <p className="text-brand-100 text-sm font-medium leading-relaxed opacity-80 mb-10">
            You are operating in the TruliCares Staffing Network. All professionals browsing your shifts have cleared license verification and background checks.
          </p>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest">
              100% Verified Staff
            </div>
            <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest">
              Liability Insured
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl space-y-6">
          <h3 className="font-black text-gray-400 uppercase tracking-[0.2em] text-[10px]">Quick Operational Actions</h3>
          <div className="space-y-4">
            <Link to="/facility-dashboard/post" className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-transparent hover:border-brand-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-700">Create Multiple Shifts</span>
              <ChevronRight className="ml-auto w-5 h-5 text-gray-300" />
            </Link>
            <Link to="/facility-dashboard/schedule" className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-transparent hover:border-violet-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-700">View Roster Calendar</span>
              <ChevronRight className="ml-auto w-5 h-5 text-gray-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
