import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Routes, Route } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Calendar, Wallet, 
  UserCircle, Bell, Menu, X, LogOut, ChevronRight,
  Shield, CheckCircle, Briefcase, Clock, FileText,
  ChevronLeft, Info, MessageCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { professional as proApi, shifts as shiftApi, applications as appApi, wallet as walletApi } from '@/lib/staffingApi';
import { ProfessionalProfile, Shift } from '@/types/staffing';
import logoImg from '@/assets/logo.png';
import { get, post } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';

// Sub-views
import ShiftBrowse from './professional/ShiftBrowse';
import ProfessionalCalendar from './professional/ProfessionalCalendar';
import WalletView from './professional/WalletView';
import ProfessionalProfileView from './professional/ProfessionalProfileView';
import ResumeGenerator from './professional/ResumeGenerator';
import ShiftDetails from './professional/ShiftDetails';
import StaffingChat from './StaffingChat';
import CheckInTimer from '@/components/staffing/CheckInTimer';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);

  // Notifications
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    get('/notifications').then((d: any) => setDbNotifications(d.notifications || [])).catch(console.error);
    
    const notifChannel = supabase
      .channel(`notifications:${user.id}`)
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        setDbNotifications(prev => [payload.payload, ...prev]);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const unread = dbNotifications.filter(n => !(n.read ?? n.isRead)).length;

  const openNotifications = async () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen && unread > 0) {
      setDbNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      try {
        await post('/notifications/read', {});
      } catch (err) {
        console.error('Failed to mark notifications read', err);
      }
    }
  };

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
    { label: 'Messages', icon: MessageCircle, path: '/professional-dashboard/messages' },
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Setting up your dashboard...</p>
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'P';

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
                <p className="text-xs text-emerald-400 truncate">{profile?.license_type || 'Professional'}</p>
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
            const isActive = location.pathname === item.path || (item.path !== '/professional-dashboard' && location.pathname.startsWith(item.path));
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
              {navItems.find(i => location.pathname === i.path || (i.path !== '/professional-dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
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
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-coral-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
                )}
              </button>
              {notifOpen && (
                <div className="hidden lg:block absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  {dbNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</div>
                  ) : dbNotifications.slice(0, 8).map((n: any) => {
                    const isRead = n.read ?? n.isRead ?? false;
                    return (
                      <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <p className={cn('text-sm font-medium', isRead ? 'text-gray-600' : 'text-gray-900')}>{n.content || n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : n.timeAgo}</p>
                      </div>
                    );
                  })}
                </div>
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
                      <p className="text-sm font-bold text-gray-900 truncate">{profile?.name || user?.name || 'Professional'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link 
                      to="/professional-dashboard/profile" 
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
            <Route index element={<Overview profile={profile} summary={summary} activeShift={activeShift} />} />
            <Route path="browse" element={<ShiftBrowse />} />
            <Route path="shifts/:id" element={<ShiftDetails />} />
            <Route path="schedule" element={<ProfessionalCalendar />} />
            <Route path="messages" element={<StaffingChat />} />
            <Route path="wallet" element={<WalletView />} />
            <Route path="profile" element={<ProfessionalProfileView />} />
            <Route path="resume" element={<ResumeGenerator />} />
          </Routes>
        </div>

        {/* Mobile Bottom Navigation & Drawer */}
        {(() => {
          const MOBILE_PRIMARY = [
            '/professional-dashboard',
            '/professional-dashboard/browse',
            '/professional-dashboard/schedule',
            '/professional-dashboard/wallet',
          ];
          const mobileNav = navItems.filter(n => MOBILE_PRIMARY.includes(n.path));
          const moreNav = navItems.filter(n => !MOBILE_PRIMARY.includes(n.path));
          const moreActive = moreNav.some(n => location.pathname === n.path || location.pathname.startsWith(n.path));

          return (
            <>
              {/* More drawer */}
              {moreOpen && (
                <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <div
                    className="absolute bottom-[64px] left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-fade-in-up"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
                    <p className="px-5 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">More</p>
                    <div className="px-3 pb-4 space-y-1">
                      {moreNav.map(item => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              'w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors',
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            <span className={cn(isActive ? 'text-emerald-600' : 'text-gray-400')}>
                              <item.icon className="w-5 h-5" />
                            </span>
                            <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                          </Link>
                        );
                      })}
                      <button
                        onClick={() => { setMoreOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span className="text-red-400">
                          <LogOut className="w-5 h-5" />
                        </span>
                        <span className="font-semibold text-sm flex-1 text-left">Log Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Nav Bar */}
              <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex items-stretch h-16">
                  {mobileNav.map(item => {
                    const isActive = location.pathname === item.path || (item.path !== '/professional-dashboard' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
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
                        <span className="text-[10px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
                      </Link>
                    );
                  })}

                  {/* More button */}
                  <button
                    onClick={() => setMoreOpen(!moreOpen)}
                    className={cn(
                      'relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
                      moreActive || moreOpen ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-12 h-7 rounded-full transition-all',
                      (moreActive || moreOpen) ? 'bg-emerald-100 text-emerald-700' : ''
                    )}>
                      <Menu className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-semibold leading-none">More</span>
                  </button>
                </div>
              </nav>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── Dashboard Overview Component ─────────────────────────────
function Overview({ profile, summary, activeShift }: { profile: ProfessionalProfile | null, summary: any, activeShift: any }) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back</p>
        <h2 className="text-2xl font-bold mb-1">{profile?.name || 'Professional'}</h2>
        <p className="text-emerald-200 text-sm mb-5">
          Ready for your next shift?
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link 
            to="/professional-dashboard/browse"
            className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md active:scale-95"
          >
            <Search className="w-4 h-4" />
            Browse Available Shifts
          </Link>
        </div>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <CheckInTimer
          bookingId={activeShift.booking_id}
          status={activeShift.booking_status}
          startTime={activeShift.start_time}
          endTime={activeShift.end_time}
          role="professional"
          checkedInAt={activeShift.checked_in_at}
          checkedOutAt={activeShift.checked_out_at}
          clockedHours={activeShift.clocked_hours}
          checkInVerified={activeShift.check_in_verified}
          checkOutVerified={activeShift.check_out_verified}
          counterpartName={activeShift.facility_name}
          onUpdate={() => window.location.reload()}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Shifts', value: summary.stats.upcoming, icon: Clock, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Pending Apps', value: summary.stats.applications, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Wallet Balance', value: `$${summary.wallet.balance.toFixed(2)}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Earnings', value: `$${summary.wallet.totalEarned.toFixed(2)}`, icon: CheckCircle, color: 'text-brand-700', bg: 'bg-brand-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Updated just now</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
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
                "flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/50 border border-transparent transition-all duration-300 group/item",
                link.border
              )}
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-500", link.color)}>
                <link.icon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">{link.label}</span>
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400 group-hover/item:text-gray-900 group-hover/item:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

