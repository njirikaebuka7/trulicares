import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, TrendingUp,
  Briefcase, X, CheckCircle, XCircle, Edit3, LayoutDashboard, Users,
  ChevronLeft, ChevronRight as ChevronRightIcon, Camera, Upload
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  mockJobRequests, mockCaregiverClients, mockEarnings,
  mockCaregiverReviews, mockCaregiverSchedule
} from '@/data/mock';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

type Tab = 'Overview' | 'Job Requests' | 'My Clients' | 'Schedule' | 'Earnings' | 'Reviews' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'Job Requests', label: 'Job Requests', icon: <Briefcase className="w-5 h-5" />, badge: 3 },
  { id: 'My Clients', label: 'My Clients', icon: <Users className="w-5 h-5" /> },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'Earnings', label: 'Earnings', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'Reviews', label: 'Reviews', icon: <Star className="w-5 h-5" /> },
  { id: 'Profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'];

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [jobStatuses, setJobStatuses] = useState<Record<string, 'accepted' | 'declined' | null>>({});
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'away'>('available');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => { logout(); navigate('/'); };
  const handleJob = (id: string, action: 'accepted' | 'declined') =>
    setJobStatuses(prev => ({ ...prev, [id]: action }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  };

  const maxEarning = Math.max(...mockEarnings.weeklyBreakdown.map(d => d.amount), 1);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'C';
  const unread = notificationsRead ? 0 : 2;

  const openNotifications = () => {
    setNotifOpen(true);
    setNotificationsRead(true);
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed top-16 lg:top-[72px] left-0 bottom-0 z-20 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        'bg-emerald-950'
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center border-b border-emerald-800/60 shrink-0',
          collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4'
        )}>
          {!collapsed && (
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/60 flex items-center justify-center text-emerald-300 hover:text-white transition-all shrink-0"
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User profile */}
        {!collapsed ? (
          <div className="px-4 py-4 border-b border-emerald-800/60">
            <div className="flex items-center gap-3">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-9 h-9 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{user?.name}</p>
                <p className="text-xs text-emerald-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full shrink-0',
                availabilityStatus === 'available' ? 'bg-green-400' :
                availabilityStatus === 'busy' ? 'bg-amber-400' : 'bg-gray-400')} />
              <select
                value={availabilityStatus}
                onChange={e => setAvailabilityStatus(e.target.value as typeof availabilityStatus)}
                className="text-xs font-medium text-emerald-300 bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-3 border-b border-emerald-800/60">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-8 h-8 rounded-xl object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
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
                  ? 'bg-white/10 text-white'
                  : 'text-emerald-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <span className="shrink-0 relative">
                {item.icon}
                {item.badge && collapsed && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activeTab === item.id ? 'bg-white/20 text-white' : 'bg-coral-500/20 text-coral-300')}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-emerald-800/60">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log Out' : undefined}
            className={cn(
              'w-full flex items-center rounded-xl text-sm font-medium text-emerald-400 hover:bg-red-500/10 hover:text-red-300 transition-colors',
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
          <h1 className="text-base font-bold text-gray-900">
            {navItems.find(n => n.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={openNotifications}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-coral-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  {[
                    { text: '2 new job requests match your profile', time: '30 min ago' },
                    { text: 'Johnson Family left you a 5-star review', time: '3 hrs ago' },
                    { text: 'Weekly payout of $540 processed', time: '2 days ago' },
                  ].map((n, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer lg:hidden"
              onClick={() => setActiveTab('Profile')}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">

          {/* ── OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
                <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
                <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back</p>
                <h2 className="text-2xl font-bold mb-1">{user?.name || 'Caregiver'}</h2>
                <p className="text-emerald-200 text-sm mb-5">
                  You have <strong className="text-white">{mockJobRequests.filter(j => !jobStatuses[j.id]).length} new job requests</strong> waiting.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button size="sm" onClick={() => setActiveTab('Job Requests')}
                    className="bg-white text-emerald-700 border-white hover:bg-emerald-50 rounded-full">
                    View Job Requests
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('Earnings')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full border">
                    View Earnings
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Active Clients', value: mockCaregiverClients.filter(c => c.status === 'active').length,
                    icon: <User className="w-4 h-4" />, sub: '2 ongoing', bg: 'bg-emerald-50', txt: 'text-emerald-600' },
                  { label: 'This Week', value: `$${mockEarnings.thisWeek}`,
                    icon: <DollarSign className="w-4 h-4" />, sub: '↑ 9% vs last week', bg: 'bg-sky-50', txt: 'text-sky-600' },
                  { label: 'Avg Rating', value: '4.9',
                    icon: <Star className="w-4 h-4" />, sub: 'Top 5% of caregivers', bg: 'bg-amber-50', txt: 'text-amber-600' },
                  { label: 'Profile Views', value: 128,
                    icon: <TrendingUp className="w-4 h-4" />, sub: '↑ 23% this month', bg: 'bg-violet-50', txt: 'text-violet-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500 font-medium">{s.label}</span>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg, s.txt)}>{s.icon}</div>
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{s.value}</span>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">New Job Requests</h3>
                    <button onClick={() => setActiveTab('Job Requests')} className="text-sm text-emerald-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {mockJobRequests.slice(0, 2).map((job, i) => (
                      <div key={job.id} className="px-5 py-4 flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0', avatarColors[i])}>
                          {job.familyName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{job.familyName}</p>
                          <p className="text-xs text-gray-500">{job.schedule}</p>
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">{job.budget}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{job.postedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Upcoming Sessions</h3>
                    <button onClick={() => setActiveTab('Schedule')} className="text-sm text-emerald-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {mockCaregiverSchedule.slice(0, 3).map(session => (
                      <div key={session.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-2 h-10 rounded-full bg-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{session.familyName}</p>
                          <p className="text-xs text-gray-500">{session.date} · {session.time}</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">{session.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Earnings This Week</h3>
                  <span className="text-sm font-bold text-emerald-600">${mockEarnings.thisWeek} total</span>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {mockEarnings.weeklyBreakdown.map(d => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative flex items-end" style={{ height: '72px' }}>
                        <div className={cn('w-full rounded-t-lg transition-all', d.amount > 0 ? 'bg-emerald-500' : 'bg-gray-100')}
                          style={{ height: d.amount > 0 ? `${(d.amount / maxEarning) * 72}px` : '8px' }} />
                      </div>
                      <span className="text-xs text-gray-400">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── JOB REQUESTS ── */}
          {activeTab === 'Job Requests' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Job Requests</h2>
                <span className="text-sm text-gray-500">{mockJobRequests.length} requests</span>
              </div>
              {mockJobRequests.map((job, i) => {
                const jobAction = jobStatuses[job.id];
                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0', avatarColors[i % avatarColors.length])}>
                        {job.familyName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900">{job.familyName}</h3>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                            job.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                            {job.status === 'new' ? 'New' : 'Viewed'}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">{job.postedAt}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{job.service} · {job.children}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.schedule}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold"><DollarSign className="w-3 h-3" /> {job.budget}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {jobAction ? (
                        <div className={cn('flex items-center gap-2 text-sm font-semibold',
                          jobAction === 'accepted' ? 'text-green-600' : 'text-red-500')}>
                          {jobAction === 'accepted' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {jobAction === 'accepted' ? 'Request Accepted' : 'Request Declined'}
                          <button onClick={() => setJobStatuses(prev => ({ ...prev, [job.id]: null }))}
                            className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline font-normal">Undo</button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <Button size="sm" onClick={() => handleJob(job.id, 'accepted')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm">
                            <CheckCircle className="w-4 h-4" /> Accept
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleJob(job.id, 'declined')}
                            className="text-red-500 hover:bg-red-50">
                            <XCircle className="w-4 h-4" /> Decline
                          </Button>
                          <Button variant="secondary" size="sm">View Details</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MY CLIENTS ── */}
          {activeTab === 'My Clients' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">My Clients</h2>
              {mockCaregiverClients.map((client, i) => (
                <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0', avatarColors[i % avatarColors.length])}>
                    {client.familyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900">{client.familyName}</h3>
                      <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                        client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {client.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{client.service} · Since {client.since}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>{client.totalSessions} sessions</span>
                      <span>Next: {client.nextSession}</span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">Message</Button>
                </div>
              ))}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeTab === 'Schedule' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
              {mockCaregiverSchedule.map(session => (
                <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-1.5 h-16 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{session.familyName}</p>
                    <p className="text-sm text-gray-500">{session.service}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold shrink-0">{session.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── EARNINGS ── */}
          {activeTab === 'Earnings' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Earnings</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'This Week', value: `$${mockEarnings.thisWeek}`, highlight: true },
                  { label: 'This Month', value: `$${mockEarnings.thisMonth.toLocaleString()}` },
                  { label: 'Last Month', value: `$${mockEarnings.lastMonth.toLocaleString()}` },
                  { label: 'All Time', value: `$${mockEarnings.totalAllTime.toLocaleString()}` },
                ].map((e, i) => (
                  <div key={i} className={cn('rounded-2xl p-5', e.highlight ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-100')}>
                    <p className={cn('text-sm mb-1', e.highlight ? 'text-emerald-200' : 'text-gray-500')}>{e.label}</p>
                    <p className={cn('text-3xl font-bold', e.highlight ? 'text-white' : 'text-gray-900')}>{e.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Weekly Breakdown</h3>
                <div className="flex items-end gap-2" style={{ height: '100px' }}>
                  {mockEarnings.weeklyBreakdown.map(d => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative flex items-end" style={{ height: '72px' }}>
                        <div className={cn('w-full rounded-t-lg', d.amount > 0 ? 'bg-emerald-500' : 'bg-gray-100')}
                          style={{ height: d.amount > 0 ? `${(d.amount / maxEarning) * 72}px` : '8px' }} />
                      </div>
                      <span className="text-xs text-gray-400">{d.day}</span>
                      {d.amount > 0 && <span className="text-xs text-emerald-600 font-semibold">${d.amount}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Recent Payouts</h3></div>
                <div className="divide-y divide-gray-50">
                  {mockEarnings.recentPayouts.map((payout, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{payout.sessions} sessions</p>
                        <p className="text-xs text-gray-400">{payout.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{payout.amount}</p>
                        <span className="text-xs text-emerald-600 font-medium">{payout.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEWS ── */}
          {activeTab === 'Reviews' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Reviews & Ratings</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-8">
                <div className="text-center shrink-0">
                  <p className="text-5xl font-bold text-gray-900">4.9</p>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">47 reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(star => {
                    const count = star === 5 ? 42 : star === 4 ? 4 : star === 3 ? 1 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count/47)*100}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {mockCaregiverReviews.map(review => (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{review.familyName}</p>
                      <p className="text-xs text-gray-400">{review.service} · {review.date}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({length: review.rating}).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'Profile' && (
            <div className="space-y-5 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                  <div className="relative shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                    )}
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md hover:bg-emerald-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Caregiver'}</h2>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        <Check className="w-3 h-3" /> Background Checked
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm"><Edit3 className="w-4 h-4" /> Edit</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Specialties', value: 'Child Care' },
                    { label: 'Hourly Rate', value: '$18 – $25/hr' },
                    { label: 'Availability', value: 'Full-time' },
                    { label: 'Experience', value: '8 years' },
                  ].map((f, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                      <p className="font-semibold text-gray-900">{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {[
                    { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Bio & Specialties' },
                    { icon: <DollarSign className="w-5 h-5" />, label: 'Update Rates' },
                    { icon: <Calendar className="w-5 h-5" />, label: 'Manage Availability' },
                    { icon: <Bell className="w-5 h-5" />, label: 'Notification Preferences' },
                    { icon: <Settings className="w-5 h-5" />, label: 'Account Settings' },
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{item.icon}</span>
                        <span className="font-medium text-gray-700">{item.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>
                  ))}
                  <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-colors text-red-600 mt-2">
                    <div className="flex items-center gap-3"><LogOut className="w-5 h-5" /><span className="font-medium">Log Out</span></div>
                    <ChevronRight className="w-5 h-5 text-red-300" />
                  </button>
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
                activeTab === item.id ? 'text-emerald-600' : 'text-gray-400')}>
              {item.badge && (
                <span className="absolute top-1.5 right-1/2 translate-x-3 w-4 h-4 bg-coral-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              <span className={cn('transition-transform', activeTab === item.id && 'scale-110')}>{item.icon}</span>
              <span className="text-[10px] font-medium leading-none truncate w-full text-center">{item.label.split(' ')[0]}</span>
              {activeTab === item.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-emerald-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
