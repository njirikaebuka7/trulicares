import { useState } from 'react';
import StepContainer from '@/components/ui/StepContainer';
import SelectCard from '@/components/ui/SelectCard';
import { MapPin, Loader2 } from 'lucide-react';
import { detectLocationWithZip } from '@/utils/geolocation';

interface Props {
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onCancel?: () => void;
}

export default function SeniorCareFlow({ onComplete, onBack, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const totalSteps = 7;

  const [age, setAge] = useState('');
  const [careType, setCareType] = useState('');
  const [mobility, setMobility] = useState('');
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('');
  const [location, setLocation] = useState('');
  const [payRange, setPayRange] = useState(25);
  const [locating, setLocating] = useState(false);

  const goNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else onComplete({ age, careType, mobility, helpNeeded, startDate, days, frequency, location, payRange: [15, payRange] });
  };
  const goBack = () => { if (step > 0) setStep(step - 1); else onBack(); };
  const toggleDay = (d: string) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleHelp = (h: string) => setHelpNeeded(p => p.includes(h) ? p.filter(x => x !== h) : [...p, h]);

  const isDisabled = () => {
    switch (step) {
      case 0: return !age;
      case 1: return !careType;
      case 2: return !mobility;
      case 3: return helpNeeded.length === 0;
      case 4: return !startDate || days.length === 0 || !frequency;
      case 5: return !location;
      default: return false;
    }
  };

  const titles = ['How old is the person needing care?', 'What type of senior care?', 'What is their mobility level?', 'What help is needed?', 'When do you need care?', 'Where are you located?', 'What\'s your budget?'];
  const subtitles = ['Enter their age.', 'Select the care type that best fits.', 'Help us understand their level of independence.', 'Select all that apply.', 'Set schedule preferences.', 'We\'ll find caregivers near you.', 'Set the hourly rate range.'];

  const steps = [
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
      <input type="number" min={50} max={120} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 75"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-lg font-semibold" />
    </div>,
    <>
      {['Companion', 'Personal care', 'Live-in', 'Overnight'].map(t => (
        <SelectCard key={t} selected={careType === t} onClick={() => setCareType(t)} label={t}
          icon={<span className="text-xl">{t === 'Companion' ? '🤝' : t === 'Personal care' ? '🩺' : t === 'Live-in' ? '🏠' : '🌙'}</span>} />
      ))}
    </>,
    <>
      {['Independent', 'Needs assistance'].map(m => (
        <SelectCard key={m} selected={mobility === m} onClick={() => setMobility(m)} label={m}
          icon={<span className="text-xl">{m === 'Independent' ? '🚶' : '♿'}</span>} />
      ))}
    </>,
    <>
      {['Bathing', 'Dressing', 'Medications', 'Meals'].map(h => (
        <SelectCard key={h} selected={helpNeeded.includes(h)} onClick={() => toggleHelp(h)} label={h} multiSelect />
      ))}
    </>,
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Start date</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Days needed</label>
        <div className="flex flex-wrap gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <button key={d} onClick={() => toggleDay(d)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${days.includes(d) ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Frequency</label>
        {['One-time', 'Recurring'].map(f => (
          <SelectCard key={f} selected={frequency === f} onClick={() => setFrequency(f)} label={f} />
        ))}
      </div>
    </>,
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">City or ZIP code</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Manhattan, NY"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
      </div>
      <button
        onClick={async () => {
          setLocating(true);
          try {
            const { address } = await detectLocationWithZip();
            setLocation(address);
          } catch {
            // User denied or unavailable — they can type manually
          } finally {
            setLocating(false);
          }
        }}
        disabled={locating}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-50 text-brand-700 font-medium text-sm hover:bg-brand-100 transition-colors w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        {locating ? 'Detecting your location…' : 'Use my current location'}
      </button>
    </>,
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <label className="block text-sm font-medium text-gray-700 mb-4">Hourly rate range</label>
      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-brand-700">$15</span>
        <span className="text-2xl text-gray-400 mx-2">–</span>
        <span className="text-4xl font-bold text-brand-700">${payRange}</span>
        <span className="text-gray-500 text-sm ml-1">/hr</span>
      </div>
      <input type="range" min={16} max={100} value={payRange} onChange={e => setPayRange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-xs text-gray-400 mt-2"><span>$16/hr</span><span>$100/hr</span></div>
    </div>,
  ];

  return (
    <StepContainer title={titles[step]} subtitle={subtitles[step]} currentStep={step + 2} totalSteps={totalSteps + 1}
      onBack={goBack} onNext={goNext} nextDisabled={isDisabled()} nextLabel={step === totalSteps - 1 ? 'Continue to Account' : 'Continue'}
      onCancel={onCancel} cancelLabel="Cancel">
      {steps[step]}
    </StepContainer>
  );
}
