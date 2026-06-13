import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toaster';
import {
  UserCircle, Stethoscope, FileText, MapPin,
  Shield, CheckCircle, Clock,
  Upload, Edit3, Save, X, Loader2, Info,
  Camera, Plus, Trash2, Briefcase, Award,
  Lock, Eye, EyeOff, ChevronRight,
  Activity, CalendarDays, Building2
} from 'lucide-react';
import { professional as proApi } from '@/lib/staffingApi';
import { auth as authApi } from '@/lib/api';
import { cn } from '@/utils/cn';
import LocationPicker from '@/components/ui/LocationPicker';
import BackgroundCheckCard from '@/components/BackgroundCheckCard';

// ── Types ─────────────────────────────────────────────────────
interface WorkExperience {
  id: string;
  title: string;
  employer: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Certification {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const ROLE_OPTIONS = ['RN', 'LPN/LVN', 'CNA', 'HHA', 'Therapist', 'Medical Assistant', 'Support Worker', 'Other'];
const SPECIALTIES_LIST = [
  'ICU/Critical Care', 'Emergency/ER', 'Pediatrics', 'Geriatrics',
  'Oncology', 'Cardiology', 'Orthopedics', 'Neurology', 'Psychiatry',
  'Labor & Delivery', 'NICU', 'Home Health', 'Rehab', 'General Med/Surg',
];

// ── Sub-tab config ─────────────────────────────────────────────
const TABS = [
  { id: 'profile', label: 'My Profile', icon: UserCircle },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'background', label: 'Background Check', icon: Activity },
  { id: 'security', label: 'Account Security', icon: Lock },
];

// ── Password checklist ────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────
export default function ProfessionalProfileView() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certFileRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Work experience
  const [workExps, setWorkExps] = useState<WorkExperience[]>([]);
  const [addingWork, setAddingWork] = useState(false);
  const [newWork, setNewWork] = useState<Partial<WorkExperience>>({
    title: '', employer: '', startDate: '', endDate: '', current: false, description: ''
  });

