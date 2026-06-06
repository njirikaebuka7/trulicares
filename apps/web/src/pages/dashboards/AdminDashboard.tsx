import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, LogOut, Users, Shield, AlertTriangle,
  CheckCircle, XCircle, Clock, X, Search,
  Activity, DollarSign, UserCheck, Flag, BarChart2, LayoutDashboard,
  ChevronLeft, ChevronRight as ChevronRightIcon, Pencil, Trash2,
  FileText, Eye, Ban, RotateCcw, Mail, Calendar, Briefcase, User, MapPin, Sparkles
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { get, put, post, del } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';
import AdminContent from '@/components/admin/AdminContent';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminSupport from '@/components/admin/AdminSupport';
import AdminNotes from '@/components/admin/AdminNotes';
import { toast } from '@/components/ui/Toaster';

type Tab = 'Overview' | 'Users' | 'Verification Queue' | 'Reports' | 'Staffing' | 'Analytics' | 'Pricing' | 'Finance' | 'Content' | 'Support' | 'Settings' | 'Audit Log';

type AdminUser = {
  id: string; name: string; email: string; role: string;
  status: string; photoUrl?: string; joined: string; matches: number;
  location?: string; specialties?: string[];
};
type AdminReport = {
  id: string; type: string; reportedUser: string; reportedBy: string;
  date: string; status: string; priority: string; description: string;
  evidence: string[]; refId?: string;
};
type AdminStats = {
  totalUsers: number; totalFamilies: number; totalCaregivers: number;
  activeMatches: number; monthlyRevenue: number; newSignupsThisMonth: number;
  pendingVerifications: number; openReports: number;
  totalProfessionals: number; totalFacilities: number; activeShifts: number; openDisputes: number;
  monthlyGrowth: Array<{ month: string; families: number; caregivers: number }>;
};

const defaultStats: AdminStats = {
  totalUsers: 0, totalFamilies: 0, totalCaregivers: 0,
  activeMatches: 0, monthlyRevenue: 0, newSignupsThisMonth: 0,
  pendingVerifications: 0, openReports: 0,
  totalProfessionals: 0, totalFacilities: 0, activeShifts: 0, openDisputes: 0,
  monthlyGrowth: [],
};

const navItems: { id: Tab; label: string; mobileLabel: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'Overview', label: 'Overview', mobileLabel: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'Users', label: 'Users', mobileLabel: 'Users', icon: <Users className="w-5 h-5" /> },
  { id: 'Verification Queue', label: 'Verifications', mobileLabel: 'Verify', icon: <UserCheck className="w-5 h-5" /> },
  { id: 'Staffing', label: 'Staffing', mobileLabel: 'Staff', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'Reports', label: 'Reports', mobileLabel: 'Reports', icon: <Flag className="w-5 h-5" /> },
  { id: 'Pricing', label: 'Pricing', mobileLabel: 'Pricing', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'Finance', label: 'Finance', mobileLabel: 'Finance', icon: <Activity className="w-5 h-5" /> },
  { id: 'Content', label: 'Content', mobileLabel: 'Content', icon: <FileText className="w-5 h-5" /> },
  { id: 'Support', label: 'Support', mobileLabel: 'Support', icon: <Mail className="w-5 h-5" /> },
  { id: 'Analytics', label: 'Analytics', mobileLabel: 'Analytics', icon: <BarChart2 className="w-5 h-5" /> },
  { id: 'Settings', label: 'Settings', mobileLabel: 'Settings', icon: <Shield className="w-5 h-5" /> },
  { id: 'Audit Log', label: 'Audit Log', mobileLabel: 'Audit', icon: <Eye className="w-5 h-5" /> },
];

