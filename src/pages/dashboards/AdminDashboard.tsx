import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, LogOut, Users, Shield, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, Clock, X, Search,
  Activity, DollarSign, UserCheck, Flag, BarChart2, LayoutDashboard,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  mockAdminStats, mockAdminUsers, mockVerificationQueue, mockAdminReports
} from '@/data/mock';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

type Tab = 'Overview' | 'Users' | 'Verification Queue' | 'Reports' | 'Analytics';

const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'Users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { id: 'Verification Queue', label: 'Verifications', icon: <UserCheck className="w-5 h-5" />, badge: mockAdminStats.pendingVerifications },
  { id: 'Reports', label: 'Reports', icon: <Flag className="w-5 h-5" />, badge: mockAdminStats.openReports },
  { id: 'Analytics', label: 'Analytics', icon: <BarChart2 className="w-5 h-5" /> },
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
  const [userFilter, setUserFilter] = useState<'all' | 'family' | 'caregiver'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationActions, setVerificationActions] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [reportActions, setReportActions] = useState<Record<string, 'resolved' | 'dismissed' | null>>({});

  const handleLogout = () => { logout(); navigate('/'); };

  const filteredUsers = mockAdminUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = userFilter === 'all' || u.role === userFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (f: typeof userFilter) => {
    setUserFilter(f);
    setCurrentPage(1);
  };
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const unread = notificationsRead ? 0 : mockAdminStats.pendingVerifications + mockAdminStats.openReports;
  const openNotifications = () => { setNotifOpen(true); setNotificationsRead(true); };

  const maxBarValue = Math.max(...mockAdminStats.monthlyGrowth.map(m => m.families + m.caregivers));
  const initials = 'AD';

  return (
    <div className="flex bg-gray-50 min-h-screen">

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed top-16 lg:top-[72px] left-0 bottom-0 z-20 transition-all duration-300 bg-slate-900',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center border-b border-slate-700/60 shrink-0',
          collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4'
        )}>
          {!collapsed && (
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80" />
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
        {!collapsed && (mockAdminStats.pendingVerifications > 0 || mockAdminStats.openReports > 0) && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-semibold text-red-400 mb-1.5">Action Required</p>
            {mockAdminStats.pendingVerifications > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {mockAdminStats.pendingVerifications} pending verifications
              </p>
            )}
            {mockAdminStats.openReports > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {mockAdminStats.openReports} open reports
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
      <div className={cn('flex-1 flex flex-col min-h-screen transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>

        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">{navItems.find(n => n.id === activeTab)?.label}</h1>
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
                  {[
                    { text: `${mockAdminStats.pendingVerifications} caregivers awaiting verification`, time: 'Ongoing', urgent: true },
                    { text: `${mockAdminStats.openReports} open reports need review`, time: 'Ongoing', urgent: true },
                    { text: '94 new sign-ups this month', time: 'This month', urgent: false },
                  ].map((n, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-start gap-2">
                        {n.urgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                        <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold cursor-pointer lg:hidden">
              AD
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">

          {/* ── OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
                <p className="text-slate-400 text-sm font-medium mb-1">Admin Console</p>
                <h2 className="text-2xl font-bold mb-1">Platform Overview</h2>
                <p className="text-slate-400 text-sm mb-5">
                  <span className="text-white font-semibold">{mockAdminStats.newSignupsThisMonth} new signups</span> this month ·
                  <span className="text-amber-400 font-semibold"> {mockAdminStats.pendingVerifications} pending</span> ·
                  <span className="text-red-400 font-semibold"> {mockAdminStats.openReports} reports</span>
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
                  { label: 'Total Users', value: mockAdminStats.totalUsers.toLocaleString(), icon: <Users className="w-4 h-4" />, sub: `+${mockAdminStats.newSignupsThisMonth} this month`, bg: 'bg-blue-50', txt: 'text-blue-600' },
                  { label: 'Families', value: mockAdminStats.totalFamilies.toLocaleString(), icon: <UserCheck className="w-4 h-4" />, sub: 'Seeking care', bg: 'bg-brand-50', txt: 'text-brand-600' },
                  { label: 'Caregivers', value: mockAdminStats.totalCaregivers.toLocaleString(), icon: <Shield className="w-4 h-4" />, sub: 'Providing care', bg: 'bg-emerald-50', txt: 'text-emerald-600' },
                  { label: 'Monthly Revenue', value: `$${mockAdminStats.monthlyRevenue.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, sub: `${mockAdminStats.activeMatches} active matches`, bg: 'bg-violet-50', txt: 'text-violet-600' },
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
                    {mockVerificationQueue.slice(0, 3).map(item => (
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
                    {mockAdminReports.filter(r => r.status !== 'resolved').map(report => (
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
                  <h3 className="font-bold text-gray-900">Platform Growth</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" /> Families</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Caregivers</span>
                  </div>
                </div>
                <div className="flex items-end gap-4" style={{ height: '110px' }}>
                  {mockAdminStats.monthlyGrowth.map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-1" style={{ height: '80px' }}>
                        <div className="flex-1 rounded-t-md bg-brand-500" style={{ height: `${(m.families / maxBarValue) * 100}%` }} />
                        <div className="flex-1 rounded-t-md bg-emerald-400" style={{ height: `${(m.caregivers / maxBarValue) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{m.month}</span>
                    </div>
                  ))}
                </div>
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
                    {(['all', 'family', 'caregiver'] as const).map(f => (
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
                              <button className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-gray-100">View</button>
                              {u.status === 'suspended'
                                ? <button className="text-xs text-green-600 font-medium px-2 py-1 rounded-lg hover:bg-green-50">Restore</button>
                                : <button className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50">Suspend</button>
                              }
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
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                            p === currentPage
                              ? 'bg-slate-800 text-white'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
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
                <span className="text-sm text-gray-500">{mockVerificationQueue.length} pending</span>
              </div>
              {mockVerificationQueue.map(item => {
                const action = verificationActions[item.id];
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
                          {item.documents.map((doc: string) => (
                            <span key={doc} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              <CheckCircle className="w-3 h-3" /> {doc}
                            </span>
                          ))}
                          <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium',
                            item.backgroundCheck === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            item.backgroundCheck === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                            <Activity className="w-3 h-3" /> Background: {item.backgroundCheck.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
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
                        <div className="flex gap-3">
                          <Button size="sm" onClick={() => setVerificationActions(prev => ({...prev, [item.id]: 'approved'}))}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setVerificationActions(prev => ({...prev, [item.id]: 'rejected'}))}
                            className="text-red-500 hover:bg-red-50">
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                          <Button variant="secondary" size="sm">View Documents</Button>
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
                <span className="text-sm text-gray-500">{mockAdminReports.length} total</span>
              </div>
              {mockAdminReports.map(report => {
                const action = reportActions[report.id];
                return (
                  <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                        report.priority === 'high' ? 'bg-red-50' : report.priority === 'medium' ? 'bg-amber-50' : 'bg-gray-50')}>
                        <Flag className={cn('w-6 h-6',
                          report.priority === 'high' ? 'text-red-500' : report.priority === 'medium' ? 'text-amber-500' : 'text-gray-400')} />
                      </div>
                      <div className="flex-1">
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
                      </div>
                    </div>
                    {report.status !== 'resolved' && (
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
                          <div className="flex gap-3">
                            <Button size="sm" onClick={() => setReportActions(prev => ({...prev, [report.id]: 'resolved'}))}
                              className="bg-slate-700 hover:bg-slate-800 text-white rounded-full shadow-sm">
                              <CheckCircle className="w-4 h-4" /> Mark Resolved
                            </Button>
                            <Button variant="secondary" size="sm">Review Details</Button>
                            <Button variant="ghost" size="sm" onClick={() => setReportActions(prev => ({...prev, [report.id]: 'dismissed'}))}
                              className="text-gray-400 hover:bg-gray-100">Dismiss</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'Analytics' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Match Rate', value: '78%', sub: 'Families that find a match', trend: '↑ 4% vs last month' },
                  { label: 'Avg Time to Match', value: '2.4 days', sub: 'From request to first match', trend: '↓ 0.3 days improvement' },
                  { label: 'Acceptance Rate', value: '64%', sub: 'Job requests accepted', trend: '↑ 7% vs last month' },
                  { label: 'Messaging Conv.', value: '41%', sub: 'Matches that unlock messaging', trend: '↑ 2% vs last month' },
                  { label: 'Repeat Families', value: '58%', sub: 'Families with 2+ requests', trend: '↑ 5% vs last month' },
                  { label: 'Churn Rate', value: '3.2%', sub: 'Monthly user churn', trend: '↓ 0.8% improvement' },
                ].map((metric, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 font-medium mb-2">{metric.label}</p>
                    <p className="text-4xl font-bold text-gray-900 mb-1">{metric.value}</p>
                    <p className="text-xs text-gray-400 mb-2">{metric.sub}</p>
                    <p className="text-xs text-emerald-600 font-semibold">{metric.trend}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Care Category Distribution</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Child Care', pct: 48, color: 'bg-brand-500' },
                    { label: 'Senior Care', pct: 27, color: 'bg-emerald-500' },
                    { label: 'Adult Care', pct: 14, color: 'bg-sky-500' },
                    { label: 'Cleaning Services', pct: 11, color: 'bg-violet-400' },
                  ].map(cat => (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                        <span className="text-sm font-bold text-gray-900">{cat.pct}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', cat.color)} style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Revenue by Month</h3>
                <div className="flex items-end gap-4" style={{ height: '120px' }}>
                  {[
                    { month: 'Dec', revenue: 18200 },
                    { month: 'Jan', revenue: 21400 },
                    { month: 'Feb', revenue: 22800 },
                    { month: 'Mar', revenue: 24600 },
                    { month: 'Apr', revenue: 26100 },
                    { month: 'May', revenue: 28640 },
                  ].map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-600 font-semibold">${(m.revenue/1000).toFixed(0)}k</span>
                      <div className="w-full flex items-end" style={{ height: '80px' }}>
                        <div className="w-full rounded-t-lg bg-slate-700" style={{ height: `${(m.revenue/30000)*100}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 px-1">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={cn('relative flex flex-col items-center gap-0.5 px-2 py-2.5 min-w-0 flex-1 transition-colors',
                activeTab === item.id ? 'text-slate-800' : 'text-gray-400')}>
              {item.badge && (
                <span className="absolute top-1.5 right-1/2 translate-x-3 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              <span className={cn('transition-transform', activeTab === item.id && 'scale-110')}>{item.icon}</span>
              <span className="text-[10px] font-medium leading-none truncate w-full text-center">{item.label.split(' ')[0]}</span>
              {activeTab === item.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-slate-800 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
