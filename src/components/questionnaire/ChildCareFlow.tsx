import { useState } from 'react';
import StepContainer from '@/components/ui/StepContainer';
import SelectCard from '@/components/ui/SelectCard';
import { MapPin, Minus, Plus, Loader2 } from 'lucide-react';
import { detectLocationWithZip } from '@/utils/geolocation';

interface Props {
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onCancel?: () => void;
}

function ageLabel(years: number): string {
  if (years === 0) return 'Under 1 year';
  if (years === 1) return '1 year';
  return `${years} years`;
}

export default function ChildCareFlow({ onComplete, onBack, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const totalSteps = 7;

  const [numChildren, setNumChildren] = useState(1);
  const [childAges, setChildAges] = useState<number[]>([1]);
  const [careType, setCareType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('');
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [location, setLocation] = useState('');
  const [payRange, setPayRange] = useState(20);
  const [locating, setLocating] = useState(false);

  const goNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else onComplete({ numChildren, childAges, careType, startDate, days, frequency, helpNeeded, specialNeeds, location, payRange: [15, payRange] });
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else onBack();
  };

  const toggleDay = (day: string) => setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  const toggleHelp = (h: string) => setHelpNeeded(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);

  const updateNumChildren = (n: number) => {
    setNumChildren(n);
    setChildAges(prev => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(1)];
      return prev.slice(0, n);
    });
  };

  const isNextDisabled = () => {
    switch (step) {
      case 0: return numChildren < 1;
      case 1: return !careType;
      case 2: return !startDate || days.length === 0 || !frequency;
      case 3: return helpNeeded.length === 0;
      case 5: return !location;
      default: return false;
    }
  };

  const AGE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  const steps = [
    // Step 0: Number & Ages
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">How many children?</label>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => numChildren > 1 && updateNumChildren(numChildren - 1)} className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Minus className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-4xl font-bold text-brand-700 w-16 text-center">{numChildren}</span>
          <button onClick={() => updateNumChildren(numChildren + 1)} className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition-colors">
            <Plus className="w-5 h-5 text-brand-600" />
          </button>
        </div>
      </div>
      {childAges.map((age, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Child {i + 1} age</label>
          <select
            value={age}
            onChange={e => {
              const newAges = [...childAges];
              newAges[i] = parseInt(e.target.value);
              setChildAges(newAges);
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-base font-semibold text-gray-800 bg-white appearance-none cursor-pointer"
          >
            {AGE_OPTIONS.map(yr => (
              <option key={yr} value={yr}>{ageLabel(yr)}</option>
            ))}
          </select>
        </div>
      ))}
    </>,
    // Step 1: Type of Care
    <>
      {['Nanny', 'Babysitter', 'Daycare'].map(t => (
        <SelectCard key={t} selected={careType === t} onClick={() => setCareType(t)} label={t}
          icon={<span className="text-xl">{t === 'Nanny' ? '👩‍🍼' : t === 'Babysitter' ? '🧑‍🤝‍🧑' : '🏫'}</span>}
        />
      ))}
    </>,
    // Step 2: Schedule
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
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${days.includes(d) ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {d}
            </button>
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
    // Step 3: Help needed
    <>
      {['Supervision', 'Meals', 'School pickup', 'Homework help'].map(h => (
        <SelectCard key={h} selected={helpNeeded.includes(h)} onClick={() => toggleHelp(h)} label={h} multiSelect />
      ))}
    </>,
    // Step 4: Special needs
    <>
      <textarea
        value={specialNeeds}
        onChange={e => setSpecialNeeds(e.target.value)}
        placeholder="Describe any special needs or requirements..."
        rows={4}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none text-gray-800"
      />
    </>,
    // Step 5: Location
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">City or ZIP code</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Brooklyn, NY or 11201"
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
    // Step 6: Pay range
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">Hourly rate range</label>
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-brand-700">${15}</span>
          <span className="text-2xl text-gray-400 mx-2">–</span>
          <span className="text-4xl font-bold text-brand-700">${payRange}</span>
          <span className="text-gray-500 text-sm ml-1">/hr</span>
        </div>
        <input type="range" min={16} max={80} value={payRange} onChange={e => setPayRange(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>$16/hr</span>
          <span>$80/hr</span>
        </div>
      </div>
    </>,
  ];

  const titles = [
    'How many children need care?',
    'What type of care do you need?',
    'When do you need care?',
    'What help do you need?',
    'Any special needs?',
    'Where are you located?',
    'What\'s your budget?',
  ];

  const subtitles = [
    'Enter the number and ages of your children.',
    'Select the care arrangement that works best.',
    'Set your schedule and frequency preferences.',
    'Select all that apply.',
    'This is optional — share any details that might help.',
    'We\'ll find caregivers near you.',
    'Set the hourly rate range you\'re comfortable with.',
  ];

  return (
    <StepContainer
      title={titles[step]}
      subtitle={subtitles[step]}
      currentStep={step + 2}
      totalSteps={totalSteps + 1}
      onBack={goBack}
      onNext={goNext}
      nextDisabled={isNextDisabled()}
      nextLabel={step === totalSteps - 1 ? 'Continue to Account' : 'Continue'}
      onCancel={onCancel}
      cancelLabel="Cancel"
    >
      {steps[step]}
    </StepContainer>
  );
}
