import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Mail, Lock, Eye, EyeOff, User, DollarSign, Calendar, Shield, Star, Heart, X, MapPin, Loader2, Camera, Phone } from 'lucide-react';
import { detectLocationWithZip } from '@/utils/geolocation';
import Button from '@/components/ui/Button';
import SelectCard from '@/components/ui/SelectCard';
import { useAuth } from '@/context/AuthContext';
import { caregivers as caregiversApi, auth as authApi } from '@/lib/api';
import type { CareCategory } from '@/types';
import logoImg from '@/assets/logo.png';

const benefits = [
  { icon: <Calendar className="w-5 h-5" />, title: 'Flexible Schedule', desc: 'Work when you want, where you want.' },
  { icon: <DollarSign className="w-5 h-5" />, title: 'Set Your Rates', desc: 'You decide what you\'re worth.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Free to Join', desc: 'No upfront fees or subscriptions.' },
  { icon: <Star className="w-5 h-5" />, title: 'Build Your Reputation', desc: 'Earn reviews and grow your career.' },
];

const specialtyOptions: { id: CareCategory; label: string; icon: string }[] = [
  { id: 'child-care', label: 'Child Care', icon: '👶' },
  { id: 'senior-care', label: 'Senior Care', icon: '❤️' },
  { id: 'adult-care', label: 'Adult Care', icon: '🧑' },
  { id: 'cleaning', label: 'Cleaning Services', icon: '✨' },
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ProvideCare() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signup } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<CareCategory[]>([]);
  const [serviceZips, setServiceZips] = useState<string[]>([]);
  const [zipInput, setZipInput] = useState('');
  const [locatingZip, setLocatingZip] = useState(false);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState(20);
  const [bio, setBio] = useState('');
  const [showAnyway, setShowAnyway] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && !showAnyway) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You already have a caregiver account</h2>
          <p className="text-gray-500 text-sm mb-6">Head to your dashboard to manage your profile, job requests, and schedule.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl transition-colors mb-3"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => setShowAnyway(true)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const toggleSpecialty = (s: CareCategory) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSendOtp = async () => {
    if (!email) return;
    setLoading(true);
    setPhoneError('');
    try {
      await authApi.sendEmailCode(email);
      setOtpSent(true);
    } catch (err: any) {
      setPhoneError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.some(d => !d)) return;
    setLoading(true);
    setPhoneError('');
    try {
      await authApi.verifyEmailCode(email, otp.join(''));
      setIsPhoneVerified(true);
    } catch (err: any) {
      setPhoneError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 0 && !isPhoneVerified) {
       // On step 0 next, if not verified, we show phone step (or handle it in steps array)
       setStep(1);
       return;
    }
    if (step < 5) setStep(step + 1);
    else handleSubmit();
  };

  const experienceToYears: Record<string, number> = {
    'Less than 1 year': 0, '1-3 years': 2, '4-6 years': 5, '7-10 years': 8, '10+ years': 12,
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const formattedCaregiverData = {
        bio,
        specialties,
        hourlyRateMin: Math.max(10, hourlyRate - 5),
        hourlyRateMax: hourlyRate,
        yearsExperience: experienceToYears[experience] ?? 0,
        serviceZips,
        location: serviceZips[0] || 'United States',
      };
      await signup(email, password, name, 'caregiver', phone, formattedCaregiverData);
      if (photoBase64) {
        await authApi.updateProfile({ photoUrl: photoBase64 }).catch(console.error);
      }
      await caregiversApi.updateProfile({
        specialties,
        serviceZips,
        hourlyRateMin: Math.max(10, hourlyRate - 5),
        hourlyRateMax: hourlyRate,
        bio,
        yearsExperience: experienceToYears[experience] ?? 0,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    switch (step) {
      case 0: return !name || !email || !password || !STRONG_PASSWORD_REGEX.test(password) || !photoBase64;
      case 1: return !isPhoneVerified;
      case 2: return specialties.length === 0;
      case 3: return serviceZips.length === 0;
      case 4: return !experience;
      default: return false;
    }
  };

  const steps = [
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join TruliCares</h2>
        <p className="text-gray-500 text-sm">Create your caregiver account for free.</p>
      </div>

      {/* Photo upload */}
      <div className="flex flex-col items-center mb-5">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="relative group"
        >
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile preview"
              className="w-20 h-20 rounded-full object-cover border-4 border-brand-200 shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
              <Camera className="w-6 h-6 text-gray-400 mb-0.5" />
              <span className="text-[10px] text-gray-400 font-medium">Photo</span>
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center shadow border-2 border-white">
            <Camera className="w-3 h-3 text-white" />
          </span>
        </button>
        <span className="text-xs text-brand-600 font-semibold mt-2">Profile photo (required)</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password"
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password && !STRONG_PASSWORD_REGEX.test(password) && (
            <p className="text-xs text-red-500 mt-1.5 font-medium leading-tight">
              Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
            </p>
          )}
        </div>

      </div>
    </>,
    <>
      {isPhoneVerified ? (
        <div className="text-center py-6 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Your email <span className="font-semibold text-gray-800">{email}</span> has been successfully verified.
          </p>
          <div className="bg-emerald-50 rounded-2xl p-4 text-emerald-800 text-xs font-semibold max-w-sm mx-auto">
            🛡️ Secure caregiver account active.
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
            <p className="text-gray-500 text-sm">We'll send a 6-digit code to your email.</p>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone number <span className="text-gray-400 font-normal">(optional — for families to reach you)</span></label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 10) val = val.slice(0, 10);
                      let formatted = val;
                      if (val.length > 0) {
                        if (val.length <= 3) {
                          formatted = `(${val}`;
                        } else if (val.length <= 6) {
                          formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                        } else {
                          formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                        }
                      }
                      setPhone(formatted);
                    }}
                    placeholder="(555) 000-0000"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                  />
                </div>
              </div>
              {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
              <Button variant="primary" fullWidth loading={loading} onClick={handleSendOtp} disabled={!email}>
                Send Verification Code
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-center text-sm text-gray-500">Enter the 6-digit code sent to <span className="font-semibold text-gray-800">{email}</span>.</p>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length > 1) return;
                      const newOtp = [...otp];
                      newOtp[i] = val;
                      setOtp(newOtp);
                      if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
                    }}
                    className="w-10 h-12 rounded-xl border-2 border-gray-200 text-center text-xl font-bold focus:border-brand-400 outline-none"
                  />
                ))}
              </div>
              {phoneError && <p className="text-red-500 text-xs text-center">{phoneError}</p>}
              <Button variant="primary" fullWidth loading={loading} onClick={handleVerifyOtp} disabled={otp.some(d => !d)}>
                Verify & Continue
              </Button>
              <button onClick={handleSendOtp} className="w-full text-center text-xs text-brand-600 font-medium hover:underline">
                Resend code
              </button>
            </div>
          )}
        </>
      )}
    </>,
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What services do you offer?</h2>
      <p className="text-gray-500 text-sm mb-6">Select all that apply.</p>
      <div className="space-y-3">
        {specialtyOptions.map(opt => (
          <SelectCard key={opt.id} selected={specialties.includes(opt.id)} onClick={() => toggleSpecialty(opt.id)}
            icon={<span className="text-xl">{opt.icon}</span>} label={opt.label} multiSelect />
        ))}
      </div>
    </>,
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Where do you provide services?</h2>
      <p className="text-gray-500 text-sm mb-5">Add ZIP codes or neighborhoods. Families in your area get matched with you first.</p>

      {serviceZips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {serviceZips.map(zip => (
            <span key={zip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-100 text-brand-800 text-sm font-semibold">
              <MapPin className="w-3.5 h-3.5 text-brand-500" />
              {zip}
              <button
                type="button"
                onClick={() => setServiceZips(prev => prev.filter(z => z !== zip))}
                className="text-brand-400 hover:text-brand-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add ZIP code or city</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={zipInput}
            onChange={e => setZipInput(e.target.value)}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ',') && zipInput.trim()) {
                e.preventDefault();
                const val = zipInput.trim().replace(/,+$/, '');
                if (val && !serviceZips.includes(val)) setServiceZips(prev => [...prev, val]);
                setZipInput('');
              }
            }}
            placeholder="e.g. 11201 or Brooklyn, NY"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const val = zipInput.trim().replace(/,+$/, '');
              if (val && !serviceZips.includes(val)) setServiceZips(prev => [...prev, val]);
              setZipInput('');
            }}
            disabled={!zipInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Press Enter or comma to add multiple areas.</p>
      </div>

      <button
        type="button"
        onClick={async () => {
          setLocatingZip(true);
          try {
            const { address, zip } = await detectLocationWithZip();
            const label = zip || address;
            if (label) setZipInput(label);
          } catch {
            // User denied or unavailable
          } finally {
            setLocatingZip(false);
          }
        }}
        disabled={locatingZip}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-50 text-brand-700 font-medium text-sm hover:bg-brand-100 transition-colors w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {locatingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        {locatingZip ? 'Detecting your location…' : 'Add my current location'}
      </button>
    </>,
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">How many years of experience?</h2>
      <p className="text-gray-500 text-sm mb-6">This helps families understand your background.</p>
      <div className="space-y-3">
        {['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(exp => (
          <SelectCard key={exp} selected={experience === exp} onClick={() => setExperience(exp)} label={exp} />
        ))}
      </div>
    </>,
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Set your rate & introduce yourself</h2>
      <p className="text-gray-500 text-sm mb-6">You can always update this later.</p>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-4">Desired hourly rate</label>
        <div className="text-center mb-4">
          <span className="text-4xl font-bold text-brand-700">${hourlyRate}</span>
          <span className="text-gray-500 text-sm ml-1">/hr</span>
        </div>
        <input type="range" min={10} max={100} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400 mt-2"><span>$10/hr</span><span>$100/hr</span></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Short bio (optional)</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell families about yourself..."
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none" />
      </div>
    </>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50">
      {/* Hero section (visible only on step 0) */}
      {step === 0 && (
        <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          {/* Exit button */}
          <Link
            to="/"
            className="absolute left-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}
            aria-label="Go home"
          >
            <X className="w-5 h-5 text-white" />
          </Link>
          {/* Logo */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}
          >
            <img src={logoImg} alt="TruliCares" className="h-8 w-auto brightness-0 invert opacity-90" />
          </Link>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-14 pb-16">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start earning as a <span className="text-brand-300">caregiver</span>
            </h1>
            <p className="text-brand-200 max-w-xl mx-auto mb-8">
              Join TruliCares for free, receive direct matches, and build a rewarding care career.
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

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        {step > 0 && (
          <div className="flex items-center gap-2 mb-8">
            {[0, 1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {steps[step]}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>
        )}
        <div className="mt-8">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={handleNext}
            disabled={isNextDisabled()}
            loading={loading}
            icon={step < 5 ? <ArrowRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          >
            {step < 5 ? 'Continue' : 'Create Account'}
          </Button>

          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="w-full mt-4 text-center text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          )}
        </div>

        {step === 0 && (
          <p className="text-center text-xs text-gray-500 mt-6">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
