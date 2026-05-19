import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, TrendingUp,
  Briefcase, X, CheckCircle, XCircle, Edit3, LayoutDashboard,
  ChevronLeft, ChevronRight as ChevronRightIcon, Camera, Send, MoreHorizontal, Loader2, Plus, AlertCircle, Phone, Trash2, Upload, Zap, CreditCard, Flag, AlertTriangle, Ban
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ReportModal from '@/components/ReportModal';
import { useAuth } from '@/context/AuthContext';
import { detectLocationWithZip } from '@/utils/geolocation';
import { auth as authApi, get, post, put } from '@/lib/api';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import logoImg from '@/assets/logo.png';

type Tab = 'Overview' | 'Job Requests' | 'Messages' | 'Schedule' | 'Reviews' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'Job Requests', label: 'Job Requests', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'Messages', label: 'Messages', icon: <MessageCircle className="w-5 h-5" /> },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'Reviews', label: 'Reviews', icon: <Star className="w-5 h-5" /> },
  { id: 'Profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'];

const SPECIALTY_MAP: Record<string, string> = {
  'child-care': 'Child Care',
  'Child Care': 'Child Care',
  'senior-care': 'Senior Care',
  'Senior Care': 'Senior Care',
  'adult-care': 'Adult Care',
  'Adult Care': 'Adult Care',
  'cleaning': 'Cleaning',
  'Cleaning': 'Cleaning',
  'tutoring': 'Tutoring',
  'Tutoring': 'Tutoring',
  'pet-care': 'Pet Care',
  'Pet Care': 'Pet Care',
};

