import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth as authApi, setToken } from '@/lib/api';
import { professional as proApi } from '@/lib/staffingApi';
import { useAuth } from '@/context/AuthContext';
import {
  User, Stethoscope, FileText, MapPin, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, Shield, AlertCircle,
  PlusCircle, X, Heart, Star, Briefcase, Clock, Phone, DollarSign,
  Camera, Lock
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import Button from '@/components/ui/Button';
import SelectCard from '@/components/ui/SelectCard';
import { detectLocationWithZip } from '@/utils/geolocation';
import { cn } from '@/utils/cn';

const LICENSE_TYPES = ['RN', 'CNA', 'LPN', 'NP', 'PT', 'OT', 'MA', 'EMT', 'Other'];
const SPECIALTIES = [
  'ICU/Critical Care', 'Emergency/ER', 'Pediatrics', 'Geriatrics',
  'Oncology', 'Cardiology', 'Orthopedics', 'Neurology', 'Psychiatry',
  'Labor & Delivery', 'NICU', 'Home Health', 'Rehab', 'General Med/Surg',
];

const steps = [
  { id: 1, title: 'Account', icon: User },
  { id: 2, title: 'Licenses', icon: Stethoscope },
  { id: 3, title: 'Specialties', icon: FileText },
  { id: 4, title: 'Location', icon: MapPin },
  { id: 5, title: 'Finish', icon: CheckCircle },
];

const benefits = [
  { icon: <Clock className="w-5 h-5" />, title: 'High-Pay Shifts', desc: 'Premium rates for your clinical expertise.' },
  { icon: <DollarSign className="w-5 h-5" />, title: 'Next-Day Pay', desc: 'Get paid faster than traditional agencies.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Full Freedom', desc: 'Choose where and when you want to work.' },
  { icon: <Star className="w-5 h-5" />, title: 'Top Facilities', desc: 'Access shifts at highly-rated hospitals & clinics.' },
];

export default function ProfessionalOnboarding() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [locatingZip, setLocatingZip] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    name: '', email: '', password: '', phone: '',
    // Step 2: Multiple Licenses
    licenses: [
      { type: '', number: '', state: '', expiry: '', docUrl: '' }
    ],
    // Step 3
    specialties: [] as string[], yearsExperience: '', bio: '',
    // Step 4
    location: '', preferredRadiusMiles: '25',
  });

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleSpecialty = (s: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.name.trim()) return setError('Full name is required'), false;
      if (!form.email.trim()) return setError('Email is required'), false;
      if (form.password.length < 8) return setError('Password must be at least 8 characters'), false;
    }
    if (step === 2) {
      if (form.licenses.some(l => !l.type)) return setError('License type is required for all entries'), false;
      if (form.licenses.some(l => !l.number)) return setError('License number is required for all entries'), false;
    }
    if (step === 4) {
      if (!form.location.trim()) return setError('Location is required'), false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Create auth account
      const authData: any = await authApi.register(
        form.name, form.email, form.password, 'professional', form.phone
      );
      setToken(authData.token);
      updateUser({
        id: authData.user.id,
        name: authData.user.name,
        email: authData.user.email,
        role: 'professional' as any,
        verified: false,
        status: 'active',
      });

      // Step 2: Create professional profile (best-effort; navigate even if this fails)
      try {
        await proApi.register({
          licenseType: form.licenses[0].type,
          licenseNumber: form.licenses[0].number,
          licenseState: form.licenses[0].state,
          licenseExpiry: form.licenses[0].expiry || undefined,
          licenses: form.licenses,
          specialties: form.specialties,
          yearsExperience: form.yearsExperience === '0-1 Year' ? 0 : form.yearsExperience === '2-5 Years' ? 2 : form.yearsExperience === '5-10 Years' ? 5 : 10,
          bio: form.bio,
          location: form.location,
          preferredRadiusMiles: parseInt(form.preferredRadiusMiles) || 25,
        });
      } catch (profileErr: any) {
        console.warn('Profile creation failed, proceeding to dashboard:', profileErr);
      }

      navigate('/professional-dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !form.name || !form.email || form.password.length < 8;
    if (step === 2) return form.licenses.some(l => !l.type || !l.number);
    if (step === 3) return form.specialties.length === 0 || !form.yearsExperience;
    if (step === 4) return !form.location;
    return false;
  };

  const progressPct = step > 0 ? ((step - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col font-sans">
      {/* Hero Section (Step 0) */}
      {step === 0 && (
        <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative pt-10 pb-16">
          <Link to="/" className="absolute left-6 top-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10">
            <X className="w-5 h-5 text-white" />
          </Link>
          <div className="text-center px-4">
            <Link to="/" className="inline-block mb-10">
              <img src={logoImg} alt="TruliCares" className="h-12 w-auto brightness-0 invert" />
            </Link>
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
              Ready to redefine your <span className="text-brand-400">nursing career?</span>
            </h1>
            <p className="text-brand-100 text-lg mt-6 max-w-xl mx-auto font-medium opacity-90">
              Join thousands of healthcare professionals who choose their own shifts, rates, and schedule.
            </p>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {benefits.map((b, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 text-left hover:bg-white/10 transition-all group">
                  <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                    {b.icon}
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{b.title}</h3>
                  <p className="text-brand-200/70 text-[11px] leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Layout */}
      <div className="max-w-lg mx-auto w-full px-4 py-12 flex-1 flex flex-col">
        {/* Header with Logo for Step > 0 */}
        {step > 0 && (
          <div className="flex flex-col items-center mb-10 text-center">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-9 w-auto mb-8" />
            </Link>
            <div className="flex items-center gap-2 w-full">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Step {step} of 5</p>
          </div>
        )}

        <div className="flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6 flex gap-3 items-center">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="text-center pt-8">
              <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Briefcase className="w-10 h-10 text-brand-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to start?</h2>
              <p className="text-gray-500 mb-8">Create your professional account in less than 5 minutes.</p>
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-gray-500 text-sm mt-1">Start your journey as a TruliCares professional.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                      placeholder="e.g. Sarah Johnson"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Licenses ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">License & Credentials</h2>
                <p className="text-gray-500 text-sm mt-1">We need to verify your clinical qualifications.</p>
              </div>
              
              <div className="space-y-6">
                {form.licenses.map((lic, idx) => (
                  <div key={idx} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5 relative group">
                    {form.licenses.length > 1 && (
                      <button 
                        onClick={() => set('licenses', form.licenses.filter((_, i) => i !== idx))}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Primary Role *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {LICENSE_TYPES.map(lt => (
                          <button
                            key={lt}
                            type="button"
                            onClick={() => {
                              const newLics = [...form.licenses];
                              newLics[idx].type = lt;
                              set('licenses', newLics);
                            }}
                            className={cn(
                              "py-2.5 rounded-xl border-2 text-xs font-bold transition-all",
                              lic.type === lt 
                                ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm" 
                                : "border-gray-50 text-gray-400 hover:border-brand-200 hover:bg-brand-50/30"
                            )}
                          >
                            {lt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">License #</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-medium"
                          placeholder="RN-123456"
                          value={lic.number}
                          onChange={e => {
                            const newLics = [...form.licenses];
                            newLics[idx].number = e.target.value;
                            set('licenses', newLics);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">State</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-medium"
                          placeholder="NY"
                          value={lic.state}
                          onChange={e => {
                            const newLics = [...form.licenses];
                            newLics[idx].state = e.target.value.toUpperCase();
                            set('licenses', newLics);
                          }}
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => set('licenses', [...form.licenses, { type: '', number: '', state: '', expiry: '', docUrl: '' }])}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-bold text-sm hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" /> Add Another Certification
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Specialties ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Your Specialties</h2>
                <p className="text-gray-500 text-sm mt-1">Select the clinical areas where you excel.</p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={cn(
                        "px-4 py-2.5 rounded-full border-2 text-sm font-bold transition-all",
                        form.specialties.includes(s)
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-gray-100 text-gray-500 hover:border-brand-200 hover:bg-brand-50/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="pt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-4 ml-1">Total Nursing Experience</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['0-1 Year', '2-5 Years', '5-10 Years', '10+ Years'].map(exp => (
                      <SelectCard
                        key={exp}
                        label={exp}
                        selected={form.yearsExperience === exp}
                        onClick={() => set('yearsExperience', exp)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Location ── */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Where are you based?</h2>
                <p className="text-gray-500 text-sm mt-1">We'll show you shifts within your preferred radius.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">Primary City, State</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                      placeholder="e.g. Brooklyn, NY"
                      value={form.location}
                      onChange={e => set('location', e.target.value)}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={async () => {
                      setLocatingZip(true);
                      try {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                            const data = await res.json();
                            const city = data.address.city || data.address.town || data.address.village || '';
                            const state = data.address.state || '';
                            set('location', `${city}${city && state ? ', ' : ''}${state}`);
                            setLocatingZip(false);
                          });
                        }
                      } catch {
                        setLocatingZip(false);
                      }
                    }}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-brand-50 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-all disabled:opacity-50"
                    disabled={locatingZip}
                  >
                    {locatingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {locatingZip ? 'Locating...' : 'Use my current location'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <label className="block text-sm font-bold text-gray-800 mb-4 flex justify-between">
                    Work Radius: <span className="text-brand-600">{form.preferredRadiusMiles} miles</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    className="w-full accent-brand-600"
                    value={form.preferredRadiusMiles}
                    onChange={e => set('preferredRadiusMiles', e.target.value)}
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                    <span>5 mi</span><span>100 mi</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Finish ── */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Ready to go!</h2>
                <p className="text-gray-500 text-sm mt-1">Review your details and create your profile.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Details</h3>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Name <span>{form.name}</span></p>
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Email <span>{form.email}</span></p>
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Role <span>{form.licenses[0]?.type}</span></p>
                  </div>
                </div>
                <div className="bg-brand-50/50 p-5 rounded-3xl border border-brand-100 text-sm text-brand-800 leading-relaxed font-medium">
                  <strong>Verification Note:</strong> Our admin team will review your licenses within 24 hours. You can explore shifts while your profile is pending verification.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 space-y-4">
          <Button
            size="xl"
            fullWidth
            onClick={step === 0 ? () => setStep(1) : step === 5 ? handleSubmit : handleNext}
            disabled={step > 0 && isNextDisabled()}
            loading={loading}
            icon={step < 5 ? <ArrowRight className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          >
            {step === 0 ? 'Get Started' : step === 5 ? 'Complete Registration' : 'Continue'}
          </Button>

          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          )}

          {step === 0 && (
            <div className="text-center">
              <Link to="/login" className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
                Already have an account? Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
