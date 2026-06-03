import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, TrendingUp,
  Briefcase, X, CheckCircle, XCircle, Edit3, LayoutDashboard,
  ChevronLeft, ChevronRight as ChevronRightIcon, Camera, Send, MoreHorizontal, Loader2, Plus, AlertCircle, Phone, Trash2, Upload, Zap, CreditCard, Flag, AlertTriangle, Ban, Award,
  Eye, EyeOff
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ReportModal from '@/components/ReportModal';
import { useAuth } from '@/context/AuthContext';
import { detectLocationWithZip } from '@/utils/geolocation';
import { auth as authApi, get, post, put } from '@/lib/api';
import { cn } from '@/utils/cn';
import { sameDay, dayLabel, listStamp } from '@/utils/chatTime';
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

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
  const [cgFamilyMessages, setCgFamilyMessages] = useState<Record<string, { text: string; fromMe: boolean; time: string; at?: string }[]>>({});
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
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Rebuilt Profile Builder States
  const [profileSubTab, setProfileSubTab] = useState<'bio' | 'id_verification' | 'background_check' | 'services' | 'resumes' | 'certifications' | 'security' | 'notifications'>('bio');
  const [mobileShowMenu, setMobileShowMenu] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModalCurrent, setShowModalCurrent] = useState(false);
  const [showModalNew, setShowModalNew] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const [idSelfie, setIdSelfie] = useState('');
  const [idVerificationStatus, setIdVerificationStatus] = useState('none');
  const [resumes, setResumes] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [cgJobTitle, setCgJobTitle] = useState('Caregiver');
  const [cgLanguages, setCgLanguages] = useState('English');

  // ID Verification Submission steps (1: Number, 2: ID Upload, 3: Selfie)
  const [idSubmitStep, setIdSubmitStep] = useState(1);
  const [idVerifying, setIdVerifying] = useState(false);

  // Background Check Details Submission
  const [bgConsent, setBgConsent] = useState(false);
  const [bgLegalName, setBgLegalName] = useState('');
  const [bgDob, setBgDob] = useState('');
  const [bgCurrentAddress, setBgCurrentAddress] = useState('');
  const [bgPreviousAddress, setBgPreviousAddress] = useState('');
  const [bgOffersTransport, setBgOffersTransport] = useState(false);
  const [bgDriversLicense, setBgDriversLicense] = useState('');
  const [bgSubmitLoading, setBgSubmitLoading] = useState(false);
  const [bgApplyStep, setBgApplyStep] = useState(0); // 0: Prompt/Start, 1: Consent, 2: Details Form

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
        at: m.createdAt,
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

  const fetchData = useCallback((forceRefresh = false) => {
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
          setBgCheckStatus((cg.backgroundCheckStatus || 'none') as any);
          setIdVerificationStatus(cg.idVerificationStatus || 'none');

          if (forceRefresh || !hasLoadedProfile) {
            setCgBio(cg.bio || '');
            if (cg.hourlyRate) setCgRate({ min: cg.hourlyRate[0], max: cg.hourlyRate[1] });
            setCgLocation(cg.location || '');
            setCgServiceZips(cg.serviceZips || []);
            setCgSpecialties((cg.specialties || []).map((s: string) => SPECIALTY_MAP[s] || s));
            setCgExperience(cg.yearsExperience || 0);
            setPhotoUrl(cg.photoUrl || null);
            setCgAvailType(cg.availability || 'Flexible');

            // Populating built-profile fields
            setIdCardNumber(cg.idCardNumber || '');
            setIdCardFront(cg.idCardFront || '');
            setIdCardBack(cg.idCardBack || '');
            setIdSelfie(cg.idSelfie || '');
            setResumes(cg.resumes || []);
            setCertifications(cg.certifications || []);
            setCgJobTitle(cg.jobTitle || 'Caregiver');
            setCgLanguages(cg.languages ? cg.languages.join(', ') : 'English');
            
            setHasLoadedProfile(true);
          }
        }
      }).catch(() => {}),
    ]).catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, [user?.id, hasLoadedProfile]);

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

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error('Video play error:', err));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please check permissions or select fallback file upload.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Horizontal flip for mirror effect (common in selfie cams)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setIdSelfie(dataUrl);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    if (profileSubTab !== 'id_verification' || idSubmitStep !== 3) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setCameraActive(false);
    }
  }, [profileSubTab, idSubmitStep]);

  useEffect(() => {
    if (profileSubTab === 'id_verification' && idSubmitStep === 3 && !idSelfie && !cameraActive && !cameraError) {
      startCamera();
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [profileSubTab, idSubmitStep]);

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
                [cgSelectedMsg]: [...(prev[cgSelectedMsg] || []), { text: content, fromMe: true, time, at: new Date().toISOString() }],
              }));
              setCgMsgInput('');
              try { await post(`/conversations/${cgSelectedMsg}/messages`, { content }); } catch {}
            };

            const activeFamily = cgSelectedMsg ? cgFamilies.find(f => f.id === cgSelectedMsg) : null;
            const activeMsgs = cgSelectedMsg ? (cgFamilyMessages[cgSelectedMsg] || []) : [];

            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                {cgFamilies.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="font-semibold text-gray-700 mb-1">No conversations yet</p>
                    <p className="text-sm text-gray-400">Messages appear here once a family unlocks chat with you.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex h-[calc(100dvh-12rem)] min-h-[460px]">
                    {/* Conversation list pane */}
                    <aside className={cn('w-full md:w-80 lg:w-96 border-r border-gray-100 flex-col min-h-0', activeFamily ? 'hidden md:flex' : 'flex')}>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        {cgFamilies.map((family) => {
                          const msgs = cgFamilyMessages[family.id] || [];
                          const lastMsg = msgs[msgs.length - 1];
                          return (
                            <button
                              key={family.id}
                              onClick={() => { setCgSelectedMsg(family.id); loadCgMessages(family.id); }}
                              className={cn('w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left', activeFamily?.id === family.id && 'bg-emerald-50/60')}
                            >
                              {family.photoUrl ? (
                                <img src={family.photoUrl} alt={family.name} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
                              ) : (
                                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0', family.color)}>
                                  {family.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className={cn('text-sm font-semibold truncate', family.unread > 0 ? 'text-gray-900' : 'text-gray-700')}>{family.name}</p>
                                  <span className="text-[10px] text-gray-400 shrink-0">{listStamp(lastMsg?.at) || lastMsg?.time || ''}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-gray-500 truncate">
                                    {lastMsg ? (lastMsg.fromMe ? `You: ${lastMsg.text}` : lastMsg.text) : family.care}
                                  </p>
                                  {family.unread > 0 && (
                                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{family.unread}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    {/* Conversation thread pane */}
                    <section className={cn('flex-1 flex-col min-h-0', activeFamily ? 'flex' : 'hidden md:flex')}>
                      {!activeFamily ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-emerald-400" />
                          </div>
                          <p className="text-sm">Select a conversation to start chatting</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 px-4 sm:px-5 h-16 border-b border-gray-100 shrink-0">
                            <button onClick={() => setCgSelectedMsg(null)} className="md:hidden text-emerald-600 shrink-0 -ml-1">
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            {activeFamily.photoUrl ? (
                              <img src={activeFamily.photoUrl} alt={activeFamily.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0', activeFamily.color)}>
                                {activeFamily.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{activeFamily.name}</p>
                              <p className="text-xs text-emerald-600">● {activeFamily.care}</p>
                            </div>
                            <button
                              onClick={() => {
                                const conversation = conversations.find(c => c.id === cgSelectedMsg);
                                setShowBookModal({
                                  familyId: conversation?.familyId || '',
                                  familyName: activeFamily.name,
                                  service: activeFamily.care
                                });
                                setBookLocation(conversation?.location || '');
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors shrink-0"
                            >
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span className="hidden sm:inline">Book Session</span>
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4 space-y-1 bg-[#f7f8fa]">
                            {activeMsgs.map((m, i) => {
                              const prev = activeMsgs[i - 1];
                              const showDay = !!m.at && (!prev?.at || !sameDay(new Date(prev.at), new Date(m.at)));
                              return (
                                <div key={i}>
                                  {showDay && (
                                    <div className="flex justify-center my-3">
                                      <span className="px-3 py-1 rounded-full bg-white text-gray-500 text-[11px] font-medium shadow-sm border border-gray-100">
                                        {dayLabel(new Date(m.at as string))}
                                      </span>
                                    </div>
                                  )}
                                  <div className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
                                    <div className={cn('max-w-[80%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl shadow-sm', m.fromMe ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md')}>
                                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                                      <p className={cn('text-[10px] mt-0.5 text-right', m.fromMe ? 'text-emerald-200' : 'text-gray-400')}>{m.time}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={cgMsgEndRef} />
                          </div>

                          <div className="px-3 sm:px-5 py-3 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
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
                              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center text-white transition-colors shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                )}
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
            <div className="space-y-6">
              {/* Main Profile Builder Layout */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                
                {/* Left Sidebar / Checklist Panel */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
                  
                  {/* Profile Header & Stats */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center">
                    <div className="relative shrink-0 mb-3">
                      {photoUrl ? (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md">
                          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                          {photoUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-3xl font-bold relative shadow-md">
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
                        title="Upload profile image"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-lg">{user?.name || 'Caregiver'}</h3>
                    <p className="text-gray-500 text-xs mb-3">{user?.email}</p>
                    
                    {/* Status Badges */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold">
                        <Check className="w-3.5 h-3.5" /> Caregiver Account
                      </div>
                      
                      {idVerificationStatus === 'approved' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 text-xs font-bold">
                          <Shield className="w-3.5 h-3.5" /> ID Verified
                        </div>
                      ) : idVerificationStatus === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> ID Verification Pending
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-gray-50 text-gray-500 border border-gray-100 text-xs font-bold">
                          <Shield className="w-3.5 h-3.5 text-gray-400" /> ID Unverified
                        </div>
                      )}

                      {bgCheckStatus === 'approved' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-green-50 text-green-800 border border-green-100 text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Background Checked
                        </div>
                      ) : bgCheckStatus === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Background-Check
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-gray-50 text-gray-500 border border-gray-100 text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-gray-400" /> No Background Check
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Sub-navigation (LinkedIn style Sidebar) */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hidden lg:block">
                    <div className="p-4 border-b border-gray-50">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Sections</span>
                    </div>
                    <nav className="divide-y divide-gray-50">
                      {[
                        { id: 'bio', label: 'Bio & Specialties', icon: <User className="w-4 h-4" /> },
                        { id: 'id_verification', label: 'Government ID', icon: <Shield className="w-4 h-4" />, status: idVerificationStatus },
                        { id: 'background_check', label: 'Background Check', icon: <CheckCircle className="w-4 h-4" />, status: bgCheckStatus },
                        { id: 'services', label: 'Rates & Areas', icon: <MapPin className="w-4 h-4" /> },
                        { id: 'resumes', label: 'Resumes', icon: <Briefcase className="w-4 h-4" />, count: resumes.length },
                        { id: 'certifications', label: 'Certifications', icon: <Award className="w-4 h-4" />, count: certifications.length },
                        { id: 'security', label: 'Account Security', icon: <Settings className="w-4 h-4" /> },
                        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setProfileSubTab(sub.id as any)}
                          className={cn(
                            "w-full text-left px-4 py-3.5 text-sm font-semibold flex items-center justify-between transition-colors",
                            profileSubTab === sub.id
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={profileSubTab === sub.id ? "text-emerald-600" : "text-gray-400"}>
                              {sub.icon}
                            </span>
                            <span>{sub.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {sub.count !== undefined && sub.count > 0 && (
                              <span className="bg-gray-100 text-gray-600 text-2xs px-2 py-0.5 rounded-full font-bold">
                                {sub.count}
                              </span>
                            )}
                            {sub.status === 'approved' && (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                            {sub.status === 'pending' && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                            <ChevronRight className={cn("w-4 h-4 opacity-50", profileSubTab === sub.id ? "text-emerald-500" : "text-gray-300")} />
                          </div>
                        </button>
                      ))}
                    </nav>
                  </div>
                  
                  {/* Quick Profile Builder Checklist */}
                  <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden hidden lg:block">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
                    <h4 className="font-bold text-sm mb-1.5 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" /> Checklist Status
                    </h4>
                    <div className="space-y-2 mt-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Profile Photo</span>
                        <span>{photoUrl ? '✓' : '✖'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Specialties & Bio</span>
                        <span>{cgBio ? '✓' : '✖'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ID Verification</span>
                        <span>{idVerificationStatus === 'approved' ? '✓' : idVerificationStatus === 'pending' ? '⏳' : '✖'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Background Check</span>
                        <span>{bgCheckStatus === 'approved' ? '✓' : bgCheckStatus === 'pending' ? '⏳' : '✖'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Mobile iOS-style Settings Grid Menu */}
                {mobileShowMenu && (
                  <div className="block lg:hidden w-full space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Profile Settings</h4>
                      <div className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-150 overflow-hidden shadow-2xs">
                        {[
                          { id: 'bio', label: 'Bio & Specialties', desc: 'Personal details & care types', icon: <User className="w-4.5 h-4.5" />, color: 'bg-emerald-50 text-emerald-600', status: null },
                          { id: 'id_verification', label: 'Government ID', desc: 'Verify passport or license', icon: <Shield className="w-4.5 h-4.5" />, color: 'bg-blue-50 text-blue-600', status: idVerificationStatus === 'approved' ? 'Approved' : idVerificationStatus === 'pending' ? 'Pending' : 'Incomplete' },
                          { id: 'background_check', label: 'Background Check', desc: 'Safety screening credentials', icon: <CheckCircle className="w-4.5 h-4.5" />, color: 'bg-purple-50 text-purple-600', status: bgCheckStatus === 'approved' ? 'Approved' : bgCheckStatus === 'pending' ? 'Pending' : 'Incomplete' },
                          { id: 'services', label: 'Rates & Areas', desc: 'Hourly pricing & ZIP codes', icon: <MapPin className="w-4.5 h-4.5" />, color: 'bg-amber-50 text-amber-600', status: null },
                          { id: 'resumes', label: 'Resumes', desc: 'Upload professional CV files', icon: <Briefcase className="w-4.5 h-4.5" />, color: 'bg-sky-50 text-sky-600', status: resumes.length > 0 ? `${resumes.length} uploaded` : 'None' },
                          { id: 'certifications', label: 'Certifications', desc: 'Add credentials & skills', icon: <Award className="w-4.5 h-4.5" />, color: 'bg-rose-50 text-rose-600', status: certifications.length > 0 ? `${certifications.length} added` : 'None' },
                          { id: 'security', label: 'Account Security', desc: 'Change password & toggles', icon: <Settings className="w-4.5 h-4.5" />, color: 'bg-slate-100 text-slate-600', status: null },
                          { id: 'notifications', label: 'Alert Preferences', desc: 'Manage SMS & email alerts', icon: <Bell className="w-4.5 h-4.5" />, color: 'bg-indigo-50 text-indigo-600', status: null }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setProfileSubTab(sub.id as any);
                              setMobileShowMenu(false);
                            }}
                            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/85 transition-colors active:bg-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs", sub.color)}>
                                {sub.icon}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800 leading-tight">{sub.label}</p>
                                <p className="text-3xs text-gray-400 font-medium mt-0.5 leading-none">{sub.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sub.status && (
                                <span className={cn(
                                  "text-3xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                  sub.status === 'Approved' ? 'bg-green-50 text-green-700' :
                                  sub.status === 'Pending' ? 'bg-amber-50 text-amber-700 animate-pulse' :
                                  sub.status === 'None' || sub.status === 'Incomplete' ? 'bg-gray-50 text-gray-400' : 'bg-emerald-50 text-emerald-700'
                                )}>
                                  {sub.status}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Right Interactive Active Panel Container */}
                <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-6", mobileShowMenu ? "hidden lg:block" : "block")}>
                  {/* Sticky back bar for mobile details views */}
                  {!mobileShowMenu && (
                    <button
                      type="button"
                      onClick={() => setMobileShowMenu(true)}
                      className="lg:hidden mb-6 flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 active:scale-98 transition-all px-3 py-2 bg-emerald-50 rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Settings
                    </button>
                  )}
                  
                  {/* Panel 1: BIO & SPECIALTIES */}
                  {profileSubTab === 'bio' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Bio & Specialties</h3>
                        <p className="text-xs text-gray-500">Provide personal details and specify the types of care services you offer families.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professional Headline / Job Title</label>
                          <input
                            type="text"
                            value={cgJobTitle}
                            onChange={e => setCgJobTitle(e.target.value)}
                            placeholder="e.g. Compassionate Child Care Provider & Tutor"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Years of Experience</label>
                            <input
                              type="number"
                              value={cgExperience}
                              onChange={e => setCgExperience(Number(e.target.value))}
                              min={0}
                              max={50}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Languages (Comma separated)</label>
                            <input
                              type="text"
                              value={cgLanguages}
                              onChange={e => setCgLanguages(e.target.value)}
                              placeholder="English, Spanish"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Detailed Bio</label>
                            <span className="text-2xs text-gray-400 font-medium">{cgBio.length}/600 characters</span>
                          </div>
                          <textarea
                            value={cgBio}
                            onChange={e => setCgBio(e.target.value.slice(0, 600))}
                            rows={5}
                            placeholder="Introduce yourself to prospective families! Detail your care philosophy, personality traits, and what makes you a trusted caregiver."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">My Care Specialties</label>
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
                                    "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5",
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs font-black"
                                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                  )}
                                >
                                  {isSelected ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Plus className="w-3.5 h-3.5 text-gray-400" />}
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-50 flex justify-end">
                          <Button
                            variant="primary"
                            disabled={cgSaving}
                            onClick={async () => {
                              setCgSaving(true);
                              try {
                                const dbSpecialties = cgSpecialties.map(s => DB_SPECIALTY_MAP[s] || s.toLowerCase().replace(' ', '-'));
                                await put('/caregivers/profile', {
                                  bio: cgBio,
                                  specialties: dbSpecialties,
                                  yearsExperience: cgExperience,
                                  jobTitle: cgJobTitle,
                                  languages: cgLanguages.split(',').map(x => x.trim()).filter(Boolean)
                                });
                                showToast('Profile details updated successfully!');
                                fetchData(true);
                              } catch {
                                showToast('Failed to save profile details.');
                              } finally {
                                setCgSaving(false);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 shadow-sm rounded-full text-xs"
                          >
                            {cgSaving ? 'Saving…' : 'Save Profile Changes'}
                          </Button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Panel 2: GOVERNMENT ID VERIFICATION */}
                  {profileSubTab === 'id_verification' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Government ID Verification</h3>
                        <p className="text-xs text-gray-500">Provide an identification document to build premium trust badges and unlock client bookings.</p>
                      </div>

                      {/* Display Status Banner */}
                      {idVerificationStatus === 'approved' ? (
                        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                          <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-blue-900 text-sm">ID Card Verified</h4>
                            <p className="text-xs text-blue-700 leading-relaxed mt-0.5">Your official government identification has been successfully verified by our administrative team. Your "ID Verified" safety badge is active on your public profile!</p>
                          </div>
                        </div>
                      ) : idVerificationStatus === 'pending' ? (
                        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                          <Clock className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />
                          <div>
                            <h4 className="font-bold text-amber-900 text-sm">Verification Under Review</h4>
                            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">Your ID documents have been uploaded and are queued for verification. The approval process usually takes 24–48 hours. We will email you once complete.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5 pt-2">
                          
                          {/* Multi-step ID verification wizard */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Step {idSubmitStep} of 3</span>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(st => (
                                <div key={st} className={cn("w-6 h-1 rounded-full", st <= idSubmitStep ? "bg-emerald-600" : "bg-gray-150")} />
                              ))}
                            </div>
                          </div>

                          {/* ID STEP 1: ID Number Input */}
                          {idSubmitStep === 1 && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">Enter Identification Document Number</h4>
                                <p className="text-2xs text-gray-400 mt-0.5">We support Driver's Licenses, Passports, National Identity Cards, or State IDs.</p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">ID Number</label>
                                <input
                                  type="text"
                                  value={idCardNumber}
                                  onChange={e => setIdCardNumber(e.target.value)}
                                  placeholder="e.g. DL-48593859"
                                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                                />
                              </div>
                              <div className="flex justify-end pt-2">
                                <Button
                                  variant="primary"
                                  disabled={!idCardNumber.trim()}
                                  onClick={() => setIdSubmitStep(2)}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-full px-6"
                                >
                                  Continue
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* ID STEP 2: Front and Back Uploads */}
                          {idSubmitStep === 2 && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">Upload Front & Back of Document</h4>
                                <p className="text-2xs text-gray-400 mt-0.5">Scans should be readable, well-lit, and in JPG/PNG format under 4MB.</p>
                              </div>
                              
                              <div className="grid sm:grid-cols-2 gap-4">
                                {/* FRONT */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Front Scan</label>
                                  {idCardFront ? (
                                    <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl overflow-hidden aspect-video bg-emerald-50 flex items-center justify-center">
                                      <img src={idCardFront} alt="ID Front" className="w-full h-full object-contain" />
                                      <button
                                        type="button"
                                        onClick={() => setIdCardFront('')}
                                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="border-2 border-dashed border-gray-200 rounded-2xl aspect-video bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors p-4 text-center">
                                      <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                      <span className="text-xs font-bold text-emerald-700">Upload Front Side</span>
                                      <span className="text-2xs text-gray-400 mt-0.5">JPG, PNG up to 4MB</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = () => setIdCardFront(reader.result as string);
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>

                                {/* BACK */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Back Scan</label>
                                  {idCardBack ? (
                                    <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl overflow-hidden aspect-video bg-emerald-50 flex items-center justify-center">
                                      <img src={idCardBack} alt="ID Back" className="w-full h-full object-contain" />
                                      <button
                                        type="button"
                                        onClick={() => setIdCardBack('')}
                                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="border-2 border-dashed border-gray-200 rounded-2xl aspect-video bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors p-4 text-center">
                                      <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                      <span className="text-xs font-bold text-emerald-700">Upload Back Side</span>
                                      <span className="text-2xs text-gray-400 mt-0.5">JPG, PNG up to 4MB</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = () => setIdCardBack(reader.result as string);
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-between pt-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => setIdSubmitStep(1)}
                                  className="text-xs font-bold rounded-full px-5"
                                >
                                  Back
                                </Button>
                                <Button
                                  variant="primary"
                                  disabled={!idCardFront || !idCardBack}
                                  onClick={() => setIdSubmitStep(3)}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-full px-6"
                                >
                                  Continue
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* ID STEP 3: Selfie Verification */}
                          {idSubmitStep === 3 && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">Selfie Verification</h4>
                                <p className="text-2xs text-gray-400 mt-0.5">Please capture a live selfie. This matches your face with your identification card.</p>
                              </div>

                              <div className="flex flex-col items-center justify-center space-y-4">
                                {idSelfie ? (
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="relative border-2 border-emerald-500 rounded-3xl overflow-hidden w-64 h-64 bg-emerald-50 flex items-center justify-center shadow-lg">
                                      <img src={idSelfie} alt="Selfie" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIdSelfie('');
                                          startCamera();
                                        }}
                                        className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
                                        title="Retake Selfie"
                                      >
                                        <X className="w-5 h-5" />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIdSelfie('');
                                        startCamera();
                                      }}
                                      className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                                    >
                                      <Camera className="w-4 h-4" /> Retake Photo
                                    </button>
                                  </div>
                                ) : cameraActive ? (
                                  <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
                                    <div className="relative border border-gray-200 rounded-3xl overflow-hidden w-64 h-64 bg-black shadow-inner flex items-center justify-center">
                                      <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        style={{ transform: 'scaleX(-1)' }}
                                        playsInline
                                        muted
                                      />
                                      <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                        <button
                                          type="button"
                                          onClick={capturePhoto}
                                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                                        >
                                          <Camera className="w-4 h-4" /> Snap Photo
                                        </button>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        stopCamera();
                                        setCameraError('fallback');
                                      }}
                                      className="text-2xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                      Or upload a photo instead
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
                                    {cameraError && cameraError !== 'fallback' && (
                                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-2xs text-amber-700 text-center font-medium leading-relaxed">
                                        {cameraError}
                                      </div>
                                    )}
                                    <label className="border-2 border-dashed border-gray-200 rounded-3xl w-64 h-64 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all p-4 text-center group shadow-2xs">
                                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                                      <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-700">Upload Selfie File</span>
                                      <span className="text-2xs text-gray-400 mt-1.5 leading-relaxed">Select a standard portrait photo showing your face clearly</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = () => setIdSelfie(reader.result as string);
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={startCamera}
                                      className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 mt-1"
                                    >
                                      <Camera className="w-4 h-4" /> Use camera live capture
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between pt-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    stopCamera();
                                    setIdSubmitStep(2);
                                  }}
                                  className="text-xs font-bold rounded-full px-5"
                                >
                                  Back
                                </Button>
                                <Button
                                  variant="primary"
                                  disabled={!idSelfie || idVerifying}
                                  onClick={async () => {
                                    setIdVerifying(true);
                                    try {
                                      await post('/caregivers/verify-id', {
                                        idCardNumber,
                                        idCardFront,
                                        idCardBack,
                                        idSelfie
                                      });
                                      showToast('ID Verification request submitted to Admin!');
                                      fetchData(true);
                                    } catch {
                                      showToast('Failed to submit ID details.');
                                    } finally {
                                      setIdVerifying(false);
                                    }
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-full px-6 shadow-sm"
                                >
                                  {idVerifying ? 'Submitting...' : 'Submit for Verification'}
                                </Button>
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}

                  {/* Panel 3: BACKGROUND CHECK */}
                  {profileSubTab === 'background_check' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Background Check Application</h3>
                        <p className="text-xs text-gray-500">Increase premium booking opportunities by authenticating your criminal history background verification.</p>
                      </div>

                      {/* Display Status Banner */}
                      {bgCheckStatus === 'approved' ? (
                        <div className="p-5 rounded-2xl bg-green-50 border border-green-100 flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-green-900 text-sm">Background Check Approved</h4>
                            <p className="text-xs text-green-700 leading-relaxed mt-0.5">✓ Congratulations! Your background screening is approved. The protective verification badge is fully integrated into your caregiver card details.</p>
                          </div>
                        </div>
                      ) : bgCheckStatus === 'pending' ? (
                        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                          <Clock className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />
                          <div>
                            <h4 className="font-bold text-amber-900 text-sm">Screening In Progress</h4>
                            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">Your consent form and information details have been dispatched to our screening partners. The processing period takes 2–4 business days. We will alert you immediately when complete.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5 pt-2">
                          
                          {/* BG STEP 0: Promotional Banner / Intro */}
                          {bgApplyStep === 0 && (
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 border border-emerald-100 text-center space-y-4">
                              <Shield className="w-12 h-12 text-emerald-600 mx-auto" />
                              <div className="space-y-1">
                                <h4 className="font-bold text-gray-900 text-base">Complete background check to increase trust and receive more bookings.</h4>
                                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">Verified caregivers receive a shiny safety badge on their profiles and get up to 3x more matching requests from premium clients.</p>
                              </div>
                              <Button
                                variant="primary"
                                onClick={() => setBgApplyStep(1)}
                                className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-full px-6 text-xs shadow-sm"
                              >
                                Start Background Check
                              </Button>
                            </div>
                          )}

                          {/* BG STEP 1: Consent Screen */}
                          {bgApplyStep === 1 && (
                            <div className="space-y-4 text-sm text-gray-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
                              <h4 className="font-black text-gray-900 text-base mb-2">Consent & Disclosure Notice</h4>
                              
                              <div className="space-y-3 text-xs leading-relaxed">
                                <p>1. **Permission to run background check**: I hereby authorize Trulicares and its third-party background screening agencies to conduct a check covering identity validation, criminal records, sex offender registry, and motor vehicle records (if driving care is offered).</p>
                                <p>2. **Privacy Notice**: When required, sensitive identifiers such as your SSN are collected directly by our accredited screening partner on their secure portal — TruliCares never stores your SSN. Other details are kept strictly for verification and are never shared with families or other caregivers.</p>
                                <p>3. **What is checked**: We cross-reference municipal court registers, county records, federal crimes repositories, and state databases to confirm a clean and safe background history.</p>
                              </div>

                              <div className="flex items-start gap-2.5 pt-3 border-t border-slate-200">
                                <input
                                  type="checkbox"
                                  id="bgConsentCheck"
                                  checked={bgConsent}
                                  onChange={e => setBgConsent(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 mt-0.5"
                                />
                                <label htmlFor="bgConsentCheck" className="text-xs text-gray-800 font-bold select-none cursor-pointer">
                                  I explicitly provide consent to Trulicares to initiate my background check process and agree to the privacy statement.
                                </label>
                              </div>

                              <div className="flex justify-between pt-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => setBgApplyStep(0)}
                                  className="text-xs font-bold rounded-full px-5"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="primary"
                                  disabled={!bgConsent}
                                  onClick={() => setBgApplyStep(2)}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-full px-6"
                                >
                                  Accept & Continue
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* BG STEP 2: Collect Details Form */}
                          {bgApplyStep === 2 && (
                            <div className="space-y-4">
                              <h4 className="font-bold text-sm text-gray-900">Enter Your Personal Details</h4>
                              
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Legal Name</label>
                                  <input
                                    type="text"
                                    value={bgLegalName}
                                    onChange={e => setBgLegalName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-xs transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                                  <input
                                    type="date"
                                    value={bgDob}
                                    onChange={e => setBgDob(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-xs transition-all"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Address</label>
                                <input
                                  type="text"
                                  value={bgCurrentAddress}
                                  onChange={e => setBgCurrentAddress(e.target.value)}
                                  placeholder="123 Emerald Ave, Suite 10"
                                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-xs transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Previous Address (If lived at current for under 2 years)</label>
                                <input
                                  type="text"
                                  value={bgPreviousAddress}
                                  onChange={e => setBgPreviousAddress(e.target.value)}
                                  placeholder="456 Ruby Street, Apt 3B"
                                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-xs transition-all"
                                />
                              </div>

                              {/* Offers driving care check */}
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-bold text-xs text-gray-900">Are you offering driving or transport care?</h5>
                                    <p className="text-2xs text-gray-400">Enabling this requires a Driver's License verification check.</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={bgOffersTransport}
                                    onChange={e => setBgOffersTransport(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                  />
                                </div>

                                {bgOffersTransport && (
                                  <div>
                                    <label className="block text-2xs font-bold text-gray-700 mb-1">Driver's License Number</label>
                                    <input
                                      type="text"
                                      value={bgDriversLicense}
                                      onChange={e => setBgDriversLicense(e.target.value)}
                                      placeholder="e.g. DL-1234567"
                                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-xs transition-all"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between pt-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => setBgApplyStep(1)}
                                  className="text-xs font-bold rounded-full px-5"
                                >
                                  Back
                                </Button>
                                <Button
                                  variant="primary"
                                  disabled={bgSubmitLoading || !bgLegalName || !bgDob || !bgCurrentAddress || (bgOffersTransport && !bgDriversLicense)}
                                  onClick={async () => {
                                    setBgSubmitLoading(true);
                                    try {
                                      await post('/caregivers/apply-background-check', {
                                        details: {
                                          legalName: bgLegalName,
                                          dob: bgDob,
                                          currentAddress: bgCurrentAddress,
                                          previousAddress: bgPreviousAddress,
                                          offersTransport: bgOffersTransport,
                                          driversLicense: bgOffersTransport ? bgDriversLicense : null
                                        }
                                      });
                                      showToast('Background Check request submitted successfully!');
                                      fetchData(true);
                                    } catch {
                                      showToast('Failed to submit background check details.');
                                    } finally {
                                      setBgSubmitLoading(false);
                                    }
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-full px-6 shadow-sm"
                                >
                                  {bgSubmitLoading ? 'Submitting…' : 'Submit Background Check'}
                                </Button>
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}

                  {/* Panel 4: RATES & AREAS */}
                  {profileSubTab === 'services' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Service Areas, Availability, & Hourly Rate</h3>
                        <p className="text-xs text-gray-500">Configure your target work location zones, active scheduling layout, and pricing structures.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* Hourly Rate Slider */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-xs text-gray-900">Hourly Rate Scale</h4>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-xs shadow-3xs">
                              ${cgRate.min} – ${cgRate.max} / hr
                            </span>
                          </div>
                          
                          <div className="relative pt-4 pb-4 select-none">
                            {/* The track rail */}
                            <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 -translate-y-1/2 rounded-full" />
                            {/* The active range bar */}
                            <div
                              className="absolute top-1/2 h-2 bg-emerald-500 -translate-y-1/2 rounded-full"
                              style={{
                                left: `${((cgRate.min - 10) / (100 - 10)) * 100}%`,
                                right: `${100 - ((cgRate.max - 10) / (100 - 10)) * 100}%`
                              }}
                            />
                            {/* Min Input Slider */}
                            <input
                              type="range"
                              min={10}
                              max={100}
                              value={cgRate.min}
                              onChange={e => {
                                const val = Number(e.target.value);
                                if (val < cgRate.max) {
                                  setCgRate(prev => ({ ...prev, min: val }));
                                }
                              }}
                              className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-2 pointer-events-none appearance-none bg-transparent outline-none double-range-slider-input"
                              style={{ zIndex: cgRate.min > 90 ? 5 : 3 }}
                            />
                            {/* Max Input Slider */}
                            <input
                              type="range"
                              min={10}
                              max={100}
                              value={cgRate.max}
                              onChange={e => {
                                const val = Number(e.target.value);
                                if (val > cgRate.min) {
                                  setCgRate(prev => ({ ...prev, max: val }));
                                }
                              }}
                              className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-2 pointer-events-none appearance-none bg-transparent outline-none double-range-slider-input"
                              style={{ zIndex: 4 }}
                            />
                          </div>
                          <div className="flex justify-between text-2xs text-gray-400 font-medium px-0.5">
                            <span>$10/hr</span>
                            <span>$55/hr</span>
                            <span>$100/hr</span>
                          </div>
                        </div>

                        {/* Location Text */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Base Location / Neighborhood</label>
                          <input
                            type="text"
                            value={cgLocation}
                            onChange={e => setCgLocation(e.target.value)}
                            placeholder="e.g. Brooklyn, NY"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          />
                        </div>

                        {/* Service Areas (Zip Codes) */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Covered ZIP Codes ({cgServiceZips.length})</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={cgZipInput}
                              onChange={e => setCgZipInput(e.target.value)}
                              placeholder="e.g. 11201"
                              className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 flex-1"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = cgZipInput.trim();
                                  if (val && !cgServiceZips.includes(val)) {
                                    setCgServiceZips(prev => [...prev, val]);
                                    setCgZipInput('');
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = cgZipInput.trim();
                                if (val && !cgServiceZips.includes(val)) {
                                  setCgServiceZips(prev => [...prev, val]);
                                  setCgZipInput('');
                                }
                              }}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shrink-0"
                            >
                              Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {cgServiceZips.length === 0 ? (
                              <p className="text-2xs text-gray-400 italic">No zip codes added yet. Enter a zip code above and click Add.</p>
                            ) : (
                              cgServiceZips.map(zip => (
                                <span key={zip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-semibold">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {zip}
                                  <button
                                    type="button"
                                    onClick={() => setCgServiceZips(prev => prev.filter(z => z !== zip))}
                                    className="hover:text-red-500 ml-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Availability Type */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Availability Layout</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['Full-time', 'Part-time', 'Flexible'].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCgAvailType(opt)}
                                className={cn(
                                  "py-2.5 px-4 rounded-xl border text-xs font-bold transition-all",
                                  cgAvailType === opt
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                    : "bg-white text-gray-600 border-gray-250 hover:border-gray-300"
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-50 flex justify-end">
                          <Button
                            variant="primary"
                            onClick={async () => {
                              try {
                                await put('/caregivers/profile', {
                                  hourlyRateMin: cgRate.min,
                                  hourlyRateMax: cgRate.max,
                                  location: cgLocation,
                                  serviceZips: cgServiceZips,
                                  availability: cgAvailType
                                });
                                showToast('Rates, Areas, & Availability saved!');
                                fetchData(true);
                              } catch {
                                showToast('Failed to save settings.');
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 shadow-sm rounded-full text-xs"
                          >
                            Save Settings
                          </Button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Panel 5: RESUMES */}
                  {profileSubTab === 'resumes' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Resumes</h3>
                        <p className="text-xs text-gray-500">Upload your CV/resume PDF or photo files. Active resumes help families verify your professional history.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* Drag and drop / upload box */}
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50 text-center hover:bg-gray-100 transition-colors relative cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 4_000_000) { showToast('File must be under 4MB'); return; }
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = reader.result as string;
                                const newResumes = [...resumes, {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name: file.name,
                                  url: base64,
                                  uploadedAt: new Date().toLocaleDateString()
                                }];
                                try {
                                  await put('/caregivers/profile', { resumes: newResumes });
                                  setResumes(newResumes);
                                  showToast('Resume uploaded successfully!');
                                } catch {
                                  showToast('Failed to save resume.');
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <h4 className="font-bold text-xs text-emerald-800">Click or Drag to Upload CV / Resume</h4>
                          <p className="text-3xs text-gray-400 mt-1">Supports PDF, PNG, JPG up to 4MB</p>
                        </div>

                        {/* Resume List */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-xs text-gray-900">Uploaded Resumes ({resumes.length})</h4>
                          {resumes.length === 0 ? (
                            <div className="p-8 text-center bg-gray-25 rounded-xl border border-gray-100 text-xs text-gray-400 italic">
                              No resumes uploaded yet. Upload one above!
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {resumes.map(res => (
                                <div key={res.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Briefcase className="w-5 h-5 text-gray-400 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-800 truncate">{res.name}</p>
                                      <p className="text-3xs text-gray-400 font-normal">Uploaded on {res.uploadedAt}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={res.url}
                                      download={res.name}
                                      className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                                      title="Download resume file"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const newResumes = resumes.filter(r => r.id !== res.id);
                                        try {
                                          await put('/caregivers/profile', { resumes: newResumes });
                                          setResumes(newResumes);
                                          showToast('Resume removed successfully!');
                                        } catch {
                                          showToast('Failed to delete resume.');
                                        }
                                      }}
                                      className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                      title="Remove resume"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Panel 6: CERTIFICATIONS & QUALIFICATIONS */}
                  {profileSubTab === 'certifications' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Certifications & Qualifications</h3>
                        <p className="text-xs text-gray-500">List your professional licenses, CPR certificates, First Aid credentials, or other care qualifiers.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* New Certification Form */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                          <h4 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Add New Qualification / Certificate
                          </h4>
                          
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-2xs text-gray-500 mb-1">Certificate / License Name</label>
                              <input
                                id="certNameInput"
                                type="text"
                                placeholder="e.g. CPR & First Aid"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                            </div>
                            <div>
                              <label className="block text-2xs text-gray-500 mb-1">Issuing Authority</label>
                              <input
                                id="certAuthInput"
                                type="text"
                                placeholder="e.g. American Red Cross"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-2xs text-gray-500 mb-1">Expiry Date</label>
                              <input
                                id="certExpiryInput"
                                type="date"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                            </div>
                            <div>
                              <label className="block text-2xs text-gray-500 mb-1">Upload scan / certificate document</label>
                              <input
                                id="certFileInput"
                                type="file"
                                accept="image/*,.pdf"
                                className="w-full text-2xs file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer pt-1"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const nameEl = document.getElementById('certNameInput') as HTMLInputElement;
                                const authEl = document.getElementById('certAuthInput') as HTMLInputElement;
                                const expEl = document.getElementById('certExpiryInput') as HTMLInputElement;
                                const fileEl = document.getElementById('certFileInput') as HTMLInputElement;

                                const certName = nameEl?.value.trim();
                                const certAuth = authEl?.value.trim();
                                const certExpiry = expEl?.value;
                                const file = fileEl?.files?.[0];

                                if (!certName) { showToast('Please enter certification name.'); return; }
                                
                                const saveCert = async (fileBase64?: string) => {
                                  const newCerts = [...certifications, {
                                    id: Math.random().toString(36).substr(2, 9),
                                    name: certName,
                                    authority: certAuth || 'N/A',
                                    expiryDate: certExpiry || 'N/A',
                                    fileUrl: fileBase64 || '#'
                                  }];
                                  try {
                                    await put('/caregivers/profile', { certifications: newCerts });
                                    setCertifications(newCerts);
                                    showToast('Certification added successfully!');
                                    
                                    // Reset inputs
                                    if (nameEl) nameEl.value = '';
                                    if (authEl) authEl.value = '';
                                    if (expEl) expEl.value = '';
                                    if (fileEl) fileEl.value = '';
                                  } catch {
                                    showToast('Failed to add certification.');
                                  }
                                };

                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => saveCert(reader.result as string);
                                  reader.readAsDataURL(file);
                                } else {
                                  saveCert();
                                }
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                            >
                              Add Certificate
                            </button>
                          </div>
                        </div>

                        {/* Qualifications List */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-xs text-gray-900">Active Qualifications ({certifications.length})</h4>
                          
                          {certifications.length === 0 ? (
                            <div className="p-8 text-center bg-gray-25 rounded-xl border border-gray-100 text-xs text-gray-400 italic">
                              No certifications uploaded yet. Use the form above to add certifications.
                            </div>
                          ) : (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {certifications.map(cert => (
                                <div key={cert.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs relative flex flex-col justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-bold text-xs text-gray-900 leading-snug">{cert.name}</h5>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const newCerts = certifications.filter(c => c.id !== cert.id);
                                          try {
                                            await put('/caregivers/profile', { certifications: newCerts });
                                            setCertifications(newCerts);
                                            showToast('Certification deleted!');
                                          } catch {
                                            showToast('Failed to delete certification.');
                                          }
                                        }}
                                        className="text-red-500 hover:text-red-700 shrink-0"
                                        title="Delete qualification"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <p className="text-3xs text-gray-400 font-semibold">{cert.authority}</p>
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-3xs text-gray-500">
                                    <span>Expires: {cert.expiryDate}</span>
                                    {cert.fileUrl && cert.fileUrl !== '#' && (
                                      <a
                                        href={cert.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 font-bold hover:underline"
                                      >
                                        View Document Scan
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Panel 7: ACCOUNT SECURITY */}
                  {profileSubTab === 'security' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Account Security</h3>
                        <p className="text-xs text-gray-500">Update your login password and review current security settings.</p>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setCgPasswordError('');
                          if (cgPasswordForm.next !== cgPasswordForm.confirm) {
                            setCgPasswordError('New passwords do not match!');
                            return;
                          }
                          if (!STRONG_PASSWORD_REGEX.test(cgPasswordForm.next)) {
                            setCgPasswordError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
                            return;
                          }
                          try {
                            await put('/auth/password', {
                              currentPassword: cgPasswordForm.current,
                              newPassword: cgPasswordForm.next
                            });
                            showToast('Password updated successfully!');
                            setCgPasswordForm({ current: '', next: '', confirm: '' });
                          } catch (err: any) {
                            setCgPasswordError(err.message || 'Failed to change password. Please check your current password.');
                          }
                        }}
                        className="space-y-4 pt-2"
                      >
                        {cgPasswordError && (
                          <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-red-700 shadow-2xs">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                            <span>{cgPasswordError}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              required
                              value={cgPasswordForm.current}
                              onChange={e => setCgPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                              className="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                value={cgPasswordForm.next}
                                onChange={e => setCgPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                                className="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                              >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {cgPasswordForm.next && !STRONG_PASSWORD_REGEX.test(cgPasswordForm.next) && (
                              <p className="text-2xs text-red-500 mt-1.5 font-medium leading-tight">
                                Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={cgPasswordForm.confirm}
                                onChange={e => setCgPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                                className="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-2xl text-sm transition-all shadow-2xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-sm transition-all"
                          >
                            Update Password
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Panel 8: NOTIFICATION PREFERENCES */}
                  {profileSubTab === 'notifications' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Notification Preferences</h3>
                        <p className="text-xs text-gray-500">Customize what updates you receive via email, mobile SMS text, or desktop pushes.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        {[
                          { key: 'email', label: 'Email Notifications', desc: 'Receive matching caregiver requests and client chat logs via email.' },
                          { key: 'sms', label: 'SMS Text Messaging Alerts', desc: 'Get direct mobile notifications for urgent job allocations.' },
                          { key: 'push', label: 'Browser Push Notifications', desc: 'Live alerts in your browser whenever a message is received.' },
                          { key: 'marketing', label: 'Marketing & Promotional Updates', desc: 'Receive newsletters, community surveys, and caregiver rewards information.' }
                        ].map(item => {
                          const val = (cgNotifPrefs as any)[item.key];
                          return (
                            <div key={item.key} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <h5 className="font-bold text-xs text-gray-900">{item.label}</h5>
                                <p className="text-3xs text-gray-400 font-normal leading-relaxed">{item.desc}</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={async (e) => {
                                  const nextPrefs = { ...cgNotifPrefs, [item.key]: e.target.checked };
                                  setCgNotifPrefs(nextPrefs);
                                  try {
                                    await put('/auth/notifications', nextPrefs);
                                    showToast('Preferences auto-saved!');
                                  } catch {
                                    showToast('Failed to auto-save preference.');
                                  }
                                }}
                                className="w-4.5 h-4.5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Settings Page Log Out link */}
                  <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-2xs text-gray-400">Trulicares Safety & Security Framework</span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out of Account
                    </button>
                  </div>

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
                    fetchData(true); // Refresh local state to ensure sync
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
                    fetchData(true);
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
                <div className="relative">
                  <input
                    type={showModalCurrent ? 'text' : 'password'}
                    value={cgPasswordForm.current}
                    onChange={e => setCgPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-10 rounded-2xl border border-gray-200 bg-white shadow-2xs text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalCurrent(!showModalCurrent)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showModalCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showModalNew ? 'text' : 'password'}
                    value={cgPasswordForm.next}
                    onChange={e => setCgPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-10 rounded-2xl border border-gray-200 bg-white shadow-2xs text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalNew(!showModalNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showModalNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {cgPasswordForm.next && !STRONG_PASSWORD_REGEX.test(cgPasswordForm.next) && (
                  <p className="text-2xs text-red-500 mt-1.5 font-medium leading-tight">
                    Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showModalConfirm ? 'text' : 'password'}
                    value={cgPasswordForm.confirm}
                    onChange={e => setCgPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 pr-10 rounded-2xl border border-gray-200 bg-white shadow-2xs text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalConfirm(!showModalConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showModalConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                    if (!STRONG_PASSWORD_REGEX.test(cgPasswordForm.next)) {
                      setCgPasswordError('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
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
                  try { await put('/caregivers/profile', { location: cgLocation, serviceZips: cgServiceZips }); showToast('Service area saved!'); setCgModal(null); fetchData(true); } catch { showToast('Failed to save.'); }
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
