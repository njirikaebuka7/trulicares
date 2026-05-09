import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, Plus, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, CreditCard,
  FileText, X, Home, LayoutDashboard, Users, ChevronLeft, ChevronRight as ChevronRightIcon,
  Edit3, Camera, MoreHorizontal, Send
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { get, post, put } from '@/lib/api';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

const careCategoryLabels: Record<string, string> = {
  'child-care': 'Child Care',
  'senior-care': 'Senior Care',
  'adult-care': 'Adult Care',
  'cleaning': 'Cleaning Services',
};

type Tab = 'Overview' | 'My Requests' | 'Matches' | 'Schedule' | 'Messages' | 'Payments' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'My Requests', label: 'My Requests', icon: <FileText className="w-5 h-5" /> },
  { id: 'Matches', label: 'Matches', icon: <Users className="w-5 h-5" /> },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'Messages', label: 'Messages', icon: <MessageCircle className="w-5 h-5" /> },
  { id: 'Payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'Profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'];

function StatCard({ label, value, icon, sub, colorBg, colorText }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
  colorBg?: string; colorText?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colorBg || 'bg-brand-50', colorText || 'text-brand-600')}>
          {icon}
        </div>
      </div>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function FamilyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState('(555) 000-1234');
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvc: '' });
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileModal, setProfileModal] = useState<null | 'personal' | 'notifications' | 'privacy' | 'account'>(null);
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, push: false, marketing: false });
  const [privacyPrefs, setPrivacyPrefs] = useState({ profileVisible: true, shareActivity: false, dataAnalytics: true });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{text: string; fromMe: boolean; time: string}>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingReq, setEditingReq] = useState<any | null>(null);
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  const loadMessages = async (convId: string) => {
    try {
      const d: any = await get(`/conversations/${convId}/messages`);
      const msgs = (d.messages || []).map((m: any) => ({
        text: m.content,
        fromMe: m.isOwn,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setChatMessages(prev => ({ ...prev, [convId]: msgs }));
    } catch {}
  };

  useEffect(() => {
    Promise.all([
      get('/matches').then((d: any) => setMatches(d.matches || [])).catch(() => {}),
      get('/care-requests').then((d: any) => setRequests(d.requests || [])).catch(() => {}),
      get('/schedule').then((d: any) => setSchedule(d.schedule || [])).catch(() => {}),
      get('/payments').then((d: any) => setPayments(d.payments || [])).catch(() => {}),
      get('/conversations').then((d: any) => setConversations(d.conversations || [])).catch(() => {}),
    ]).catch(console.error);
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [chatMessages, selectedMessage]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedMessage) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const content = chatInput.trim();
    const newMsg = { text: content, fromMe: true, time };
    setChatMessages(prev => ({ ...prev, [selectedMessage]: [...(prev[selectedMessage] || []), newMsg] }));
    setChatInput('');
    try { await post(`/conversations/${selectedMessage}/messages`, { content }); } catch {}
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const notifications = [
    { id: 'n1', text: 'Sarah Johnson accepted your request', time: '10 min ago' },
    { id: 'n2', text: 'New match found for Senior Care', time: '2 hrs ago' },
    { id: 'n3', text: 'Upcoming session tomorrow at 8am', time: '1 day ago' },
  ];
  const unread = notificationsRead ? 0 : 2;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'U';

  const navBadges: Partial<Record<Tab, number>> = {
    'My Requests': requests.filter((r: any) => r.status === 'matching').length || 0,
    'Matches': matches.filter((m: any) => m.status === 'pending').length || 0,
    'Messages': conversations.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0) || 0,
  };

  const totalSpentCents = payments
    .filter((p: any) => p.status === 'succeeded')
    .reduce((s: number, p: any) => s + (p.amountCents || 0), 0);
  const totalSpentStr = totalSpentCents ? `$${(totalSpentCents / 100).toFixed(0)}` : '$0';
  const totalUnread = conversations.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0);

  const handleEditRequest = async () => {
    if (!editingReq) return;
    setEditSaving(true);
    try {
      const updated: any = await put(`/care-requests/${editingReq.id}`, { location: editLocation });
      setRequests(prev => prev.map((r: any) => r.id === editingReq.id ? updated.request : r));
      setEditingReq(null);
    } catch {}
    setEditSaving(false);
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await put(`/care-requests/${id}/cancel`);
      setRequests(prev => prev.map((r: any) => r.id === id ? { ...r, status: 'cancelled' } : r));
    } catch {}
    setCancelConfirmId(null);
  };

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
        'bg-brand-950'
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center border-b border-brand-800/60 shrink-0',
          collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4'
        )}>
          {!collapsed && (
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg bg-brand-800/60 hover:bg-brand-700/60 flex items-center justify-center text-brand-300 hover:text-white transition-all shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User profile */}
        {!collapsed && (
          <div className="px-4 py-4 border-b border-brand-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{user?.name}</p>
                <p className="text-xs text-brand-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-800/60 text-brand-300 text-xs font-semibold">
              <Home className="w-3 h-3" /> Family Account
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-3 border-b border-brand-800/60">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
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
                  : 'text-brand-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <span className="shrink-0 relative">
                {item.icon}
                {(navBadges[item.id] ?? 0) > 0 && collapsed && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                    {navBadges[item.id]}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {(navBadges[item.id] ?? 0) > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activeTab === item.id ? 'bg-white/20 text-white' : 'bg-coral-500/20 text-coral-300'
                    )}>
                      {navBadges[item.id]}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-brand-800/60">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log Out' : undefined}
            className={cn(
              'w-full flex items-center rounded-xl text-sm font-medium text-brand-400 hover:bg-red-500/10 hover:text-red-300 transition-colors',
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
          {/* Mobile: logo | Desktop: page title */}
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto lg:hidden" />
            <h1 className="hidden lg:block text-base font-bold text-gray-900">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          {/* Mobile: tab name centered */}
          <p className="lg:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800 pointer-events-none">
            {navItems.find(n => n.id === activeTab)?.label}
          </p>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-coral-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unread}
                  </span>
                )}
              </button>
              {/* Desktop notification dropdown */}
              {notifOpen && (
                <div className="hidden lg:block absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold lg:hidden transition-all active:scale-95"
              onClick={() => setActiveTab('Profile')}
            >
              {initials}
            </button>
          </div>
        </div>

        {/* Mobile notification panel (full-width) */}
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
              {notifications.map(n => (
                <div key={n.id} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-start gap-3">
                  <div className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 shrink-0" />
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
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
                <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
                <p className="text-brand-200 text-sm font-medium mb-1">Welcome back</p>
                <h2 className="text-2xl font-bold mb-1">{user?.name || 'User'}</h2>
                <p className="text-brand-200 text-sm mb-5">Your care journey is well underway.</p>
                <div className="flex gap-3 flex-wrap">
                  <Button size="sm" onClick={() => navigate('/find-care')}
                    className="bg-white text-brand-700 border-white hover:bg-brand-50 rounded-full">
                    <Plus className="w-4 h-4" /> Post New Request
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('Matches')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full border">
                    View Matches
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Active Matches" value={matches.filter((m: any) => m.status === 'accepted').length}
                  icon={<Shield className="w-4 h-4" />}
                  sub={matches.filter((m: any) => m.status === 'pending').length > 0 ? `${matches.filter((m: any) => m.status === 'pending').length} awaiting response` : 'Up to date'}
                  colorBg="bg-brand-50" colorText="text-brand-600" />
                <StatCard label="Sessions" value={schedule.length} icon={<Calendar className="w-4 h-4" />}
                  sub={schedule.length > 0 ? `Next: ${schedule[0]?.date || 'Upcoming'}` : 'None scheduled'}
                  colorBg="bg-emerald-50" colorText="text-emerald-600" />
                <StatCard label="Messages" value={conversations.length} icon={<MessageCircle className="w-4 h-4" />}
                  sub={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
                  colorBg="bg-sky-50" colorText="text-sky-600" />
                <StatCard label="Total Spent" value={totalSpentStr} icon={<CreditCard className="w-4 h-4" />}
                  sub={payments.length > 0 ? `${payments.length} transactions` : 'No payments yet'}
                  colorBg="bg-violet-50" colorText="text-violet-600" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Upcoming Sessions</h3>
                    <button onClick={() => setActiveTab('Schedule')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {schedule.slice(0, 3).map((session: any) => (
                      <div key={session.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={cn('w-2 h-10 rounded-full shrink-0', session.colorClass)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{session.caregiverName}</p>
                          <p className="text-xs text-gray-500">{session.date} · {session.time}</p>
                        </div>
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold',
                          session.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                          {session.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Care Requests</h3>
                    <button onClick={() => setActiveTab('My Requests')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {requests.map((req: any) => (
                      <div key={req.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{req.label}</p>
                          <p className="text-xs text-gray-500 truncate">{req.description}</p>
                        </div>
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap',
                          req.status === 'matched' ? 'bg-green-100 text-green-700' :
                          req.status === 'matching' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>
                          {req.status === 'matched' ? `${req.matchCount} matches` : req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Top Matches</h3>
                  <button onClick={() => setActiveTab('Matches')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {matches.slice(0, 2).map((match: any, i: number) => (
                    <div key={match.id} className="flex items-center gap-4 px-5 py-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', avatarColors[i % avatarColors.length])}>
                        {match.caregiver.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{match.caregiver.name}</p>
                          {match.caregiver.verified && <Shield className="w-3.5 h-3.5 text-brand-500" />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-gray-600">{match.caregiver.rating} · {careCategoryLabels[match.careType]}</span>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('Matches')}>View</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MY REQUESTS ── */}
          {activeTab === 'My Requests' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">My Care Requests</h2>
                <Button variant="primary" size="sm" onClick={() => navigate('/find-care')}>
                  <Plus className="w-4 h-4" /> New Request
                </Button>
              </div>
              {requests.map((req: any) => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900">{req.label}</h3>
                        <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                          req.status === 'matched' ? 'bg-green-100 text-green-700' :
                          req.status === 'matching' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>
                          {req.status === 'matched' ? `${req.matchCount} Matches Found` : req.status === 'matching' ? 'Finding Matches…' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{req.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.location}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {req.budget}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Posted {req.postedDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    {req.status === 'matched' && (
                      <Button variant="primary" size="sm" onClick={() => setActiveTab('Matches')}>
                        View {req.matchCount} Matches
                      </Button>
                    )}
                    {req.status !== 'cancelled' && req.status !== 'completed' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingReq(req); setEditLocation(req.location || ''); }}>
                          Edit Request
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50"
                          onClick={() => setCancelConfirmId(req.id)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div onClick={() => navigate('/find-care')}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-brand-500" />
                </div>
                <p className="font-semibold text-gray-700">Post a New Care Request</p>
                <p className="text-sm text-gray-400">Find the right caregiver for your needs</p>
              </div>
            </div>
          )}

          {/* ── MATCHES ── */}
          {activeTab === 'Matches' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Your Matches</h2>
              {matches.map((match: any, i: number) => (
                <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    {match.caregiver.photoUrl ? (
                      <img src={match.caregiver.photoUrl} alt={match.caregiver.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0', avatarColors[i % avatarColors.length])}>
                        {match.caregiver.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{match.caregiver.name}</h3>
                        {match.caregiver.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                            <Shield className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {match.caregiver.backgroundChecked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            <Check className="w-3 h-3" /> Background Checked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-gray-800 text-sm">{match.caregiver.rating}</span>
                        <span className="text-sm text-gray-400">({match.caregiver.reviewCount} reviews)</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{match.caregiver.bio}</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-gray-500"><MapPin className="w-4 h-4" /> {match.location}</span>
                        <span className="flex items-center gap-1 text-brand-600 font-semibold"><DollarSign className="w-4 h-4" /> {match.budget}</span>
                        <span className="flex items-center gap-1 text-gray-500"><Clock className="w-4 h-4" /> {match.caregiver.yearsExperience} yrs exp</span>
                        <span className="flex items-center gap-1 text-gray-500"><Calendar className="w-4 h-4" /> {match.caregiver.availability}</span>
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-full text-xs font-bold shrink-0',
                      match.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {match.status}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3 flex-wrap items-center">
                    {match.messagingUnlocked ? (
                      <Button variant="primary" size="sm" onClick={() => setActiveTab('Messages')}>
                        <MessageCircle className="w-4 h-4" /> Message
                      </Button>
                    ) : match.status === 'accepted' ? (
                      <Button variant="coral" size="sm" onClick={async () => {
                        try { await post(`/matches/${match.id}/unlock-messaging`); setMatches(prev => prev.map((m: any) => m.id === match.id ? { ...m, messagingUnlocked: true } : m)); } catch {}
                      }}>
                        <DollarSign className="w-4 h-4" /> Pay to Unlock Messaging
                      </Button>
                    ) : (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Waiting for caregiver to accept
                      </span>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/caregivers/${match.caregiver.id}`)}>View Full Profile</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeTab === 'Schedule' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Schedule</h2>
              <div className="space-y-3">
                {schedule.map((session: any) => (
                  <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className={cn('w-1.5 h-16 rounded-full shrink-0', session.colorClass)} />
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{session.caregiverName}</p>
                      <p className="text-sm text-gray-500">{session.service}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
                      </div>
                    </div>
                    <span className={cn('text-xs px-3 py-1 rounded-full font-semibold shrink-0',
                      session.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === 'Messages' && (() => {
            const activeConv = selectedMessage ? conversations.find((c: any) => c.id === selectedMessage) : null;
            const activeMessages = selectedMessage ? (chatMessages[selectedMessage] || []) : [];
            const threadList = conversations;
            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                {activeConv ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                      <button onClick={() => setSelectedMessage(null)} className="text-sm text-brand-600 hover:underline font-medium shrink-0">← Back</button>
                      {activeConv?.otherPhoto ? (
                        <img src={activeConv.otherPhoto} alt={activeConv.otherName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0', avatarColors[0])}>
                          {(activeConv?.otherName || '?').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 block">{activeConv?.otherName}</span>
                        <span className="text-xs text-green-600">● Online</span>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="px-5 py-5 space-y-4 min-h-64 max-h-96 overflow-y-auto">
                      {activeMessages.map((msg, i) => (
                        <div key={i} className={cn('flex gap-3', msg.fromMe && 'justify-end')}>
                          {!msg.fromMe && (
                            activeConv?.otherPhoto ? (
                              <img src={activeConv.otherPhoto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 self-end" />
                            ) : (
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 self-end', avatarColors[0])}>
                                {(activeConv?.otherName || '?').split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )
                          )}
                          <div className={cn('rounded-2xl px-4 py-2.5 max-w-xs sm:max-w-sm', msg.fromMe ? 'bg-brand-600 rounded-tr-none' : 'bg-gray-100 rounded-tl-none')}>
                            <p className={cn('text-sm', msg.fromMe ? 'text-white' : 'text-gray-800')}>{msg.text}</p>
                            <p className={cn('text-xs mt-1', msg.fromMe ? 'text-brand-200' : 'text-gray-400')}>{msg.time}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    {/* Input */}
                    <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message…"
                        className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  threadList.map((conv: any, i: number) => {
                    const msgs = chatMessages[conv.id] || [];
                    const lastMsg = msgs[msgs.length - 1];
                    const unreadDot = (conv.unreadCount || 0) > 0;
                    return (
                      <div key={conv.id} onClick={() => { setSelectedMessage(conv.id); loadMessages(conv.id); }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all">
                        <div className="relative shrink-0">
                          {conv.otherPhoto ? (
                            <img src={conv.otherPhoto} alt={conv.otherName} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-bold', avatarColors[i % avatarColors.length])}>
                              {(conv.otherName || '?').split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          {i === 0 && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={cn('font-semibold', unreadDot ? 'text-gray-900' : 'text-gray-700')}>{conv.otherName}</h4>
                            <span className="text-xs text-gray-400">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {lastMsg ? (lastMsg.fromMe ? `You: ${lastMsg.text}` : lastMsg.text) : conv.lastMessage || ''}
                          </p>
                        </div>
                        {unreadDot && <span className="w-2.5 h-2.5 bg-brand-500 rounded-full shrink-0" />}
                        <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}

          {/* ── PAYMENTS ── */}
          {activeTab === 'Payments' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              {(() => {
                const now = new Date();
                const thisMonthCents = payments.filter((p: any) => {
                  const d = new Date(p.createdAt); return p.status === 'succeeded' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((s: number, p: any) => s + p.amountCents, 0);
                const lastMonthCents = payments.filter((p: any) => {
                  const d = new Date(p.createdAt); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return p.status === 'succeeded' && d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
                }).reduce((s: number, p: any) => s + p.amountCents, 0);
                const allTimeCents = payments.filter((p: any) => p.status === 'succeeded').reduce((s: number, p: any) => s + p.amountCents, 0);
                const fmt = (cents: number) => cents ? `$${(cents / 100).toFixed(2)}` : '$0.00';
                return (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-brand-600 text-white rounded-2xl p-5">
                      <p className="text-brand-200 text-sm mb-1">This Month</p>
                      <p className="text-3xl font-bold">{fmt(thisMonthCents)}</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5">
                      <p className="text-gray-500 text-sm mb-1">Last Month</p>
                      <p className="text-3xl font-bold text-gray-900">{fmt(lastMonthCents)}</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5">
                      <p className="text-gray-500 text-sm mb-1">All Time</p>
                      <p className="text-3xl font-bold text-gray-900">{fmt(allTimeCents)}</p>
                    </div>
                  </div>
                );
              })()}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Transactions</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {payments.map((pay: any) => (
                    <div key={pay.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{pay.description}</p>
                        <p className="text-xs text-gray-400">{pay.date} · {pay.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{pay.amount}</p>
                        <span className="text-xs text-green-600 font-medium">{pay.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
                <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-900">Visa ending in 4242</p>
                    <p className="text-sm text-gray-400">Expires 08/27</p>
                  </div>
                  <span className="ml-auto text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Default</span>
                </div>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Payment Method
                </button>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'Profile' && (
            <div className="space-y-5 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
              {/* Profile header card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold">
                      {initials}
                    </div>
                    <button
                      onClick={() => setShowEditProfile(true)}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-md hover:bg-brand-700 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{editName || user?.name || 'User'}</h2>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      <Check className="w-3 h-3" /> Verified Account
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setShowEditProfile(true)}>
                    <Edit3 className="w-4 h-4" /> Edit
                  </Button>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Member since', value: 'Jan 2026' },
                    { label: 'Care requests', value: '2 active' },
                    { label: 'Matches found', value: '3 caregivers' },
                    { label: 'Sessions booked', value: '12 total' },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                      <p className="font-semibold text-gray-900 text-sm">{f.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {[
                    { icon: <User className="w-5 h-5" />, label: 'Personal Information', sub: 'Update name, phone & address', action: () => setProfileModal('personal') },
                    { icon: <Bell className="w-5 h-5" />, label: 'Notification Preferences', sub: 'Email, SMS & push alerts', action: () => setProfileModal('notifications') },
                    { icon: <Shield className="w-5 h-5" />, label: 'Privacy & Safety', sub: 'Visibility & data controls', action: () => setProfileModal('privacy') },
                    { icon: <CreditCard className="w-5 h-5" />, label: 'Billing & Payments', sub: 'Cards, history & invoices', action: () => setActiveTab('Payments') },
                    { icon: <Settings className="w-5 h-5" />, label: 'Account Settings', sub: 'Password, language & timezone', action: () => setProfileModal('account') },
                  ].map((item, i) => (
                    <button key={i}
                      onClick={item.action}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 group-hover:text-brand-500 transition-colors">{item.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-400 transition-colors" />
                    </button>
                  ))}
                  <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-colors text-red-600 mt-2 group">
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

      {/* ── BOTTOM NAV (mobile) ── */}
      {(() => {
        const MOBILE_PRIMARY: Tab[] = ['Overview', 'My Requests', 'Matches', 'Messages', 'Profile'];
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
                          activeTab === item.id ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span className={cn(activeTab === item.id ? 'text-brand-600' : 'text-gray-400')}>{item.icon}</span>
                        <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                        {(navBadges[item.id] ?? 0) > 0 && (
                          <span className="px-2 py-0.5 bg-coral-500 text-white text-[10px] font-bold rounded-full">{navBadges[item.id]}</span>
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
                      activeTab === item.id ? 'text-brand-600' : 'text-gray-400'
                    )}
                  >
                    {(navBadges[item.id] ?? 0) > 0 && (
                      <span className="absolute top-2.5 right-[calc(50%-16px)] translate-x-3 w-4 h-4 bg-coral-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold leading-none">
                        {navBadges[item.id]}
                      </span>
                    )}
                    <span className={cn(
                      'flex items-center justify-center w-12 h-7 rounded-full transition-all',
                      activeTab === item.id ? 'bg-brand-100' : ''
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
                    moreActive || moreOpen ? 'text-brand-600' : 'text-gray-400'
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-12 h-7 rounded-full transition-all',
                    (moreActive || moreOpen) ? 'bg-brand-100' : ''
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

      {/* ── EDIT REQUEST MODAL ── */}
      {editingReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingReq(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Edit Care Request</h3>
              <button onClick={() => setEditingReq(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Care Type</label>
                <div className="px-4 py-3 rounded-xl bg-gray-50 text-sm text-gray-500 border border-gray-200">
                  {editingReq.label} <span className="text-xs text-gray-400 ml-1">(cannot be changed)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  placeholder="City, State or ZIP"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setEditingReq(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={handleEditRequest} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL REQUEST CONFIRM ── */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCancelConfirmId(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Cancel Request?</h3>
            <p className="text-sm text-gray-500 mb-6">This will cancel your care request and remove any pending matches. You can post a new one at any time.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setCancelConfirmId(null)}>Keep It</Button>
              <Button fullWidth className="bg-red-500 text-white border-red-500 hover:bg-red-600"
                onClick={() => handleCancelRequest(cancelConfirmId)}>
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {showEditProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditProfile(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 outline-none text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setShowEditProfile(false)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setShowEditProfile(false)}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PERSONAL INFO MODAL ── */}
      {profileModal === 'personal' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Personal Information</h3>
              <button onClick={() => setProfileModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Full Name', value: user?.name || '', type: 'text', placeholder: 'Your full name' },
                { label: 'Email Address', value: user?.email || '', type: 'email', placeholder: 'your@email.com' },
                { label: 'Phone Number', value: '(555) 000-1234', type: 'tel', placeholder: '(555) 000-0000' },
                { label: 'Address', value: 'Brooklyn, NY 11201', type: 'text', placeholder: 'Your address' },
              ].map((f, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                  <input type={f.type} defaultValue={f.value} placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setProfileModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setProfileModal(null)}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION PREFERENCES MODAL ── */}
      {profileModal === 'notifications' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Notification Preferences</h3>
              <button onClick={() => setProfileModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'email' as const, label: 'Email Notifications', sub: 'Match updates, messages & invoices' },
                { key: 'sms' as const, label: 'SMS / Text Alerts', sub: 'Session reminders & urgent updates' },
                { key: 'push' as const, label: 'Push Notifications', sub: 'Real-time alerts on your device' },
                { key: 'marketing' as const, label: 'Marketing & Tips', sub: 'Care tips, promotions & news' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={cn('w-12 h-6 rounded-full transition-colors relative shrink-0',
                      notifPrefs[item.key] ? 'bg-brand-500' : 'bg-gray-200')}
                  >
                    <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
              <Button variant="primary" fullWidth onClick={() => setProfileModal(null)} className="mt-2">Save Preferences</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRIVACY MODAL ── */}
      {profileModal === 'privacy' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Privacy & Safety</h3>
              <button onClick={() => setProfileModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'profileVisible' as const, label: 'Profile Visible to Caregivers', sub: 'Caregivers can see your family profile' },
                { key: 'shareActivity' as const, label: 'Share Activity Data', sub: 'Help improve matching accuracy' },
                { key: 'dataAnalytics' as const, label: 'Analytics & Performance', sub: 'Allow anonymized usage analytics' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                  <button
                    onClick={() => setPrivacyPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={cn('w-12 h-6 rounded-full transition-colors relative shrink-0',
                      privacyPrefs[item.key] ? 'bg-brand-500' : 'bg-gray-200')}
                  >
                    <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      privacyPrefs[item.key] ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <button className="text-sm text-red-500 font-medium hover:underline">Request account deletion</button>
              </div>
              <Button variant="primary" fullWidth onClick={() => setProfileModal(null)}>Save Settings</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNT SETTINGS MODAL ── */}
      {profileModal === 'account' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Account Settings</h3>
              <button onClick={() => setProfileModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input type="password" placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
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
                <Button variant="secondary" fullWidth onClick={() => setProfileModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setProfileModal(null)}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PAYMENT METHOD MODAL ── */}
      {showAddPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddPayment(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Add Payment Method</h3>
              <button onClick={() => setShowAddPayment(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white mb-2">
                <p className="text-brand-200 text-xs mb-4">Card Number</p>
                <p className="font-mono text-lg tracking-widest">{newCard.number || '•••• •••• •••• ••••'}</p>
                <div className="flex justify-between mt-4 text-xs text-brand-200">
                  <span>{newCard.expiry || 'MM/YY'}</span>
                  <span>CVV</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                  value={newCard.number} onChange={e => setNewCard(p => ({ ...p, number: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                  <input type="text" placeholder="MM/YY" maxLength={5}
                    value={newCard.expiry} onChange={e => setNewCard(p => ({ ...p, expiry: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CVV</label>
                  <input type="text" placeholder="123" maxLength={4}
                    value={newCard.cvc} onChange={e => setNewCard(p => ({ ...p, cvc: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setShowAddPayment(false)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={() => setShowAddPayment(false)}>Add Card</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
