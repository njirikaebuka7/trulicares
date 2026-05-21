import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth as authApi, setToken } from '@/lib/api';
import { facility as facilityApi } from '@/lib/staffingApi';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, FileText, User, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, Shield, MapPin, X,
  Briefcase, Globe, Phone, Lock, Heart, Star, LayoutDashboard,
  ShieldCheck, Zap, Users
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import Button from '@/components/ui/Button';
import SelectCard from '@/components/ui/SelectCard';
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

const steps = [
  { id: 1, title: 'Facility', icon: Building2 },
  { id: 2, title: 'Business', icon: FileText },
  { id: 3, title: 'Contact', icon: User },
  { id: 4, title: 'Finish', icon: CheckCircle },
];

const benefits = [
  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Verified Talent', desc: 'Every professional is background checked and license verified.' },
  { icon: <Zap className="w-5 h-5" />, title: 'Reduced Burnout', desc: 'Instantly fill gaps in your schedule to support your core team.' },
  { icon: <Users className="w-5 h-5" />, title: 'Vast Network', desc: 'Access 1,000+ RNs, CNAs, and therapists in your local area.' },
  { icon: <LayoutDashboard className="w-5 h-5" />, title: 'Smart Staffing', desc: 'Powerful dashboard to manage shifts, billing, and compliance.' },
];

