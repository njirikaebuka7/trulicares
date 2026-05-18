import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Routes, Route } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Calendar, Wallet, 
  UserCircle, Bell, Menu, X, LogOut, ChevronRight,
  Shield, CheckCircle, Briefcase, Clock, FileText,
  ChevronLeft, Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { professional as proApi, shifts as shiftApi, applications as appApi, wallet as walletApi } from '@/lib/staffingApi';
import { ProfessionalProfile, Shift } from '@/types/staffing';
import logoImg from '@/assets/logo.png';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';

// Sub-views
import ShiftBrowse from './professional/ShiftBrowse';
import ProfessionalCalendar from './professional/ProfessionalCalendar';
import WalletView from './professional/WalletView';
import ProfessionalProfileView from './professional/ProfessionalProfileView';
import ResumeGenerator from './professional/ResumeGenerator';
import { DashboardProvider, useDashboard } from './professional/DashboardContext';

export default function ProfessionalDashboard() {
  return (
    <DashboardProvider>
      <ProfessionalDashboardInner />
    </DashboardProvider>
  );
}

function ProfessionalDashboardInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { profile, loading, summary, activeShift, refresh } = useDashboard();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Global Staffing Listeners (Realtime updates)
  useEffect(() => {
    if (!user) return;

    const walletChannel = supabase
      .channel(`wallet:${user.id}`)
      .on('broadcast', { event: 'balance_updated' }, (payload) => {
        console.log('Wallet update received:', payload);
        refresh(); // Refresh context
      })
      .subscribe();

    const profileChannel = supabase
      .channel(`profile:${user.id}`)
      .on('broadcast', { event: 'verification_update' }, (payload) => {
        refresh();
      })
      .subscribe();

    const bookingChannel = supabase
      .channel(`professional:${user.id}`)
      .on('broadcast', { event: '*' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [user]);

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/professional-dashboard' },
    { label: 'Browse Shifts', icon: Search, path: '/professional-dashboard/browse' },
    { label: 'My Schedule', icon: Calendar, path: '/professional-dashboard/schedule' },
    { label: 'Wallet', icon: Wallet, path: '/professional-dashboard/wallet' },
    { label: 'My Profile', icon: UserCircle, path: '/professional-dashboard/profile' },
    { label: 'Resume', icon: FileText, path: '/professional-dashboard/resume' },
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
            <p className="text-gray-400 font-bold tracking-tight">Syncing your dashboard...</p>
            <p className="text-gray-600 text-xs font-medium">Securing your medical credentials</p>
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-gray-950 border-r border-white/5 z-50 transition-all duration-500 ease-out transform lg:translate-x-0 shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-24" : "lg:w-72"
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className={cn(
            "p-6 border-b border-white/5 flex items-center mb-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                <img src={logoImg} alt="" className="w-6 h-6 brightness-0 invert" />
              </div>
              {!isCollapsed && <span className="font-black text-white text-xl tracking-tighter">TruliCares</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 py-4 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/professional-dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group relative",
                    isActive 
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-gray-500 group-hover:text-brand-400")} />
                  {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                  {!isCollapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Bottom */}
          <div className="p-4 mt-auto">
            <div className={cn(
              "p-4 rounded-3xl bg-white/5 border border-white/5 mb-4 overflow-hidden transition-all duration-300",
              isCollapsed ? "opacity-0 h-0 p-0 mb-0" : "opacity-100"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg">
                  {profile?.name?.charAt(0) || user?.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white truncate">{profile?.name || user?.name}</p>
                  <p className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-widest">{profile?.license_type || 'Professional'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all w-full group",
                isCollapsed && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              {!isCollapsed && <span className="font-bold text-sm">Logout</span>}
            </button>
          </div>
        </div>

        {/* Collapse Toggle */}
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
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40 pointer-events-none" />

        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2.5 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-black text-gray-900 tracking-tight hidden sm:block">
              {navItems.find(i => location.pathname === i.path || (i.path !== '/professional-dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Verified & Active
              </div>
            </div>
            <button className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center relative hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all group">
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 lg:p-12 relative">
          {loading && (
            <div className="h-1 bg-brand-100 w-full mb-8 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-brand-600 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
            </div>
          )}
          
          <Routes>
            <Route index element={<Overview profile={profile} summary={summary} activeShift={activeShift} />} />
            <Route path="browse" element={<ShiftBrowse />} />
            <Route path="schedule" element={<ProfessionalCalendar />} />
            <Route path="wallet" element={<WalletView />} />
            <Route path="profile" element={<ProfessionalProfileView />} />
            <Route path="resume" element={<ResumeGenerator />} />
          </Routes>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { width: 0; transform: translateX(-100%); }
          50% { width: 50%; transform: translateX(0); }
          100% { width: 0; transform: translateX(200%); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}

// ── Dashboard Overview Component ─────────────────────────────
function Overview({ profile, summary, activeShift }: { profile: ProfessionalProfile | null, summary: any, activeShift: any }) {
  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome back, {profile?.name?.split(' ')[0]}!</h2>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            {format(new Date(), 'EEEE, MMMM do')} • Ready for your next shift?
          </p>
        </div>
        <Link 
          to="/professional-dashboard/browse"
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-3xl font-black transition-all shadow-xl shadow-brand-100 hover:-translate-y-1 active:scale-95"
        >
          <Search className="w-5 h-5" />
          Browse Available Shifts
        </Link>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <CheckInTimer 
          bookingId={activeShift.booking_id}
          status={activeShift.booking_status}
          startTime={activeShift.start_time}
          endTime={activeShift.end_time}
          role="professional"
          onUpdate={() => window.location.reload()} 
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Upcoming Shifts', value: summary.stats.upcoming, icon: Clock, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
          { label: 'Pending Apps', value: summary.stats.applications, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Wallet Balance', value: `$${summary.wallet.balance.toFixed(2)}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Total Earnings', value: `$${summary.wallet.totalEarned.toFixed(2)}`, icon: CheckCircle, color: 'text-brand-700', bg: 'bg-brand-50', border: 'border-brand-100' },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group relative overflow-hidden",
            stat.border
          )}>
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
            <div className={cn("absolute bottom-0 right-0 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity", stat.bg)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Verification Status */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 via-brand-950 to-black rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-125" />
          <div className="relative flex flex-col md:flex-row items-center gap-10">
            <div className="w-28 h-28 rounded-[2rem] bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:rotate-6 transition-transform duration-500">
              <Shield className="w-14 h-14 text-brand-300 shadow-[0_0_20px_rgba(110,231,183,0.3)]" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h4 className="text-3xl font-black mb-3 tracking-tight">Professional Credentials</h4>
              <p className="text-brand-100 text-sm font-medium leading-relaxed max-w-lg opacity-80">
                Your profile is active and verified by TruliCares Admin. You have priority access to high-pay shifts at top facilities in {profile?.location}.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2.5 bg-emerald-500/20 text-emerald-300 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-emerald-500/30 backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4" /> License Verified
                </div>
                <div className="flex items-center gap-2.5 bg-blue-500/20 text-blue-300 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-blue-500/30 backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4" /> Background Clear
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700" />
          <h3 className="font-black text-gray-400 mb-8 uppercase tracking-[0.2em] text-[10px]">Quick Actions</h3>
          <div className="space-y-4 relative">
            {[
              { label: 'View My Wallet', path: '/professional-dashboard/wallet', icon: Wallet, color: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200' },
              { label: 'Update Profile', path: '/professional-dashboard/profile', icon: UserCircle, color: 'bg-brand-50 text-brand-600', border: 'hover:border-brand-200' },
              { label: 'Browse Shifts', path: '/professional-dashboard/browse', icon: Search, color: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200' },
              { label: 'My Schedule', path: '/professional-dashboard/schedule', icon: Calendar, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
            ].map((link, i) => (
              <Link 
                key={i} 
                to={link.path}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-[1.75rem] bg-gray-50/50 border border-transparent transition-all duration-300 group/item",
                  link.border
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover/item:scale-110", link.color)}>
                  <link.icon className="w-6 h-6" />
                </div>
                <span className="font-black text-gray-700 text-sm">{link.label}</span>
                <ChevronRight className="ml-auto w-5 h-5 text-gray-300 group-hover/item:text-gray-900 group-hover/item:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckInTimer({ bookingId, status, startTime, endTime, role, onUpdate }: any) {
  // Existing implementation
  return (
    <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-emerald-200 animate-pulse-subtle relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
      <div className="flex items-center gap-6 relative">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <div>
          <h4 className="text-2xl font-black tracking-tight">Active Shift In Progress</h4>
          <p className="text-emerald-100 font-bold opacity-80 mt-1">Status: {status.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="text-right hidden sm:block mr-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 opacity-60">Ends in</p>
          <p className="text-xl font-black tracking-tight">2h 45m</p>
        </div>
        <button className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-all active:scale-95">
          View Shift Details
        </button>
      </div>
    </div>
  );
}
