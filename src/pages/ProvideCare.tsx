import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Mail, Lock, Eye, EyeOff, User, DollarSign, Calendar, Shield, Star, Heart } from 'lucide-react';
import Button from '@/components/ui/Button';
import SelectCard from '@/components/ui/SelectCard';
import { useAuth } from '@/context/AuthContext';
import type { CareCategory } from '@/types';

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

export default function ProvideCare() {
  const navigate = useNavigate();
  const { isAuthenticated, signup } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // If already logged in, go to dashboard
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialties, setSpecialties] = useState<CareCategory[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState(20);
  const [bio, setBio] = useState('');

  const toggleSpecialty = (s: CareCategory) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    await signup(email, password, name, 'caregiver');
    setLoading(false);
    navigate('/dashboard');
  };

  const isNextDisabled = () => {
    switch (step) {
      case 0: return !name || !email || !password || password.length < 6;
      case 1: return specialties.length === 0;
      case 2: return !experience;
      default: return false;
    }
  };

  const steps = [
    // Step 0: Account info
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join TruliCares</h2>
        <p className="text-gray-500 text-sm">Create your caregiver account for free.</p>
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
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </>,
    // Step 1: Specialties
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
    // Step 2: Experience
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">How many years of experience?</h2>
      <p className="text-gray-500 text-sm mb-6">This helps families understand your background.</p>
      <div className="space-y-3">
        {['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(exp => (
          <SelectCard key={exp} selected={experience === exp} onClick={() => setExperience(exp)} label={exp} />
        ))}
      </div>
    </>,
    // Step 3: Rate & Bio
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
        <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start earning as a <span className="text-brand-300">caregiver</span>
            </h1>
            <p className="text-brand-200 max-w-xl mx-auto mb-8">
              Join TruliCares for free, receive direct matches, and build a rewarding care career.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
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
            {[0, 1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {steps[step]}

        <div className="mt-8">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={handleNext}
            disabled={isNextDisabled()}
            loading={loading}
            icon={step < 3 ? <ArrowRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          >
            {step < 3 ? 'Continue' : 'Create Account'}
          </Button>

          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="w-full mt-4 text-center text-sm text-gray-500 hover:text-gray-700">
              Go back
            </button>
          )}
        </div>

        {step === 0 && (
          <p className="text-center text-xs text-gray-500 mt-6">
            By signing up, you agree to our{' '}
            <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}
