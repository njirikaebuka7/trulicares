import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Routes, Route } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Calendar, PlusCircle, 
  Settings, Bell, Menu, X, LogOut, ChevronRight,
  Shield, CheckCircle, Briefcase, Clock, Building,
  ChevronLeft, Users, MessageCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { facility as facApi, shifts as shiftApi } from '@/lib/staffingApi';
import { notifications as notificationsApi } from '@/lib/api';
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
import FacilityApplicants from './facility/FacilityApplicants';
import StaffingChat from './StaffingChat';
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
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [apiNotifications, setApiNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  useEffect(() => {
    notificationsApi.list()
      .then((data: any) => setApiNotifications(data.notifications || []))
      .catch(() => {});
  }, []);

  const unreadApiCount = apiNotifications.filter((n: any) => !(n.read ?? n.isRead ?? false)).length;
  const unread = notificationsRead ? 0 : unreadApiCount;

  const openNotifications = () => {
    setNotifOpen(true);
    setNotificationsRead(true);
    if (unreadApiCount > 0) {
      notificationsApi.markAllRead().catch(() => {});
      setApiNotifications(prev => prev.map((n: any) => ({ ...n, read: true, isRead: true })));
    }
  };

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
    { label: 'Messages', icon: MessageCircle, path: '/facility-dashboard/messages' },
    { label: 'Post a Shift', icon: PlusCircle, path: '/facility-dashboard/post' },
    { label: 'Facility Profile', icon: Building, path: '/facility-dashboard/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Setting up your dashboard...</p>
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'F';

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans overflow-x-hidden relative">
      {/* Sidebar (Desktop Only) */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 bg-emerald-950 border-r border-white/5 z-50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          "flex items-center border-b border-emerald-800/60 shrink-0 h-14",
          isCollapsed ? "justify-center px-3" : "justify-between px-4"
        )}>
          {!isCollapsed && (
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80 hover:opacity-100 transition-opacity" />
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/60 flex items-center justify-center text-emerald-300 hover:text-white transition-all shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User profile */}
        {!isCollapsed ? (
          <div className="px-4 py-4 border-b border-emerald-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white text-sm truncate">{profile?.name || user?.name}</p>
                <p className="text-xs text-emerald-400 truncate">{profile?.type || 'Facility'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-3 border-b border-emerald-800/60">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/facility-dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "w-full flex items-center rounded-xl text-sm font-medium transition-all",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-emerald-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "text-white" : "text-emerald-400")} />
                {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom */}
        <div className="px-2 py-3 border-t border-emerald-800/60">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-xl text-sm font-medium text-emerald-400 hover:bg-red-500/10 hover:text-red-300 transition-all",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && 'Log Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 relative",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40 pointer-events-none" />

        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-7 w-auto lg:hidden" />
            </Link>
            <h1 className="hidden lg:block text-base font-bold text-gray-900">
              {navItems.find(i => location.pathname === i.path || (i.path !== '/facility-dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 bg-gray-50 border border-gray-100 p-1.5 rounded-2xl pr-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
              <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{profile?.name || user?.name}</span>
            </div>
            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-bold text-gray-900 text-sm">Notifications</span>
                      <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {apiNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</div>
                    ) : apiNotifications.slice(0, 8).map((n: any) => {
                      const isRead = n.read ?? n.isRead ?? false;
                      return (
                        <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                          <p className={cn('text-sm font-medium', isRead ? 'text-gray-600' : 'text-gray-900')}>{n.content || n.message || n.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : n.time}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Mobile User Menu Dropdown */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold transition-all active:scale-95 overflow-hidden"
              >
                {initials}
              </button>
              {mobileUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile?.name || user?.name || 'Facility'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link 
                      to="/facility-dashboard/profile" 
                      onClick={() => setMobileUserMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      My Profile
                    </Link>
                    <button 
                      onClick={() => {
                        setMobileUserMenuOpen(false);
                        handleLogout();
                      }} 
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 relative">
          <Routes>
            <Route index element={<FacilityOverview profile={profile} summary={summary} />} />
            <Route path="post" element={<PostShift />} />
            <Route path="shifts" element={<FacilityShifts />} />
            <Route path="applicants" element={<FacilityApplicants />} />
            <Route path="schedule" element={<FacilitySchedule />} />
            <Route path="messages" element={<StaffingChat />} />
            <Route path="profile" element={<FacilityProfileView />} />
          </Routes>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-stretch h-16">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path !== '/facility-dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
                    isActive ? 'text-emerald-600' : 'text-gray-400'
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-12 h-7 rounded-full transition-all',
                    isActive ? 'bg-emerald-100 text-emerald-700' : ''
                  )}>
                    <item.icon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-semibold leading-none">
                    {item.label === 'Facility Profile' ? 'Profile' : item.label === 'Post a Shift' ? 'Post' : item.label === 'My Shifts' ? 'Shifts' : item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function FacilityOverview({ profile, summary }: { profile: FacilityProfile | null, summary: any }) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back</p>
        <h2 className="text-2xl font-bold mb-1">{profile?.name || 'Facility'}</h2>
        <p className="text-emerald-200 text-sm mb-5 font-semibold">
          {profile?.type || 'Operational'} Hub • {format(new Date(), 'EEEE, MMMM do')}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link 
            to="/facility-dashboard/post"
            className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Post New Shift
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Open Shifts', value: summary.stats.openShifts, icon: Search, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Filled Shifts', value: summary.stats.filledShifts, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Professionals', value: summary.stats.totalProfessionals, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Live metrics</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Card */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-125" />
          <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-400" />
            Verified Marketplace
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed max-w-lg">
            You are operating in the TruliCares Staffing Network. All professionals browsing your shifts have cleared license verification and background checks.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/5 text-xs font-semibold">
              100% Verified Staff
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/5 text-xs font-semibold">
              Liability Insured
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/facility-dashboard/post" className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-transparent hover:border-brand-200 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">Create Multiple Shifts</span>
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link to="/facility-dashboard/schedule" className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-transparent hover:border-violet-200 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">View Roster Calendar</span>
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
