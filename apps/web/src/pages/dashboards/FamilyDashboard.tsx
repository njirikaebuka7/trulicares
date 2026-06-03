import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, MessageCircle, User, Settings, LogOut, Plus, MapPin, DollarSign,
  Star, Shield, Check, ChevronRight, Calendar, Clock, CreditCard,
  FileText, X, Home, LayoutDashboard, ChevronLeft, ChevronRight as ChevronRightIcon,
  Edit3, Camera, MoreHorizontal, Send, Phone, Trash2, CheckCircle, AlertCircle,
  Loader2, Flag, AlertTriangle, Ban, Upload, ImagePlus, Scale, Lock, Eye, EyeOff
} from 'lucide-react';
import Button from '@/components/ui/Button';
import StripeCardModal from '@/components/ui/StripeCardModal';
import ReportModal from '@/components/ReportModal';
import { useAuth } from '@/context/AuthContext';
import { get, post, put, auth as authApi, payments as paymentsApi, notifications as notificationsApi } from '@/lib/api';
import { cn } from '@/utils/cn';
import { sameDay, dayLabel, listStamp } from '@/utils/chatTime';
import { TrustBadges, DistanceChip } from '@/components/ui/CaregiverTrust';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import LocationPicker from '@/components/ui/LocationPicker';
import { supabase } from '@/lib/supabase';
import logoImg from '@/assets/logo.png';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


type Tab = 'Overview' | 'My Requests' | 'Matches' | 'Schedule' | 'Messages' | 'Payments' | 'Profile';