const PAGE_SIZE = 8;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'family' | 'caregiver' | 'professional' | 'facility'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationActions, setVerificationActions] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [reportActions, setReportActions] = useState<Record<string, 'resolved' | 'dismissed' | null>>({});
  const [expandedVerificationId, setExpandedVerificationId] = useState<string | null>(null);

  // Live user state for CRUD
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<AdminUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  // Report detail modal
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const [adminStats, setAdminStats] = useState<AdminStats>(defaultStats);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [staffingDisputes, setStaffingDisputes] = useState<any[]>([]);
  const [professionalVerifications, setProfessionalVerifications] = useState<any[]>([]);
  const [pricing, setPricing] = useState<Record<string, { value: string; label: string; kind: string }>>({});
  const [pricingDraft, setPricingDraft] = useState<Record<string, string>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [resolvingDispute, setResolvingDispute] = useState<any | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [idDocs, setIdDocs] = useState<Record<string, { front: string | null; back: string | null; selfie: string | null } | 'loading'>>({});

  const refreshAllData = () => {
    Promise.all([
      get('/admin/stats').then((d: any) => setAdminStats(d.stats || defaultStats)).catch(() => {}),
      get('/admin/users').then((d: any) => setUsers(d.users || [])).catch(() => {}),
      get('/admin/verification-queue').then((d: any) => setVerificationQueue(d.queue || [])).catch(() => {}),
      get('/admin/reports').then((d: any) => setAdminReports(d.reports || [])).catch(() => {}),
      get('/admin/payments').then((d: any) => setAdminPayments(d.payments || [])).catch(() => {}),
      get('/notifications').then((d: any) => setDbNotifications(d.notifications || [])).catch(() => {}),
      get('/staffing/disputes').then((d: any) => setStaffingDisputes(d.disputes || [])).catch(() => {}),
      get('/admin/staffing-verification-queue').then((d: any) => setProfessionalVerifications(d.queue || [])).catch(() => {}),
      get('/admin/settings/pricing').then((d: any) => {
        setPricing(d.pricing || {});
        setPricingDraft(Object.fromEntries(Object.entries(d.pricing || {}).map(([k, v]: any) => [k, v.value])));
      }).catch(() => {}),
      get('/admin/audit-logs').then((d: any) => setAuditLogs(d.logs || [])).catch(() => {}),
      get('/admin/finance').then((d: any) => setFinance(d)).catch(() => {}),
      get('/admin/analytics').then((d: any) => setAnalytics(d.analytics || null)).catch(() => {}),
    ]).catch(console.error);
  };

  const handleResolveDispute = async (outcome: 'release' | 'refund' | 'none') => {
    if (!resolvingDispute) return;
    const id = resolvingDispute.id;
    const status = outcome === 'none' ? 'dismissed' : 'resolved';
    setStaffingDisputes((prev) => prev.filter((d: any) => d.id !== id));
    setResolvingDispute(null);
    setDisputeNotes('');
    try {
      await put(`/staffing/disputes/${id}`, { status, outcome, resolutionNotes: disputeNotes });
      toast('Dispute resolved successfully', 'success');
    } catch {
      toast('Failed to resolve dispute', 'error');
      refreshAllData();
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Refund this payment? This cannot be undone.')) return;
    try {
      await post(`/admin/payments/${paymentId}/refund`, {});
      toast('Payment refunded successfully', 'success');
    } catch {
      toast('Failed to refund payment', 'error');
    }
    refreshAllData();
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const d: any = await put('/admin/settings/pricing', { pricing: pricingDraft });
      setPricing(d.pricing || {});
      setPricingDraft(Object.fromEntries(Object.entries(d.pricing || {}).map(([k, v]: any) => [k, v.value])));
      toast('Pricing updated successfully', 'success');
    } catch (e) {
      console.error('Save pricing failed', e);
      toast('Failed to save pricing', 'error');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleStaffingVerify = async (id: string, status: 'approved' | 'rejected' | 'needs_review') => {
    // optimistic remove from the list
    setProfessionalVerifications((prev) => prev.filter((v: any) => v.id !== id));
    try {
      await put(`/admin/staffing-verification/${id}`, { status });
      toast('Verification updated successfully', 'success');
    } catch {
      toast('Failed to update verification', 'error');
      refreshAllData(); // restore on failure
    }
  };

  const viewIdDocuments = async (caregiverId: string) => {
    setIdDocs((p) => ({ ...p, [caregiverId]: 'loading' }));
    try {
      const r: any = await get(`/admin/users/${caregiverId}/id-documents`);
      setIdDocs((p) => ({ ...p, [caregiverId]: r.documents || { front: null, back: null, selfie: null } }));
    } catch {
      setIdDocs((p) => ({ ...p, [caregiverId]: { front: null, back: null, selfie: null } }));
    }
  };

  const handleResendBgLink = async (userId: string) => {
    try {
      const r: any = await post(`/admin/background-check/${userId}/resend`, {});
      if (r?.url) { window.open(r.url, '_blank'); }
    } catch (e) {
      console.error('Resend bg link failed', e);
    }
  };

  useEffect(() => {
    refreshAllData();

    // Subscribe to all relevant tables for real-time updates
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        console.log('Realtime change in users:', payload);
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caregiver_profiles' }, () => {
        console.log('Realtime change in caregiver_profiles');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_queue' }, () => {
        console.log('Realtime change in verification_queue');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        console.log('Realtime change in reports');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        console.log('Realtime change in notifications');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_requests' }, () => {
        console.log('Realtime change in care_requests');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        console.log('Realtime change in matches');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        console.log('Realtime change in payments');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        console.log('Realtime change in schedules');
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        console.log('Realtime change in reviews');
        refreshAllData();
      })
      .subscribe((status) => {
        console.log('Admin Dashboard Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = userFilter === 'all' || u.role === userFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (f: typeof userFilter) => { setUserFilter(f); setCurrentPage(1); };
  const handleSearchChange = (q: string) => { setSearchQuery(q); setCurrentPage(1); };

  const handleSuspend = (u: AdminUser) => {
    setSuspendingUser(u);
    setSuspensionReason('');
    setSelectedUser(null);
  };
  const confirmSuspend = async () => {
    if (!suspendingUser) return;
    const id = suspendingUser.id;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'suspended' } : u));
    setSuspendingUser(null);
    try { 
      await put(`/admin/users/${id}/suspend`, { reason: suspensionReason });
      toast('User suspended successfully', 'success');
    } catch {
      toast('Failed to suspend user', 'error');
    }
  };
  const handleRestore = async (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u));
    if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, status: 'active' } : prev);
    try { 
      await put(`/admin/users/${id}/restore`, {});
      toast('User restored successfully', 'success');
    } catch {
      toast('Failed to restore user', 'error');
    }
  };
  const handleDelete = (u: AdminUser) => { setDeletingUser(u); setSelectedUser(null); };
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
    setDeletingUser(null);
    try { 
      await del(`/admin/users/${deletingUser.id}`);
      toast('User deleted successfully', 'success');
    } catch {
      toast('Failed to delete user', 'error');
    }
  };
  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role });
    setSelectedUser(null);
  };
  const saveEdit = async () => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
    setEditingUser(null);
    try { 
      await put(`/admin/users/${editingUser.id}`, editForm);
      toast('User updated successfully', 'success');
    } catch {
      toast('Failed to update user', 'error');
    }
  };

  const unread = dbNotifications.filter(n => !n.is_read).length;
  const openNotifications = () => {
    setNotifOpen(true);
    put('/notifications/read-all', {}).then(() => {
      setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }).catch(() => {});
  };

  const maxBarValue = adminStats.monthlyGrowth.length > 0
    ? Math.max(...adminStats.monthlyGrowth.map(m => m.families + m.caregivers), 1)
    : 1;
  const initials = 'AD';

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-20 transition-all duration-300 bg-slate-900',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center border-b border-slate-700/60 shrink-0 h-14',
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        )}>
          {!collapsed && (
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80 hover:opacity-100 transition-opacity" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User profile */}
        {!collapsed ? (
          <div className="px-4 py-4 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">
              <Shield className="w-3 h-3" /> Admin Console
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-3 border-b border-slate-700/60">
            <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        )}

        {/* Alerts summary */}
        {!collapsed && (verificationQueue.length + professionalVerifications.length > 0 || adminReports.filter((r: any) => r.status !== 'resolved').length > 0) && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-semibold text-red-400 mb-1.5">Action Required</p>
            {verificationQueue.length + professionalVerifications.length > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {verificationQueue.length + professionalVerifications.length} pending verifications
              </p>
            )}
            {adminReports.filter((r: any) => r.status !== 'resolved').length > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {adminReports.filter((r: any) => r.status !== 'resolved').length} open reports
              </p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center rounded-xl text-sm font-medium transition-all',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                activeTab === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="shrink-0 relative">
                {item.icon}
                {item.badge && collapsed && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activeTab === item.id ? 'bg-red-100 text-red-600' : 'bg-red-500 text-white')}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log Out' : undefined}
            className={cn(
              'w-full flex items-center rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && 'Log Out'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={cn('flex-1 flex flex-col h-full overflow-hidden transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>

        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-6 w-auto lg:hidden" />
            </Link>
            <h1 className="text-base font-bold text-gray-900 hidden lg:block">{navItems.find(n => n.id === activeTab)?.label}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold hidden sm:inline">Internal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button onClick={openNotifications}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Admin Alerts</span>
                    <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  {dbNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No new alerts</div>
                  ) : (
                    dbNotifications.slice(0, 5).map((n, i) => (
                      <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", n.is_read ? "text-gray-300" : "text-amber-500")} />
                          <p className={cn("text-sm", n.is_read ? "text-gray-500" : "text-gray-800 font-medium")}>{n.title}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-5">{n.content}</p>
                      </div>
                    ))
                  )}
                  {dbNotifications.length > 5 && (
                    <div className="px-4 py-2 bg-gray-50 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Showing 5 of {dbNotifications.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative lg:hidden">
              <div 
                onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold cursor-pointer overflow-hidden"
              >
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : initials}
              </div>
              {mobileUserMenuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setMobileUserMenuOpen(false); /* Add profile nav if needed */ }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" /> Profile
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-red-500" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">

          {/* ── OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
                <p className="text-slate-400 text-sm font-medium mb-1">Admin Console</p>
                <h2 className="text-2xl font-bold mb-1">Platform Overview</h2>
                <p className="text-slate-400 text-sm mb-5">
                  <span className="text-white font-semibold">{adminStats.newSignupsThisMonth} new signups</span> this month ·
                  <span className="text-amber-400 font-semibold"> {verificationQueue.length + professionalVerifications.length} pending</span> ·
                  <span className="text-red-400 font-semibold"> {adminReports.filter((r: any) => r.status !== 'resolved').length} reports</span>
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button size="sm" onClick={() => setActiveTab('Verification Queue')}
                    className="bg-white text-slate-700 border-white hover:bg-slate-50 rounded-full">
                    Review Verifications
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('Reports')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full border">
                    View Reports
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: adminStats.totalUsers.toLocaleString(), icon: <Users className="w-4 h-4" />, sub: `+${adminStats.newSignupsThisMonth} this month`, bg: 'bg-blue-50', txt: 'text-blue-600' },
                  { label: 'Families', value: adminStats.totalFamilies.toLocaleString(), icon: <UserCheck className="w-4 h-4" />, sub: 'Seeking care', bg: 'bg-brand-50', txt: 'text-brand-600' },
                  { label: 'Caregivers', value: adminStats.totalCaregivers.toLocaleString(), icon: <Shield className="w-4 h-4" />, sub: 'Providing care', bg: 'bg-emerald-50', txt: 'text-emerald-600' },
                  { label: 'Monthly Revenue', value: `$${adminStats.monthlyRevenue.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, sub: `${adminStats.activeMatches} active matches`, bg: 'bg-violet-50', txt: 'text-violet-600' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.bg, stat.txt)}>{stat.icon}</div>
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                    <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Pending Verifications</h3>
                    <button onClick={() => setActiveTab('Verification Queue')} className="text-sm text-slate-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {verificationQueue.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500 truncate">{item.specialty}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{item.submittedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Open Reports</h3>
                    <button onClick={() => setActiveTab('Reports')} className="text-sm text-slate-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {adminReports.filter((r: any) => r.status !== 'resolved').slice(0, 3).map((report: any) => (
                      <div key={report.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          report.priority === 'high' ? 'bg-red-50' : report.priority === 'medium' ? 'bg-amber-50' : 'bg-gray-50')}>
                          <Flag className={cn('w-4 h-4',
                            report.priority === 'high' ? 'text-red-500' : report.priority === 'medium' ? 'text-amber-500' : 'text-gray-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{report.type}</p>
                          <p className="text-xs text-gray-500">Reported: {report.reportedUser}</p>
                        </div>
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap',
                          report.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Recent Transactions</h3>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <DollarSign className="w-3 h-3" /> Revenue
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 pr-4">User / Ref</th>
                          <th className="pb-3 pr-4">Description</th>
                          <th className="pb-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {adminPayments.slice(0, 5).map((pay: any) => (
                          <tr key={pay.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 pr-4">
                              <p className="font-semibold text-gray-900 truncate max-w-[120px]">{pay.userName}</p>
                              {pay.refId && <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">#{pay.refId}</p>}
                            </td>
                            <td className="py-3 pr-4">
                              <p className="text-gray-500 text-xs line-clamp-1">{pay.description}</p>
                              <p className="text-[10px] text-gray-400">{pay.date}</p>
                            </td>
                            <td className="py-3 text-right">
                              <p className="font-bold text-gray-900">{pay.amount}</p>
                              <span className={cn('text-[10px] font-bold uppercase tracking-widest',
                                pay.status === 'succeeded' ? 'text-emerald-500' : 'text-amber-500')}>
                                {pay.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {adminPayments.length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-xs italic border-t border-dashed border-gray-100 mt-2">
                      No recent transactions found.
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* ── USERS ── */}
          {activeTab === 'Users' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search users…" value={searchQuery}
                      onChange={e => handleSearchChange(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-slate-400 w-48" />
                  </div>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
                    {(['all', 'family', 'caregiver', 'professional', 'facility'] as const).map(f => (
                      <button key={f} onClick={() => handleFilterChange(f)}
                        className={cn('px-3 py-2 capitalize transition-colors',
                          userFilter === f ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Name', 'Role', 'Joined', 'Status', 'Matches', 'Actions'].map((h, i) => (
                          <th key={h} className={cn('text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide',
                            i === 2 ? 'hidden lg:table-cell' : i === 1 || i === 4 ? 'hidden md:table-cell' : '')}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedUsers.map((u, i) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                                ['bg-coral-400','bg-brand-400','bg-sky-400','bg-emerald-400','bg-violet-400'][i%5])}>
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                              u.role === 'family' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700')}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-500 hidden lg:table-cell">{u.joined}</td>
                          <td className="px-5 py-4">
                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold',
                              u.status === 'active' ? 'bg-green-100 text-green-700' :
                              u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{u.matches}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              <button
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                                {u.status === 'suspended'
                                  ? <button onClick={() => handleRestore(u.id)} className="inline-flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">
                                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                                    </button>
                                  : <button onClick={() => handleSuspend(u)} className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors">
                                      <Ban className="w-3.5 h-3.5" /> Suspend
                                    </button>
                                }
                              <button
                                onClick={() => handleDelete(u)}
                                className="inline-flex items-center gap-1 text-xs text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-gray-400">No users found.</div>
                )}
                {/* Pagination */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-xs text-gray-400">
                    Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredUsers.length)}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setCurrentPage(p)}
                          className={cn('w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                            p === currentPage ? 'bg-slate-800 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFICATION QUEUE ── */}
          {activeTab === 'Verification Queue' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Verification Queue</h2>
                <span className="text-sm text-gray-500">{verificationQueue.length + professionalVerifications.length} pending</span>
              </div>

              {/* Professionals & Facilities (staffing verifications) */}
              {professionalVerifications.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" /> Professionals &amp; Facilities
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{professionalVerifications.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {professionalVerifications.map((v: any) => {
                      const isFacility = v.entity_type === 'facility';
                      const title = isFacility ? v.facility_name : v.name;
                      const subtitle = isFacility
                        ? `${v.facility_type || 'Facility'} · ${[v.fac_city, v.fac_state].filter(Boolean).join(', ')}`
                        : `${v.license_type || 'Professional'} · ${v.pro_location || v.location || '—'}`;
                      return (
                        <div key={v.id} className="p-4 flex items-center gap-4 flex-wrap">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0',
                            isFacility ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}>
                            {(title || '?').charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-gray-900 truncate">{title}</p>
                              <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                                isFacility ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                                {isFacility ? 'Facility' : 'Pro'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleStaffingVerify(v.id, 'approved')}
                              className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all active:scale-95">Approve</button>
                            <button onClick={() => handleStaffingVerify(v.id, 'needs_review')}
                              className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg hover:bg-amber-200 transition-all active:scale-95">Needs Review</button>
                            <button onClick={() => handleStaffingVerify(v.id, 'rejected')}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 transition-all active:scale-95">Reject</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setActiveTab('Staffing')} className="w-full px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-gray-50 border-t border-gray-50">
                    Open full Staffing review →
                  </button>
                </div>
              )}

              {/* Caregivers */}
              {verificationQueue.length === 0 && professionalVerifications.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
                  No pending verifications.
                </div>
              )}
              {verificationQueue.map((item: any) => {
                const action = verificationActions[item.id];
                const isExpanded = expandedVerificationId === item.id;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                        <UserCheck className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900">{item.name}</h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Awaiting Review</span>
                        </div>
                        <p className="text-sm text-gray-500">{item.email} · {item.specialty}</p>
                        <p className="text-sm text-gray-500">{item.experience} experience · Submitted {item.submittedAt}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.documents.map((doc: any, idx: number) => {
                            // Documents are stored as "Label: URL" strings (text[] in DB)
                            const isObj = doc && typeof doc === 'object';
                            let docLabel: string;
                            let docUrl: string | null;
                            if (isObj) {
                              docLabel = doc.name || String(doc);
                              docUrl = doc.url && doc.url !== '#' ? doc.url : null;
                            } else {
                              const str = String(doc);
                              const colonIdx = str.indexOf(': ');
                              docLabel = colonIdx !== -1 ? str.slice(0, colonIdx) : str;
                              const possibleUrl = colonIdx !== -1 ? str.slice(colonIdx + 2) : '';
                              docUrl = possibleUrl.startsWith('http') ? possibleUrl : null;
                            }
                            if (docUrl) {
                              return (
                                <a
                                  key={idx}
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors cursor-pointer border border-emerald-150"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-600" /> View: {docLabel}
                                </a>
                              );
                            }
                            return (
                              <span key={idx} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-150">
                                <CheckCircle className="w-3 h-3 text-green-600" /> {docLabel}
                              </span>
                            );
                          })}
                          <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold border',
                            (item.backgroundCheck === true || item.backgroundCheck === 'true') ? 'bg-violet-50 text-violet-700 border-violet-150' : 'bg-blue-50 text-blue-700 border-blue-150')}>
                            <Activity className="w-3 h-3" /> Type: {(item.backgroundCheck === true || item.backgroundCheck === 'true') ? 'Background Check' : 'Government ID'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Auditing / Detail Panel */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-150 space-y-4 bg-slate-50 p-4 rounded-xl">
                        {/* ID Verification Details */}
                        {!(item.backgroundCheck === true || item.backgroundCheck === 'true') ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-emerald-600" /> Government ID Documents
                              </h4>
                              {idDocs[item.caregiverId] !== 'loading' && !idDocs[item.caregiverId] && (
                                <button onClick={() => viewIdDocuments(item.caregiverId)}
                                  className="text-2xs font-bold bg-emerald-600 text-white rounded-lg px-3 py-1 hover:bg-emerald-700 transition-colors uppercase tracking-wider">
                                  View ID Documents
                                </button>
                              )}
                            </div>

                            {/* Signed ID document images (fetched on demand, expire ~1h) */}
                            {idDocs[item.caregiverId] === 'loading' && (
                              <p className="text-xs text-gray-400">Loading secure documents…</p>
                            )}
                            {idDocs[item.caregiverId] && idDocs[item.caregiverId] !== 'loading' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                {([
                                  ['ID Front', (idDocs[item.caregiverId] as any).front],
                                  ['ID Back', (idDocs[item.caregiverId] as any).back],
                                  ['Selfie', (idDocs[item.caregiverId] as any).selfie],
                                ] as [string, string | null][]).map(([label, url]) => (
                                  <div key={label} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                                    <span className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider block">{label}</span>
                                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border">
                                      {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                          <img src={url} alt={label} className="w-full h-full object-contain hover:scale-105 transition-transform" />
                                        </a>
                                      ) : (
                                        <span className="text-2xs text-gray-400">Not available</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Images Render grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                              {item.documents.map((doc: any, docIdx: number) => {
                                // Parse "Label: URL" strings from text[] column
                                const isObj = doc && typeof doc === 'object';
                                let docLabel: string;
                                let docUrl: string | null;
                                if (isObj) {
                                  docLabel = doc.name || String(doc);
                                  docUrl = doc.url && doc.url !== '#' ? doc.url : null;
                                } else {
                                  const str = String(doc);
                                  const colonIdx = str.indexOf(': ');
                                  docLabel = colonIdx !== -1 ? str.slice(0, colonIdx) : str;
                                  const possibleUrl = colonIdx !== -1 ? str.slice(colonIdx + 2) : '';
                                  docUrl = possibleUrl.startsWith('http') ? possibleUrl : null;
                                }
                                if (!docUrl) return null;
                                return (
                                  <div key={docIdx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                    <span className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider block">{docLabel}</span>
                                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border">
                                      <img 
                                        src={docUrl} 
                                        alt={docLabel} 
                                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-200" 
                                      />
                                    </div>
                                    <a 
                                      href={docUrl} 
                                      download={`Document_${docLabel.replace(' ', '_')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-3xs text-emerald-600 hover:text-emerald-700 hover:underline font-extrabold block text-center mt-1"
                                    >
                                      Open in New Tab
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Background Check details */
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-violet-600" /> Background Screening Application
                            </h4>
                            
                            {(() => {
                              // Background check details come from caregiver_profiles.background_check_details (JSON)
                              let details = item.backgroundCheckDetails;
                              if (typeof details === 'string') {
                                try { details = JSON.parse(details); } catch { details = null; }
                              }
                              // Also check documents array for any legacy object format
                              if (!details) {
                                const detailsDoc = item.documents.find((d: any) => d && typeof d === 'object' && d.details);
                                details = detailsDoc?.details;
                              }
                              if (!details) {
                                // Parse human-readable strings from text[] documents column
                                const parsed: Record<string, string> = {};
                                item.documents.forEach((d: any) => {
                                  if (typeof d === 'string') {
                                    const colonIdx = d.indexOf(': ');
                                    if (colonIdx !== -1) {
                                      parsed[d.slice(0, colonIdx).trim()] = d.slice(colonIdx + 2).trim();
                                    }
                                  }
                                });
                                if (Object.keys(parsed).length > 0) {
                                  return (
                                    <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-150">
                                      {Object.entries(parsed).map(([key, val]) => (
                                        <div key={key} className="text-2xs space-y-0.5">
                                          <span className="font-bold text-gray-400">{key}</span>
                                          <p className="font-bold text-gray-800 text-xs">{val}</p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return <p className="text-xs text-gray-500 italic">No legal information submitted. Review required.</p>;
                              }
                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-150">
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">Legal Name</span>
                                      <p className="font-bold text-gray-800 text-xs">{details.legalName || 'N/A'}</p>
                                    </div>
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">Date of Birth</span>
                                      <p className="font-bold text-gray-800 text-xs">{details.dob || 'N/A'}</p>
                                    </div>
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">SSN</span>
                                      <p className="font-bold text-gray-500 text-xs italic">Handled securely by screening partner — not stored</p>
                                    </div>
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">Current Address</span>
                                      <p className="font-bold text-gray-800 text-xs">{details.currentAddress || 'N/A'}</p>
                                    </div>
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">Previous Address</span>
                                      <p className="font-bold text-gray-800 text-xs">{details.previousAddress || 'None Provided'}</p>
                                    </div>
                                    <div className="text-2xs space-y-0.5">
                                      <span className="font-bold text-gray-400">Driver's License (Transportation Care)</span>
                                      <p className="font-bold text-gray-800 text-xs">
                                        {details.offersTransport && details.driversLicense 
                                          ? `Yes (DL: ${details.driversLicense})` 
                                          : 'No (Not providing driving service)'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-2xs font-extrabold text-slate-500 bg-white px-3 py-1.5 rounded-lg border w-fit">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Consent & Disclosure Notice Acknowledged</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {action ? (
                        <div className={cn('flex items-center gap-2 text-sm font-semibold',
                          action === 'approved' ? 'text-green-600' : 'text-red-500')}>
                          {action === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {action === 'approved' ? 'Caregiver Approved' : 'Verification Rejected'}
                          <button onClick={() => setVerificationActions(prev => ({...prev, [item.id]: null}))}
                            className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline font-normal">Undo</button>
                        </div>
                      ) : (
                        <div className="flex gap-3 flex-wrap items-center">
                          <Button size="sm" onClick={async () => {
                            setVerificationActions(prev => ({...prev, [item.id]: 'approved'}));
                            try { 
                              await put(`/admin/verification/${item.id}`, { status: 'approved' });
                              toast('Caregiver approved successfully', 'success');
                            } catch { 
                              toast('Failed to approve caregiver', 'error');
                            }
                          }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm text-xs">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            setVerificationActions(prev => ({...prev, [item.id]: 'rejected'}));
                            try { 
                              await put(`/admin/verification/${item.id}`, { status: 'rejected' });
                              toast('Caregiver rejected', 'info');
                            } catch {
                              toast('Failed to reject caregiver', 'error');
                            }
                          }}
                            className="text-red-500 hover:bg-red-50 text-xs">
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setExpandedVerificationId(isExpanded ? null : item.id)}
                            className="text-xs"
                          >
                            <Eye className="w-4 h-4" /> {isExpanded ? 'Hide Details' : 'Audit Details'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'Reports' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Platform Reports</h2>
                <span className="text-sm text-gray-500">{adminReports.length} total</span>
              </div>
              {adminReports.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
                  No reports to display.
                </div>
              )}
              {adminReports.map((report: any) => {
                const action = reportActions[report.id];
                return (
                  <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                        report.priority === 'high' ? 'bg-red-50' : report.priority === 'medium' ? 'bg-amber-50' : 'bg-gray-50')}>
                        <Flag className={cn('w-6 h-6',
                          report.priority === 'high' ? 'text-red-500' : report.priority === 'medium' ? 'text-amber-500' : 'text-gray-400')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900">{report.type}</h3>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                            report.priority === 'high' ? 'bg-red-100 text-red-700' :
                            report.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                            {report.priority} priority
                          </span>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                            report.status === 'open' ? 'bg-red-100 text-red-700' :
                            report.status === 'under_review' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600"><span className="font-medium">Reported:</span> {report.reportedUser}</p>
                        <p className="text-sm text-gray-500"><span className="font-medium">By:</span> {report.reportedBy} · {report.date}</p>
                        {report.refId && (
                          <p className="text-xs font-bold text-slate-500 mt-1.5 flex items-center gap-1.5 bg-slate-100 w-fit px-2 py-0.5 rounded-lg">
                            <FileText className="w-3 h-3" /> Ref: {report.refId}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{report.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {action ? (
                        <div className={cn('flex items-center gap-2 text-sm font-semibold',
                          action === 'resolved' ? 'text-green-600' : 'text-gray-500')}>
                          <CheckCircle className="w-4 h-4" />
                          {action === 'resolved' ? 'Report Resolved' : 'Report Dismissed'}
                          <button onClick={() => setReportActions(prev => ({...prev, [report.id]: null}))}
                            className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline font-normal">Undo</button>
                        </div>
                      ) : (
                        <div className="flex gap-3 flex-wrap">
                          <Button size="sm" onClick={async () => {
                            setReportActions(prev => ({...prev, [report.id]: 'resolved'}));
                            try { 
                              await put(`/admin/reports/${report.id}`, { status: 'resolved' });
                              toast('Report resolved successfully', 'success');
                            } catch {
                              toast('Failed to resolve report', 'error');
                            }
                          }}
                            className="bg-slate-700 hover:bg-slate-800 text-white rounded-full shadow-sm">
                            <CheckCircle className="w-4 h-4" /> Mark Resolved
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setSelectedReport(report)}>
                            <FileText className="w-4 h-4" /> View Details
                          </Button>
                          {report.status !== 'resolved' && (
                            <Button variant="ghost" size="sm" onClick={async () => {
                              setReportActions(prev => ({...prev, [report.id]: 'dismissed'}));
                              try { 
                                await put(`/admin/reports/${report.id}`, { status: 'dismissed' });
                                toast('Report dismissed', 'info');
                              } catch {
                                toast('Failed to dismiss report', 'error');
                              }
                            }}
                              className="text-gray-400 hover:bg-gray-100">Dismiss</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── STAFFING ── */}
          {activeTab === 'Staffing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Staffing Module Management</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-bold">
                    {staffingDisputes.length} Disputes
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                    {professionalVerifications.length} Pending Verifications
                  </span>
                </div>
              </div>

              {/* Staffing Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Active Shifts', value: adminStats.activeShifts, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Total Professionals', value: adminStats.totalProfessionals, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Open Disputes', value: adminStats.openDisputes, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Professional Verification Queue */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Pending Verifications</h3>
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                      {professionalVerifications.length}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {professionalVerifications.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 text-sm">No pending professional verifications.</div>
                    ) : (
                      professionalVerifications.map((v) => {
                        const isFacility = v.entity_type === 'facility';
                        const title = isFacility ? v.facility_name : v.name;
                        const subtitle = isFacility
                          ? `${v.facility_type || 'Facility'} · ${[v.fac_city, v.fac_state].filter(Boolean).join(', ')}`
                          : `${v.license_type || 'Professional'} · ${v.pro_location || v.location || '—'}`;
                        return (
                          <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 mb-3">
                              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold',
                                isFacility ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}>
                                {(title || '?').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-gray-900 truncate">{title}</p>
                                  <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                                    isFacility ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                                    {isFacility ? 'Facility' : 'Pro'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                              </div>
                            </div>
                            {/* Background-check status (professionals) */}
                            {!isFacility && (
                              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-bold">
                                <span className={cn('px-1.5 py-0.5 rounded uppercase',
                                  v.background_check_status === 'passed' ? 'bg-emerald-50 text-emerald-700' :
                                  v.background_check_status === 'failed' || v.background_check_status === 'needs_review' ? 'bg-red-50 text-red-700' :
                                  'bg-amber-50 text-amber-700')}>
                                  BG: {(v.background_check_status || 'not started').replace('_', ' ')}
                                </span>
                                <span className={cn('px-1.5 py-0.5 rounded uppercase',
                                  v.background_check_payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                                  Pay: {v.background_check_payment_status || 'unpaid'}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => handleStaffingVerify(v.id, 'approved')}
                                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all active:scale-95">
                                Approve
                              </button>
                              <button onClick={() => handleStaffingVerify(v.id, 'needs_review')}
                                className="flex-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg hover:bg-amber-200 transition-all active:scale-95">
                                Needs Review
                              </button>
                              <button onClick={() => handleStaffingVerify(v.id, 'rejected')}
                                className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 transition-all active:scale-95">
                                Reject
                              </button>
                              {!isFacility && v.user_id && (
                                <button onClick={() => handleResendBgLink(v.user_id)}
                                  className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-50 transition-all active:scale-95">
                                  Resend BG Link
                                </button>
                              )}
                              {!isFacility && v.user_id && !idDocs[v.user_id] && (
                                <button onClick={() => viewIdDocuments(v.user_id)}
                                  className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-50 transition-all active:scale-95">
                                  View ID Docs
                                </button>
                              )}
                            </div>
                            {/* Signed ID documents (on demand) */}
                            {!isFacility && idDocs[v.user_id] === 'loading' && (
                              <p className="text-[11px] text-gray-400 mt-2">Loading secure documents…</p>
                            )}
                            {!isFacility && idDocs[v.user_id] && idDocs[v.user_id] !== 'loading' && (
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                {([
                                  ['Front', (idDocs[v.user_id] as any).front],
                                  ['Back', (idDocs[v.user_id] as any).back],
                                  ['Selfie', (idDocs[v.user_id] as any).selfie],
                                ] as [string, string | null][]).map(([label, url]) => (
                                  <div key={label} className="bg-gray-50 rounded-lg border border-gray-100 p-1.5">
                                    <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">{label}</span>
                                    <div className="aspect-video rounded bg-white overflow-hidden flex items-center justify-center border">
                                      {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={label} className="w-full h-full object-contain" /></a>
                                      ) : <span className="text-[9px] text-gray-400">N/A</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Staffing Disputes */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Staffing Disputes</h3>
                    <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs">
                      {staffingDisputes.length}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {staffingDisputes.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 text-sm">No active staffing disputes.</div>
                    ) : (
                      staffingDisputes.map((dispute) => (
                        <div key={dispute.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase">
                              {dispute.status}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">Ref: {dispute.booking_id.split('-')[0]}</span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium mb-3 line-clamp-2">"{dispute.reason}"</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setResolvingDispute(dispute); setDisputeNotes(''); }}
                              className="flex-1 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-900 transition-all">
                              Resolve
                            </button>
                            <button onClick={() => { setResolvingDispute(dispute); setDisputeNotes(''); }}
                              className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-[10px] font-black uppercase rounded-lg hover:bg-gray-50 transition-all">
                              Details
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'Analytics' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
              {(() => {
                const m = analytics?.metrics || {};
                const cats = analytics?.categoryDistribution || [];
                const rev = analytics?.revenueByMonth || [];
                const maxRev = Math.max(1, ...rev.map((r: any) => r.revenue));
                const catColors = ['bg-brand-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-400', 'bg-amber-400'];
                const cards = [
                  { label: 'Match Rate', value: `${m.matchRate ?? 0}%`, sub: 'Matches that were accepted' },
                  { label: 'Acceptance Rate', value: `${m.acceptanceRate ?? 0}%`, sub: 'Of accepted + declined' },
                  { label: 'Messaging Conv.', value: `${m.messagingConversion ?? 0}%`, sub: 'Accepted matches that unlock messaging' },
                  { label: 'Repeat Families', value: `${m.repeatFamilies ?? 0}%`, sub: 'Families with 2+ requests' },
                  { label: 'Total Matches', value: (m.totalMatches ?? 0).toLocaleString(), sub: 'All-time matches created' },
                  { label: 'Accepted Matches', value: (m.acceptedMatches ?? 0).toLocaleString(), sub: 'Currently accepted' },
                ];
                return (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cards.map((metric, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-500 font-medium mb-2">{metric.label}</p>
                          <p className="text-4xl font-bold text-gray-900 mb-1">{metric.value}</p>
                          <p className="text-xs text-gray-400">{metric.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-bold text-gray-900 mb-4">Care Category Distribution</h3>
                      {cats.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No care requests yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {cats.map((cat: any, i: number) => (
                            <div key={cat.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                                <span className="text-sm font-bold text-gray-900">{cat.pct}% <span className="text-gray-400 font-normal">({cat.count})</span></span>
                              </div>
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', catColors[i % catColors.length])} style={{ width: `${cat.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-bold text-gray-900 mb-4">Revenue by Month</h3>
                      {rev.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No revenue data yet.</p>
                      ) : (
                        <div className="flex items-end gap-4" style={{ height: '120px' }}>
                          {rev.map((r: any) => (
                            <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs text-slate-600 font-semibold">${(r.revenue / 1000).toFixed(1)}k</span>
                              <div className="w-full flex items-end" style={{ height: '80px' }}>
                                <div className="w-full rounded-t-lg bg-slate-700" style={{ height: `${Math.max(4, (r.revenue / maxRev) * 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{r.month}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ── PRICING ── */}
          {activeTab === 'Pricing' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pricing Configuration</h2>
                <p className="text-sm text-gray-500">Set platform fees. Changes apply immediately (cached for 5 min).</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {Object.entries(pricing).map(([key, cfg]) => (
                  <div key={key} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{cfg.label}</p>
                      <p className="text-xs text-gray-400">
                        {cfg.kind === 'usd' ? 'US Dollars ($)' : cfg.kind === 'percent' ? 'Percent (%)' : 'Rate (0–1, e.g. 0.20 = 20%)'}
                      </p>
                    </div>
                    <div className="relative shrink-0 w-36">
                      {cfg.kind === 'usd' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>}
                      <input
                        type="number" step="0.01" min="0"
                        value={pricingDraft[key] ?? cfg.value}
                        onChange={(e) => setPricingDraft((p) => ({ ...p, [key]: e.target.value }))}
                        className={cn('w-full py-2 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-400', cfg.kind === 'usd' ? 'pl-7' : 'pl-3')}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSavePricing} disabled={savingPricing}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-6">
                {savingPricing ? 'Saving…' : 'Save Pricing'}
              </Button>
            </div>
          )}

          {/* ── CONTENT / CMS ── */}
          {activeTab === 'Content' && <AdminContent />}

          {/* ── SUPPORT ── */}
          {activeTab === 'Support' && <AdminSupport />}

          {/* ── SETTINGS ── */}
          {activeTab === 'Settings' && <AdminSettings />}

          {/* ── FINANCE ── */}
          {activeTab === 'Finance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Finance</h2>
                  <p className="text-sm text-gray-500">Escrow, platform fees, payouts and refunds.</p>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold',
                  finance?.connectEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {finance?.connectEnabled ? 'Stripe Connect: Live' : 'Stripe Connect: Not enabled'}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Escrow Held', value: `$${(finance?.summary?.escrowHeld ?? 0).toFixed(2)}` },
                  { label: 'Platform Fees', value: `$${(finance?.summary?.platformFees ?? 0).toFixed(2)}` },
                  { label: 'Payouts Paid', value: `$${(finance?.summary?.payoutsPaidTotal ?? 0).toFixed(2)}` },
                  { label: 'Refunded', value: `$${(finance?.summary?.refundedTotal ?? 0).toFixed(2)}` },
                  { label: 'Payouts Pending', value: finance?.summary?.payoutsPending ?? 0 },
                  { label: 'Payouts Failed', value: finance?.summary?.payoutsFailed ?? 0 },
                  { label: 'Payout-Ready Pros', value: `${finance?.summary?.connectReady ?? 0}/${finance?.summary?.totalPros ?? 0}` },
                  { label: 'Escrow Released', value: `$${(finance?.summary?.escrowReleased ?? 0).toFixed(2)}` },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Failed payments + refund */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50"><h3 className="font-bold text-gray-900 text-sm">Failed Payments</h3></div>
                {(!finance?.failedPayments || finance.failedPayments.length === 0) ? (
                  <div className="p-8 text-center text-sm text-gray-400">No failed payments.</div>
                ) : finance.failedPayments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 p-4 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.description}</p>
                      <p className="text-xs text-gray-400">{p.refId} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{p.amount}</span>
                  </div>
                ))}
              </div>

              {/* Recent payouts */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50"><h3 className="font-bold text-gray-900 text-sm">Recent Payouts</h3></div>
                {(!finance?.payouts || finance.payouts.length === 0) ? (
                  <div className="p-8 text-center text-sm text-gray-400">No payouts yet.</div>
                ) : finance.payouts.map((po: any) => (
                  <div key={po.id} className="flex items-center justify-between gap-4 p-4 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{po.name}</p>
                      <p className="text-xs text-gray-400">{po.type} · {new Date(po.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-gray-900">${Number(po.amount).toFixed(2)}</span>
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                        po.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        po.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                        {po.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payments — refundable */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50"><h3 className="font-bold text-gray-900 text-sm">Recent Payments</h3></div>
                {adminPayments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No payments yet.</div>
                ) : adminPayments.slice(0, 15).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 p-4 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.description}</p>
                      <p className="text-xs text-gray-400">{p.userName} · {p.date}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-gray-900">{p.amount}</span>
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                        p.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'refunded' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700')}>
                        {p.status}
                      </span>
                      {p.status === 'succeeded' && (
                        <button onClick={() => handleRefund(p.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline">
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {activeTab === 'Audit Log' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Admin Audit Log</h2>
                <p className="text-sm text-gray-500">Every consequential admin action, most recent first.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">No admin actions recorded yet.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 mr-2">{log.action}</span>
                            {log.entity_type}{log.entity_id ? ` · ${String(log.entity_id).slice(0, 8)}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{log.admin_email || 'admin'}</p>
                          {log.metadata && (
                            <p className="text-[11px] text-gray-400 mt-1 font-mono break-all">{JSON.stringify(log.metadata)}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center px-1 overflow-x-auto scrollbar-hide">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={cn('relative flex flex-col items-center gap-0.5 px-3 py-2.5 shrink-0 transition-colors',
                activeTab === item.id ? 'text-slate-900' : 'text-gray-400 hover:text-gray-600')}>
              {item.badge && (
                <span className="absolute top-1.5 right-1/2 translate-x-3.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold z-10">
                  {item.badge}
                </span>
              )}
              <span className={cn('transition-transform shrink-0', activeTab === item.id && 'scale-110')}>{item.icon}</span>
              <span className={cn('text-[10px] font-semibold leading-none truncate w-full text-center',
                activeTab === item.id ? 'text-slate-900' : 'text-gray-400')}>
                {item.mobileLabel}
              </span>
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-slate-800 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── USER DETAIL MODAL ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                  <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize mt-1 inline-block',
                    selectedUser.role === 'family' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700')}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              {/* Info rows */}
              <div className="space-y-3 bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700 break-all">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700">Joined {selectedUser.joined}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700">{selectedUser.matches} matches</span>
                </div>
                {/* Location row */}
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700">{selectedUser.location || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={cn('w-2 h-2 rounded-full shrink-0',
                    selectedUser.status === 'active' ? 'bg-green-500' : selectedUser.status === 'pending' ? 'bg-amber-500' : 'bg-red-500')} />
                  <span className={cn('font-semibold capitalize',
                    selectedUser.status === 'active' ? 'text-green-700' : selectedUser.status === 'pending' ? 'text-amber-700' : 'text-red-700')}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              {/* Specialties Section */}
              {selectedUser.role === 'caregiver' && selectedUser.specialties && selectedUser.specialties.length > 0 && (
                <div className="space-y-2 bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Specialties</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.specialties.map((spec, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/50 font-medium capitalize">
                        {spec.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Admin notes */}
              <AdminNotes entityType="user" entityId={selectedUser.id} />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openEdit(selectedUser)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
                  <Pencil className="w-4 h-4" /> Edit User
                </button>
                {selectedUser.status === 'suspended'
                  ? <button onClick={() => handleRestore(selectedUser.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                      <RotateCcw className="w-4 h-4" /> Restore
                    </button>
                  : <button onClick={() => handleSuspend(selectedUser)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors">
                      <Ban className="w-4 h-4" /> Suspend
                    </button>
                }
                <button onClick={() => handleDelete(selectedUser)}
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</label>
                <div className="flex gap-2">
                  {(['family', 'caregiver'] as const).map(r => (
                    <button key={r} onClick={() => setEditForm(f => ({...f, role: r}))}
                      className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors',
                        editForm.role === r ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={saveEdit} className="bg-slate-800 hover:bg-slate-900">Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUSPEND CONFIRM MODAL ── */}
      {suspendingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSuspendingUser(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
                <Ban className="w-7 h-7 text-amber-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Suspend Account?</h3>
                <p className="text-sm text-gray-500">
                  Provide a reason for suspending <span className="font-semibold text-gray-800">{suspendingUser.name}</span>.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Suspension Reason</label>
                <textarea
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Policy violation, suspicious activity..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none text-sm min-h-[100px] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setSuspendingUser(null)} className="h-11 flex-1">Cancel</Button>
                <Button variant="primary" onClick={confirmSuspend}
                  className="bg-amber-500 hover:bg-amber-600 text-white h-11 flex-1">
                  Suspend
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingUser(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Account?</h3>
                <p className="text-sm text-gray-500">
                  This will permanently remove <span className="font-semibold text-gray-800">{deletingUser.name}</span>'s account and all associated data. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setDeletingUser(null)} className="h-11 flex-1">Cancel</Button>
                <Button variant="primary" onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white h-11 flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT DETAIL MODAL ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">Dispute Details</h3>
              <button onClick={() => setSelectedReport(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                  selectedReport.priority === 'high' ? 'bg-red-50' : selectedReport.priority === 'medium' ? 'bg-amber-50' : 'bg-gray-50')}>
                  <Flag className={cn('w-6 h-6',
                    selectedReport.priority === 'high' ? 'text-red-500' : selectedReport.priority === 'medium' ? 'text-amber-500' : 'text-gray-400')} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg">{selectedReport.type}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                      selectedReport.priority === 'high' ? 'bg-red-100 text-red-700' :
                      selectedReport.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                      {selectedReport.priority} priority
                    </span>
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                      selectedReport.status === 'open' ? 'bg-red-100 text-red-700' :
                      selectedReport.status === 'under_review' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                      {selectedReport.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Reported User</p>
                  <p className="font-bold text-gray-900">{selectedReport.reportedUser}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Reported By</p>
                  <p className="font-bold text-gray-900">{selectedReport.reportedBy}</p>
                </div>
              </div>

              {/* Date & Ref */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 shrink-0" />
                  Report filed: {selectedReport.date}
                </div>
                {selectedReport.refId && (
                  <div className="flex items-center gap-2 font-bold text-slate-600">
                    <FileText className="w-4 h-4 shrink-0" />
                    Reference: {selectedReport.refId}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</p>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.description}</p>
                </div>
              </div>

              {/* Evidence */}
              {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.evidence.map((ev: string) => (
                      <span key={ev} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-medium">
                        <FileText className="w-3.5 h-3.5" /> {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!reportActions[selectedReport.id] && selectedReport.status !== 'resolved' && (
                <div className="flex gap-3 pt-2">
                  <Button size="sm" onClick={() => { setReportActions(prev => ({...prev, [selectedReport.id]: 'resolved'})); setSelectedReport(null); }}
                    className="bg-slate-700 hover:bg-slate-800 text-white rounded-full flex-1">
                    <CheckCircle className="w-4 h-4" /> Mark Resolved
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setReportActions(prev => ({...prev, [selectedReport.id]: 'dismissed'})); setSelectedReport(null); }}
                    className="text-gray-400 hover:bg-gray-100 flex-1">
                    Dismiss
                  </Button>
                </div>
              )}
              {reportActions[selectedReport.id] && (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-600 pt-2">
                  <CheckCircle className="w-4 h-4" />
                  {reportActions[selectedReport.id] === 'resolved' ? 'Report Resolved' : 'Report Dismissed'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DISPUTE RESOLUTION MODAL ── */}
      {resolvingDispute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResolvingDispute(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">Resolve Dispute</h3>
              <button onClick={() => setResolvingDispute(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Raised By</p>
                  <p className="font-bold text-gray-900">{resolvingDispute.raised_by_name || resolvingDispute.raised_by_role}</p>
                  <p className="text-xs text-gray-400 capitalize">{resolvingDispute.raised_by_role}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Booking</p>
                  <p className="font-bold text-gray-900">{resolvingDispute.booking_ref || `#${String(resolvingDispute.booking_id).split('-')[0]}`}</p>
                  {resolvingDispute.wage_amount != null && <p className="text-xs text-gray-400">Wage: ${Number(resolvingDispute.wage_amount).toFixed(2)}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{resolvingDispute.reason}</p>
                  {resolvingDispute.description && <p className="text-sm text-gray-500 mt-2">{resolvingDispute.description}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolution notes (optional)</p>
                <textarea value={disputeNotes} onChange={e => setDisputeNotes(e.target.value)} rows={3}
                  placeholder="Explain the decision for both parties…"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm resize-none" />
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outcome</p>
                <button onClick={() => handleResolveDispute('release')}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  <span className="font-bold text-emerald-800 text-sm">Release funds to professional</span>
                  <span className="block text-xs text-emerald-600">Completes the booking and credits the professional's wallet.</span>
                </button>
                <button onClick={() => handleResolveDispute('refund')}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                  <span className="font-bold text-amber-800 text-sm">Refund the facility</span>
                  <span className="block text-xs text-amber-600">Refunds the charge via Stripe and cancels the booking.</span>
                </button>
                <button onClick={() => handleResolveDispute('none')}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-gray-700 text-sm">Dismiss (no money movement)</span>
                  <span className="block text-xs text-gray-500">Closes the dispute without releasing or refunding.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
