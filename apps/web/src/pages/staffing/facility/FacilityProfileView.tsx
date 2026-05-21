import { useState, useEffect, useRef } from 'react';
import {
  Building2, Globe, FileText, MapPin,
  Shield, CheckCircle, Clock, Save, Edit3,
  X, Loader2, Briefcase, Info, Camera, Lock,
  Eye, EyeOff, CreditCard, AlertCircle, Phone,
  ChevronRight, UserCircle, Settings, Plus, Trash2
} from 'lucide-react';
import { facility as facApi } from '@/lib/staffingApi';
import { auth as authApi } from '@/lib/api';
import { FacilityProfile } from '@/types/staffing';
import { useFacilityDashboard } from './FacilityDashboardContext';
import { cn } from '@/utils/cn';

const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'nursing_home', label: 'Nursing Home' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'rehab_center', label: 'Rehab Center' },
  { value: 'home_health', label: 'Home Health Agency' },
  { value: 'other', label: 'Other' },
];

const TABS = [
  { id: 'profile', label: 'My Profile', icon: UserCircle },
  { id: 'business', label: 'Business & Compliance', icon: Shield },
  { id: 'policies', label: 'Workplace Policies', icon: FileText },
  { id: 'security', label: 'Account Security', icon: Lock },
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

function PasswordChecklist({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number (0-9)', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  return (
    <div className="mt-3 space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all', c.ok ? 'bg-emerald-500' : 'bg-gray-200')}>
            {c.ok && <CheckCircle className="w-3 h-3 text-white" />}
          </div>
          <span className={cn('text-xs font-medium', c.ok ? 'text-emerald-700' : 'text-gray-400')}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FacilityProfileView() {
  const { refresh: refreshDashboard } = useFacilityDashboard();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<FacilityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({
    facilityName: '',
    facilityType: '',
    legalBusinessName: '',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    contactName: '',
    contactTitle: '',
    contactPhone: '',
    website: '',
    cancellationPolicy: '',
    overtimePolicy: '',
  });

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await facApi.me();
      setProfile(data);
      setForm({
        facilityName: data.facility_name || '',
        facilityType: data.facility_type || '',
        legalBusinessName: data.legal_business_name || '',
        ein: data.ein || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        phone: data.phone || '',
        contactName: data.contact_name || '',
        contactTitle: data.contact_title || '',
        contactPhone: data.contact_phone || '',
        website: data.website || '',
        cancellationPolicy: data.cancellation_policy || '',
        overtimePolicy: data.overtime_policy || '',
      });
      if (data.photo_url) setLogoPreview(data.photo_url);
    } catch (err) {
      console.error('Failed to load facility profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await facApi.updateProfile(form);
      setProfile(updated);
      setEditing(false);
      await refreshDashboard();
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMsg('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setUploadingLogo(true);
      try {
        await facApi.updateProfile({ photoUrl: base64 }).catch(console.error);
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess('');
    if (!STRONG_PASSWORD_REGEX.test(pwForm.next)) {
      setPwError('New password does not meet requirements.'); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Passwords do not match.'); return;
    }
    setChangingPw(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwSuccess('Password updated successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm">Fetching facility records...</p>
      </div>
    );
  }

  const currentTypeLabel = FACILITY_TYPES.find(t => t.value === profile?.facility_type)?.label || profile?.facility_type || 'Facility';

  const verificationStatus = profile?.verification_status;
  const hasEin = !!(profile?.ein || form.ein);
  const statusLabel = verificationStatus === 'approved'
    ? 'Verified Business'
    : hasEin
      ? 'Pending Business Verification'
      : 'Pending EIN Verification';
  const statusColor = verificationStatus === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700';
  const StatusIcon = verificationStatus === 'approved' ? CheckCircle : Clock;

  const setField = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-emerald-600 to-teal-700 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 mb-4">
            {/* Logo / Avatar Upload */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden cursor-pointer group"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-9 h-9" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  {uploadingLogo ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="flex-1 pb-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{profile?.facility_name || 'Your Facility'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-lg text-xs">
                  <Building2 className="w-3.5 h-3.5" /> {currentTypeLabel}
                </span>
                {profile?.city && (
                  <span className="flex items-center gap-1 text-gray-500 font-medium bg-gray-50 px-2.5 py-0.5 rounded-lg text-xs border border-gray-100">
                    <MapPin className="w-3.5 h-3.5" /> {profile.city}, {profile.state}
                  </span>
                )}
                <span className={cn('flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold', statusColor)}>
                  <StatusIcon className="w-3.5 h-3.5" /> {statusLabel}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {saveMsg && (
                <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', saveMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                  {saveMsg}
                </span>
              )}
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="px-4 py-1.5 border border-gray-200 text-gray-600 font-semibold rounded-full hover:bg-gray-50 transition-all flex items-center gap-1.5 text-xs">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all flex items-center gap-1.5 text-xs shadow-sm">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="px-4 py-1.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all flex items-center gap-1.5 text-xs shadow-sm">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all',
                  isActive
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {/* ── My Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Facility Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Facility Name</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.facilityName} onChange={e => setField('facilityName', e.target.value)} />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.facility_name || '—'}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Facility Type</label>
                  {editing ? (
                    <select className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.facilityType} onChange={e => setField('facilityType', e.target.value)}>
                      {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{currentTypeLabel}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Business Phone</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(555) 000-0000" />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.phone || '—'}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Website</label>
                  {editing ? (
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                        value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://example.com" />
                    </div>
                  ) : <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-800 truncate">{profile?.website || '—'}</p>
                    {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" className="text-emerald-600 ml-2"><Globe className="w-4 h-4" /></a>}
                  </div>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Street Address</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.address} onChange={e => setField('address', e.target.value)} />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.address || '—'}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">City</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.city} onChange={e => setField('city', e.target.value)} />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.city || '—'}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">State</label>
                    {editing ? (
                      <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none text-center uppercase"
                        value={form.state} onChange={e => setField('state', e.target.value.toUpperCase())} maxLength={2} />
                    ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl text-center">{profile?.state || '—'}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">ZIP</label>
                    {editing ? (
                      <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none text-center"
                        value={form.zip} onChange={e => setField('zip', e.target.value)} />
                    ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl text-center">{profile?.zip || '—'}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Primary Contact Person</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Contact Name</label>
                    {editing ? (
                      <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                        value={form.contactName} onChange={e => setField('contactName', e.target.value)} />
                    ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.contact_name || '—'}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Contact Title</label>
                    {editing ? (
                      <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                        value={form.contactTitle} onChange={e => setField('contactTitle', e.target.value)} />
                    ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.contact_title || '—'}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Contact Phone</label>
                    {editing ? (
                      <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                        value={form.contactPhone} onChange={e => setField('contactPhone', e.target.value)} placeholder="(555) 000-0000" />
                    ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{(profile as any)?.contact_phone || '—'}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Business & Compliance Tab ── */}
          {activeTab === 'business' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Business Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Legal Business Name</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.legalBusinessName} onChange={e => setField('legalBusinessName', e.target.value)}
                      placeholder="e.g. Greenfield Medical Center LLC" />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{(profile as any)?.legal_business_name || '—'}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">EIN (Employer ID)</label>
                  {editing ? (
                    <input className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={form.ein} onChange={e => setField('ein', e.target.value)} placeholder="XX-XXXXXXX" />
                  ) : <p className="text-sm font-medium text-gray-800 p-3 bg-gray-50 rounded-xl">{profile?.ein || '—'}</p>}
                </div>
              </div>

              {/* Verification status cards */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Trust & Compliance</h3>
                {[
                  {
                    label: 'Business Verification',
                    status: verificationStatus === 'approved' ? 'Approved' : 'Pending Business Verification',
                    desc: 'Regulatory review of your healthcare facility registration.',
                    ok: verificationStatus === 'approved'
                  },
                  {
                    label: 'EIN Validation',
                    status: hasEin ? (verificationStatus === 'approved' ? 'Verified' : 'Pending EIN Verification') : 'EIN Required',
                    desc: 'Federal employer tax ID validation for compliance.',
                    ok: hasEin && verificationStatus === 'approved'
                  },
                  {
                    label: 'Staffing Capability',
                    status: verificationStatus === 'approved' ? 'Active' : 'Pending Approval',
                    desc: 'Clearance to post open shifts to credentialed professionals.',
                    ok: verificationStatus === 'approved'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                      {item.ok ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md', item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Need to update your EIN or Legal Name? Contact our compliance desk at <strong>compliance@trulicares.com</strong>
                </p>
              </div>

              {/* Billing / Payment */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Billing & Payment Method</h3>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600">No payment method added</p>
                    <p className="text-xs text-gray-400">Add a card to automate payroll for filled shifts</p>
                  </div>
                  <button className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 transition-all shrink-0">
                    Add Card
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Workplace Policies Tab ── */}
          {activeTab === 'policies' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Workplace policies are displayed on your shift details so professionals can review them before applying.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Cancellation Policy</label>
                <p className="text-xs text-gray-400 mb-2">Describe your policy for shift cancellations by professionals or the facility.</p>
                {editing ? (
                  <textarea
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none resize-none"
                    rows={4}
                    placeholder="e.g. Professionals must cancel at least 4 hours before shift start. Repeated no-shows may result in removal from the platform."
                    value={form.cancellationPolicy}
                    onChange={e => setField('cancellationPolicy', e.target.value)}
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 min-h-[80px]">
                    {form.cancellationPolicy
                      ? <p className="text-sm text-gray-700 leading-relaxed">{form.cancellationPolicy}</p>
                      : <p className="text-sm text-gray-400 italic">No cancellation policy set. Click "Edit Profile" to add one.</p>
                    }
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Overtime Policy</label>
                <p className="text-xs text-gray-400 mb-2">Explain how overtime hours are handled and compensated.</p>
                {editing ? (
                  <textarea
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none resize-none"
                    rows={4}
                    placeholder="e.g. Overtime is paid at 1.5x the base rate for hours exceeding 8 hours in a single shift or 40 hours in a work week."
                    value={form.overtimePolicy}
                    onChange={e => setField('overtimePolicy', e.target.value)}
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 min-h-[80px]">
                    {form.overtimePolicy
                      ? <p className="text-sm text-gray-700 leading-relaxed">{form.overtimePolicy}</p>
                      : <p className="text-sm text-gray-400 italic">No overtime policy set. Click "Edit Profile" to add one.</p>
                    }
                  </div>
                )}
              </div>

              {editing && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all text-sm shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Policies
                </button>
              )}
            </div>
          )}

          {/* ── Account Security Tab ── */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fade-in max-w-md">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Change Password</h3>
              {pwError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium">
                  <CheckCircle className="w-4 h-4 shrink-0" /> {pwSuccess}
                </div>
              )}
              {['current', 'next', 'confirm'].map((field, i) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                    {field === 'current' ? 'Current Password' : field === 'next' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPw[field as keyof typeof showPw] ? 'text' : 'password'}
                      className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      value={pwForm[field as keyof typeof pwForm]}
                      onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={field === 'current' ? 'Enter current password' : field === 'next' ? 'New password' : 'Confirm new password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => ({ ...s, [field]: !s[field as keyof typeof s] }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPw[field as keyof typeof showPw] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {field === 'next' && pwForm.next && <PasswordChecklist password={pwForm.next} />}
                </div>
              ))}
              <button
                onClick={handlePasswordChange}
                disabled={changingPw || !pwForm.current || !pwForm.next || !pwForm.confirm}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all text-sm shadow-sm disabled:opacity-50"
              >
                {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