const DB_SPECIALTY_MAP: Record<string, string> = {
  'Child Care': 'child-care',
  'Senior Care': 'senior-care',
  'Adult Care': 'adult-care',
  'Cleaning': 'cleaning',
  'Tutoring': 'tutoring',
  'Pet Care': 'pet-care',
};

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [jobStatuses, setJobStatuses] = useState<Record<string, 'accepted' | 'declined' | null>>({});
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'away'>('available');
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoUrl || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cgExperience, setCgExperience] = useState<number>(0);
  const [showBookModal, setShowBookModal] = useState<null | { familyId?: string; familyName?: string; service?: string }>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookStartTime, setBookStartTime] = useState('09:00');
  const [bookEndTime, setBookEndTime] = useState('17:00');
  const [bookLocation, setBookLocation] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cgModal, setCgModal] = useState<null | 'bio' | 'rates' | 'availability' | 'notifications' | 'account' | 'serviceArea'>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<any | null>(null);
  const [cgBio, setCgBio] = useState('');
  const [cgRate, setCgRate] = useState({ min: 15, max: 30 });
  const [cgLocation, setCgLocation] = useState('');
  const [cgServiceZips, setCgServiceZips] = useState<string[]>([]);
  const [cgZipInput, setCgZipInput] = useState('');
  const [cgLocating, setCgLocating] = useState(false);
  const [cgNotifPrefs, setCgNotifPrefs] = useState({ email: true, sms: true, push: true, marketing: false });
  const [cgSelectedMsg, setCgSelectedMsg] = useState<string | null>(null);
  const [cgMsgInput, setCgMsgInput] = useState('');
  const [cgFamilyMessages, setCgFamilyMessages] = useState<Record<string, { text: string; fromMe: boolean; time: string }[]>>({});
  const cgMsgEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [cgSaving, setCgSaving] = useState(false);
  const [cgToast, setCgToast] = useState<string | null>(null);
  const [cgSpecialties, setCgSpecialties] = useState<string[]>([]);
  const [cgAvailType, setCgAvailType] = useState('Flexible');
  const [cgPasswordForm, setCgPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [cgPasswordError, setCgPasswordError] = useState('');
  const [bgCheckModalOpen, setBgCheckModalOpen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [showReportModal, setShowReportModal] = useState<null | { reportedUserId: string; reportedUserName: string; requestId?: string; refId?: string }>(null);

  const getDisplayName = (familyName: string, unlocked: boolean) => {
    if (unlocked) return familyName;
    const parts = (familyName || '').trim().split(' ');
    if (parts.length <= 1) return familyName || 'Family';
    return parts[0] + ' ' + parts[1][0] + '.';
  };

  useEffect(() => {
    if (user?.photoUrl) {
      setPhotoUrl(user.photoUrl);
    }
  }, [user?.photoUrl]);

  // Schedule calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null);
  const [caregiverId, setCaregiverId] = useState<string | null>(null);

  // Background check state: 'none' | 'pending' | 'approved' | 'awaiting_payment'
  const [bgCheckStatus, setBgCheckStatus] = useState<'none' | 'pending' | 'approved' | 'awaiting_payment'>('none');
  const [bgStep, setBgStep] = useState(1);

  const [jobRequests, setJobRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cgSchedule, setCgSchedule] = useState<any[]>([]);
  const [cgReviews, setCgReviews] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setCgToast(msg);
    setTimeout(() => setCgToast(null), 3000);
  };

  const canRevealFamilyIdentity = (job: any) => Boolean(job?.messagingUnlocked || job?.status === 'accepted');

  const loadCgMessages = async (convId: string) => {
    try {
      const d: any = await get(`/conversations/${convId}/messages`);
      const msgs = (d.messages || []).map((m: any) => ({
        text: m.content,
        fromMe: m.isOwn,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setCgFamilyMessages(prev => ({ ...prev, [convId]: msgs }));
    } catch {}
  };

  useEffect(() => {
    if (!cgSelectedMsg) return;
    loadCgMessages(cgSelectedMsg);
    const timer = setInterval(() => loadCgMessages(cgSelectedMsg), 3000);
    return () => clearInterval(timer);
  }, [cgSelectedMsg]);

  const fetchData = useCallback(() => {
    if (!user?.id) return;
    Promise.all([
      get('/matches').then((d: any) => setJobRequests(d.matches || [])).catch(() => {}),
      get('/schedule').then((d: any) => setCgSchedule(d.schedule || [])).catch(() => {}),
      get('/reviews').then((d: any) => setCgReviews(d.reviews || [])).catch(() => {}),
      get('/conversations').then((d: any) => setConversations(d.conversations || [])).catch(() => {}),
      get('/clients').then((d: any) => setClients(d.clients || [])).catch(() => {}),
      get('/notifications').then((d: any) => setDbNotifications(d.notifications || [])).catch(() => {}),
      get('/caregivers/profile/me').then((d: any) => {
        if (d?.caregiver) {
          const cg = d.caregiver;
          if (cg.id) setCaregiverId(cg.id);
          setCgBio(cg.bio || '');
          if (cg.hourlyRate) setCgRate({ min: cg.hourlyRate[0], max: cg.hourlyRate[1] });
          setCgLocation(cg.location || '');
          setCgServiceZips(cg.serviceZips || []);
          setCgSpecialties((cg.specialties || []).map((s: string) => SPECIALTY_MAP[s] || s));
          setCgExperience(cg.yearsExperience || 0);
          setPhotoUrl(cg.photoUrl || null);
          setBgCheckStatus((cg.backgroundCheckStatus || 'none') as any);
          setCgAvailType(cg.availability || 'Flexible');
        }
      }).catch(() => {}),
    ]).catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, [user?.id]);

  // Real-time subscription for new matches/job requests
  useEffect(() => {
    if (!caregiverId) return;

    const channel = supabase
      .channel('caregiver-matches')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for inserts (new requests) and updates
          schema: 'public',
          table: 'matches',
          filter: `caregiver_id=eq.${caregiverId}`,
        },
        () => {
          // Refresh data immediately when a change is detected
          fetchData();
          showToast('New update received!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caregiverId, fetchData]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('caregiver-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchData]);

  useEffect(() => {
    fetchData();

    // 1. WebSocket-based real-time database listener
    const channel = supabase
      .channel('caregiver-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        console.log('⚡ Realtime Match table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_requests' }, () => {
        console.log('⚡ Realtime Care Request table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        console.log('⚡ Realtime Schedule table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        console.log('⚡ Realtime Conversations table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        console.log('⚡ Realtime Messages table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        console.log('⚡ Realtime Reviews table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        console.log('⚡ Realtime Payments table mutated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        console.log('⚡ Realtime Notifications table mutated');
        fetchData();
      })
      .subscribe();

    // 2. Slow fallback poll (30s) as a resilient safety net for offline users or disabled tables
    const fallbackTimer = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackTimer);
    };
  }, [fetchData]);

  // Handle background check payment success sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bgPaymentStatus = params.get('bg_payment');
    const sessionId = params.get('session_id');
    if (bgPaymentStatus === 'success' && sessionId) {
      post('/caregivers/background-check/pay-success', { sessionId })
        .then(() => {
          showToast('Payment successful! Your professional background check has been ordered.');
          fetchData();
        })
        .catch(() => {
          showToast('Failed to synchronize background check order.');
        });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (bgPaymentStatus === 'cancelled') {
      showToast('Payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchData]);

  const handleLogout = () => { logout(); navigate('/'); };
  const handleJob = async (id: string, action: 'accepted' | 'declined') => {
    setJobStatuses(prev => ({ ...prev, [id]: action }));
    try {
      await put(`/matches/${id}/${action === 'accepted' ? 'accept' : 'decline'}`);
    } catch (err) {
      console.error('Failed to update match status:', err);
      setJobStatuses(prev => ({ ...prev, [id]: null }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { showToast('Image must be under 2 MB'); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res: any = await put('/auth/profile', { photoUrl: base64 });
        updateUser({ photoUrl: res.photoUrl ?? base64 });
        setPhotoUrl(res.photoUrl ?? base64);
        showToast('Profile photo updated successfully!');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload photo');
      } finally {
        setPhotoUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };
  
  const [bgCheckUploading, setBgCheckUploading] = useState(false);
  const handleBgCheckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { showToast('Document must be under 5 MB'); return; }
    setBgCheckUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        await post('/caregivers/background-check', {
          documentBase64: base64,
          documentName: file.name,
        });
        setBgCheckStatus('awaiting_payment');
        setBgStep(2);
        showToast('Document uploaded successfully! Please proceed to payment to finish.');
      } catch (err: any) {
        showToast(err.message || 'Failed to submit document');
      } finally {
        setBgCheckUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const [bgCheckPaying, setBgCheckPaying] = useState(false);
  const handleBgStripeCheckout = async () => {
    setBgCheckPaying(true);
    try {
      const res: any = await post('/payments/checkout', { isBackgroundCheck: true });
      if (res.url) {
        window.location.href = res.url;
      } else {
        showToast('Failed to initiate payment. Stripe connection is not ready.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to start background check checkout session.');
    } finally {
      setBgCheckPaying(false);
    }
  };

  const pendingJobsCount = jobRequests.filter((j: any) => (j.status === 'pending' || j.status === 'matching') && !jobStatuses[j.id]).length;
  const unreadMsgCount = conversations.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'C';
  const dbUnreadNotifCount = dbNotifications.filter((n: any) => !(n.read ?? n.isRead ?? false)).length;
  const unread = notificationsRead ? 0 : dbUnreadNotifCount;

  const openBgCheckModal = () => {
    if (bgCheckStatus === 'awaiting_payment') {
      setBgStep(2);
    } else {
      setBgStep(1);
    }
    setBgCheckModalOpen(true);
  };

  const openNotifications = () => {
    setNotifOpen(true);
    setNotificationsRead(true);
    // Mark all as read in DB if needed
    post('/notifications/read-all', {}).catch(() => {});
    setDbNotifications(prev => prev.map((n: any) => ({ ...n, read: true, isRead: true })));
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Setting up your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen relative">
      {user?.status === 'suspended' && (
        <div className="fixed inset-0 z-[300] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6">
            <Ban className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Account Suspended</h2>
          <p className="text-gray-600 max-w-md mb-8">
            Your account has been suspended for violating our terms of service or due to a pending investigation. 
            You cannot accept new requests or message families at this time.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button variant="primary" fullWidth onClick={() => window.location.href = 'mailto:support@trulicares.com'}>
              Contact Support
            </Button>
            <Button variant="ghost" fullWidth onClick={logout}>
              Log Out
            </Button>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {cgToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in-up pointer-events-none">
          {cgToast}
        </div>
      )}


      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-20 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        'bg-emerald-950'
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
                {(item.id === 'Job Requests' ? pendingJobsCount : item.id === 'Messages' ? unreadMsgCount : 0) > 0 && collapsed && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                    {item.id === 'Job Requests' ? pendingJobsCount : unreadMsgCount}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {(item.id === 'Job Requests' ? pendingJobsCount : item.id === 'Messages' ? unreadMsgCount : 0) > 0 && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activeTab === item.id ? 'bg-white/20 text-white' : 'bg-coral-500/20 text-coral-300')}>
                      {item.id === 'Job Requests' ? pendingJobsCount : unreadMsgCount}
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
      <div className={cn('flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>

        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-7 w-auto lg:hidden" />
            </Link>
            <h1 className="hidden lg:block text-base font-bold text-gray-900">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
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
            <div className="relative lg:hidden">
              <button
                onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold transition-all active:scale-95 overflow-hidden"
              >
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : initials}
              </button>
              {mobileUserMenuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Caregiver'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setMobileUserMenuOpen(false); setActiveTab('Profile'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
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
              {dbNotifications.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-gray-400">No notifications yet.</div>
              ) : dbNotifications.slice(0, 5).map((n: any) => {
                const isRead = n.read ?? n.isRead ?? false;
                return (
                  <div key={n.id} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", isRead ? "bg-gray-300" : "bg-emerald-500")} />
                    <div>
                      <p className={cn("text-sm font-medium", isRead ? "text-gray-600" : "text-gray-900")}>{n.content || n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : n.timeAgo}</p>
                    </div>
                  </div>
                );
              })}
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
                  You have <strong className="text-white">{jobRequests.filter((j: any) => !jobStatuses[j.id]).length} new job requests</strong> waiting.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button size="sm" onClick={() => setActiveTab('Job Requests')}
                    className="bg-white text-emerald-700 border-white hover:bg-emerald-50 rounded-full">
                    View Job Requests
                  </Button>
                </div>
              </div>

              {/* Live stats */}
              {(() => {
                const activeClients = new Set(
                  clients
                    .filter((c: any) => c.active || c.messagingUnlocked)
                    .map((c: any) => c.id)
                ).size;
                const upcomingCount = cgSchedule.length;
                const avgRating = cgReviews.length > 0
                  ? (cgReviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / cgReviews.length).toFixed(1)
                  : '—';
                const pendingCount = jobRequests.filter((j: any) => (j.status === 'pending' || j.status === 'matching') && !jobStatuses[j.id]).length;
                const stats = [
                  { label: 'Active Clients', value: activeClients, icon: <User className="w-4 h-4" />,
                    sub: activeClients === 0 ? 'No active clients' : `${activeClients} ongoing`, bg: 'bg-emerald-50', txt: 'text-emerald-600' },
                  { label: 'Sessions', value: upcomingCount, icon: <Calendar className="w-4 h-4" />,
                    sub: upcomingCount === 0 ? 'None scheduled' : 'Upcoming sessions', bg: 'bg-sky-50', txt: 'text-sky-600' },
                  { label: 'Avg Rating', value: avgRating, icon: <Star className="w-4 h-4" />,
                    sub: cgReviews.length > 0 ? `${cgReviews.length} reviews` : 'No reviews yet', bg: 'bg-amber-50', txt: 'text-amber-600' },
                  { label: 'Pending Requests', value: pendingCount, icon: <TrendingUp className="w-4 h-4" />,
                    sub: pendingCount === 0 ? 'All caught up' : 'Awaiting your response', bg: 'bg-violet-50', txt: 'text-violet-600' },
                ];
                return (
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
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
                );
              })()}

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">New Job Requests</h3>
                    <button onClick={() => setActiveTab('Job Requests')} className="text-sm text-emerald-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {jobRequests.slice(0, 2).map((job: any, i: number) => (
                      <div key={job.id} className="px-5 py-4 flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0', avatarColors[i])}>
                          {(job.familyName || '?').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{getDisplayName(job.familyName, canRevealFamilyIdentity(job))}</p>
                          <p className="text-xs text-gray-500">{job.details?.schedule || job.location || ''}</p>
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
                    {cgSchedule.slice(0, 3).map((session: any) => (
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

            </div>
          )}

          {/* ── JOB REQUESTS ── */}
          {activeTab === 'Job Requests' && (() => {
            // Filter out old/completed jobs
            const activeJobRequests = jobRequests.filter((j: any) => {
              if (j.status === 'completed' || j.status === 'declined' || j.status === 'cancelled') return false;
              if (j.scheduleDate) {
                const jobDate = new Date(j.scheduleDate);
                const diffHours = (new Date().getTime() - jobDate.getTime()) / (1000 * 60 * 60);
                if (diffHours > 48) return false;
              }
              return true;
            });
            
            return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Job Requests</h2>
                <span className="text-sm text-gray-500">{activeJobRequests.length} requests</span>
              </div>
              {activeJobRequests.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No job requests yet</p>
                  <p className="text-sm mt-1">When families match with you, their requests will appear here.</p>
                </div>
              )}
              {activeJobRequests.map((job: any, i: number) => {
                const jobAction = jobStatuses[job.id] || (job.status === 'accepted' ? 'accepted' : job.status === 'declined' ? 'declined' : null);
                const careLabel = { 'child-care': 'Child Care', 'senior-care': 'Senior Care', 'adult-care': 'Adult Care', 'cleaning': 'Cleaning Services' }[job.careType as string] || job.careType || 'Care';
                const childrenInfo = job.details?.numberOfChildren ? `${job.details.numberOfChildren} child${job.details.numberOfChildren > 1 ? 'ren' : ''}` : '';
                const scheduleInfo = job.details?.schedule || '';
                const isPending = job.status === 'pending' || job.status === 'matching';
                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0', avatarColors[i % avatarColors.length])}>
                        {(job.familyName || '?').charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900">{getDisplayName(job.familyName, canRevealFamilyIdentity(job))}</h3>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold',
                            isPending ? 'bg-blue-100 text-blue-700' :
                            jobAction === 'accepted' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600')}>
                            {isPending && !jobAction ? 'New' : jobAction === 'accepted' ? 'Accepted' : job.status}
                          </span>
                          {job.refId && (
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase tracking-wider">
                              ID: {job.refId}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{job.postedAt}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{careLabel}{childrenInfo ? ` · ${childrenInfo}` : ''}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {scheduleInfo && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scheduleInfo}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                          {job.budget && <span className="flex items-center gap-1 text-emerald-600 font-semibold"><DollarSign className="w-3 h-3" /> {job.budget}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {jobAction ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={cn('flex items-center gap-2 text-sm font-semibold',
                            jobAction === 'accepted' ? 'text-green-600' : 'text-red-500')}>
                            {jobAction === 'accepted' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {jobAction === 'accepted' ? 'Request Accepted' : 'Request Declined'}
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => setSelectedJobDetail(job)}>View Full Care Details</Button>
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
                          <Button variant="secondary" size="sm" onClick={() => setSelectedJobDetail(job)}>View Full Care Details</Button>
                          <button
                            onClick={() => setShowReportModal({
                              reportedUserId: job.familyId,
                              reportedUserName: job.familyName,
                              refId: job.refId
                            })}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-auto"
                            title="Report Issue"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )})()}



          {/* ── MESSAGES ── */}
          {activeTab === 'Messages' && (() => {
            const cgFamilies = conversations.map((conv: any, idx: number) => ({
              id: conv.id,
              name: conv.otherName || 'Family',
              care: conv.careType || 'Care',
              color: avatarColors[idx % avatarColors.length],
              unread: conv.unreadCount || 0,
              photoUrl: conv.otherPhoto || null,
            }));

            const sendCgMsg = async () => {
              if (!cgMsgInput.trim() || !cgSelectedMsg) return;
              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const content = cgMsgInput.trim();
              setCgFamilyMessages(prev => ({
                ...prev,
                [cgSelectedMsg]: [...(prev[cgSelectedMsg] || []), { text: content, fromMe: true, time }],
              }));
              setCgMsgInput('');
              try { await post(`/conversations/${cgSelectedMsg}/messages`, { content }); } catch {}
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
                      {family.photoUrl ? (
                        <img src={family.photoUrl} alt={family.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', family.color)}>
                          {family.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{family.name}</p>
                        <p className="text-xs text-emerald-600">● {family.care}</p>
                      </div>
                      <button
                        onClick={() => {
                          const conversation = conversations.find(c => c.id === cgSelectedMsg);
                          setShowBookModal({
                            familyId: conversation?.familyId || '',
                            familyName: family.name,
                            service: family.care
                          });
                          setBookLocation(conversation?.location || '');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors shrink-0"
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span className="hidden sm:inline">Book Session</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                      {msgs.map((m, i) => (
                        <div key={i} className={cn('flex gap-3', m.fromMe ? 'justify-end' : 'justify-start')}>
                          {!m.fromMe && (
                            family.photoUrl ? (
                              <img src={family.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 self-end" />
                            ) : (
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 self-end', family.color)}>
                                {family.name.charAt(0)}
                              </div>
                            )
                          )}
                          <div className={cn(
                            'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                            m.fromMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          )}>
                            <p>{m.text}</p>
                            <p className={cn('text-[10px] mt-0.5', m.fromMe ? 'text-emerald-200' : 'text-gray-400')}>{m.time}</p>
                          </div>
                        </div>
                      ))}
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
                        onClick={() => { setCgSelectedMsg(family.id); loadCgMessages(family.id); }}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        {family.photoUrl ? (
                          <div className="relative shrink-0">
                            <img src={family.photoUrl} alt={family.name} className="w-11 h-11 rounded-2xl object-cover" />
                            {family.unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                        ) : (
                          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 relative', family.color)}>
                            {family.name.charAt(0)}
                            {family.unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                        )}
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
          {activeTab === 'Schedule' && (() => {
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const now = new Date();
            const firstDay = new Date(calYear, calMonth, 1).getDay();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setCalSelectedDay(null); };
            const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setCalSelectedDay(null); };
            const parseDate = (s: any): Date | null => {
              if (!s.date) return null;
              let d: Date;
              const hasYear = /\b\d{4}\b/.test(s.date);
              if (hasYear) {
                d = new Date(s.date);
              } else {
                const stripped = s.date.replace(/^[A-Za-z]+,\s*/, '');
                d = new Date(`${stripped}, ${calYear}`);
              }
              return isNaN(d.getTime()) ? null : d;
            };
            const sessionsByDay = new Map<number, any[]>();
            cgSchedule.forEach((s: any) => {
              const d = parseDate(s);
              if (d && d.getFullYear() === calYear && d.getMonth() === calMonth) {
                const day = d.getDate();
                sessionsByDay.set(day, [...(sessionsByDay.get(day) || []), s]);
              }
            });
            const sessionDays = new Set(sessionsByDay.keys());
            const selectedSessions = calSelectedDay ? (sessionsByDay.get(calSelectedDay) || []) : cgSchedule;
            return (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-gray-900">{monthNames[calMonth]} {calYear}</span>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-2">
                    {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isToday = now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === day;
                      const hasSession = sessionDays.has(day);
                      const isSelected = calSelectedDay === day;
                      return (
                        <button key={day} onClick={() => setCalSelectedDay(isSelected ? null : day)}
                          className={cn(
                            'relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-sm font-medium transition-all',
                            isSelected ? 'bg-emerald-600 text-white' :
                            isToday ? 'bg-emerald-50 text-emerald-700 font-bold' :
                            hasSession ? 'hover:bg-emerald-50 text-gray-800' : 'hover:bg-gray-50 text-gray-500'
                          )}>
                          {day}
                          {hasSession && !isSelected && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {calSelectedDay && (
                    <p className="text-xs text-center text-emerald-600 font-medium mt-3">
                      Showing sessions for {monthNames[calMonth]} {calSelectedDay} · <button onClick={() => setCalSelectedDay(null)} className="underline">Clear</button>
                    </p>
                  )}
                </div>
                {selectedSessions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{calSelectedDay ? 'No sessions on this day' : 'No upcoming sessions'}</p>
                    <p className="text-sm text-gray-400 mt-1">When families book sessions with you, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSessions.map((session: any) => (
                      <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                        <div className="w-1.5 h-16 rounded-full bg-emerald-500 shrink-0" />
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{session.familyName || session.caregiverName || 'Session'}</p>
                          <p className="text-sm text-gray-500">{session.service} {session.refId && <span className="ml-2 font-mono text-[10px] bg-gray-50 px-1 py-0.5 rounded text-gray-400 uppercase tracking-tighter">ID: {session.refId}</span>}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.time}</span>
                            {session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={cn('text-xs px-3 py-1 rounded-full font-semibold',
                            session.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                            {session.status}
                          </span>
                          <button
                            onClick={() => setShowReportModal({
                              reportedUserId: session.familyId,
                              reportedUserName: session.familyName || 'Family',
                              refId: session.refId
                            })}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                            title="Report Issue"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}



          {/* ── REVIEWS ── */}
          {activeTab === 'Reviews' && (
            <div className="space-y-5 mt-1">
              <h2 className="text-xl font-bold text-gray-900">Reviews & Ratings</h2>
              {cgReviews.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm mt-1">Reviews from families will show up here after sessions.</p>
                </div>
              )}
              {cgReviews.length > 0 && (() => {
                const totalReviews = cgReviews.length;
                const avgRating = cgReviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / totalReviews;
                const starCounts = [5,4,3,2,1].map(star => ({ star, count: cgReviews.filter((r: any) => Math.round(r.rating) === star).length }));
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center shrink-0">
                      <p className="text-5xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-4 h-4', s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')} />)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-1.5 w-full">
                      {starCounts.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: totalReviews > 0 ? `${(count/totalReviews)*100}%` : '0%' }} />
                          </div>
                          <span className="text-xs text-gray-400 w-6">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {cgReviews.map((review: any) => (
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

              {/* Profile header card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    {photoUrl ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden">
                        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        {photoUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold relative">
                        {initials}
                        {photoUploading && (
                          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900">{user?.name || 'Caregiver'}</h3>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {bgCheckStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          <Check className="w-3 h-3" /> Background Checked
                        </span>
                      )}
                      {bgCheckStatus === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          <Clock className="w-3 h-3" /> Check Pending
                        </span>
                      )}
                      {bgCheckStatus === 'awaiting_payment' && (
                        <button
                          onClick={openBgCheckModal}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-bold transition-all cursor-pointer shadow-sm border border-orange-200"
                        >
                          <CreditCard className="w-3 h-3" /> Complete Application
                        </button>
                      )}
                      {bgCheckStatus === 'none' && (
                        <button
                          onClick={openBgCheckModal}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold transition-all cursor-pointer shadow-sm animate-pulse border border-blue-200"
                        >
                          <Shield className="w-3 h-3" /> Apply for Background
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Check card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                    bgCheckStatus === 'approved' ? 'bg-green-50' : bgCheckStatus === 'pending' ? 'bg-amber-50' : 'bg-gray-50')}>
                    <Shield className={cn('w-6 h-6',
                      bgCheckStatus === 'approved' ? 'text-green-600' : bgCheckStatus === 'pending' ? 'text-amber-600' : 'text-gray-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-0.5">Background Check</h4>
                    {bgCheckStatus === 'none' && (
                      <>
                        <p className="text-sm text-gray-500 mb-3">Upload your verification documents and order a background check to get verified. Verified caregivers get 3x more matches.</p>
                        <button
                          onClick={openBgCheckModal}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
                        >
                          <Shield className="w-4 h-4" />
                          Apply for Background Check
                        </button>
                      </>
                    )}
                    {bgCheckStatus === 'awaiting_payment' && (
                      <>
                        <p className="text-sm text-orange-700 font-medium mb-3">Documents uploaded! Please complete the payment to submit your application to our team.</p>
                        <button
                          onClick={openBgCheckModal}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
                        >
                          <CreditCard className="w-4 h-4" />
                          Complete Payment
                        </button>
                      </>
                    )}
                    {bgCheckStatus === 'pending' && (
                      <p className="text-sm text-amber-700 font-medium">Your background check is under review. We'll notify you once it's complete (typically 2–3 business days).</p>
                    )}
                    {bgCheckStatus === 'approved' && (
                      <p className="text-sm text-green-700 font-medium">✓ Your background check is approved. This badge is now visible to all families on your profile.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio & Specialties */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900">Bio & Specialties</h4>
                  <button onClick={() => setCgModal('bio')} className="text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl mb-3.5 w-fit border border-emerald-100">
                  <span>Experience: {cgExperience} years</span>
                </div>
                {cgBio ? (
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{cgBio}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-3">No bio added yet. Tell families about yourself!</p>
                )}
                {cgSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cgSpecialties.map(s => (
                      <span key={s} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rates & Availability */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">Hourly Rate</h4>
                    <button onClick={() => setCgModal('rates')} className="text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">${cgRate.min}<span className="text-lg text-emerald-500"> – ${cgRate.max}/hr</span></p>
                  <p className="text-xs text-gray-400 mt-1">Your quoted range for families</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">Availability</h4>
                    <button onClick={() => setCgModal('availability')} className="text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <p className="text-lg font-semibold text-gray-800">{cgAvailType}</p>
                  <p className="text-xs text-gray-400 mt-1">Arrange schedule with families</p>
                </div>
              </div>

              {/* Service Area */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900">Service Area</h4>
                  <button onClick={() => setCgModal('serviceArea')} className="text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                {cgLocation && (
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" /> {cgLocation}
                  </p>
                )}
                {cgServiceZips.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cgServiceZips.map(zip => (
                      <span key={zip} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        <MapPin className="w-3 h-3" /> {zip}
                      </span>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setCgModal('serviceArea')} className="text-sm text-emerald-600 font-medium hover:underline">
                    + Add ZIP codes or neighborhoods you cover
                  </button>
                )}
              </div>

              {/* Settings links */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {[
                  { icon: <Bell className="w-5 h-5" />, label: 'Notification Preferences', sub: 'Alerts for requests & messages', action: () => setCgModal('notifications') },
                  { icon: <Settings className="w-5 h-5" />, label: 'Account Settings', sub: 'Password & security', action: () => setCgModal('account') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">{item.icon}</span>
                      <div className="text-left">
                        <p className="font-medium text-gray-700 text-sm">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.sub}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-red-600">
                  <LogOut className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Log Out</p>
                    <p className="text-xs text-red-400">Sign out of your account</p>
                  </div>
                </button>
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
                  {['Child Care', 'Senior Care', 'Adult Care', 'Cleaning', 'Tutoring', 'Pet Care'].map(s => {
                    const isSelected = cgSpecialties.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCgSpecialties(prev => prev.filter(x => x !== s));
                          } else {
                            setCgSpecialties(prev => [...prev, s]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  value={cgExperience}
                  onChange={e => setCgExperience(Number(e.target.value))}
                  min={0}
                  max={50}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth disabled={cgSaving} onClick={async () => {
                  setCgSaving(true);
                  try {
                    const dbSpecialties = cgSpecialties.map(s => DB_SPECIALTY_MAP[s] || s.toLowerCase().replace(' ', '-'));
                    await put('/caregivers/profile', {
                      bio: cgBio,
                      specialties: dbSpecialties,
                      yearsExperience: cgExperience
                    });
                    showToast('Profile updated!');
                    setCgModal(null);
                    fetchData(); // Refresh local state to ensure sync
                  } catch {
                    showToast('Failed to save.');
                  } finally {
                    setCgSaving(false);
                  }
                }} className="bg-emerald-600 hover:bg-emerald-700">{cgSaving ? 'Saving…' : 'Save Changes'}</Button>
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
                <Button variant="primary" fullWidth disabled={cgSaving} onClick={async () => {
                  setCgSaving(true);
                  try { 
                    await put('/caregivers/profile', { hourlyRateMin: cgRate.min, hourlyRateMax: cgRate.max }); 
                    showToast('Rates saved!'); 
                    setCgModal(null); 
                    fetchData();
                  } catch { showToast('Failed to save.'); }
                  finally { setCgSaving(false); }
                }} className="bg-emerald-600 hover:bg-emerald-700">{cgSaving ? 'Saving…' : 'Save Rates'}</Button>
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
                <select value={cgAvailType} onChange={e => setCgAvailType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Weekends only</option>
                  <option>Evenings & Weekends</option>
                  <option>Flexible</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth disabled={cgSaving} onClick={async () => {
                  setCgSaving(true);
                  try { await put('/caregivers/profile', { availability: cgAvailType }); showToast('Availability saved!'); setCgModal(null); } catch { showToast('Failed to save.'); }
                  finally { setCgSaving(false); }
                }} className="bg-emerald-600 hover:bg-emerald-700">{cgSaving ? 'Saving…' : 'Save Availability'}</Button>
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
              <Button variant="primary" fullWidth disabled={cgSaving} onClick={async () => {
                setCgSaving(true);
                try { await put('/auth/notifications', cgNotifPrefs); showToast('Preferences saved!'); setCgModal(null); } catch { showToast('Failed to save.'); }
                finally { setCgSaving(false); }
              }} className="mt-2 bg-emerald-600 hover:bg-emerald-700">{cgSaving ? 'Saving…' : 'Save Preferences'}</Button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={cgPasswordForm.current}
                  onChange={e => setCgPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={cgPasswordForm.next}
                  onChange={e => setCgPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={cgPasswordForm.confirm}
                  onChange={e => setCgPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              {cgPasswordError && <p className="text-sm text-red-500">{cgPasswordError}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setCgModal(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={cgSaving}
                  onClick={async () => {
                    setCgPasswordError('');
                    if (!cgPasswordForm.current || !cgPasswordForm.next || !cgPasswordForm.confirm) {
                      setCgPasswordError('All password fields are required.');
                      return;
                    }
                    if (cgPasswordForm.next.length < 8) {
                      setCgPasswordError('New password must be at least 8 characters.');
                      return;
                    }
                    if (cgPasswordForm.next !== cgPasswordForm.confirm) {
                      setCgPasswordError('New password and confirmation do not match.');
                      return;
                    }

                    setCgSaving(true);
                    try {
                      await authApi.changePassword(cgPasswordForm.current, cgPasswordForm.next);
                      setCgPasswordForm({ current: '', next: '', confirm: '' });
                      setCgModal(null);
                      showToast('Password updated successfully!');
                    } catch (err: any) {
                      setCgPasswordError(err.message || 'Failed to update password.');
                    } finally {
                      setCgSaving(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {cgSaving ? 'Saving...' : 'Update Password'}
                </Button>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Service Location</label>
                <input
                  type="text"
                  value={cgLocation}
                  onChange={e => setCgLocation(e.target.value)}
                  placeholder="e.g. Brooklyn, NY"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>

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
                    if (address) setCgLocation(address);
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
                <Button variant="primary" fullWidth disabled={cgSaving} onClick={async () => {
                  setCgSaving(true);
                  try { await put('/caregivers/profile', { location: cgLocation, serviceZips: cgServiceZips }); showToast('Service area saved!'); setCgModal(null); fetchData(); } catch { showToast('Failed to save.'); }
                  finally { setCgSaving(false); }
                }} className="bg-emerald-600 hover:bg-emerald-700">{cgSaving ? 'Saving…' : 'Save Area'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedJobDetail(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Job Request Details</h3>
              <button onClick={() => setSelectedJobDetail(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Family</p>
                <p className="font-bold text-gray-900">{getDisplayName(selectedJobDetail.familyName, canRevealFamilyIdentity(selectedJobDetail))}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Service</p>
                  <p className="font-semibold text-gray-800">{selectedJobDetail.service}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Budget</p>
                  <p className="font-semibold text-emerald-600">{selectedJobDetail.budget || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
                <p className="text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" /> {selectedJobDetail.location}
                </p>
              </div>
              {selectedJobDetail.details?.schedule && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Schedule</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedJobDetail.details.schedule}</p>
                </div>
              )}
              {selectedJobDetail.details?.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Additional Details</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedJobDetail.details.description}</p>
                </div>
              )}

              {/* Dynamic Child Care / Senior Care detailed breakdown */}
              {selectedJobDetail.details && (
                <div className="bg-emerald-50/40 rounded-2xl border border-emerald-100 p-4 space-y-4 text-sm text-gray-800">
                  <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-widest border-b border-emerald-100 pb-1.5">Care Requirements</h4>
                  
                  {/* Children / Ages details */}
                  {(selectedJobDetail.details.numChildren !== undefined || selectedJobDetail.details.numberOfChildren !== undefined) && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-gray-500 font-medium">Children:</span>
                      <span className="font-bold text-right">
                        {selectedJobDetail.details.numChildren ?? selectedJobDetail.details.numberOfChildren} 
                        {selectedJobDetail.details.childAges && ` (Ages: ${selectedJobDetail.details.childAges.map((a: number) => a === 0 ? 'Under 1 yr' : `${a} yrs`).join(', ')})`}
                      </span>
                    </div>
                  )}

                  {/* Arranged Type */}
                  {selectedJobDetail.details.careType && (
                    <div className="flex items-start justify-between gap-4 border-t border-emerald-100/50 pt-2">
                      <span className="text-xs text-gray-500 font-medium">Care Arrangement:</span>
                      <span className="font-semibold">{selectedJobDetail.details.careType}</span>
                    </div>
                  )}

                  {/* Frequency */}
                  {selectedJobDetail.details.frequency && (
                    <div className="flex items-start justify-between gap-4 border-t border-emerald-100/50 pt-2">
                      <span className="text-xs text-gray-500 font-medium">Frequency:</span>
                      <span className="font-semibold">{selectedJobDetail.details.frequency}</span>
                    </div>
                  )}

                  {/* Help Needed */}
                  {selectedJobDetail.details.helpNeeded && Array.isArray(selectedJobDetail.details.helpNeeded) && selectedJobDetail.details.helpNeeded.length > 0 && (
                    <div className="border-t border-emerald-100/50 pt-2 space-y-1">
                      <span className="text-xs text-gray-500 font-medium block">Services Required:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedJobDetail.details.helpNeeded.map((h: string) => (
                          <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-medium">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Needs */}
                  {selectedJobDetail.details.specialNeeds && (
                    <div className="border-t border-emerald-100/50 pt-2 space-y-1">
                      <span className="text-xs text-gray-500 font-medium block">Special Needs / Care Instructions:</span>
                      <p className="text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100/40 italic leading-relaxed">
                        "{selectedJobDetail.details.specialNeeds}"
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Family Contact Info</p>
                {selectedJobDetail.messagingUnlocked || selectedJobDetail.status === 'accepted' ? (
                  <div className="space-y-2 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-sm">
                    <p className="text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" /> {selectedJobDetail.familyPhone || selectedJobDetail.details?.phone || 'No phone number shared'}
                    </p>
                    <p className="text-gray-700 flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" /> {selectedJobDetail.familyEmail || selectedJobDetail.details?.email || 'No email shared'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-center">
                    <Shield className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-amber-900 mb-0.5">🔒 Contact Details Locked</p>
                    <p className="text-[11px] text-amber-700 leading-normal">
                      Accept this job request. Direct messaging, emails, and phone channels will unlock as soon as the family secures the stripe reservation.
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-2">
                <Button variant="primary" fullWidth onClick={() => setSelectedJobDetail(null)} className="bg-emerald-600 hover:bg-emerald-700">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Session Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBookModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Book Care Session</h3>
              <button onClick={() => setShowBookModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Client Family</p>
                <p className="text-sm font-bold text-emerald-950 mt-0.5">{showBookModal.familyName}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Service: {showBookModal.service}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={e => setBookDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={bookStartTime}
                    onChange={e => setBookStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={bookEndTime}
                    onChange={e => setBookEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, New York"
                  value={bookLocation}
                  onChange={e => setBookLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setShowBookModal(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={bookSaving || !bookDate || !bookStartTime || !bookEndTime || !bookLocation}
                  onClick={async () => {
                    setBookSaving(true);
                    try {
                      const formatDateLabel = (dateStr: string) => {
                        if (!dateStr) return '';
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return '';
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
                      };

                      const formatTime12Hour = (timeStr: string) => {
                        if (!timeStr) return '';
                        const parts = timeStr.split(':');
                        let hour = parseInt(parts[0], 10);
                        const min = parts[1] || '00';
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        hour = hour % 12;
                        hour = hour ? hour : 12;
                        return `${hour}:${min} ${ampm}`;
                      };

                      const combinedTime = `${formatTime12Hour(bookStartTime)} - ${formatTime12Hour(bookEndTime)}`;

                      await post('/schedule', {
                        familyId: showBookModal.familyId,
                        service: showBookModal.service || 'Child Care',
                        date: formatDateLabel(bookDate),
                        time: combinedTime,
                        location: bookLocation
                      });

                      showToast('Care session booked successfully!');
                      fetchData();
                      setShowBookModal(null);
                      setBookDate('');
                      setBookStartTime('09:00');
                      setBookEndTime('17:00');
                      setBookLocation('');
                    } catch {
                      showToast('Failed to book session.');
                    } finally {
                      setBookSaving(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {bookSaving ? 'Scheduling…' : 'Schedule Session'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile) ── */}
      {(() => {
        const MOBILE_PRIMARY: Tab[] = ['Overview', 'Job Requests', 'Messages', 'Schedule', 'Profile'];
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
                        {(item.id === 'Job Requests' ? pendingJobsCount : item.id === 'Messages' ? unreadMsgCount : 0) > 0 && (
                          <span className="px-2 py-0.5 bg-coral-500 text-white text-[10px] font-bold rounded-full">
                            {item.id === 'Job Requests' ? pendingJobsCount : unreadMsgCount}
                          </span>
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
                    {(item.id === 'Job Requests' ? pendingJobsCount : item.id === 'Messages' ? unreadMsgCount : 0) > 0 && (
                      <span className="absolute top-2.5 right-[calc(50%-16px)] translate-x-3 w-4 h-4 bg-coral-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold leading-none">
                        {item.id === 'Job Requests' ? pendingJobsCount : unreadMsgCount}
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

            {/* Background Check Choice Modal */}
            {bgCheckModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBgCheckModalOpen(false)} />
                <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Apply for Background Check</h3>
                        <p className="text-xs text-gray-500 font-sans">Get background checked to unlock 3x more job requests</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBgCheckModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-8 overflow-y-auto space-y-8 flex-1">
                    {/* Stepper */}
                    <div className="flex items-center justify-center max-w-sm mx-auto mb-4">
                      <div className="flex items-center flex-1">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all", 
                          bgStep >= 1 ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400")}>
                          {bgStep > 1 ? <Check className="w-5 h-5" /> : "1"}
                        </div>
                        <div className={cn("flex-1 h-1 mx-2 rounded-full", bgStep > 1 ? "bg-emerald-600" : "bg-gray-100")} />
                      </div>
                      <div className="flex items-center">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all", 
                          bgStep === 2 ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-gray-100 text-gray-400")}>
                          2
                        </div>
                      </div>
                    </div>

                    {bgStep === 1 && (
                      <div className="animate-fade-in">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
                            <Upload className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Step 1: Upload Documents</h4>
                          <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Please upload a high-quality copy of your Driver's License, State ID, or professional care certifications for manual verification.
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
                          <ul className="text-sm text-gray-600 space-y-3 mb-8">
                            <li className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                              Valid Government Issued ID
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                              Professional care credentials (optional)
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                              Clear, legible scans or photos
                            </li>
                          </ul>

                          <label className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold cursor-pointer transition-all shadow-xl active:scale-95 group">
                            {bgCheckUploading ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                            )}
                            {bgCheckUploading ? 'Uploading Document...' : 'Select & Upload Document'}
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={handleBgCheckUpload}
                              disabled={bgCheckUploading}
                            />
                          </label>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                          <Shield className="w-4 h-4" />
                          <span>Encrypted and secure document storage</span>
                        </div>
                      </div>
                    )}

                    {bgStep === 2 && (
                      <div className="animate-fade-in">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                            <Zap className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Step 2: Instant Background Check</h4>
                          <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Pay for TruliCares to run a professional digital screening. This unlocks premium status and higher priority in searches.
                          </p>
                        </div>

                        <div className="bg-emerald-50/30 rounded-2xl p-6 border border-emerald-100 mb-8">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-sm font-bold text-emerald-900">Background Screening Fee</span>
                            <span className="text-2xl font-bold text-emerald-600">$39.00</span>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-3">
                            <li className="flex items-center gap-3">
                              <Check className="w-5 h-5 text-emerald-600 shrink-0" /> National criminal database check
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="w-5 h-5 text-emerald-600 shrink-0" /> Sex offender registry check
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="w-5 h-5 text-emerald-600 shrink-0" /> Identity validation & SSN trace
                            </li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={handleBgStripeCheckout}
                            disabled={bgCheckPaying}
                            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50"
                          >
                            {bgCheckPaying ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
                            {bgCheckPaying ? 'Connecting to Stripe...' : 'Pay & Order Background Check'}
                          </button>
                          <button 
                            onClick={() => setBgStep(1)}
                            className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            ← Back to Document Upload
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
      {/* Replaced by ReportModal component below */}
      <ReportModal 
        isOpen={!!showReportModal}
        onClose={() => setShowReportModal(null)}
        reportedUserId={showReportModal?.reportedUserId || ''}
        reportedUserName={showReportModal?.reportedUserName || ''}
        requestId={showReportModal?.requestId}
        refId={showReportModal?.refId}
      />
    </div>
  );
}