  // Certifications
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [certName, setCertName] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);

  // Govt ID
  const [govtIdStep, setGovtIdStep] = useState<'idle' | 'upload' | 'submitting' | 'submitted'>('idle');
  const [govtIdFront, setGovtIdFront] = useState<string | null>(null);
  const [govtIdBack, setGovtIdBack] = useState<string | null>(null);
  const [govtSelfie, setGovtSelfie] = useState<string | null>(null);
  const [govtIdNumber, setGovtIdNumber] = useState('');
  const [govtIdSubStep, setGovtIdSubStep] = useState(1); // 1=front, 2=back, 3=selfie, 4=confirm
  const [govtSubmitting, setGovtSubmitting] = useState(false);

  // Background check
  const [, setBgSubmitted] = useState(false);

  // Security
  const [secForm, setSecForm] = useState({ currentPwd: '', newPwd: '', confirmPwd: '' });
  const [showPwds, setShowPwds] = useState({ current: false, new: false, confirm: false });
  const [secSaving, setSecSaving] = useState(false);
  const [secMsg, setSecMsg] = useState('');

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const data = await proApi.me();
      setProfile(data);
      setEditForm({
        name: data.name || '',
        bio: data.bio || '',
        location: data.location || '',
        specialties: data.specialties || [],
        yearsExperience: data.years_experience || 0,
        roles: data.licenses?.map((l: any) => l.license_type) || (data.license_type ? [data.license_type] : []),
        preferredRadiusMiles: data.preferred_radius_miles || 25,
        locationData: (data.latitude && data.longitude) ? {
          latitude: data.latitude, longitude: data.longitude, city: data.city || '', state: data.state || '',
          zipCode: data.zip_code || '', country: data.country || '', formattedAddress: data.formatted_address || data.location || '',
          locationSource: data.location_source || 'geocoded',
        } : null,
      });
      // Parse work experience
      let we: WorkExperience[] = [];
      if (data.work_experience) {
        try { we = typeof data.work_experience === 'string' ? JSON.parse(data.work_experience) : data.work_experience; } catch {}
      }
      setWorkExps(we || []);
      // Parse certifications
      let certs: Certification[] = [];
      if (data.certifications) {
        try {
          const raw = typeof data.certifications === 'string' ? JSON.parse(data.certifications) : data.certifications;
          certs = Array.isArray(raw) ? raw : [];
        } catch {}
      }
      setCertifications(certs);
      // Background check status
      if (data.background_check_status === 'pending' || data.background_check_status === 'approved') {
        setBgSubmitted(true);
      }
      // Govt ID
      const govtDocs = data.govt_id_docs || [];
      if (govtDocs.length > 0) setGovtIdStep('submitted');
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }

  const saveProfile = async (updates: any) => {
    setSaving(true);
    setSaveMsg('');
    try {
      await proApi.updateProfile(updates);
      await loadProfile();
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    await saveProfile({
      bio: editForm.bio,
      location: editForm.location,
      specialties: editForm.specialties,
      yearsExperience: editForm.yearsExperience,
      preferredRadiusMiles: editForm.preferredRadiusMiles,
      roles: editForm.roles,
      locationData: (editForm as any).locationData || undefined,
    });
    setEditing(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await authApi.updateProfile({ photoUrl: base64 });
        await loadProfile();
        setSaveMsg('Photo updated!');
        setTimeout(() => setSaveMsg(''), 2000);
      } catch (err) {
        setSaveMsg('Failed to upload photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const addWorkExperience = async () => {
    if (!newWork.title || !newWork.employer || !newWork.startDate) return;
    const entry: WorkExperience = {
      id: Date.now().toString(),
      title: newWork.title || '',
      employer: newWork.employer || '',
      startDate: newWork.startDate || '',
      endDate: newWork.endDate || '',
      current: newWork.current || false,
      description: newWork.description || '',
    };
    const updated = [...workExps, entry];
    setWorkExps(updated);
    await saveProfile({ workExperience: updated });
    setNewWork({ title: '', employer: '', startDate: '', endDate: '', current: false, description: '' });
    setAddingWork(false);
  };

  const removeWorkExperience = async (id: string) => {
    const updated = workExps.filter(w => w.id !== id);
    setWorkExps(updated);
    await saveProfile({ workExperience: updated });
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !certName.trim()) { toast('Please enter a certification name first.', 'error'); return; }
    setUploadingCert(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const newCert: Certification = { id: Date.now().toString(), name: certName.trim(), url: base64, uploadedAt: new Date().toISOString() };
        const updated = [...certifications, newCert];
        setCertifications(updated);
        await saveProfile({ certifications: JSON.stringify(updated) });
        setCertName('');
      } finally {
        setUploadingCert(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeCert = async (id: string) => {
    const updated = certifications.filter(c => c.id !== id);
    setCertifications(updated);
    await saveProfile({ certifications: JSON.stringify(updated) });
  };

  const handleGovtFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGovtSubmit = async () => {
    setGovtSubmitting(true);
    try {
      await proApi.submitGovtId({
        idFrontUrl: govtIdFront || undefined,
        idBackUrl: govtIdBack || undefined,
        selfieUrl: govtSelfie || undefined,
        idNumber: govtIdNumber || undefined,
      });
      setGovtIdStep('submitted');
    } catch (err: any) {
      toast(err.message || 'Submission failed', 'error');
    } finally {
      setGovtSubmitting(false);
    }
  };


  const handlePasswordChange = async () => {
    if (secForm.newPwd !== secForm.confirmPwd) { setSecMsg('Passwords do not match'); return; }
    if (!STRONG_PASSWORD_REGEX.test(secForm.newPwd)) { setSecMsg('Password does not meet requirements'); return; }
    setSecSaving(true);
    setSecMsg('');
    try {
      await authApi.updateProfile({ currentPassword: secForm.currentPwd, newPassword: secForm.newPwd });
      setSecMsg('Password updated successfully!');
      setSecForm({ currentPwd: '', newPwd: '', confirmPwd: '' });
    } catch (err: any) {
      setSecMsg(err.message || 'Failed to update password');
    } finally {
      setSecSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  const verStatus = profile?.verification_status;

  // ── Profile completeness ────────────────────────────────────
  // A complete profile gets booked faster — surface what's missing with quick jumps.
  const completionItems = [
    { label: 'Add a profile photo', ok: !!profile?.photo_url, tab: 'profile' },
    { label: 'Write a short bio', ok: !!(profile?.bio && profile.bio.trim()), tab: 'profile' },
    { label: 'Set your base location', ok: !!profile?.location, tab: 'profile' },
    { label: 'List your specialties', ok: (profile?.specialties?.length || 0) > 0, tab: 'profile' },
    { label: 'Add work experience', ok: (workExps?.length || 0) > 0, tab: 'profile' },
    { label: 'Upload a certification', ok: (certifications?.length || 0) > 0, tab: 'certifications' },
    { label: 'Complete a background check', ok: ['passed', 'pending', 'processing', 'approved'].includes(profile?.background_check_status), tab: 'background' },
  ];
  const completionDone = completionItems.filter((i) => i.ok).length;
  const completionPct = Math.round((completionDone / completionItems.length) * 100);
  const nextStep = completionItems.find((i) => !i.ok);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        </div>
        <div className="px-5 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
            {/* Avatar */}
            <div className="relative shrink-0 -mt-14 sm:-mt-14">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-lg border border-gray-100">
                <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                  {profile?.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-14 h-14 text-emerald-400" />
                  )}
                </div>
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {/* Name & info */}
            <div className="flex-1 min-w-0 sm:pb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{profile?.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-100">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {profile?.license_type || 'Healthcare Professional'}
                </span>
                {profile?.location && (
                  <span className="flex items-center gap-1.5 text-gray-500 font-medium bg-gray-50 px-2.5 py-1 rounded-lg text-xs border border-gray-100">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.location}
                  </span>
                )}
                <span className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold',
                  verStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {verStatus === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {verStatus || 'Pending'}
                </span>
              </div>
            </div>
            {saveMsg && (
              <span className={cn('text-xs font-bold px-3 py-1 rounded-full', saveMsg.includes('Fail') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700')}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className={cn(
        'rounded-3xl border shadow-sm p-5 sm:p-6',
        completionPct === 100 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'
      )}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              {completionPct === 100 ? (
                <><CheckCircle className="w-4 h-4 text-emerald-600" /> Your profile is complete</>
              ) : (
                <>Profile completeness</>
              )}
            </h3>
            {completionPct < 100 && nextStep && (
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Next: <button onClick={() => setActiveTab(nextStep.tab)} className="text-emerald-700 font-semibold hover:underline">{nextStep.label}</button>
              </p>
            )}
          </div>
          <span className={cn('text-lg font-bold', completionPct === 100 ? 'text-emerald-600' : 'text-gray-900')}>{completionPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', completionPct === 100 ? 'bg-emerald-500' : 'bg-emerald-600')}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {completionPct < 100 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {completionItems.map((item) => (
              <button
                key={item.label}
                onClick={() => !item.ok && setActiveTab(item.tab)}
                disabled={item.ok}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                  item.ok
                    ? 'bg-emerald-50 text-emerald-700 cursor-default'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 active:scale-95'
                )}
              >
                <div className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center', item.ok ? 'bg-emerald-500' : 'bg-gray-300')}>
                  {item.ok && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                </div>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar — horizontal scroll on mobile */}
        <div className="overflow-x-auto border-b border-gray-100">
          <div className="flex min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all',
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* ─── MY PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Edit controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-full hover:bg-gray-50 transition-all text-sm flex items-center gap-1.5">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all text-sm flex items-center gap-1.5 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all text-sm flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Professional Summary
                </h4>
                {editing ? (
                  <textarea
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    rows={5}
                    value={editForm.bio}
                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a brief professional bio — this appears on your resume..."
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    {profile?.bio || <span className="text-gray-400 italic">No bio yet. Click Edit Profile to add one.</span>}
                  </p>
                )}
              </div>

              {/* Roles */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Roles
                </h4>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          const cur = editForm.roles || [];
                          setEditForm({
                            ...editForm,
                            roles: cur.includes(r) ? cur.filter((x: string) => x !== r) : [...cur, r]
                          });
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all',
                          (editForm.roles || []).includes(r)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-100 text-gray-500 hover:border-emerald-200'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(profile?.licenses?.map((l: any) => l.license_type) || (profile?.license_type ? [profile.license_type] : [])).map((r: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                        {r}
                      </span>
                    ))}
                    {(!profile?.licenses || profile.licenses.length === 0) && !profile?.license_type && (
                      <span className="text-gray-400 text-sm italic">No roles set</span>
                    )}
                  </div>
                )}
              </div>

              {/* Specialties */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Specialties
                </h4>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES_LIST.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          const cur = editForm.specialties || [];
                          setEditForm({
                            ...editForm,
                            specialties: cur.includes(s) ? cur.filter((x: string) => x !== s) : [...cur, s]
                          });
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all',
                          (editForm.specialties || []).includes(s)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-100 text-gray-500 hover:border-emerald-200'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(profile?.specialties || []).map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">{s}</span>
                    ))}
                    {(!profile?.specialties || profile.specialties.length === 0) && (
                      <span className="text-gray-400 text-sm italic">No specialties set</span>
                    )}
                  </div>
                )}
              </div>

              {/* Location & radius */}
              {editing && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Base location <span className="text-gray-400 font-normal">(matches you to nearby shifts)</span></label>
                    <LocationPicker
                      accent="emerald"
                      initial={(editForm as any).locationData}
                      onConfirm={(str, data) => setEditForm({ ...editForm, location: str, locationData: data })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Years Experience</label>
                    <select
                      value={editForm.yearsExperience}
                      onChange={e => setEditForm({ ...editForm, yearsExperience: parseInt(e.target.value) })}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:border-emerald-500 outline-none"
                    >
                      <option value={0}>Less than 1 year</option>
                      <option value={2}>2-5 years</option>
                      <option value={5}>5-10 years</option>
                      <option value={10}>10+ years</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Work Experience Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Work Experience
                  </h4>
                  <button
                    onClick={() => setAddingWork(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 transition-all hover:bg-emerald-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Experience
                  </button>
                </div>

                {/* Work exp list */}
                <div className="space-y-3">
                  {workExps.length === 0 && !addingWork && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                      <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm font-medium">No work experience added yet</p>
                      <p className="text-gray-300 text-xs">Add your work history — it appears on your resume</p>
                    </div>
                  )}
                  {workExps.map(w => (
                    <div key={w.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group">
                      <button
                        onClick={() => removeWorkExperience(w.id)}
                        className="absolute top-3 right-3 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{w.title}</p>
                          <p className="text-xs text-emerald-600 font-semibold">{w.employer}</p>
                          <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {w.startDate} — {w.current ? 'Present' : w.endDate}
                          </p>
                          {w.description && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{w.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add work experience form */}
                {addingWork && (
                  <div className="mt-3 bg-emerald-50 rounded-2xl p-5 border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h5 className="font-bold text-emerald-700 text-sm">Add Work Experience</h5>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Title *</label>
                        <input
                          value={newWork.title}
                          onChange={e => setNewWork({ ...newWork, title: e.target.value })}
                          placeholder="e.g. Registered Nurse"
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Employer *</label>
                        <input
                          value={newWork.employer}
                          onChange={e => setNewWork({ ...newWork, employer: e.target.value })}
                          placeholder="e.g. St. Mary's Hospital"
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date *</label>
                        <input
                          type="month"
                          value={newWork.startDate}
                          onChange={e => setNewWork({ ...newWork, startDate: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                        <input
                          type="month"
                          value={newWork.endDate}
                          onChange={e => setNewWork({ ...newWork, endDate: e.target.value })}
                          disabled={newWork.current}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 disabled:opacity-50"
                        />
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWork.current}
                            onChange={e => setNewWork({ ...newWork, current: e.target.checked, endDate: '' })}
                            className="rounded"
                          />
                          <span className="text-xs text-gray-600 font-medium">Currently working here</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Description (optional)</label>
                      <textarea
                        value={newWork.description}
                        onChange={e => setNewWork({ ...newWork, description: e.target.value })}
                        rows={3}
                        placeholder="Briefly describe your responsibilities..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addWorkExperience}
                        disabled={!newWork.title || !newWork.employer || !newWork.startDate || saving}
                        className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Experience
                      </button>
                      <button
                        onClick={() => setAddingWork(false)}
                        className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── CERTIFICATIONS TAB ─── */}
          {activeTab === 'certifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Certifications & Documents</h3>
                <p className="text-sm text-gray-500">Upload your nursing licenses, CPR cards, and other certifications.</p>
              </div>

              {/* Upload new cert */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm">Upload New Certification</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Certification Name</label>
                  <input
                    value={certName}
                    onChange={e => setCertName(e.target.value)}
                    placeholder="e.g. RN License, BLS/CPR Card, ACLS..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <input ref={certFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} />
                <button
                  onClick={() => { if (!certName.trim()) { toast('Enter a certification name first', 'error'); return; } certFileRef.current?.click(); }}
                  disabled={uploadingCert}
                  className="w-full py-3 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 font-bold text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCert ? 'Uploading...' : 'Choose File to Upload'}
                </button>
              </div>

              {/* Uploaded certs list */}
              <div className="space-y-3">
                {certifications.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm font-medium">No certifications uploaded yet</p>
                  </div>
                )}
                {certifications.map(cert => (
                  <div key={cert.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-emerald-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{cert.name}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        Uploaded {new Date(cert.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Pending Verification</span>
                      {cert.url.startsWith('http') && (
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 font-bold hover:underline">View</a>
                      )}
                      <button onClick={() => removeCert(cert.id)} className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                  Accepted formats: JPEG, PNG, PDF. Our admin team will verify your credentials within 24 hours.
                </p>
              </div>
            </div>
          )}

          {/* ─── GOVERNMENT ID TAB ─── */}
          {activeTab === 'govt-id' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Government ID Verification</h3>
                <p className="text-sm text-gray-500">Upload a valid government-issued ID and selfie for identity verification.</p>
              </div>

              {govtIdStep === 'submitted' ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">Submitted for Review</h4>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">Your documents are under admin review. You'll be notified once verified.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold border border-amber-100">
                    <Clock className="w-4 h-4" /> Under Review — usually 24 hours
                  </div>
                  <button
                    onClick={() => { setGovtIdStep('upload'); setGovtIdSubStep(1); setGovtIdFront(null); setGovtIdBack(null); setGovtSelfie(null); setGovtIdNumber(''); }}
                    className="text-sm text-gray-400 hover:text-gray-600 underline block mx-auto"
                  >
                    Re-submit documents
                  </button>
                </div>
              ) : govtIdStep === 'idle' ? (
                <div className="text-center py-8">
                  <Shield className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                  <h4 className="font-bold text-gray-700 mb-2">Verify Your Identity</h4>
                  <p className="text-sm text-gray-400 mb-6">Complete this to unlock shift applications. Takes less than 2 minutes.</p>
                  <button
                    onClick={() => setGovtIdStep('upload')}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 transition-all shadow-md text-sm"
                  >
                    Start Verification
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2">
                    {['ID Front', 'ID Back', 'Selfie', 'Confirm'].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                          govtIdSubStep > i + 1 ? 'bg-emerald-500 text-white' : govtIdSubStep === i + 1 ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-gray-100 text-gray-400'
                        )}>
                          {govtIdSubStep > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={cn('text-xs font-medium hidden sm:block', govtIdSubStep === i + 1 ? 'text-emerald-600' : 'text-gray-400')}>{s}</span>
                        {i < 3 && <div className={cn('flex-1 h-0.5 rounded-full', govtIdSubStep > i + 1 ? 'bg-emerald-400' : 'bg-gray-100')} />}
                      </div>
                    ))}
                  </div>

                  {/* Sub-step 1: ID Front */}
                  {govtIdSubStep === 1 && (
                    <GovtIdUploadStep
                      title="Upload ID Front"
                      desc="Driver's license, passport, or government ID — front side"
                      preview={govtIdFront}
                      onUpload={e => handleGovtFileUpload(e, setGovtIdFront)}
                      onNext={() => setGovtIdSubStep(2)}
                      canProceed={!!govtIdFront}
                    />
                  )}
                  {govtIdSubStep === 2 && (
                    <GovtIdUploadStep
                      title="Upload ID Back"
                      desc="The back side of your government-issued ID"
                      preview={govtIdBack}
                      onUpload={e => handleGovtFileUpload(e, setGovtIdBack)}
                      onNext={() => setGovtIdSubStep(3)}
                      onBack={() => setGovtIdSubStep(1)}
                      canProceed={!!govtIdBack}
                    />
                  )}
                  {govtIdSubStep === 3 && (
                    <GovtIdUploadStep
                      title="Upload a Selfie"
                      desc="Take or upload a clear selfie holding your ID next to your face"
                      preview={govtSelfie}
                      onUpload={e => handleGovtFileUpload(e, setGovtSelfie)}
                      onNext={() => setGovtIdSubStep(4)}
                      onBack={() => setGovtIdSubStep(2)}
                      canProceed={!!govtSelfie}
                      isSelfie
                    />
                  )}
                  {govtIdSubStep === 4 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h4 className="font-bold text-gray-800">Confirm & Submit</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {[govtIdFront, govtIdBack, govtSelfie].map((img, i) => img && (
                          <div key={i} className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                            <img src={img} alt={['ID Front', 'ID Back', 'Selfie'][i]} className="w-full h-full object-cover" />
                            <p className="text-center text-[10px] font-bold text-gray-500 py-1 bg-white">{['ID Front', 'ID Back', 'Selfie'][i]}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ID Number (optional)</label>
                        <input
                          value={govtIdNumber}
                          onChange={e => setGovtIdNumber(e.target.value)}
                          placeholder="Document/ID number"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setGovtIdSubStep(3)} className="px-5 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm">Back</button>
                        <button
                          onClick={handleGovtSubmit}
                          disabled={govtSubmitting}
                          className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {govtSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          Submit for Verification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── BACKGROUND CHECK TAB ─── */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Background Check</h3>
                <p className="text-sm text-gray-500">Required before you can apply to shifts. Run securely by our partner Turn — your sensitive data never touches TruliCares.</p>
              </div>
              <BackgroundCheckCard />
            </div>
          )}

          {/* ─── ACCOUNT SECURITY TAB ─── */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-md">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Account Security</h3>
                <p className="text-sm text-gray-500">Keep your account safe with a strong password.</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Current Password', key: 'currentPwd', showKey: 'current' },
                  { label: 'New Password', key: 'newPwd', showKey: 'new' },
                  { label: 'Confirm New Password', key: 'confirmPwd', showKey: 'confirm' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={(showPwds as any)[f.showKey] ? 'text' : 'password'}
                        value={(secForm as any)[f.key]}
                        onChange={e => setSecForm({ ...secForm, [f.key]: e.target.value })}
                        placeholder={f.label}
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-gray-200 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwds({ ...showPwds, [f.showKey]: !(showPwds as any)[f.showKey] })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {(showPwds as any)[f.showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {f.key === 'newPwd' && secForm.newPwd && <PasswordChecklist password={secForm.newPwd} />}
                  </div>
                ))}

                {secMsg && (
                  <p className={cn('text-sm font-semibold', secMsg.includes('success') ? 'text-emerald-600' : 'text-red-500')}>
                    {secMsg}
                  </p>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={secSaving || !secForm.currentPwd || !secForm.newPwd || !secForm.confirmPwd}
                  className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {secSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Govt ID Upload Step Sub-Component ─────────────────────────
function GovtIdUploadStep({
  title, desc, preview, onUpload, onNext, onBack, canProceed, isSelfie
}: {
  title: string; desc: string; preview: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void; onBack?: () => void; canProceed: boolean; isSelfie?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h4 className="font-bold text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture={isSelfie ? 'user' : undefined} className="hidden" onChange={onUpload} />
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-200 bg-gray-50">
          <img src={preview} alt={title} className="w-full max-h-52 object-contain" />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute top-3 right-3 bg-white border border-gray-200 text-xs font-bold text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all"
          >
            Change
          </button>
          <div className="absolute bottom-3 right-3 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
        >
          <Camera className="w-10 h-10" />
          <div className="text-center">
            <p className="font-semibold text-sm">{isSelfie ? 'Take a Selfie' : 'Upload Photo'}</p>
            <p className="text-xs mt-0.5">{isSelfie ? 'Use camera or select from gallery' : 'JPEG or PNG, clear & readable'}</p>
          </div>
        </button>
      )}
      <div className="flex gap-3">
        {onBack && (
          <button onClick={onBack} className="px-5 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm">Back</button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
