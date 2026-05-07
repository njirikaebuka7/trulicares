import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, Plus, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, CreditCard,
  FileText, X, Home, LayoutDashboard, Users
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  mockMatches, mockCaregivers, careCategoryLabels,
  mockCareRequests, mockSchedule, mockPayments
} from '@/data/mock';
import { cn } from '@/utils/cn';

type Tab = 'Overview' | 'My Requests' | 'Matches' | 'Schedule' | 'Messages' | 'Payments' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'My Requests', label: 'My Requests', icon: <FileText className="w-5 h-5" />, badge: 2 },
  { id: 'Matches', label: 'Matches', icon: <Users className="w-5 h-5" />, badge: 3 },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'Messages', label: 'Messages', icon: <MessageCircle className="w-5 h-5" />, badge: 1 },
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const handleLogout = () => { logout(); navigate('/'); };

  const notifications = [
    { id: 'n1', text: 'Sarah Johnson accepted your request', time: '10 min ago', read: false },
    { id: 'n2', text: 'New match found for Senior Care', time: '2 hrs ago', read: false },
    { id: 'n3', text: 'Upcoming session tomorrow at 8am', time: '1 day ago', read: true },
  ];
  const unread = notifications.filter(n => !n.read).length;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'U';

  return (
    <div className="flex bg-gray-50 min-h-screen">

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className="hidden lg:flex flex-col fixed top-16 lg:top-[72px] left-0 bottom-0 w-64 bg-white border-r border-gray-100 z-20">
        {/* User profile */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
            <Home className="w-3 h-3" /> Family Account
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === item.id
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  activeTab === item.id ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0">
          <h1 className="text-base font-bold text-gray-900">
            {navItems.find(n => n.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-coral-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className={cn('px-4 py-3 border-b border-gray-50 last:border-0', !n.read && 'bg-brand-50/50')}>
                      <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer lg:hidden"
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
                <StatCard label="Active Matches" value={mockMatches.filter(m => m.status === 'accepted').length}
                  icon={<Shield className="w-4 h-4" />} sub="2 new this week" colorBg="bg-brand-50" colorText="text-brand-600" />
                <StatCard label="Sessions" value={2} icon={<Calendar className="w-4 h-4" />}
                  sub="Next: Today 8am" colorBg="bg-emerald-50" colorText="text-emerald-600" />
                <StatCard label="Messages" value={3} icon={<MessageCircle className="w-4 h-4" />}
                  sub="1 unread" colorBg="bg-sky-50" colorText="text-sky-600" />
                <StatCard label="Total Spent" value="$464" icon={<CreditCard className="w-4 h-4" />}
                  sub="This month" colorBg="bg-violet-50" colorText="text-violet-600" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Upcoming Sessions</h3>
                    <button onClick={() => setActiveTab('Schedule')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {mockSchedule.slice(0, 3).map(session => (
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
                    {mockCareRequests.map(req => (
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
                  {mockMatches.slice(0, 2).map((match, i) => (
                    <div key={match.id} className="flex items-center gap-4 px-5 py-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', avatarColors[i % avatarColors.length])}>
                        {match.caregiver.name.split(' ').map(n => n[0]).join('')}
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
              {mockCareRequests.map(req => (
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
                          {req.status === 'matched' ? `${req.matchCount} Matches Found` : req.status === 'matching' ? 'Finding Matches…' : req.status}
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
                    <Button variant="ghost" size="sm">Edit Request</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50">Cancel</Button>
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
              {mockMatches.map((match, i) => (
                <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0', avatarColors[i % avatarColors.length])}>
                      {match.caregiver.name.split(' ').map(n => n[0]).join('')}
                    </div>
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
                  <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3 flex-wrap">
                    {match.messagingUnlocked ? (
                      <Button variant="primary" size="sm" onClick={() => setActiveTab('Messages')}>
                        <MessageCircle className="w-4 h-4" /> Message
                      </Button>
                    ) : (
                      <Button variant="coral" size="sm">
                        <DollarSign className="w-4 h-4" /> Unlock Messaging
                      </Button>
                    )}
                    <Button variant="secondary" size="sm">View Full Profile</Button>
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
                {mockSchedule.map(session => (
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
          {activeTab === 'Messages' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              {selectedMessage ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <button onClick={() => setSelectedMessage(null)} className="text-sm text-brand-600 hover:underline">← Back</button>
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs', avatarColors[0])}>SJ</div>
                    <span className="font-semibold text-gray-900">Sarah Johnson</span>
                  </div>
                  <div className="px-5 py-6 space-y-4 min-h-64">
                    <div className="flex gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0', avatarColors[0])}>SJ</div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-sm">
                        <p className="text-sm text-gray-800">Hi! Thank you for reaching out. I'd love to learn more about your family's needs.</p>
                        <p className="text-xs text-gray-400 mt-1">2:30 PM</p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="bg-brand-600 rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm">
                        <p className="text-sm text-white">Great! We have two kids, ages 3 and 6. Looking for full-time care starting next month.</p>
                        <p className="text-xs text-brand-200 mt-1">2:35 PM</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                    <input type="text" placeholder="Type a message…" className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-brand-400" />
                    <Button variant="primary" size="sm">Send</Button>
                  </div>
                </div>
              ) : (
                mockCaregivers.slice(0, 3).map((cg, i) => (
                  <div key={cg.id} onClick={() => setSelectedMessage(cg.id)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0', avatarColors[i % avatarColors.length])}>
                      {cg.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-semibold text-gray-900">{cg.name}</h4>
                        <span className="text-xs text-gray-400">2:35 PM</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">Thank you for reaching out! I'd love to discuss your care needs...</p>
                    </div>
                    {i === 0 && <span className="w-2.5 h-2.5 bg-brand-500 rounded-full shrink-0" />}
                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {activeTab === 'Payments' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-brand-600 text-white rounded-2xl p-5">
                  <p className="text-brand-200 text-sm mb-1">This Month</p>
                  <p className="text-3xl font-bold">$464.99</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-gray-500 text-sm mb-1">Last Month</p>
                  <p className="text-3xl font-bold text-gray-900">$720.00</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-gray-500 text-sm mb-1">All Time</p>
                  <p className="text-3xl font-bold text-gray-900">$2,840</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Transactions</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {mockPayments.map(pay => (
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
                <h3 className="font-bold text-gray-900 mb-4">Payment Method</h3>
                <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-900">Visa ending in 4242</p>
                    <p className="text-sm text-gray-400">Expires 08/27</p>
                  </div>
                  <span className="ml-auto text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Default</span>
                </div>
                <Button variant="secondary" size="sm" className="mt-3">+ Add Payment Method</Button>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'Profile' && (
            <div className="space-y-5 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{user?.name || 'User'}</h2>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      <Check className="w-3 h-3" /> Verified Account
                    </span>
                  </div>
                  <Button variant="secondary" size="sm">Edit Profile</Button>
                </div>
                <div className="space-y-1">
                  {[
                    { icon: <User className="w-5 h-5" />, label: 'Personal Information' },
                    { icon: <Bell className="w-5 h-5" />, label: 'Notification Preferences' },
                    { icon: <Shield className="w-5 h-5" />, label: 'Privacy & Safety' },
                    { icon: <CreditCard className="w-5 h-5" />, label: 'Billing & Payments' },
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
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Log Out</span>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 px-1 pb-safe">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2 py-2.5 min-w-0 flex-1 transition-colors',
                activeTab === item.id ? 'text-brand-600' : 'text-gray-400'
              )}
            >
              {item.badge && (
                <span className="absolute top-1.5 right-1/2 translate-x-3 w-4 h-4 bg-coral-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              <span className={cn('transition-transform', activeTab === item.id && 'scale-110')}>{item.icon}</span>
              <span className="text-[10px] font-medium leading-none truncate w-full text-center">{item.label.split(' ')[0]}</span>
              {activeTab === item.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
