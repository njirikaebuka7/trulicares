import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, TrendingUp,
  Briefcase, X, CheckCircle, XCircle, Edit3, LayoutDashboard, Users,
  ChevronLeft, ChevronRight as ChevronRightIcon, Camera, Send, MoreHorizontal, Loader2, Plus
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { detectLocationWithZip } from '@/utils/geolocation';
import {
  mockJobRequests, mockCaregiverClients, mockEarnings,
  mockCaregiverReviews, mockCaregiverSchedule
} from '@/data/mock';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

type Tab = 'Overview' | 'Job Requests' | 'Messages' | 'My Clients' | 'Schedule' | 'Earnings' | 'Reviews' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'Job Requests', label: 'Job Requests', icon: <Briefcase className="w-5 h-5" />, badge: 3 },
  { id: 'Messages', label: 'Messages', icon: <MessageCircle className="w-5 h-5" />, badge: 2 },
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
  const [msgClientId, setMsgClientId] = useState<string | null>(null);
  const [clientMsgInput, setClientMsgInput] = useState('');
  const [clientMessages, setClientMessages] = useState<Record<string, {text: string; fromMe: boolean; time: string}[]>>({
    cl1: [{ text: 'Hi! Just confirming tomorrow\'s session at 8am. See you then!', fromMe: false, time: '9:00 AM' }],
    cl2: [{ text: 'Good morning! Ready for Friday\'s session?', fromMe: true, time: 'Yesterday' }],
    cl3: [{ text: 'Thank you for all your help this month!', fromMe: false, time: 'May 1' }],
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const [cgModal, setCgModal] = useState<null | 'bio' | 'rates' | 'availability' | 'notifications' | 'account' | 'serviceArea'>(null);
  const [cgBio, setCgBio] = useState('Experienced nanny with 8+ years caring for children of all ages. CPR certified and passionate about early childhood development.');
  const [cgRate, setCgRate] = useState({ min: 18, max: 25 });
  const [cgServiceZips, setCgServiceZips] = useState<string[]>(['11201', '11215', '11217', '11231']);
  const [cgZipInput, setCgZipInput] = useState('');
  const [cgLocating, setCgLocating] = useState(false);
  const [cgNotifPrefs, setCgNotifPrefs] = useState({ email: true, sms: true, push: true, marketing: false });
  const [cgSelectedMsg, setCgSelectedMsg] = useState<string | null>(null);
  const [cgMsgInput, setCgMsgInput] = useState('');
  const [cgMsgAutoReplying, setCgMsgAutoReplying] = useState(false);
  const [cgFamilyMessages, setCgFamilyMessages] = useState<Record<string, { text: string; fromMe: boolean; time: string }[]>>({
    fam1: [
      { text: "Hi! We loved your profile and wanted to reach out about our child care needs.", fromMe: false, time: '10:30 AM' },
      { text: "Thank you for reaching out! I'd love to learn more about your children.", fromMe: true, time: '10:42 AM' },
      { text: "We have twins, age 4. Looking for someone reliable 3 days a week. Are you available?", fromMe: false, time: '10:55 AM' },
    ],
    fam2: [
      { text: "Hello! We're looking for senior care support for my mother — 3 days per week.", fromMe: false, time: '9:15 AM' },
      { text: "I'd be happy to help! Could you tell me more about your mother's daily needs?", fromMe: true, time: '9:28 AM' },
    ],
    fam3: [
      { text: "Can we reschedule Wednesday's session? Something came up at work.", fromMe: false, time: 'Yesterday' },
    ],
  });
  const cgMsgEndRef = useRef<HTMLDivElement>(null);

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
        'hidden lg:flex flex-col fixed top-14 left-0 bottom-0 z-20 transition-all duration-300',
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
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto lg:hidden" />
            <h1 className="hidden lg:block text-base font-bold text-gray-900">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          <p className="lg:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800 pointer-events-none">
            {navItems.find(n => n.id === activeTab)?.label}
          </p>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button onClick={openNotifications}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
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
            <button
              className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold lg:hidden transition-all active:scale-95"
              onClick={() => setActiveTab('Profile')}
            >
              {initials}
            </button>
          </div>
        </div>

        {/* Mobile notification panel */}
        {notifOpen && (
          <div className="lg:hidden fixed inset-0 z-50" onClick={() => setNotifOpen(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="absolute top-14 left-0 right-0 bg-white shadow-2xl border-b border-gray-100 animate-fade-in-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-bold text-gray-900">Notifications</span>
                <button onClick={() => setNotifOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {[
                { text: '2 new job requests match your profile', time: '30 min ago' },
                { text: 'Johnson Family left you a 5-star review', time: '3 hrs ago' },
                { text: 'Weekly payout of $540 processed', time: '2 days ago' },
              ].map((n, i) => (
                <div key={i} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {msgClientId ? (() => {
                const client = mockCaregiverClients.find(c => c.id === msgClientId)!;
                const msgs = clientMessages[msgClientId] || [];
                const sendMsg = () => {
                  if (!clientMsgInput.trim()) return;
                  setClientMessages(prev => ({
                    ...prev,
                    [msgClientId]: [...(prev[msgClientId] || []), {
                      text: clientMsgInput.trim(), fromMe: true,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]
                  }));
                  setClientMsgInput('');
                };
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                      <button onClick={() => setMsgClientId(null)} className="text-sm text-emerald-600 font-medium hover:underline">← Back</button>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', avatarColors[0])}>
                        {client.familyName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{client.familyName}</p>
                        <p className="text-xs text-green-600">● Active client</p>
                      </div>
                    </div>
                    <div className="px-5 py-5 space-y-3 min-h-48 max-h-72 overflow-y-auto">
                      {msgs.map((m, i) => (
                        <div key={i} className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[80%] px-4 py-2.5 rounded-2xl text-sm',
                            m.fromMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                            <p>{m.text}</p>
                            <p className={cn('text-[10px] mt-0.5', m.fromMe ? 'text-emerald-200' : 'text-gray-400')}>{m.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                      <input
                        type="text" value={clientMsgInput}
                        onChange={e => setClientMsgInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMsg()}
                        placeholder="Type a message…"
                        className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                      />
                      <Button variant="primary" size="sm" onClick={sendMsg}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })() : (
                mockCaregiverClients.map((client, i) => (
                  <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0', avatarColors[i % avatarColors.length])}>
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
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                      <Button
                        variant="primary" size="sm"
                        onClick={() => setMsgClientId(client.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                      >
                        <MessageCircle className="w-4 h-4" /> Message
                      </Button>
                      <Button variant="secondary" size="sm">View Details</Button>
                      {client.status === 'active' && (
                        <Button variant="ghost" size="sm">Schedule Session</Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === 'Messages' && (() => {
            const cgFamilies = [
              { id: 'fam1', name: 'The Martinez Family', care: 'Child Care', color: avatarColors[0], unread: 1 },
              { id: 'fam2', name: 'Rebecca Thompson', care: 'Senior Care', color: avatarColors[1], unread: 0 },
              { id: 'fam3', name: 'James Chen', care: 'Adult Care', color: avatarColors[2], unread: 0 },
            ];

            const sendCgMsg = () => {
              if (!cgMsgInput.trim() || !cgSelectedMsg) return;
              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setCgFamilyMessages(prev => ({
                ...prev,
                [cgSelectedMsg]: [...(prev[cgSelectedMsg] || []), { text: cgMsgInput.trim(), fromMe: true, time }],
              }));
              setCgMsgInput('');
              setCgMsgAutoReplying(true);
              setTimeout(() => {
                const replies = [
                  "That works great for us, thank you!",
                  "Perfect! We'll confirm the details soon.",
                  "Sounds good! Looking forward to it.",
                  "Thanks for getting back to me so quickly!",
                ];
                const reply = replies[Math.floor(Math.random() * replies.length)];
                const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setCgFamilyMessages(prev => ({
                  ...prev,
                  [cgSelectedMsg]: [...(prev[cgSelectedMsg] || []), { text: reply, fromMe: false, time: replyTime }],
                }));
                setCgMsgAutoReplying(false);
              }, 2000);
            };

            if (cgSelectedMsg) {
              const family = cgFamilies.find(f => f.id === cgSelectedMsg)!;
              const msgs = cgFamilyMessages[cgSelectedMsg] || [];
              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: 420 }}>
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                      <button
                        onClick={() => setCgSelectedMsg(null)}
                        className="text-sm text-emerald-600 font-semibold hover:underline"
                      >← Back</button>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', family.color)}>
                        {family.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{family.name}</p>
                        <p className="text-xs text-emerald-600">● {family.care}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                      {msgs.map((m, i) => (
                        <div key={i} className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                            m.fromMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          )}>
                            <p>{m.text}</p>
                            <p className={cn('text-[10px] mt-0.5', m.fromMe ? 'text-emerald-200' : 'text-gray-400')}>{m.time}</p>
                          </div>
                        </div>
                      ))}
                      {cgMsgAutoReplying && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={cgMsgEndRef} />
                    </div>

                    <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                      <input
                        type="text"
                        value={cgMsgInput}
                        onChange={e => setCgMsgInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendCgMsg()}
                        placeholder="Type a message…"
                        className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        onClick={sendCgMsg}
                        disabled={!cgMsgInput.trim()}
                        className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {cgFamilies.map((family) => {
                    const msgs = cgFamilyMessages[family.id] || [];
                    const lastMsg = msgs[msgs.length - 1];
                    return (
                      <button
                        key={family.id}
                        onClick={() => setCgSelectedMsg(family.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 relative', family.color)}>
                          {family.name.charAt(0)}
                          {family.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={cn('text-sm font-semibold truncate', family.unread > 0 ? 'text-gray-900' : 'text-gray-700')}>
                              {family.name}
                            </p>
                            <span className="text-xs text-gray-400 shrink-0 ml-2">{lastMsg?.time || ''}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500 truncate">
                              {lastMsg ? (lastMsg.fromMe ? `You: ${lastMsg.text}` : lastMsg.text) : ''}
                            </p>
                            {family.unread > 0 && (
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{family.care}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
                    { label: 'Hourly Rate', value: `$${cgRate.min} – $${cgRate.max}/hr` },
                    { label: 'Availability', value: 'Full-time' },
                    { label: 'Experience', value: '8 years' },
                  ].map((f, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                      <p className="font-semibold text-gray-900">{f.value}</p>
                    </div>
                  ))}
                </div>
                {/* Service Area card */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Service Area</p>
                      <p className="text-xs text-gray-400 mt-0.5">ZIP codes and neighborhoods you cover</p>
                    </div>
                    <button
                      onClick={() => setCgModal('serviceArea')}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  {cgServiceZips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cgServiceZips.map(zip => (
                        <span key={zip} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-emerald-700 text-xs font-semibold">
                          <MapPin className="w-3 h-3" /> {zip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => setCgModal('serviceArea')} className="text-sm text-emerald-600 font-medium hover:underline">
                      + Add service areas
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {[
                    { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Bio & Specialties', sub: 'Update your bio and care categories', action: () => setCgModal('bio') },
                    { icon: <DollarSign className="w-5 h-5" />, label: 'Update Rates', sub: 'Set your hourly rate range', action: () => setCgModal('rates') },
                    { icon: <Calendar className="w-5 h-5" />, label: 'Manage Availability', sub: 'Days, hours & time-off', action: () => setCgModal('availability') },
                    { icon: <MapPin className="w-5 h-5" />, label: 'Manage Service Area', sub: 'ZIP codes and neighborhoods you cover', action: () => setCgModal('serviceArea') },
                    { icon: <Bell className="w-5 h-5" />, label: 'Notification Preferences', sub: 'Alerts for requests & messages', action: () => setCgModal('notifications') },
                    { icon: <Settings className="w-5 h-5" />, label: 'Account Settings', sub: 'Password, language & timezone', action: () => setCgModal('account') },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">{item.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                    </button>
                  ))}
                  <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-colors text-red-600 mt-2">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-medium">Log Out</p>
                        <p className="text-xs text-red-400">Sign out of your account</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-300" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CAREGIVER PROFILE MODALS ── */}

      {/* Bio & Specialties */}
      {cgModal === 'bio' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Edit Bio & Specialties</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea value={cgBio} onChange={e => setCgBio(e.target.value)} rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none" />
                <p className="text-xs text-gray-400 mt-1">{cgBio.length}/500 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['Child Care', 'Senior Care', 'Adult Care', 'Cleaning', 'Tutoring', 'Pet Care'].map(s => (
                    <button key={s} className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all border-emerald-200 bg-emerald-50 text-emerald-700">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                <input type="number" defaultValue={8} min={0} max={50}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Rates */}
      {cgModal === 'rates' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Update Hourly Rates</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center py-4 bg-emerald-50 rounded-2xl">
                <p className="text-3xl font-bold text-emerald-700">${cgRate.min} – ${cgRate.max}<span className="text-lg text-emerald-500">/hr</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rate: <span className="text-emerald-600 font-bold">${cgRate.min}/hr</span></label>
                <input type="range" min={10} max={50} value={cgRate.min}
                  onChange={e => setCgRate(r => ({ ...r, min: Number(e.target.value) }))}
                  className="w-full accent-emerald-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$10</span><span>$50</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Rate: <span className="text-emerald-600 font-bold">${cgRate.max}/hr</span></label>
                <input type="range" min={15} max={100} value={cgRate.max}
                  onChange={e => setCgRate(r => ({ ...r, max: Number(e.target.value) }))}
                  className="w-full accent-emerald-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$15</span><span>$100</span></div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="bg-emerald-600 hover:bg-emerald-700">Save Rates</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Availability */}
      {cgModal === 'availability' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Manage Availability</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <button key={d} className="px-3.5 py-2 rounded-xl text-sm font-semibold border-2 border-emerald-400 bg-emerald-50 text-emerald-700">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                    {['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                    {['4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrangement Type</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Weekends only</option>
                  <option>Evenings & Weekends</option>
                  <option>Flexible</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="bg-emerald-600 hover:bg-emerald-700">Save Availability</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      {cgModal === 'notifications' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Notification Preferences</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'email' as const, label: 'Email Notifications', sub: 'New requests, messages & payouts' },
                { key: 'sms' as const, label: 'SMS / Text Alerts', sub: 'Session reminders & urgent updates' },
                { key: 'push' as const, label: 'Push Notifications', sub: 'Real-time alerts on your device' },
                { key: 'marketing' as const, label: 'Tips & Community', sub: 'Care tips, events & news' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                  <button
                    onClick={() => setCgNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={cn('w-12 h-6 rounded-full transition-colors relative shrink-0',
                      cgNotifPrefs[item.key] ? 'bg-emerald-500' : 'bg-gray-200')}
                  >
                    <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      cgNotifPrefs[item.key] ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
              <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="mt-2 bg-emerald-600 hover:bg-emerald-700">Save Preferences</Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings */}
      {cgModal === 'account' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Account Settings</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input type="password" placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                  <option>English (US)</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                  <option>Eastern Time (ET)</option>
                  <option>Central Time (CT)</option>
                  <option>Pacific Time (PT)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Area */}
      {cgModal === 'serviceArea' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCgModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Service Area</h3>
              <button onClick={() => setCgModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Add ZIP codes and neighborhoods you can serve. Families in these areas will be matched with you first.</p>

              {/* Current zip chips */}
              {cgServiceZips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cgServiceZips.map(zip => (
                    <span key={zip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                      <MapPin className="w-3.5 h-3.5" /> {zip}
                      <button
                        onClick={() => setCgServiceZips(prev => prev.filter(z => z !== zip))}
                        className="text-emerald-400 hover:text-emerald-700 transition-colors ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cgZipInput}
                  onChange={e => setCgZipInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && cgZipInput.trim()) {
                      e.preventDefault();
                      const val = cgZipInput.trim().replace(/,+$/, '');
                      if (val && !cgServiceZips.includes(val)) setCgServiceZips(prev => [...prev, val]);
                      setCgZipInput('');
                    }
                  }}
                  placeholder="e.g. 11201 or Brooklyn, NY"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
                <button
                  onClick={() => {
                    const val = cgZipInput.trim().replace(/,+$/, '');
                    if (val && !cgServiceZips.includes(val)) setCgServiceZips(prev => [...prev, val]);
                    setCgZipInput('');
                  }}
                  disabled={!cgZipInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-400 -mt-2">Press Enter or comma to add. Add as many as you cover.</p>

              {/* Use my location */}
              <button
                onClick={async () => {
                  setCgLocating(true);
                  try {
                    const { address, zip } = await detectLocationWithZip();
                    const label = zip || address;
                    if (label && !cgServiceZips.includes(label)) setCgServiceZips(prev => [...prev, label]);
                  } catch {
                    // User denied or unavailable
                  } finally {
                    setCgLocating(false);
                  }
                }}
                disabled={cgLocating}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cgLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {cgLocating ? 'Detecting your location…' : 'Add my current location'}
              </button>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setCgModal(null)} className="bg-emerald-600 hover:bg-emerald-700">Save Area</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile) ── */}
      {(() => {
        const MOBILE_PRIMARY: Tab[] = ['Overview', 'Job Requests', 'Messages', 'Earnings', 'Profile'];
        const mobileNav = navItems.filter(n => MOBILE_PRIMARY.includes(n.id));
        const moreNav = navItems.filter(n => !MOBILE_PRIMARY.includes(n.id));
        const moreActive = moreNav.some(n => n.id === activeTab);
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
                    {moreNav.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMoreOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors',
                          activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span className={cn(activeTab === item.id ? 'text-emerald-600' : 'text-gray-400')}>{item.icon}</span>
                        <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-coral-500 text-white text-[10px] font-bold rounded-full">{item.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex items-stretch h-16">
                {mobileNav.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMoreOpen(false); }}
                    className={cn(
                      'relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
                      activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  >
                    {item.badge && (
                      <span className="absolute top-2.5 right-[calc(50%-16px)] translate-x-3 w-4 h-4 bg-coral-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold leading-none">
                        {item.badge}
                      </span>
                    )}
                    <span className={cn(
                      'flex items-center justify-center w-12 h-7 rounded-full transition-all',
                      activeTab === item.id ? 'bg-emerald-100' : ''
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
                  </button>
                ))}
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
                    (moreActive || moreOpen) ? 'bg-emerald-100' : ''
                  )}>
                    <MoreHorizontal className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-semibold leading-none">More</span>
                </button>
              </div>
            </nav>
          </>
        );
      })()}
    </div>
  );
}