export default function FacilityOnboarding() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    // Step 1 — Facility basics + account
    facilityName: '', facilityType: '', email: '', password: '', phone: '',
    website: '',
    // Step 2 — Business details
    ein: '', address: '', city: '', state: '', zip: '',
    // Step 3 — Contact person
    contactName: '', contactTitle: '',
  });

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.facilityName.trim()) return setError('Facility name is required'), false;
      if (!form.facilityType) return setError('Facility type is required'), false;
      if (!form.email.trim()) return setError('Email is required'), false;
      if (form.password.length < 8) return setError('Password must be at least 8 characters'), false;
    }
    if (step === 2) {
      if (!form.address.trim()) return setError('Address is required'), false;
      if (!form.city.trim()) return setError('City is required'), false;
      if (!form.state.trim()) return setError('State is required'), false;
      if (!form.zip.trim()) return setError('ZIP code is required'), false;
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
      // Step 1: Create auth account and sign in via AuthContext
      await signup(
        form.email,
        form.password,
        form.facilityName,
        'facility',
        form.phone
      );

      // Step 2: Create facility profile (best-effort)
      try {
        await facilityApi.register({
          facilityName: form.facilityName,
          facilityType: form.facilityType,
          ein: form.ein,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          phone: form.phone,
          contactName: form.contactName,
          contactTitle: form.contactTitle,
          website: form.website,
        });
      } catch (profileErr: any) {
        console.warn('Facility profile creation failed, proceeding to dashboard:', profileErr);
      }

      navigate('/facility-dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !form.facilityName || !form.facilityType || !form.email || form.password.length < 8;
    if (step === 2) return !form.address || !form.city || !form.state || !form.zip;
    return false;
  };

  const progressPct = step > 0 ? ((step - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Hero Section (Step 0) */}
      {step === 0 && (
        <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative pt-10 pb-16">
          <Link to="/" className="absolute left-6 top-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10">
            <X className="w-5 h-5 text-white" />
          </Link>
          <div className="text-center px-4">
            <Link to="/" className="inline-block mb-10">
              <img src={logoImg} alt="TruliCares" className="h-10 w-auto brightness-0 invert opacity-90" />
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-3xl mx-auto">
              Hire the best <span className="text-brand-300">clinical</span> talent
            </h1>
            <p className="text-brand-200 max-w-xl mx-auto mb-8">
              Transform your facility's staffing with our on-demand marketplace. Verified professionals at your fingertips.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {benefits.map((b, i) => (
                <div key={i} className="glass rounded-2xl p-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/30 flex items-center justify-center text-brand-200 mb-2">
                    {b.icon}
                  </div>
                  <h4 className="text-white font-semibold text-sm">{b.title}</h4>
                  <p className="text-brand-300 text-xs mt-1">{b.desc}</p>
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
          <div className="flex flex-col items-center mb-10">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-9 w-auto mb-8" />
            </Link>
            <div className="flex items-center gap-2 w-full">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-500 shadow-sm' : 'bg-gray-200'}`} />
              ))}
            </div>
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
                <Building2 className="w-10 h-10 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Facility Partner</h2>
              <p className="text-gray-500 text-sm mb-6">Set up your facility account and start hiring verified professionals.</p>
            </div>
          )}

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Facility Information</h2>
                <p className="text-gray-500 text-sm">Tell us about your healthcare organization.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facility Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                      placeholder="e.g. Sunrise Medical Center"
                      value={form.facilityName}
                      onChange={e => set('facilityName', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facility Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {FACILITY_TYPES.map(ft => (
                      <SelectCard
                        key={ft.value}
                        label={ft.label}
                        selected={form.facilityType === ft.value}
                        onClick={() => set('facilityType', ft.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Email</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                      placeholder="billing@facility.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
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

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
                <p className="text-gray-500 text-sm">Verification details for compliance.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">EIN</label>
                  <input
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                    placeholder="XX-XXXXXXX"
                    value={form.ein}
                    onChange={e => set('ein', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                    placeholder="123 Medical Drive"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setLocating(true);
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          async (pos) => {
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                              const data = await res.json();
                              const addr = data.address || {};
                              const road = addr.road || addr.pedestrian || addr.highway || '';
                              const houseNumber = addr.house_number || '';
                              let streetAddress = `${houseNumber ? houseNumber + ' ' : ''}${road}`.trim();
                              
                              if (!streetAddress && data.display_name) {
                                streetAddress = data.display_name.split(',').slice(0, 2).join(',').trim();
                              }
                              
                              setForm(prev => ({
                                ...prev,
                                address: streetAddress || 'Current Location',
                                city: addr.city || addr.town || addr.village || addr.county || addr.suburb || '',
                                state: addr.state || '',
                                zip: addr.postcode || ''
                              }));
                            } catch (err) {
                              console.error(err);
                              alert('Failed to resolve location.');
                            } finally {
                              setLocating(false);
                            }
                          },
                          err => {
                            console.error(err);
                            setLocating(false);
                            alert('Location access denied or timed out. Please ensure permissions are granted in your device settings.');
                          },
                          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                        );
                      } else {
                        setLocating(false);
                        alert('Geolocation is not supported by your browser.');
                      }
                    }}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-brand-50 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-all disabled:opacity-50"
                    disabled={locating}
                  >
                    {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {locating ? 'Locating...' : 'Use my current location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                      placeholder="Brooklyn"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium uppercase text-center"
                        placeholder="NY"
                        value={form.state}
                        onChange={e => set('state', e.target.value.toUpperCase())}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                      <input
                        className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium text-center"
                        placeholder="11201"
                        value={form.zip}
                        onChange={e => set('zip', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Person</h2>
                <p className="text-gray-500 text-sm">Who should professionals reach out to?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                      placeholder="e.g. Maria Rodriguez"
                      value={form.contactName}
                      onChange={e => set('contactName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Title</label>
                  <input
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:border-brand-500 transition-all outline-none font-medium"
                    placeholder="e.g. HR Director, Staffing Manager"
                    value={form.contactTitle}
                    onChange={e => set('contactTitle', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Finish ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Partner with TruliCares</h2>
                <p className="text-gray-500 text-sm">Your business verification is ready to submit.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Facility Summary</h3>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Name <span>{form.facilityName}</span></p>
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Email <span>{form.email}</span></p>
                    <p className="text-sm font-bold text-gray-800 flex justify-between">Location <span>{form.city}, {form.state}</span></p>
                  </div>
                </div>
                <div className="bg-brand-50/50 p-5 rounded-3xl border border-brand-100 text-sm text-brand-800 leading-relaxed font-medium">
                  <strong>Approval Note:</strong> Business verification takes 1-2 business days. Once approved, you can post shifts immediately.
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
            onClick={step === 0 ? () => setStep(1) : step === 4 ? handleSubmit : handleNext}
            disabled={step > 0 && isNextDisabled()}
            loading={loading}
            icon={step < 4 ? <ArrowRight className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          >
            {step === 0 ? 'Get Started' : step === 4 ? 'Complete Registration' : 'Continue'}
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
