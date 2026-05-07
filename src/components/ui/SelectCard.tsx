import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  description?: string;
  multiSelect?: boolean;
}

export default function SelectCard({ selected, onClick, icon, label, description, multiSelect }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-4 w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer min-h-[56px] active:scale-[0.98]',
        selected
          ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10'
          : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50'
      )}
    >
      {icon && (
        <span className={cn('text-2xl shrink-0 w-10 h-10 flex items-center justify-center rounded-xl', selected ? 'bg-brand-100' : 'bg-gray-100')}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className={cn('block font-semibold text-sm', selected ? 'text-brand-800' : 'text-gray-800')}>
          {label}
        </span>
        {description && (
          <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
        )}
      </div>
      <div className={cn(
        'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
        selected
          ? 'border-brand-500 bg-brand-500'
          : 'border-gray-300',
        multiSelect && 'rounded-md'
      )}>
        {selected && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}