const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'My Requests', label: 'My Requests', icon: <FileText className="w-5 h-5" /> },
  { id: 'Matches', label: 'Matches', icon: <Star className="w-5 h-5" /> },
  { id: 'Messages', label: 'Messages', icon: <MessageCircle className="w-5 h-5" /> },
  { id: 'Profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'Payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
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
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Dispute Report state
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    reportedUserId: string;
    reportedUserName: string;
    requestId?: string;
    matchId?: string;
    refId?: string;
  }>({
    isOpen: false,
    reportedUserId: '',
    reportedUserName: '',
  });
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState('');
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileModal, setProfileModal] = useState<null | 'personal' | 'notifications' | 'privacy' | 'account'>(null);
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, push: false, marketing: false });
  const [privacyPrefs, setPrivacyPrefs] = useState({ profileVisible: true, shareActivity: false, dataAnalytics: true });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{text: string; fromMe: boolean; time: string; at?: string}>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingReq, setEditingReq] = useState<any | null>(null);
  const [editLocation, setEditLocation] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSched, setEditSched] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Scheduling states
  const [showBookModal, setShowBookModal] = useState<null | { caregiverId?: string; caregiverName?: string; service?: string }>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookStartTime, setBookStartTime] = useState('09:00');
  const [bookEndTime, setBookEndTime] = useState('17:00');
  const [bookLocation, setBookLocation] = useState('');
  const [bookSaving, setBookSaving] = useState(false);

  // Review states
  const [showReviewModal, setShowReviewModal] = useState<null | { caregiverId: string; caregiverName: string; matchId: string }>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewService, setReviewService] = useState('Child Care');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const reviewPhotoInputRef = useRef<HTMLInputElement>(null);

  // Dispute Management state
  const [showDisputeModal, setShowDisputeModal] = useState<null | { matchId: string; caregiverName: string; sessionDate?: string }>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<string[]>([]);
  const [disputeSaving, setDisputeSaving] = useState(false);
  const disputeEvidenceInputRef = useRef<HTMLInputElement>(null);

  // Replaced with ReportModal component

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Profile settings (stats + prefs loaded on Profile tab open) ────────────
  const [profileSettings, setProfileSettings] = useState<any>(null);
  const [profileSettingsLoaded, setProfileSettingsLoaded] = useState(false);

  // ── Photo upload ───────────────────────────────────────────────────────────
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // ── Personal info form ─────────────────────────────────────────────────────
  const [personalForm, setPersonalForm] = useState({ name: user?.name || '', phone: '', address: '' });
  const [homeLocation, setHomeLocation] = useState<any>(null);
  const [personalSaving, setPersonalSaving] = useState(false);

  // ── Edit-profile quick modal ───────────────────────────────────────────────
  const [editProfileSaving, setEditProfileSaving] = useState(false);

  // ── Password change ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNextPw, setShowNextPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Account deletion ───────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  // ── Notification / privacy saving ─────────────────────────────────────────
  const [notifSaving, setNotifSaving] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  // ── Stripe payment methods ─────────────────────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [pmLoading, setPmLoading] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [apiNotifications, setApiNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadMessages = async (convId: string) => {
    try {
      const d: any = await get(`/conversations/${convId}/messages`);
      const msgs = (d.messages || []).map((m: any) => ({
        text: m.content,
        fromMe: m.isOwn,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        at: m.createdAt,
      }));
      setChatMessages(prev => ({ ...prev, [convId]: msgs }));
    } catch {}
  };

  useEffect(() => {
    if (!selectedMessage) return;
    loadMessages(selectedMessage);
    // Realtime: refetch when the other party sends a message (instant, low DB load)
    const channel = supabase
      .channel(`conversation:${selectedMessage}`)
      .on('broadcast', { event: 'new_message' }, () => loadMessages(selectedMessage))
      .subscribe();
    // Slow safety-net poll (was 3s) in case a realtime event is missed
    const timer = setInterval(() => loadMessages(selectedMessage), 20000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [selectedMessage]);

  const fetchData = useCallback(() => {
    Promise.allSettled([
      get('/matches'),
      get('/care-requests'),
      get('/schedule'),
      get('/payments'),
      get('/conversations'),
      notificationsApi.list(),
    ]).then(([matRes, reqRes, schedRes, payRes, convRes, notifRes]) => {
      if (matRes.status === 'fulfilled') setMatches((matRes.value as any).matches || []);
      if (reqRes.status === 'fulfilled') setRequests((reqRes.value as any).requests || []);
      if (schedRes.status === 'fulfilled') setSchedule((schedRes.value as any).schedule || []);
      if (payRes.status === 'fulfilled') setPayments((payRes.value as any).payments || []);
      if (convRes.status === 'fulfilled') setConversations((convRes.value as any).conversations || []);
      if (notifRes.status === 'fulfilled') setApiNotifications((notifRes.value as any).notifications || []);
      // Surface a retry affordance only on a total failure (e.g. network/outage).
      setLoadError([matRes, reqRes, schedRes, payRes, convRes, notifRes].every((r) => r.status === 'rejected'));
    }).finally(() => {
      setDataLoading(false);
    });
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError(false);
    setDataLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setDataLoading(true);
    fetchData();

    // 1. WebSocket-based real-time database listener
    const channel = supabase
      .channel('family-dashboard-realtime')
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

  const handleStripeCheckout = async (matchId: string) => {
    try {
      showToast('Redirecting to Stripe secure checkout...');
      const res: any = await post('/payments/checkout', { matchId });
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast(err.message || 'Failed to initialize secure checkout', 'error');
    }
  };

  // Handle payment success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const matchId = params.get('matchId');
    const sessionId = params.get('session_id');
    const tab = params.get('tab') as Tab;

    if (tab) setActiveTab(tab);

    if (paymentStatus === 'success' && matchId) {
      // Clear params to avoid re-triggering
      window.history.replaceState({}, '', window.location.pathname + (tab ? `?tab=${tab}` : ''));

      // Call unlock API — pass the Stripe session id so the server can verify payment
      post(`/matches/${matchId}/unlock-messaging`, sessionId ? { sessionId } : {})
        .then(() => {
          showToast('Messaging unlocked successfully!');
          fetchData();
        })
        .catch(err => {
          showToast(err.message || 'Failed to unlock messaging', 'error');
        });
    } else if (paymentStatus === 'cancelled') {
      showToast('Payment was cancelled', 'error');
      window.history.replaceState({}, '', window.location.pathname + (tab ? `?tab=${tab}` : ''));
    }
  }, [fetchData, showToast]);

  // Load profile settings when Profile tab opens (once per session).
  // Stats come from /auth/stats; preferences come from /auth/settings (phone, address, prefs).
  useEffect(() => {
    if (activeTab === 'Profile' && !profileSettingsLoaded) {
      setProfileSettingsLoaded(true);
      Promise.all([
        authApi.me().catch(() => null),
        authApi.stats().catch(() => null),
        authApi.settings().catch(() => null),
      ]).then(([meData, statsData, settingsData]: [any, any, any]) => {
        if (meData) updateUser({ name: meData.name, email: meData.email, photoUrl: meData.photoUrl });
        setProfileSettings({ ...settingsData, ...(statsData || {}) });
        if (settingsData) {
          setPersonalForm({ name: meData?.name || user?.name || '', phone: settingsData.phone || '', address: settingsData.address || '' });
          if (settingsData.location) setHomeLocation(settingsData.location);
          setEditPhone(settingsData.phone || '');
          setNotifPrefs(settingsData.notificationPrefs || { email: true, sms: true, push: false, marketing: false });
          setPrivacyPrefs(settingsData.privacyPrefs || { profileVisible: true, shareActivity: false, dataAnalytics: true });
        }
      });
    }
  }, [activeTab]);

  // Load Stripe payment methods when Payments tab opens
  useEffect(() => {
    if (activeTab === 'Payments') {
      setPmLoading(true);
      paymentsApi.paymentMethods()
        .then((d: any) => setPaymentMethods(d.paymentMethods || []))
        .catch(() => {})
        .finally(() => setPmLoading(false));
    }
  }, [activeTab]);

  // ── Photo upload handler ───────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { showToast('Image must be under 2 MB', 'error'); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res: any = await authApi.updateProfile({ photoUrl: base64 });
        updateUser({ photoUrl: res.photoUrl ?? base64 });
        showToast('Profile photo updated!');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload photo', 'error');
      } finally {
        setPhotoUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Save edit-profile quick modal ─────────────────────────────────────────
  const handleSaveEditProfile = async () => {
    setEditProfileSaving(true);
    try {
      const res: any = await authApi.updateProfile({ name: editName, phone: editPhone });
      updateUser({ name: res.name });
      setPersonalForm(p => ({ ...p, name: res.name, phone: res.phone || '' }));
      setShowEditProfile(false);
      showToast('Profile updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setEditProfileSaving(false);
    }
  };

  // ── Save personal information modal ───────────────────────────────────────
  const handleSavePersonalInfo = async () => {
    setPersonalSaving(true);
    try {
      const res: any = await authApi.updateProfile({ ...personalForm, locationData: homeLocation || undefined });
      updateUser({ name: res.name });
      setEditName(res.name);
      if (res.location) setHomeLocation(res.location);
      setProfileModal(null);
      showToast('Personal information saved!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setPersonalSaving(false);
    }
  };

  // ── Save notification preferences ─────────────────────────────────────────
  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      await authApi.updateNotifications(notifPrefs as Record<string, boolean>);
      setProfileModal(null);
      showToast('Notification preferences saved!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Save privacy preferences ───────────────────────────────────────────────
  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await authApi.updatePrivacy(privacyPrefs as Record<string, boolean>);
      setProfileModal(null);
      showToast('Privacy settings saved!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setPrivacySaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError('');
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError('All fields are required'); return; }
    if (!STRONG_PASSWORD_REGEX.test(pwForm.next)) {
      setPwError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setShowCurrentPw(false);
      setShowNextPw(false);
      setShowConfirmPw(false);
      setProfileModal(null);
      showToast('Password changed successfully!');
    } catch (err: any) {
      const msg = err.message || 'Failed to change password';
      setPwError(msg);
      showToast(msg, 'error');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteProcessing(true);
    try {
      await authApi.deleteAccount();
      logout();
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
      setDeleteProcessing(false);
    }
  };


  // ── Remove payment method ──────────────────────────────────────────────────
  const handleRemovePaymentMethod = async (id: string) => {
    try {
      await paymentsApi.removePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
      showToast('Card removed');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove card', 'error');
    }
  };

  // ── Set default payment method ─────────────────────────────────────────────
  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      await paymentsApi.setDefaultPaymentMethod(id);
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
      showToast('Default card updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update default', 'error');
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [chatMessages, selectedMessage]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedMessage) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const content = chatInput.trim();
    const newMsg = { text: content, fromMe: true, time, at: new Date().toISOString() };
    setChatMessages(prev => ({ ...prev, [selectedMessage]: [...(prev[selectedMessage] || []), newMsg] }));
    setChatInput('');
    try { await post(`/conversations/${selectedMessage}/messages`, { content }); } catch {}
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const unreadApiCount = apiNotifications.filter((n: any) => !(n.read ?? n.isRead ?? false)).length;
  const unread = notificationsRead ? 0 : unreadApiCount;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'U';

  const navBadges: Partial<Record<Tab, number>> = {
    'My Requests': requests.filter((r: any) => r.status === 'matching').length || 0,
    'Matches': matches.filter((m: any) => m.status === 'pending').length || 0,
    'Messages': conversations.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0) || 0,
  };

  const totalUnread = conversations.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0);

  const handleEditRequest = async () => {
    if (!editingReq) return;
    setEditSaving(true);
    try {
      const payload: any = { location: editLocation };
      if (editDesc.trim()) payload.details = { ...editingReq.details, description: editDesc };
      if (editSched.trim()) payload.details = { ...(payload.details ?? editingReq.details), schedule: editSched };
      const updated: any = await put(`/care-requests/${editingReq.id}`, payload);
      setRequests(prev => prev.map((r: any) => r.id === editingReq.id ? updated.request : r));
      setEditingReq(null);
      showToast('Care request updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update request', 'error');
    }
    setEditSaving(false);
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await put(`/care-requests/${id}/cancel`);
      setRequests(prev => prev.map((r: any) => r.id === id ? { ...r, status: 'cancelled' } : r));
      showToast('Request cancelled');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel request', 'error');
    }
    setCancelConfirmId(null);
  };

  const openNotifications = () => {
    setNotifOpen(true);
    setNotificationsRead(true);
    if (unreadApiCount > 0) {
      notificationsApi.markAllRead().catch(() => {});
      setApiNotifications(prev => prev.map((n: any) => ({ ...n, read: true, isRead: true })));
    }
  };

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
            You cannot make new care requests or message caregivers at this time.
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

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-20 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        'bg-brand-950'
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
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                {user?.photoUrl
                  ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                  : initials}
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
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
              {user?.photoUrl
                ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                : initials}
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
      <div className={cn('flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>

        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0 shadow-sm">
          {/* Mobile: logo | Desktop: page title */}
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
                  {apiNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</div>
                  ) : apiNotifications.slice(0, 8).map((n: any) => {
                    const isRead = n.read ?? n.isRead ?? false;
                    return (
                      <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <p className={cn('text-sm font-medium', isRead ? 'text-gray-600' : 'text-gray-900')}>{n.content || n.message || n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : n.time}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative lg:hidden">
              <button
                className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold transition-all active:scale-95 overflow-hidden"
                onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
              >
                {user?.photoUrl
                  ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                  : initials}
              </button>
              {mobileUserMenuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fade-in-up">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Family'}</p>
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
              {apiNotifications.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No notifications yet.</div>
              ) : apiNotifications.slice(0, 8).map((n: any) => {
                const isRead = n.read ?? n.isRead ?? false;
                return (
                  <div key={n.id} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-start gap-3">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', isRead ? 'bg-gray-300' : 'bg-brand-500')} />
                    <div>
                      <p className={cn('text-sm font-medium', isRead ? 'text-gray-600' : 'text-gray-800')}>{n.content || n.message || n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">

          {/* ── LOADING SKELETON ── */}
          {dataLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-36 bg-gray-100 rounded-3xl" />
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[0,1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-48 bg-gray-100 rounded-2xl" />
                <div className="h-48 bg-gray-100 rounded-2xl" />
              </div>
            </div>
          )}

          {/* ── TOTAL LOAD FAILURE ── */}
          {!dataLoading && loadError && (
            <EmptyState
              title="We couldn't load your dashboard"
              subtitle="Please check your connection and try again."
              action={{ label: 'Retry', onClick: retryLoad }}
            />
          )}

          {/* ── OVERVIEW ── */}
          {!dataLoading && !loadError && activeTab === 'Overview' && (
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

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard label="Active Requests" value={requests.filter((r: any) => r.status !== 'cancelled' && r.status !== 'completed').length}
                  icon={<FileText className="w-4 h-4" />}
                  sub={requests.filter((r: any) => r.status === 'matching').length > 0 ? `${requests.filter((r: any) => r.status === 'matching').length} finding matches` : requests.length > 0 ? 'All matched' : 'No requests yet'}
                  colorBg="bg-brand-50" colorText="text-brand-600" />
                <StatCard label="Matches Found" value={matches.length}
                  icon={<Star className="w-4 h-4" />}
                  sub={matches.filter((m: any) => m.status === 'accepted').length > 0 ? `${matches.filter((m: any) => m.status === 'accepted').length} accepted` : matches.length > 0 ? 'Awaiting response' : 'No matches yet'}
                  colorBg="bg-emerald-50" colorText="text-emerald-600" />
                <StatCard label="Upcoming Sessions" value={schedule.length} icon={<Calendar className="w-4 h-4" />}
                  sub={schedule.length > 0 ? `Next: ${schedule[0]?.date || 'Upcoming'}` : 'None scheduled'}
                  colorBg="bg-sky-50" colorText="text-sky-600" />
                <StatCard label="Messages" value={conversations.filter((c: any) => c.messagingUnlocked).length} icon={<MessageCircle className="w-4 h-4" />}
                  sub={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
                  colorBg="bg-violet-50" colorText="text-violet-600" />
                <StatCard label="Total Spent" value={`$${(payments.filter((p: any) => p.status === 'succeeded').reduce((s: number, p: any) => s + (p.amountCents || 0), 0) / 100).toFixed(2)}`}
                  icon={<DollarSign className="w-4 h-4" />}
                  sub={payments.filter((p: any) => p.status === 'succeeded').length > 0 ? `${payments.filter((p: any) => p.status === 'succeeded').length} transactions` : 'No payments yet'}
                  colorBg="bg-amber-50" colorText="text-amber-600" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Upcoming Sessions</h3>
                    <button onClick={() => setActiveTab('Schedule')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {schedule.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-gray-400">
                        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        No upcoming sessions yet. Book one with a matched caregiver.
                      </div>
                    )}
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
                    <h3 className="font-bold text-gray-900">Recent Matches</h3>
                    <button onClick={() => setActiveTab('Matches')} className="text-sm text-brand-600 font-medium hover:underline">View all</button>
                  </div>
                  {matches.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      No matches yet — post a care request to get started.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {matches.slice(0, 3).map((match: any, i: number) => (
                        <div key={match.id} className="flex items-center gap-3 px-5 py-3.5">
                          <Avatar name={match.caregiver?.name} src={match.caregiver?.photoUrl} size={36} className="rounded-xl" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{match.caregiver?.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-gray-500">{match.caregiver?.rating || '—'}</span>
                              <DistanceChip miles={match.distanceMiles} nearYou={match.nearYou} />
                              <TrustBadges verified={match.caregiver?.verified} backgroundChecked={match.caregiver?.backgroundChecked} compact />
                            </div>
                          </div>
                          <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap',
                            match.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            match.messagingUnlocked ? 'bg-brand-100 text-brand-700' :
                            'bg-amber-100 text-amber-700')}>
                            {match.messagingUnlocked ? 'Chatting' : match.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── MY REQUESTS ── */}
          {!dataLoading && activeTab === 'My Requests' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">My Care Requests</h2>
                <Button variant="primary" size="sm" onClick={() => navigate('/find-care')}>
                  <Plus className="w-4 h-4" /> New Request
                </Button>
              </div>
              {requests.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-semibold text-gray-700 mb-1">No care requests yet</p>
                  <p className="text-sm text-gray-400 mb-5">Post a request to start finding the right caregiver for your family.</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/find-care')}>
                    <Plus className="w-4 h-4" /> Post a Request
                  </Button>
                </div>
              )}
              {requests.map((req: any) => {
                const reqMatches = matches.filter((m: any) => m.careRequestId === req.id);
                return (
                  <div key={req.id} className="space-y-3">
                    {/* Request card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
                              {req.status === 'matched' ? `${Math.max(reqMatches.length, req.matchCount, 1)} Matches Found` : req.status === 'matching' ? 'Finding Matches…' : 'Pending'}
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
                        {req.status !== 'cancelled' && req.status !== 'completed' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingReq(req); setEditLocation(req.location || ''); setEditDesc(req.details?.description || req.description || ''); setEditSched(req.details?.schedule || ''); }}>
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

                    {/* Matches nested under this request */}
                    {reqMatches.length > 0 && (
                      <div className="pl-4 border-l-2 border-brand-100 space-y-3">
                        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                          {reqMatches.length} Caregiver{reqMatches.length !== 1 ? 's' : ''} Matched
                        </p>
                        {reqMatches.map((match: any, i: number) => (
                          <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-start gap-3">
                              {match.caregiver?.photoUrl ? (
                                <img src={match.caregiver.photoUrl} alt={match.caregiver.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0', avatarColors[i % avatarColors.length])}>
                                  {(match.caregiver?.name || '?').split(' ').map((n: string) => n[0]).join('')}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-900 text-sm">{match.caregiver?.name}</span>
                                  {match.caregiver?.verified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                                      <Shield className="w-3 h-3" /> Verified
                                    </span>
                                  )}
                                  {match.nearYou && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                      <MapPin className="w-3 h-3" /> Near You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  <span className="text-xs font-semibold text-gray-700">{match.caregiver?.rating}</span>
                                  <span className="text-xs text-gray-400">· {match.budget}</span>
                                </div>
                              </div>
                              <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
                                match.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                                {match.status}
                              </span>
                            </div>
                            <div className="mt-3 flex gap-2 flex-wrap items-center">
                              {match.messagingUnlocked ? (
                                <Button variant="primary" size="sm" onClick={() => setActiveTab('Messages')}>
                                  <MessageCircle className="w-3.5 h-3.5" /> Message
                                </Button>
                              ) : match.status === 'accepted' ? (
                                <Button variant="coral" size="sm" onClick={() => handleStripeCheckout(match.id)}>
                                  <DollarSign className="w-3.5 h-3.5" /> Unlock Messaging
                                </Button>
                              ) : (
                                <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 font-semibold flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" /> Awaiting acceptance
                                </span>
                              )}
                              <Button variant="secondary" size="sm" onClick={() => navigate(`/caregivers/${match.caregiver?.id}`)}>View Profile</Button>
                              <button 
                                onClick={() => setReportModal({
                                  isOpen: true,
                                  reportedUserId: match.caregiver?.id || '',
                                  reportedUserName: match.caregiver?.name || '',
                                  requestId: match.careRequestId,
                                  matchId: match.id,
                                  refId: match.refId
                                })}
                                className="text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                              >
                                <Flag className="w-3 h-3" /> Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unscoped matches (no request_id) */}
              {matches.filter((m: any) => !m.careRequestId || !requests.some((r: any) => r.id === m.careRequestId)).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-500">Other Matches</p>
                  {matches.filter((m: any) => !m.careRequestId || !requests.some((r: any) => r.id === m.careRequestId)).map((match: any, i: number) => (
                    <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={match.caregiver?.name} src={match.caregiver?.photoUrl} size={48} className="rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-gray-900 text-sm block">{match.caregiver?.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-gray-700">{match.caregiver?.rating}</span>
                            <span className="text-xs text-gray-400">· {match.budget}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <TrustBadges verified={match.caregiver?.verified} backgroundChecked={match.caregiver?.backgroundChecked} compact />
                            <DistanceChip miles={match.distanceMiles} nearYou={match.nearYou} />
                          </div>
                        </div>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
                          match.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                          {match.status}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {match.messagingUnlocked ? (
                          <Button variant="primary" size="sm" onClick={() => setActiveTab('Messages')}>
                            <MessageCircle className="w-3.5 h-3.5" /> Message
                          </Button>
                        ) : match.status === 'accepted' ? (
                          <Button variant="coral" size="sm" onClick={() => handleStripeCheckout(match.id)}>
                            <DollarSign className="w-3.5 h-3.5" /> Unlock Messaging
                          </Button>
                        ) : (
                          <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 font-semibold">Awaiting acceptance</span>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/caregivers/${match.caregiver?.id}`)}>View Profile</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MATCHES ── */}
          {!dataLoading && activeTab === 'Matches' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">My Matches</h2>
                <Button variant="primary" size="sm" onClick={() => navigate('/find-care')}>
                  <Plus className="w-4 h-4" /> New Request
                </Button>
              </div>
              {matches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <Star className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-semibold text-gray-700 mb-1">No matches yet</p>
                  <p className="text-sm text-gray-400 mb-5">Post a care request and we'll match you with the right caregivers.</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/find-care')}>
                    <Plus className="w-4 h-4" /> Find Care
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match: any, i: number) => (
                    <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-start gap-4">
                        <Avatar name={match.caregiver?.name} src={match.caregiver?.photoUrl} size={56} className="rounded-2xl" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-gray-900">{match.caregiver?.name}</h3>
                            <TrustBadges verified={match.caregiver?.verified} backgroundChecked={match.caregiver?.backgroundChecked} />
                            <DistanceChip miles={match.distanceMiles} nearYou={match.nearYou} />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-gray-700">{match.caregiver?.rating || '—'}</span>
                            {match.budget && <span className="text-xs text-gray-400">· {match.budget}</span>}
                            {match.refId && (
                              <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-2 uppercase tracking-wider">
                                ID: {match.refId}
                              </span>
                            )}
                          </div>
                          {match.caregiver?.specialties?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {match.caregiver.specialties.slice(0, 3).map((s: string) => (
                                <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
                          match.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          match.status === 'declined' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-700')}>
                          {match.status}
                        </span>
                      </div>
                      <div className="mt-4 border-t border-gray-50 pt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                        {/* Primary action — full-width on mobile for an app-like tap target */}
                        {match.messagingUnlocked ? (
                          <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center" onClick={() => setActiveTab('Messages')}>
                            <MessageCircle className="w-3.5 h-3.5" /> Message
                          </Button>
                        ) : match.status === 'accepted' ? (
                          <Button variant="coral" size="sm" className="w-full sm:w-auto justify-center" onClick={async () => {
                            try {
                              const res: any = await post('/payments/checkout', { matchId: match.id });
                              if (res.url) window.location.href = res.url;
                            } catch (err: any) {
                              showToast(err.message || 'Failed to start checkout', 'error');
                            }
                          }}>
                            <DollarSign className="w-3.5 h-3.5" /> Unlock Messaging
                          </Button>
                        ) : (
                          <span className="w-full sm:w-auto justify-center text-xs px-3 py-2 rounded-xl bg-amber-50 text-amber-600 font-semibold flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Awaiting acceptance
                          </span>
                        )}

                        {/* Secondary actions — grouped, wrapping */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/caregivers/${match.caregiver?.id}`)}>
                            View Profile
                          </Button>
                          {match.messagingUnlocked && (
                            <>
                              <button
                                onClick={() => {
                                  setShowReviewModal({
                                    caregiverId: match.caregiver?.id || '',
                                    caregiverName: match.caregiver?.name || 'Caregiver',
                                    matchId: match.id
                                  });
                                  setReviewService(match.careType || 'Child Care');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 text-amber-700 text-xs font-semibold transition-all shadow-sm"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" /> Rate
                              </button>
                              <button
                                onClick={() => {
                                  setReportModal({
                                    isOpen: true,
                                    reportedUserId: match.caregiver?.id || '',
                                    reportedUserName: match.caregiver?.name || 'Caregiver',
                                    requestId: match.careRequestId,
                                    refId: match.refId
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold transition-all shadow-sm"
                              >
                                <Flag className="w-3.5 h-3.5 shrink-0" /> Report
                              </button>
                              <button
                                onClick={() => {
                                  setShowDisputeModal({
                                    matchId: match.id,
                                    caregiverName: match.caregiver?.name || 'Caregiver',
                                    sessionDate: match.scheduledAt || undefined,
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-all shadow-sm"
                              >
                                <Scale className="w-3.5 h-3.5 shrink-0" /> Dispute
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {!dataLoading && activeTab === 'Schedule' && (() => {
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const firstDay = new Date(calYear, calMonth, 1).getDay();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setCalSelectedDay(null); };
            const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setCalSelectedDay(null); };

            const parseSessionDate = (s: any): Date | null => {
              if (!s.date && !s.date_label) return null;
              const dateVal = s.date || s.date_label;
              if (dateVal === 'Today') return new Date();
              if (dateVal === 'Tomorrow') {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                return d;
              }
              let d: Date;
              const hasYear = /\b\d{4}\b/.test(dateVal);
              if (hasYear) {
                d = new Date(dateVal);
              } else {
                const stripped = dateVal.replace(/^[A-Za-z]+,\s*/, '');
                d = new Date(`${stripped}, ${calYear}`);
              }
              return isNaN(d.getTime()) ? null : d;
            };

            const sessionsByDay = new Map<number, any[]>();
            schedule.forEach((s: any) => {
              const d = parseSessionDate(s);
              if (d && d.getFullYear() === calYear && d.getMonth() === calMonth) {
                const day = d.getDate();
                sessionsByDay.set(day, [...(sessionsByDay.get(day) || []), s]);
              }
            });
            const sessionDays = new Set(sessionsByDay.keys());
            const selectedSessions = calSelectedDay
              ? (sessionsByDay.get(calSelectedDay) || [])
              : schedule;
            const today = new Date();
            return (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900">Schedule</h2>
                {/* Month calendar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-gray-900">{monthNames[calMonth]} {calYear}</span>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-2">
                    {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
                      const hasSession = sessionDays.has(day);
                      const isSelected = calSelectedDay === day;
                      const daySessions = sessionsByDay.get(day) || [];
                      const tooltipText = daySessions.map((s: any) => `${s.service}${s.caregiverName ? ' · ' + s.caregiverName : ''} (${s.time || ''})`).join('\n');
                      return (
                        <button key={day} onClick={() => setCalSelectedDay(isSelected ? null : day)}
                          title={hasSession ? tooltipText : undefined}
                          className={cn(
                            'relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-sm font-medium transition-all',
                            isSelected ? 'bg-brand-600 text-white' :
                            isToday ? 'bg-brand-50 text-brand-700 font-bold' :
                            hasSession ? 'hover:bg-brand-50 text-gray-800' : 'hover:bg-gray-50 text-gray-500'
                          )}>
                          {day}
                          {hasSession && !isSelected && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {calSelectedDay && (
                    <p className="text-xs text-center text-brand-600 font-medium mt-3">
                      Showing sessions for {monthNames[calMonth]} {calSelectedDay} · <button onClick={() => setCalSelectedDay(null)} className="underline">Clear</button>
                    </p>
                  )}
                </div>
                {/* Session list */}
                {selectedSessions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{calSelectedDay ? 'No sessions on this day' : 'No upcoming sessions'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSessions.map((session: any) => (
                      <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                        <div className={cn('w-1.5 h-16 rounded-full shrink-0', session.colorClass || 'bg-brand-400')} />
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{session.caregiverName}</p>
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
                            onClick={() => setReportModal({
                              isOpen: true,
                              reportedUserId: session.caregiverId,
                              reportedUserName: session.caregiverName,
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

          {/* ── MESSAGES ── */}
          {!dataLoading && activeTab === 'Messages' && (() => {
            const activeConv = selectedMessage ? conversations.find((c: any) => c.id === selectedMessage) : null;
            const activeMessages = selectedMessage ? (chatMessages[selectedMessage] || []) : [];
            const threadList = conversations.filter((c: any) => c.messagingUnlocked);
            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                {threadList.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="font-semibold text-gray-700 mb-1">No conversations yet</p>
                    <p className="text-sm text-gray-400 mb-5">Unlock messaging with a matched caregiver to start chatting.</p>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab('Matches')}>
                      View Matches
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex h-[calc(100dvh-12rem)] min-h-[460px]">
                    {/* Conversation list pane */}
                    <aside className={cn('w-full md:w-80 lg:w-96 border-r border-gray-100 flex-col min-h-0', activeConv ? 'hidden md:flex' : 'flex')}>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        {threadList.map((conv: any, i: number) => {
                          const msgs = chatMessages[conv.id] || [];
                          const lastMsg = msgs[msgs.length - 1];
                          const unreadDot = (conv.unreadCount || 0) > 0;
                          return (
                            <button key={conv.id} onClick={() => { setSelectedMessage(conv.id); loadMessages(conv.id); }}
                              className={cn('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors', activeConv?.id === conv.id && 'bg-brand-50/60')}>
                              <div className="relative shrink-0">
                                {conv.otherPhoto ? (
                                  <img src={conv.otherPhoto} alt={conv.otherName} className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-bold', avatarColors[i % avatarColors.length])}>
                                    {(conv.otherName || '?').split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <h4 className={cn('font-semibold text-sm truncate', unreadDot ? 'text-gray-900' : 'text-gray-700')}>{conv.otherName}</h4>
                                  <span className="text-[10px] text-gray-400 shrink-0">{listStamp(conv.lastMessageAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-gray-500 truncate">
                                    {lastMsg ? (lastMsg.fromMe ? `You: ${lastMsg.text}` : lastMsg.text) : conv.lastMessage || ''}
                                  </p>
                                  {unreadDot && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{conv.unreadCount}</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    {/* Conversation thread pane */}
                    <section className={cn('flex-1 flex-col min-h-0', activeConv ? 'flex' : 'hidden md:flex')}>
                      {!activeConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-brand-400" />
                          </div>
                          <p className="text-sm">Select a conversation to start chatting</p>
                        </div>
                      ) : (
                        <>
                          {/* Chat header */}
                          <div className="flex items-center gap-3 px-4 sm:px-5 h-16 border-b border-gray-100 shrink-0">
                            <button onClick={() => { setSelectedMessage(null); setShowPhone(false); }} className="md:hidden text-brand-600 shrink-0 -ml-1">
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            {activeConv?.otherPhoto ? (
                              <img src={activeConv.otherPhoto} alt={activeConv.otherName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0', avatarColors[0])}>
                                {(activeConv?.otherName || '?').split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 block truncate leading-tight">{activeConv?.otherName}</span>
                              <span className="text-xs text-green-600">● Online</span>
                            </div>
                            {/* Book Care Session */}
                            <button
                              onClick={() => {
                                setShowBookModal({
                                  caregiverId: activeConv?.caregiverId || activeConv?.otherId,
                                  caregiverName: activeConv?.otherName,
                                  service: activeConv?.careType || 'Child Care'
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition-colors shrink-0"
                            >
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-brand-600" />
                              <span className="hidden sm:inline">Book Session</span>
                            </button>
                            {/* Call button */}
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setShowPhone(p => !p)}
                                className="w-9 h-9 rounded-full bg-brand-50 hover:bg-brand-100 flex items-center justify-center text-brand-600 transition-colors"
                                title="Call caregiver"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              {showPhone && (
                                <div className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52 z-20">
                                  <p className="text-xs text-gray-500 mb-1 font-medium">Caregiver phone</p>
                                  {activeConv?.otherPhone ? (
                                    <a href={`tel:${activeConv.otherPhone}`} className="text-sm font-semibold text-brand-600 hover:underline block">
                                      {activeConv.otherPhone}
                                    </a>
                                  ) : (
                                    <p className="text-xs text-gray-500">Phone not provided yet. Contact via message.</p>
                                  )}
                                  <button onClick={() => setShowPhone(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-2 block">Close</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Messages (scrollable, WhatsApp-style day dividers) */}
                          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4 space-y-1 bg-[#f7f8fa]">
                            {activeMessages.map((msg, i) => {
                              const prev = activeMessages[i - 1];
                              const showDay = !!msg.at && (!prev?.at || !sameDay(new Date(prev.at), new Date(msg.at)));
                              return (
                                <div key={i}>
                                  {showDay && (
                                    <div className="flex justify-center my-3">
                                      <span className="px-3 py-1 rounded-full bg-white text-gray-500 text-[11px] font-medium shadow-sm border border-gray-100">
                                        {dayLabel(new Date(msg.at as string))}
                                      </span>
                                    </div>
                                  )}
                                  <div className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}>
                                    <div className={cn('max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm', msg.fromMe ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md')}>
                                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                      <p className={cn('text-[10px] mt-0.5 text-right', msg.fromMe ? 'text-brand-200' : 'text-gray-400')}>{msg.time}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </div>
                          {/* Input */}
                          <div className="px-3 sm:px-5 py-3 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
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
                        </>
                      )}
                    </section>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── PAYMENTS ── */}
          {!dataLoading && activeTab === 'Payments' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              {(() => {
                const now = new Date();
                const thisMonthCents = payments.filter((p: any) => {
                  const d = p.createdAt ? new Date(p.createdAt) : null;
                  return p.status === 'succeeded' && d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((s: number, p: any) => s + (p.amountCents || 0), 0);
                const lastMonthCents = payments.filter((p: any) => {
                  const d = p.createdAt ? new Date(p.createdAt) : null;
                  const lm = new Date(now.getFullYear(), now.getMonth() - 1);
                  return p.status === 'succeeded' && d && d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
                }).reduce((s: number, p: any) => s + (p.amountCents || 0), 0);
                const allTimeCents = payments.filter((p: any) => p.status === 'succeeded').reduce((s: number, p: any) => s + (p.amountCents || 0), 0);
                const fmt = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;
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
                  {payments.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">No transactions yet.</div>
                  ) : payments.map((pay: any) => {
                    const amountDisplay = pay.amount ?? (pay.amountCents != null ? `$${(pay.amountCents / 100).toFixed(2)}` : '—');
                    const dateDisplay = pay.date ?? (pay.createdAt ? new Date(pay.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
                    const methodDisplay = pay.method ?? (pay.brand ? `${pay.brand} ····${pay.last4}` : 'Card');
                    return (
                      <div key={pay.id} onClick={() => setSelectedPayment(pay)} className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                            {pay.description}
                            {pay.refId && (
                              <span className="text-[10px] font-mono bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                #{pay.refId}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{dateDisplay} · {methodDisplay}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{amountDisplay}</p>
                          <span className={cn('text-xs font-medium', pay.status === 'succeeded' ? 'text-green-600' : pay.status === 'failed' ? 'text-red-500' : 'text-amber-600')}>
                            {pay.status}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
                {pmLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading cards…
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">No payment methods added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map(pm => (
                      <div key={pm.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                        <CreditCard className="w-8 h-8 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 capitalize">{pm.brand} ending in {pm.last4}</p>
                          <p className="text-sm text-gray-400">Expires {pm.expMonth}/{pm.expYear}</p>
                        </div>
                        {pm.isDefault
                          ? <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-semibold shrink-0">Default</span>
                          : <button onClick={() => handleSetDefaultPaymentMethod(pm.id)} className="text-xs text-brand-600 hover:underline shrink-0 font-medium">Set default</button>
                        }
                        <button onClick={() => handleRemovePaymentMethod(pm.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
          {!dataLoading && activeTab === 'Profile' && (
            <div className="space-y-5 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
              {/* Hidden file input for photo upload */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {/* Profile header card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {user?.photoUrl
                        ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-md hover:bg-brand-700 transition-colors disabled:opacity-60"
                    >
                      {photoUploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Camera className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{user?.name || 'User'}</h2>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      <Check className="w-3 h-3" /> Verified Account
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setShowEditProfile(true)}>
                    <Edit3 className="w-4 h-4" /> Edit
                  </Button>
                </div>

                {/* Quick stats from API */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Member since', value: profileSettings?.memberSince ?? '—' },
                    { label: 'Care requests', value: profileSettings != null ? `${profileSettings.careRequestsCount} total` : '—' },
                    { label: 'Matches found', value: profileSettings != null ? `${profileSettings.matchesCount} caregivers` : '—' },
                    { label: 'Sessions booked', value: profileSettings != null ? `${profileSettings.sessionsCount} total` : '—' },
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule / Availability</label>
                <input
                  type="text"
                  value={editSched}
                  onChange={e => setEditSched(e.target.value)}
                  placeholder="e.g. Weekdays 9am–5pm, part-time"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Details</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Any specific needs or preferences…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
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
                  <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {user?.photoUrl
                      ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-md hover:bg-brand-700 transition-colors disabled:opacity-60"
                  >
                    {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
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
                <input type="tel" value={editPhone} onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 10) val = val.slice(0, 10);
                  let formatted = val;
                  if (val.length > 0) {
                    if (val.length <= 3) formatted = `(${val}`;
                    else if (val.length <= 6) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                    else formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                  }
                  setEditPhone(formatted);
                }}
                  placeholder="(555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setShowEditProfile(false)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={handleSaveEditProfile} disabled={editProfileSaving}>
                  {editProfileSaving ? 'Saving…' : 'Save Changes'}
                </Button>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={personalForm.name} placeholder="Your full name"
                  onChange={e => setPersonalForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 outline-none text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input type="tel" value={personalForm.phone} placeholder="(555) 000-0000"
                  onChange={e => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    let formatted = val;
                    if (val.length > 0) {
                      if (val.length <= 3) formatted = `(${val}`;
                      else if (val.length <= 6) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                      else formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                    }
                    setPersonalForm(p => ({ ...p, phone: formatted }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input type="text" value={personalForm.address} placeholder="City, State ZIP"
                  onChange={e => setPersonalForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Home location <span className="text-gray-400 font-normal">(used to find caregivers near you)</span></label>
                <LocationPicker
                  initial={homeLocation}
                  onConfirm={(_str, data) => setHomeLocation(data)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setProfileModal(null)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={handleSavePersonalInfo} disabled={personalSaving}>
                  {personalSaving ? 'Saving…' : 'Save Changes'}
                </Button>
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
              <Button variant="primary" fullWidth onClick={handleSaveNotifications} disabled={notifSaving} className="mt-2">
                {notifSaving ? 'Saving…' : 'Save Preferences'}
              </Button>
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
                <button
                  onClick={() => { setProfileModal(null); setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
                  className="text-sm text-red-500 font-medium hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Request account deletion
                </button>
              </div>
              <Button variant="primary" fullWidth onClick={handleSavePrivacy} disabled={privacySaving}>
                {privacySaving ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNT SETTINGS MODAL ── */}
      {profileModal === 'account' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setProfileModal(null); setPwForm({ current: '', next: '', confirm: '' }); setPwError(''); setShowCurrentPw(false); setShowNextPw(false); setShowConfirmPw(false); }} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Change Password</h3>
              <button onClick={() => { setProfileModal(null); setPwForm({ current: '', next: '', confirm: '' }); setPwError(''); setShowCurrentPw(false); setShowNextPw(false); setShowConfirmPw(false); }} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showCurrentPw ? 'text' : 'password'} value={pwForm.current} placeholder="Enter current password"
                    onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showNextPw ? 'text' : 'password'} value={pwForm.next} placeholder="At least 8 characters"
                    onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                  <button type="button" onClick={() => setShowNextPw(!showNextPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNextPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwForm.next && !STRONG_PASSWORD_REGEX.test(pwForm.next) && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium leading-tight">
                    Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showConfirmPw ? 'text' : 'password'} value={pwForm.confirm} placeholder="Re-enter new password"
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {pwError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => { setProfileModal(null); setPwForm({ current: '', next: '', confirm: '' }); setPwError(''); setShowCurrentPw(false); setShowNextPw(false); setShowConfirmPw(false); }}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={handleChangePassword} disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Change Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PAYMENT METHOD MODAL (Stripe Elements) ── */}
      {showAddPayment && (
        <StripeCardModal
          onSuccess={(pm) => {
            setPaymentMethods(prev => {
              const updated = [...prev, pm];
              if (pm.isDefault) return updated.map(m => ({ ...m, isDefault: m.id === pm.id }));
              return updated;
            });
            setShowAddPayment(false);
            showToast('Payment method added!');
          }}
          onClose={() => setShowAddPayment(false)}
        />
      )}

      {/* ── DELETE ACCOUNT CONFIRM MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteProcessing && setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg text-red-600">Delete Account</h3>
              <button disabled={deleteProcessing} onClick={() => setShowDeleteConfirm(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center disabled:opacity-40">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold mb-1">This action is permanent and cannot be undone.</p>
                  <p>Your profile, care requests, matches, messages, and all data will be permanently deleted.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-4 py-3 rounded-xl border border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)} disabled={deleteProcessing}>Cancel</Button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleteProcessing}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {deleteProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete My Account</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST OVERLAY ── */}
      <div className="fixed bottom-24 lg:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-fade-in-up pointer-events-auto',
              t.type === 'success'
                ? 'bg-gray-900 text-white'
                : 'bg-red-600 text-white'
            )}
          >
            {t.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {t.message}
          </div>
        ))}
      </div>

      {/* ── TRANSACTION DETAIL MODAL ── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPayment(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl z-10 overflow-hidden animate-fade-in-up">
            <div className="relative p-8 text-center bg-gradient-to-b from-emerald-50 to-white">
              <div className="absolute top-4 right-4">
                <button onClick={() => setSelectedPayment(null)} className="w-8 h-8 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">Payment Successful</p>
              <h2 className="text-4xl font-black text-gray-900 mb-2">
                {selectedPayment.amount ?? (selectedPayment.amountCents != null ? `$${(selectedPayment.amountCents / 100).toFixed(2)}` : '—')}
              </h2>
              <p className="text-sm text-gray-500 font-medium">{selectedPayment.description}</p>
            </div>

            <div className="px-8 pb-8 space-y-6">
              {/* Decorative dotted line */}
              <div className="border-t-2 border-dashed border-gray-100 relative">
                <div className="absolute -left-10 -top-2 w-4 h-4 bg-gray-100 rounded-full" />
                <div className="absolute -right-10 -top-2 w-4 h-4 bg-gray-100 rounded-full" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedPayment.date ?? (selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-5 bg-gray-50 rounded border border-gray-100 flex items-center justify-center">
                      <CreditCard className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 capitalize">{selectedPayment.method ?? (selectedPayment.brand ? `${selectedPayment.brand} •••• ${selectedPayment.last4}` : 'Card')}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ref ID</span>
                  <span className="text-xs font-mono font-medium text-gray-400">
                    {selectedPayment.refId ? selectedPayment.refId : `#${selectedPayment.id.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button variant="primary" fullWidth size="xl" className="shadow-lg shadow-brand-200">
                  <FileText className="w-4 h-4 mr-2" /> Download Receipt
                </Button>
                <button 
                  onClick={() => setSelectedPayment(null)}
                  className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Close Receipt
                </button>
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
              <div className="bg-brand-50 p-3.5 rounded-2xl border border-brand-100">
                <p className="text-xs font-semibold text-brand-800 uppercase tracking-wider">Matched Caregiver</p>
                <p className="text-sm font-bold text-brand-950 mt-0.5">{showBookModal.caregiverName}</p>
                <p className="text-xs text-brand-600 mt-0.5">Service Type: {showBookModal.service}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={e => setBookDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm font-medium animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={bookStartTime}
                    onChange={e => setBookStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={bookEndTime}
                    onChange={e => setBookEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm font-medium bg-white"
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
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
                        caregiverId: showBookModal.caregiverId,
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
                      showToast('Failed to book session.', 'error');
                    } finally {
                      setBookSaving(false);
                    }
                  }}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  {bookSaving ? 'Scheduling…' : 'Schedule Session'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Caregiver (Review) Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Rate Your Experience</h3>
              <button onClick={() => setShowReviewModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-0.5">Caregiver</p>
                <p className="text-base font-bold text-amber-950">{showReviewModal.caregiverName}</p>
                <p className="text-xs text-amber-700 mt-0.5">Service: {reviewService}</p>
              </div>

              {/* Star Rating Picker */}
              <div className="flex flex-col items-center py-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => {
                    const active = star <= reviewRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 transform hover:scale-110 transition-transform"
                      >
                        <Star className={cn(
                          "w-8 h-8 transition-colors",
                          active ? "text-amber-400 fill-amber-400" : "text-gray-200"
                        )} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Description Box */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Feedback & Review</label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Share details of your experience to help build trust inside the community!"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Add Photos (optional)</label>
                <input
                  ref={reviewPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    const previews: string[] = [];
                    for (const file of files.slice(0, 3)) {
                      const reader = new FileReader();
                      await new Promise<void>(res => { reader.onload = () => { previews.push(reader.result as string); res(); }; reader.readAsDataURL(file); });
                    }
                    setReviewPhotos(prev => [...prev, ...previews].slice(0, 3));
                    e.target.value = '';
                  }}
                />
                {reviewPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => reviewPhotoInputRef.current?.click()}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-bold hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ImagePlus className="w-4 h-4" /> Upload Photos ({reviewPhotos.length}/3)
                  </button>
                )}
                {reviewPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {reviewPhotos.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`Review photo ${i+1}`} className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                        <button
                          onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => { setShowReviewModal(null); setReviewPhotos([]); }}>Cancel</Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={reviewSaving || !reviewText.trim()}
                  onClick={async () => {
                    setReviewSaving(true);
                    try {
                      await post('/reviews', {
                        caregiverId: showReviewModal.caregiverId,
                        rating: reviewRating,
                        text: reviewText.trim(),
                        service: reviewService,
                        photos: reviewPhotos,
                      });
                      showToast('Thank you! Your rating was submitted successfully.');
                      fetchData();
                      setShowReviewModal(null);
                      setReviewText('');
                      setReviewRating(5);
                      setReviewPhotos([]);
                    } catch {
                      showToast('Failed to submit review.', 'error');
                    } finally {
                      setReviewSaving(false);
                    }
                  }}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  {reviewSaving ? 'Submitting…' : 'Submit Review'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DISPUTE MANAGEMENT MODAL ── */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDisputeModal(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">File a Dispute</h3>
                  <p className="text-red-100 text-xs">Against: {showDisputeModal.caregiverName}</p>
                </div>
              </div>
              <button onClick={() => setShowDisputeModal(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Official Dispute Process</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Our team will review your dispute within 2–3 business days. You may be contacted for additional information.</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason for Dispute *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'No-show / Late arrival',
                    'Poor quality of care',
                    'Unprofessional behavior',
                    'Property damage',
                    'Billing discrepancy',
                    'Other',
                  ].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDisputeReason(r)}
                      className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                        disputeReason === r
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Describe what happened *</label>
                <textarea
                  value={disputeDetails}
                  onChange={e => setDisputeDetails(e.target.value)}
                  placeholder="Please provide as much detail as possible about the incident, including dates, times, and specific concerns..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm resize-none"
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attach Evidence (optional)</label>
                <input
                  ref={disputeEvidenceInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    const previews: string[] = [];
                    for (const file of files.slice(0, 3)) {
                      const reader = new FileReader();
                      await new Promise<void>(res => { reader.onload = () => { previews.push(reader.result as string); res(); }; reader.readAsDataURL(file); });
                    }
                    setDisputeEvidence(prev => [...prev, ...previews].slice(0, 3));
                    e.target.value = '';
                  }}
                />
                {disputeEvidence.length < 3 && (
                  <button
                    type="button"
                    onClick={() => disputeEvidenceInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-bold hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Attach Photos or Documents (up to 3)
                  </button>
                )}
                {disputeEvidence.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {disputeEvidence.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`Evidence ${i+1}`} className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                        <button
                          onClick={() => setDisputeEvidence(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => { setShowDisputeModal(null); setDisputeReason(''); setDisputeDetails(''); setDisputeEvidence([]); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                disabled={disputeSaving || !disputeReason || disputeDetails.trim().length < 20}
                onClick={async () => {
                  setDisputeSaving(true);
                  try {
                    await post('/disputes', {
                      matchId: showDisputeModal.matchId,
                      reason: disputeReason,
                      details: disputeDetails.trim(),
                      evidence: disputeEvidence,
                    });
                    showToast('Dispute filed successfully. Our team will review it within 2–3 business days.');
                    setShowDisputeModal(null);
                    setDisputeReason('');
                    setDisputeDetails('');
                    setDisputeEvidence([]);
                  } catch {
                    showToast('Failed to submit dispute. Please try again.', 'error');
                  } finally {
                    setDisputeSaving(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {disputeSaving ? 'Filing...' : 'Submit Dispute'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replaced by ReportModal component below */}

    </div>
  );
}
