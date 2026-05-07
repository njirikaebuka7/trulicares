import { useState } from 'react';
import StepContainer from '@/components/ui/StepContainer';
import SelectCard from '@/components/ui/SelectCard';
import { MapPin } from 'lucide-react';

interface Props {
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

export default function CleaningFlow({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const totalSteps = 10;

  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [sqft, setSqft] = useState('');
  const [cleaningType, setCleaningType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [suppliesProvided, setSuppliesProvided] = useState<boolean | null>(null);
  const [pets, setPets] = useState<boolean | null>(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [location, setLocation] = useState('');
  const [payRange, setPayRange] = useState(35);

  const goNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else onComplete({ propertyType, bedrooms, bathrooms, sqft, cleaningType, frequency, areas, suppliesProvided, pets, preferredDate, timeWindow, specialInstructions, location, payRange: [20, payRange] });
  };
  const goBack = () => { if (step > 0) setStep(step - 1); else onBack(); };
  const toggleArea = (a: string) => setAreas(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const isDisabled = () => {
    switch (step) {
      case 0: return !propertyType;
      case 1: return !cleaningType;
      case 2: return !frequency;
      case 3: return areas.length === 0;
      case 4: return suppliesProvided === null;
      case 5: return pets === null;
      case 6: return !preferredDate || !timeWindow;
      case 8: return !location;
      default: return false;
    }
  };

  const titles = [
    'What type of property?',
    'What type of cleaning?',
    'How often do you need cleaning?',
    'Which areas need cleaning?',
    'Will you provide supplies?',
    'Are there pets in the home?',
    'When would you like cleaning?',
    'Any special instructions?',
    'Where are you located?',
    'What\'s your budget?',
  ];

  const subtitles = [
    'Tell us about your property.',
    'Select the cleaning service type.',
    'Choose your preferred frequency.',
    'Select all areas that apply.',
    'Let us know about cleaning supplies.',
    'This helps us match the right cleaner.',
    'Set your preferred schedule.',
    'Optional — share any details.',
    'We\'ll find cleaners near you.',
    'Set your budget range.',
  ];

  const steps = [
    // Property type & size
    <>
      <div className="grid grid-cols-2 gap-3">
        {['Apartment', 'House', 'Office', 'Condo'].map(t => (
          <button key={t} onClick={() => setPropertyType(t)}
            className={`p-4 rounded-2xl border-2 text-center transition-all ${propertyType === t ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-300'}`}>
            <span className="text-2xl block mb-1">{t === 'Apartment' ? '🏢' : t === 'House' ? '🏠' : t === 'Office' ? '🏬' : '🏙️'}</span>
            <span className="text-sm font-semibold text-gray-800">{t}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Bedrooms</label>
          <select value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-brand-400 outline-none">
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Bathrooms</label>
          <select value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-brand-400 outline-none">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Square footage (optional)</label>
        <input type="text" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="e.g. 1200"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-brand-400 outline-none" />
      </div>
    </>,
    // Cleaning type
    <>
      {['Standard cleaning', 'Deep cleaning', 'Move-in / Move-out', 'Post-construction'].map(t => (
        <SelectCard key={t} selected={cleaningType === t} onClick={() => setCleaningType(t)} label={t}
          icon={<span className="text-xl">{t === 'Standard cleaning' ? '🧹' : t === 'Deep cleaning' ? '✨' : t === 'Move-in / Move-out' ? '📦' : '🏗️'}</span>} />
      ))}
    </>,
    // Frequency
    <>
      {['One-time', 'Weekly', 'Bi-weekly', 'Monthly'].map(f => (
        <SelectCard key={f} selected={frequency === f} onClick={() => setFrequency(f)} label={f}
          icon={<span className="text-xl">{f === 'One-time' ? '1️⃣' : f === 'Weekly' ? '📅' : f === 'Bi-weekly' ? '📆' : '🗓️'}</span>} />
      ))}
    </>,
    // Areas
    <>
      {['Kitchen', 'Bathrooms', 'Bedrooms', 'Living areas', 'Office spaces'].map(a => (
        <SelectCard key={a} selected={areas.includes(a)} onClick={() => toggleArea(a)} label={a} multiSelect />
      ))}
    </>,
    // Supplies
    <>
      <SelectCard selected={suppliesProvided === true} onClick={() => setSuppliesProvided(true)} label="Yes, I'll provide supplies"
        icon={<span className="text-xl">✅</span>} />
      <SelectCard selected={suppliesProvided === false} onClick={() => setSuppliesProvided(false)} label="No, cleaner should bring supplies"
        icon={<span className="text-xl">🧴</span>} />
    </>,
    // Pets
    <>
      <SelectCard selected={pets === true} onClick={() => setPets(true)} label="Yes, there are pets"
        icon={<span className="text-xl">🐾</span>} />
      <SelectCard selected={pets === false} onClick={() => setPets(false)} label="No pets"
        icon={<span className="text-xl">🚫</span>} />
    </>,
    // Schedule
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred date</label>
        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Time window</label>
        {['Morning (8am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'].map(t => (
          <SelectCard key={t} selected={timeWindow === t} onClick={() => setTimeWindow(t)} label={t} />
        ))}
      </div>
    </>,
    // Special instructions
    <textarea
      value={specialInstructions}
      onChange={e => setSpecialInstructions(e.target.value)}
      placeholder="Any special instructions or requests..."
      rows={4}
      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none text-gray-800"
    />,
    // Location
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">City or ZIP code</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Jersey City, NJ"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
      </div>
      <button onClick={() => setLocation('Current Location')}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-50 text-brand-700 font-medium text-sm hover:bg-brand-100 transition-colors w-full">
        <MapPin className="w-4 h-4" /> Use my current location
      </button>
    </>,
    // Pay range
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <label className="block text-sm font-medium text-gray-700 mb-4">Budget range</label>
      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-brand-700">$20</span>
        <span className="text-2xl text-gray-400 mx-2">–</span>
        <span className="text-4xl font-bold text-brand-700">${payRange}</span>
        <span className="text-gray-500 text-sm ml-1">/hr</span>
      </div>
      <input type="range" min={25} max={100} value={payRange} onChange={e => setPayRange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-xs text-gray-400 mt-2"><span>$25/hr</span><span>$100/hr</span></div>
    </div>,
  ];

  return (
    <StepContainer title={titles[step]} subtitle={subtitles[step]} currentStep={step + 2} totalSteps={totalSteps + 1}
      onBack={goBack} onNext={goNext} nextDisabled={isDisabled()} nextLabel={step === totalSteps - 1 ? 'Continue to Account' : 'Continue'}>
      {steps[step]}
    </StepContainer>
  );
}
