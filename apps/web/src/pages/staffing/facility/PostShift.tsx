import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle, Clock, DollarSign, MapPin, Briefcase, CheckCircle,
  ArrowRight, ArrowLeft, Loader2, Info, AlertCircle, Calendar,
  Users, FileText, ListChecks, Eye, User, Building2, Plus, X
} from 'lucide-react';
import { shifts as shiftApi } from '@/lib/staffingApi';
import logoImg from '@/assets/logo.png';
import { cn } from '@/utils/cn';

const WORKER_TYPES = [
  { value: 'RN', label: 'RN', desc: 'Registered Nurse', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'LPN/LVN', label: 'LPN/LVN', desc: 'Licensed Practical / Vocational Nurse', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'CNA', label: 'CNA', desc: 'Certified Nursing Assistant', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { value: 'HHA', label: 'HHA', desc: 'Home Health Aide', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'Caregiver', label: 'Caregiver', desc: 'Personal Care Aide', color: 'bg-rose-50 border-rose-200 text-rose-700' },
];

const REQ_SUGGESTIONS = ['Current License', 'CPR/BLS Certified', 'TB Test (within 1 year)', 'COVID Vaccination', 'Flu Vaccination', '1+ Year Experience', '2+ Years Experience', 'ACLS Certified', 'PALS Certified', 'IV Certification'];
const INSTR_SUGGESTIONS = ['Business casual attire', 'Scrubs required (any color)', 'Parking available on-site', 'Report to charge nurse', '30-minute unpaid break', '15-minute paid breaks', 'Badge required for entry', 'No cell phones on floor'];

const steps = [
  { id: 1, label: 'Worker Type', icon: Briefcase },
  { id: 2, label: 'Date', icon: Calendar },
  { id: 3, label: 'Time', icon: Clock },
  { id: 4, label: 'Workers', icon: Users },
  { id: 5, label: 'Pay Rate', icon: DollarSign },
  { id: 6, label: 'Location', icon: MapPin },
  { id: 7, label: 'Requirements', icon: ListChecks },
  { id: 8, label: 'Instructions', icon: FileText },
  { id: 9, label: 'Review', icon: Eye },
];

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
        {Array.from({ length: total }, (_, i) => {
          const s = steps[i];
          const Icon = s.icon;
          const isDone = step > i + 1;
          const isActive = step === i + 1;
          return (
            <div key={i} className="flex items-center flex-1 min-w-0 last:flex-none">
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  isDone ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive ? 'bg-white border-emerald-600 text-emerald-600'
                      : 'bg-white border-gray-200 text-gray-300'
                )}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={cn('text-[9px] font-semibold mt-0.5 whitespace-nowrap', isActive ? 'text-emerald-700' : 'text-gray-400')}>
                  {s.label}
                </span>
              </div>
              {i < total - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1 mb-3', isDone ? 'bg-emerald-500' : 'bg-gray-100')} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>Step {step} of {total}</span>
        <span>{Math.round((step / total) * 100)}% complete</span>
      </div>
    </div>
  );
}

function TagInput({
  items,
  onAdd,
  onRemove,
  suggestions,
  placeholder,
  inputValue,
  setInputValue,
}: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (i: number) => void;
  suggestions: string[];
  placeholder: string;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  const add = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
          placeholder={placeholder}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter(s => !items.includes(s)).slice(0, 6).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onAdd(s)}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-xs text-gray-600 font-medium rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
          >
            + {s}
          </button>
        ))}
      </div>

      {/* Added items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm text-gray-800 font-medium flex-1">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}

export default function PostShift() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reqInput, setReqInput] = useState('');
  const [instrInput, setInstrInput] = useState('');

  const [form, setForm] = useState({
    role: '',
    date: '',
    startTime: '',
    endTime: '',
    slotsTotal: '1',
    payRate: '',
    floorUnit: '',
    department: '',
    reportingPerson: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    requirements: [] as string[],
    instructions: [] as string[],
  });

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const addRequirement = (r: string) => set('requirements', [...form.requirements, r]);
  const removeRequirement = (i: number) => set('requirements', form.requirements.filter((_, idx) => idx !== i));
  const addInstruction = (ins: string) => set('instructions', [...form.instructions, ins]);
  const removeInstruction = (i: number) => set('instructions', form.instructions.filter((_, idx) => idx !== i));

  const validateStep = (): string | null => {
    if (step === 1 && !form.role) return 'Please select a worker type';
    if (step === 2 && !form.date) return 'Please select a date';
    if (step === 3) {
      if (!form.startTime) return 'Please select a start time';
      if (!form.endTime) return 'Please select an end time';
      if (form.endTime <= form.startTime) return 'End time must be after start time';
    }
    if (step === 4 && (!form.slotsTotal || parseInt(form.slotsTotal) < 1)) return 'At least 1 worker required';
    if (step === 5 && (!form.payRate || parseFloat(form.payRate) <= 0)) return 'Please enter a valid pay rate';
    if (step === 6 && !form.floorUnit) return 'Please enter the floor or unit';
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => Math.min(s + 1, steps.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => { setError(''); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const startDateTime = form.date && form.startTime ? `${form.date}T${form.startTime}:00` : '';
      // Calculate duration in hours
      let durationHours = 8;
      if (form.startTime && form.endTime) {
        const [sh, sm] = form.startTime.split(':').map(Number);
        const [eh, em] = form.endTime.split(':').map(Number);
        durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
      }
      await shiftApi.post({
        role: form.role,
        description: [
          form.requirements.length > 0 ? `Requirements: ${form.requirements.join(', ')}` : '',
          form.instructions.length > 0 ? `Instructions: ${form.instructions.join(', ')}` : '',
        ].filter(Boolean).join('\n'),
        payRate: parseFloat(form.payRate),
        durationHours,
        startTime: startDateTime,
        location: `${form.floorUnit}${form.department ? ', ' + form.department : ''}`,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        slotsTotal: parseInt(form.slotsTotal),
        requirements: form.requirements,
        instructions: form.instructions,
        reportingPerson: form.reportingPerson,
        department: form.department,
      });
      navigate('/facility-dashboard/shifts');
    } catch (err: any) {
      setError(err.message || 'Failed to post shift');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = WORKER_TYPES.find(w => w.value === form.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/facility-dashboard" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900">Post a New Shift</h1>
            <p className="text-xs text-gray-500">Fill in shift details to attract qualified professionals</p>
          </div>
          <img src={logoImg} alt="TruliCares" className="h-5 w-auto opacity-60 shrink-0" />
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-4 pb-24">
        {/* Progress */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <StepIndicator step={step} total={steps.length} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Content Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">

          {/* STEP 1: Worker Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">What type of worker do you need?</h2>
                <p className="text-xs text-gray-500 mt-1">Select the professional role for this shift</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {WORKER_TYPES.map(w => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => set('role', w.value)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                      form.role === w.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-100 hover:border-emerald-200 hover:bg-gray-50'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 shrink-0', w.color)}>
                      {w.label.split('/')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{w.label}</p>
                      <p className="text-xs text-gray-500">{w.desc}</p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      form.role === w.value ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                    )}>
                      {form.role === w.value && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Date */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">When is this shift?</h2>
                <p className="text-xs text-gray-500 mt-1">Select the date for this shift</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shift Date *</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                />
              </div>
              {form.date && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-sm font-semibold text-emerald-800">
                    📅 {new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Start & End Time */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-violet-600">
                  <Clock className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">What are the shift hours?</h2>
                <p className="text-xs text-gray-500 mt-1">Set start and end times</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Start Time *</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                    value={form.startTime}
                    onChange={e => set('startTime', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">End Time *</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                    value={form.endTime}
                    onChange={e => set('endTime', e.target.value)}
                  />
                </div>
              </div>
              {form.startTime && form.endTime && form.endTime > form.startTime && (
                <div className="p-3.5 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-sm font-semibold text-violet-800">
                    ⏱ Duration: {(() => {
                      const [sh, sm] = form.startTime.split(':').map(Number);
                      const [eh, em] = form.endTime.split(':').map(Number);
                      const mins = eh * 60 + em - sh * 60 - sm;
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Number of Workers */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">How many workers do you need?</h2>
                <p className="text-xs text-gray-500 mt-1">Set the number of open positions for this shift</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Number of Workers *</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => set('slotsTotal', String(Math.max(1, parseInt(form.slotsTotal) - 1)))}
                    className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-xl font-bold outline-none text-center"
                    value={form.slotsTotal}
                    onChange={e => set('slotsTotal', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => set('slotsTotal', String(Math.min(50, parseInt(form.slotsTotal) + 1)))}
                    className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700 hover:bg-emerald-200 transition-all"
                  >+</button>
                </div>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-800 font-medium">
                  💡 You're posting <strong>{form.slotsTotal} open slot{parseInt(form.slotsTotal) !== 1 ? 's' : ''}</strong> for this shift. Professionals can apply individually.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Pay Rate */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">What is the hourly pay rate?</h2>
                <p className="text-xs text-gray-500 mt-1">Set the rate professionals will see on their end</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hourly Rate (USD) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    min="10"
                    step="0.50"
                    className="w-full pl-9 pr-4 py-4 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-2xl font-bold outline-none text-emerald-700"
                    placeholder="0.00"
                    value={form.payRate}
                    onChange={e => set('payRate', e.target.value)}
                  />
                </div>
              </div>
              {form.payRate && parseFloat(form.payRate) > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                  <p className="text-sm font-bold text-emerald-800">Pay Summary</p>
                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>Hourly rate:</span>
                    <span>${parseFloat(form.payRate).toFixed(2)}/hr</span>
                  </div>
                  {form.startTime && form.endTime && (
                    <div className="flex justify-between text-xs text-emerald-700 font-medium border-t border-emerald-200 pt-2">
                      <span>Est. shift total:</span>
                      <span>${(() => {
                        const [sh, sm] = form.startTime.split(':').map(Number);
                        const [eh, em] = form.endTime.split(':').map(Number);
                        const hrs = (eh * 60 + em - sh * 60 - sm) / 60;
                        return (hrs * parseFloat(form.payRate)).toFixed(2);
                      })()}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  A 20% platform fee will be added for insurance, background checks, and escrow. Professionals see the rate you set here.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Location/Unit */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Where is this shift?</h2>
                <p className="text-xs text-gray-500 mt-1">Add floor, department, and reporting details</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Floor / Unit *</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                    placeholder="e.g. ICU – Floor 4, East Wing"
                    value={form.floorUnit}
                    onChange={e => set('floorUnit', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Department (Optional)</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                    placeholder="e.g. Cardiology, Emergency, Oncology"
                    value={form.department}
                    onChange={e => set('department', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reporting Person (Optional)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      placeholder="e.g. Charge Nurse Maria R."
                      value={form.reportingPerson}
                      onChange={e => set('reportingPerson', e.target.value)}
                    />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Facility Address (Optional)</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none mb-2"
                    placeholder="Street address"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="col-span-1 px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none"
                      placeholder="City"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                    />
                    <input
                      className="px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none uppercase text-center"
                      placeholder="ST"
                      maxLength={2}
                      value={form.state}
                      onChange={e => set('state', e.target.value.toUpperCase())}
                    />
                    <input
                      className="px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium outline-none text-center"
                      placeholder="ZIP"
                      value={form.zip}
                      onChange={e => set('zip', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Requirements */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                  <ListChecks className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Any requirements?</h2>
                <p className="text-xs text-gray-500 mt-1">List certifications, experience, or compliance requirements</p>
              </div>
              <TagInput
                items={form.requirements}
                onAdd={addRequirement}
                onRemove={removeRequirement}
                suggestions={REQ_SUGGESTIONS}
                placeholder="e.g. CPR Certified, 2+ years ICU..."
                inputValue={reqInput}
                setInputValue={setReqInput}
              />
              {form.requirements.length === 0 && (
                <p className="text-xs text-gray-400 text-center">No requirements added yet. You can skip this step.</p>
              )}
            </div>
          )}

          {/* STEP 8: Instructions */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-teal-600">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Any special instructions?</h2>
                <p className="text-xs text-gray-500 mt-1">Dress code, parking, break rules, etc.</p>
              </div>
              <TagInput
                items={form.instructions}
                onAdd={addInstruction}
                onRemove={removeInstruction}
                suggestions={INSTR_SUGGESTIONS}
                placeholder="e.g. Report to charge nurse at 7am..."
                inputValue={instrInput}
                setInputValue={setInstrInput}
              />
              {form.instructions.length === 0 && (
                <p className="text-xs text-gray-400 text-center">No instructions added yet. You can skip this step.</p>
              )}
            </div>
          )}

          {/* STEP 9: Review */}
          {step === 9 && (
            <div className="space-y-5">
              <div className="text-center pb-2">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-600">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Review your shift</h2>
                <p className="text-xs text-gray-500 mt-1">Double-check the details before posting</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider mb-1">Shift Preview</p>
                    <h3 className="text-lg font-bold">{selectedWorker?.label || form.role}</h3>
                    <p className="text-emerald-200 text-sm mt-0.5">{selectedWorker?.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold">${form.payRate}/hr</p>
                    <p className="text-emerald-200 text-xs">{form.slotsTotal} slot{parseInt(form.slotsTotal) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <p className="text-emerald-200 mb-0.5">📅 Date</p>
                    <p className="font-semibold">{form.date ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <p className="text-emerald-200 mb-0.5">⏰ Time</p>
                    <p className="font-semibold">{form.startTime} – {form.endTime}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <p className="text-emerald-200 mb-0.5">📍 Location</p>
                    <p className="font-semibold">{form.floorUnit || '—'}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <p className="text-emerald-200 mb-0.5">🏥 Dept</p>
                    <p className="font-semibold">{form.department || 'General'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
                {form.reportingPerson && <ReviewRow label="Reporting To" value={form.reportingPerson} />}
                {form.address && <ReviewRow label="Address" value={`${form.address}, ${form.city} ${form.state} ${form.zip}`} />}
              </div>

              {form.requirements.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requirements ({form.requirements.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.requirements.map((r, i) => (
                      <span key={i} className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">{r}</span>
                    ))}
                  </div>
                </div>
              )}

              {form.instructions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions ({form.instructions.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.instructions.map((ins, i) => (
                      <span key={i} className="text-xs font-medium px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">{ins}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  ✅ Once posted, qualified professionals in your area will be notified and can apply for this shift. You'll review all applicants before confirming.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 p-4 z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-[2] py-3 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-md shadow-emerald-600/20"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Post Shift</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
