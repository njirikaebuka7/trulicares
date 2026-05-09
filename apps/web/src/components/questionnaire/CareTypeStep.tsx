import { Baby, Heart, UserCheck, Sparkles } from 'lucide-react';
import type { CareCategory } from '@/types';
import SelectCard from '@/components/ui/SelectCard';
import { useState } from 'react';
import StepContainer from '@/components/ui/StepContainer';

const options: { id: CareCategory; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: 'child-care', icon: <Baby className="w-5 h-5 text-pink-500" />, label: 'Child Care', desc: 'Nanny, babysitter, or daycare' },
  { id: 'senior-care', icon: <Heart className="w-5 h-5 text-brand-500" />, label: 'Senior Care', desc: 'Companion, personal care, live-in' },
  { id: 'adult-care', icon: <UserCheck className="w-5 h-5 text-sky-500" />, label: 'Adult Care', desc: 'Personal, behavioral, community support' },
  { id: 'cleaning', icon: <Sparkles className="w-5 h-5 text-warm-500" />, label: 'Cleaning Services', desc: 'Standard, deep clean, move-in/out' },
];

interface Props {
  onSelect: (type: CareCategory) => void;
  onCancel?: () => void;
}

export default function CareTypeStep({ onSelect, onCancel }: Props) {
  const [selected, setSelected] = useState<CareCategory | null>(null);

  return (
    <StepContainer
      title="What type of care do you need?"
      subtitle="Select the service that best fits your needs."
      currentStep={1}
      totalSteps={8}
      onNext={() => selected && onSelect(selected)}
      nextDisabled={!selected}
      onCancel={onCancel}
      cancelLabel={onCancel ? 'Cancel' : undefined}
    >
      {options.map(opt => (
        <SelectCard
          key={opt.id}
          selected={selected === opt.id}
          onClick={() => setSelected(opt.id)}
          icon={opt.icon}
          label={opt.label}
          description={opt.desc}
        />
      ))}
    </StepContainer>
  );
}
