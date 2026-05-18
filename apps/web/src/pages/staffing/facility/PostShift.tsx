import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PlusCircle, Calendar, Clock, DollarSign, 
  MapPin, Briefcase, FileText, CheckCircle,
  ArrowRight, ArrowLeft, Loader2, Info, Building2, AlertCircle
} from 'lucide-react';
import { shifts as shiftApi } from '@/lib/staffingApi';
import logoImg from '@/assets/logo.png';

const LICENSE_TYPES = ['RN', 'CNA', 'LPN', 'NP', 'PT', 'OT', 'MA', 'EMT', 'Other'];

export default function PostShift() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    role: '',
    specialty: '',
    description: '',
    payRate: '',
    durationHours: '',
    startTime: '',
    location: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    slotsTotal: '1',
  });

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const steps = [
    { id: 1, title: 'Requirements', icon: Briefcase },
    { id: 2, title: 'Timing', icon: Clock },
    { id: 3, title: 'Compensation', icon: DollarSign },
    { id: 4, title: 'Location', icon: MapPin },
  ];

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.role) return 'Please select a role';
      if (!form.slotsTotal || parseInt(form.slotsTotal) < 1) return 'At least 1 slot is required';
    }
    if (step === 2) {
      if (!form.startTime) return 'Please select a start time';
      if (!form.durationHours || parseFloat(form.durationHours) <= 0) return 'Please enter a valid duration';
    }
    if (step === 3) {
      if (!form.payRate || parseFloat(form.payRate) <= 0) return 'Please enter a valid pay rate';
    }
    if (step === 4) {
      if (!form.location) return 'Please enter a unit or department';
      if (!form.city || !form.state) return 'City and State are required';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await shiftApi.post({
        ...form,
        payRate: parseFloat(form.payRate),
        durationHours: parseFloat(form.durationHours),
        slotsTotal: parseInt(form.slotsTotal)
      });
      alert('Shift posted successfully!');
      navigate('/facility-dashboard/shifts');
    } catch (err: any) {
      setError(err.message || 'Failed to post shift');
    } finally {
      setLoading(false);
    }
  };

  const progressPct = (step / steps.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header & Progress */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Post a New Shift</h2>
              <p className="text-gray-500 text-sm font-medium">Step {step} of {steps.length}: {steps[step-1].title}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <img src={logoImg} alt="TruliCares" className="h-6 w-auto opacity-50" />
          </div>
        </div>

        {/* Multi-step indicator */}
        <div className="flex items-center justify-between gap-2 px-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                    isDone ? 'bg-brand-500 border-brand-500 text-white' : 
                    isActive ? 'bg-white border-brand-500 text-brand-600' : 
                    'bg-gray-50 border-gray-100 text-gray-300'
                  }`}>
                    {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 -mt-5 transition-all ${isDone ? 'bg-brand-500' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-gray-100 shadow-xl shadow-gray-200/50">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-semibold flex items-center gap-2 mb-8 animate-shake">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 1: Requirements */}
          {step === 1 && (
            <div className="space-y-6 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Role Required *</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                    required
                  >
                    <option value="">Select Role</option>
                    {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Specialty (Optional)</label>
                  <input 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="e.g. ICU, Emergency"
                    value={form.specialty}
                    onChange={(e) => set('specialty', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Number of Slots *</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                  value={form.slotsTotal}
                  onChange={(e) => set('slotsTotal', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Job Description</label>
                <textarea 
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all resize-none"
                  rows={4}
                  placeholder="Describe the responsibilities and any specific requirements..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Timing */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Start Date & Time *</label>
                  <input 
                    type="datetime-local"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    value={form.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Duration (Hours) *</label>
                  <input 
                    type="number"
                    step="0.5"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="e.g. 8"
                    value={form.durationHours}
                    onChange={(e) => set('durationHours', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Compensation */}
          {step === 3 && (
            <div className="space-y-6 animate-slide-in">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hourly Pay Rate *</label>
                <div className="relative">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="number"
                    className="w-full pl-12 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-2xl font-bold outline-none transition-all text-brand-700"
                    placeholder="0.00"
                    value={form.payRate}
                    onChange={(e) => set('payRate', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 flex gap-4">
                <Info className="w-6 h-6 text-brand-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-brand-800 font-bold">Platform Fee Transparency</p>
                  <p className="text-xs text-brand-700 leading-relaxed font-medium">
                    TruliCares adds a 20% platform fee to the total wage. This covers insurance, background checks, and secure escrow services. The professional will see the net rate you set.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Location */}
          {step === 4 && (
            <div className="space-y-6 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Unit / Department *</label>
                  <input 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="e.g. ICU Wing, Floor 4"
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Street Address</label>
                  <input 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="123 Care St"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
                <div>
                  <input 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <input 
                    className="w-1/3 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="ST"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value.toUpperCase())}
                    maxLength={2}
                  />
                  <input 
                    className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    placeholder="ZIP"
                    value={form.zip}
                    onChange={(e) => set('zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center gap-4 pt-4">
            {step > 1 && (
              <button 
                type="button"
                onClick={handleBack}
                className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            )}
            {step < steps.length ? (
              <button 
                type="button"
                onClick={handleNext}
                className="flex-[2] py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete & Post Shift <CheckCircle className="w-5 h-5" /></>}
              </button>
            )}
          </div>
        </form>
      </div>
      
      <p className="text-center text-xs text-gray-400 font-medium">
        Need help? Contact our facility support team at <span className="text-brand-600 hover:underline cursor-pointer">support@trulicares.com</span>
      </p>
    </div>
  );
}
