import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, TrendingUp,
  Briefcase, X, CheckCircle, XCircle, Edit3, AlertCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  mockJobRequests, mockCaregiverClients, mockEarnings,
  mockCaregiverReviews, mockCaregiverSchedule
} from '@/data/mock';
import { cn } from '@/utils/cn';

const tabs = ['Overview', 'Job Requests', 'My Clients', 'Schedule', 'Earnings', 'Reviews', 'Profile'];
const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'];

function StatCard({ label, value, icon, sub, trend }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string; trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          {icon}
        </div>
      </div>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {trend && <p className="text-xs text-emerald-600 font-semibold mt-1">{trend}</p>}
    </div>
  );
}

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [notifOpen, setNotifOpen] = useState(false);
  const [jobStatuses, setJobStatuses] = useState<Record<string, 'accepted' | 'declined' | null>>({});
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'away'>('available');

  const handleLogout = () => { logout(); navigate('/'); };

  const handleJob = (id: string, action: 'accepted' | 'declined') => {
    setJobStatuses(prev => ({ ...prev, [id]: action }));
  };

  const maxEarning = Math.max(...mockEarnings.weeklyBreakdown.map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <h1 className="text-base font-bold text-gray-900">Caregiver Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className={cn('w-2 h-2 rounded-full', availabilityStatus === 'available' ? 'bg-green-400' : availabilityStatus === 'busy' ? 'bg-amber-400' : 'bg-gray-400')} />
                <select
                  value={availabilityStatus}
                  onChange={e => setAvailabilityStatus(e.target.value as typeof availabilityStatus)}
                  className="text-xs font-medium text-gray-600 bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                </select>
              </div>
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-coral-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">2</span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-bold text-gray-900 text-sm">Notifications</span>
                      <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {[
                      { text: '2 new job requests match your profile', time: '30 min ago', unread: true },
                      { text: 'Johnson Family left you a 5-star review', time: '3 hrs ago', unread: true },
                      { text: 'Weekly payout of $540 processed', time: '2 days ago', unread: false },
                    ].map((n, i) => (
                      <div key={i} className={cn('px-4 py-3 border-b border-gray-50 last:border-0', n.unread && 'bg-emerald-50/40')}>
                        <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
              <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
              <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back</p>
              <h2 className="text-2xl font-bold mb-1">{user?.name || 'Caregiver'}</h2>
              <p className="text-emerald-200 text-sm mb-5">You have <strong className="text-white">{mockJobRequests.filter(j => !jobStatuses[j.id]).length} new job requests</strong> waiting for you.</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('Job Requests')}
                  className="bg-white text-emerald-700 border-white hover:bg-emerald-50"
                >
                  View Job Requests
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('Earnings')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  View Earnings
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Active Clients"
                value={mockCaregiverClients.filter(c => c.status === 'active').length}
                icon={<User className="w-4 h-4" />}
                sub="2 ongoing"
              />
              <StatCard
                label="This Week"
                value={`$${mockEarnings.thisWeek}`}
                icon={<DollarSign className="w-4 h-4" />}
                sub="3 sessions"
                trend="↑ 9% vs last week"
              />
              <StatCard
                label="Avg Rating"
                value="4.9"
                icon={<Star className="w-4 h-4" />}
                sub="47 reviews"
                trend="Top 5% of caregivers"
              />
              <StatCard
                label="Profile Views"
                value={128}
                icon={<TrendingUp className="w-4 h-4" />}
                sub="This month"
                trend="↑ 23% vs last month"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">New Job Requests</h3>
                  <button onClick={() => setActiveTab('Job Requests')} className="text-sm text-emerald-600 font-medium hover:underline">View all</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {mockJobRequests.slice(0, 2).map((job, i) => (
                    <div key={job.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
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
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                        {session.status}
                      </span>
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
                {mockEarnings.weeklyBreakdown.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative flex items-end" style={{ height: '72px' }}>
                      <div
                        className={cn('w-full rounded-t-lg transition-all', d.amount > 0 ? 'bg-emerald-500' : 'bg-gray-100')}
                        style={{ height: d.amount > 0 ? `${(d.amount / maxEarning) * 72}px` : '8px' }}
                      />
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
                        <span className={cn(
                          'text-xs px-2.5 py-0.5 rounded-full font-semibold',
                          job.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {job.status === 'new' ? 'New' : 'Viewed'}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{job.postedAt}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{job.service} · {job.children}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.schedule}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold"><DollarSign className="w-3 h-3" /> {job.budget}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    {jobAction ? (
                      <div className={cn(
                        'flex items-center gap-2 text-sm font-semibold',
                        jobAction === 'accepted' ? 'text-green-600' : 'text-red-500'
                      )}>
                        {jobAction === 'accepted' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {jobAction === 'accepted' ? 'Request Accepted' : 'Request Declined'}
                        <button onClick={() => setJobStatuses(prev => ({ ...prev, [job.id]: null }))} className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline">Undo</button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <Button variant="primary" size="sm" onClick={() => handleJob(job.id, 'accepted')}
                          className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25">
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
                    <span className={cn(
                      'text-xs px-2.5 py-0.5 rounded-full font-semibold',
                      client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {client.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{client.service} · Client since {client.since}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>{client.totalSessions} sessions completed</span>
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
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
            <div className="space-y-3">
              {mockCaregiverSchedule.map(session => (
                <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-1.5 h-16 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{session.familyName}</p>
                    <p className="text-sm text-gray-500">{session.service}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold shrink-0">
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EARNINGS ── */}
        {activeTab === 'Earnings' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Earnings</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'This Week', value: `$${mockEarnings.thisWeek}` },
                { label: 'This Month', value: `$${mockEarnings.thisMonth.toLocaleString()}` },
                { label: 'Last Month', value: `$${mockEarnings.lastMonth.toLocaleString()}` },
                { label: 'All Time', value: `$${mockEarnings.totalAllTime.toLocaleString()}` },
              ].map((e, i) => (
                <div key={i} className={cn('rounded-2xl p-5', i === 0 ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-100')}>
                  <p className={cn('text-sm mb-1', i === 0 ? 'text-emerald-200' : 'text-gray-500')}>{e.label}</p>
                  <p className={cn('text-3xl font-bold', i === 0 ? 'text-white' : 'text-gray-900')}>{e.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Weekly Breakdown</h3>
              <div className="flex items-end gap-2" style={{ height: '100px' }}>
                {mockEarnings.weeklyBreakdown.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative flex items-end" style={{ height: '72px' }}>
                      <div
                        className={cn('w-full rounded-t-lg', d.amount > 0 ? 'bg-emerald-500' : 'bg-gray-100')}
                        style={{ height: d.amount > 0 ? `${(d.amount / maxEarning) * 72}px` : '8px' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{d.day}</span>
                    {d.amount > 0 && <span className="text-xs text-emerald-600 font-semibold">${d.amount}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Recent Payouts</h3>
              </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Reviews & Ratings</h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-900">4.9</p>
                <div className="flex gap-0.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-xs text-gray-400 mt-1">47 reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = star === 5 ? 42 : star === 4 ? 4 : star === 3 ? 1 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / 47) * 100}%` }} />
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
                    {Array.from({ length: review.rating }).map((_, i) => (
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
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <User className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Caregiver'}</h2>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                  <div className="flex gap-2 mt-2">
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
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Specialties</p>
                  <p className="font-semibold text-gray-900">Child Care</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Hourly Rate</p>
                  <p className="font-semibold text-gray-900">$18 – $25/hr</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Availability</p>
                  <p className="font-semibold text-gray-900">Full-time</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Experience</p>
                  <p className="font-semibold text-gray-900">8 years</p>
                </div>
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
  );
}
