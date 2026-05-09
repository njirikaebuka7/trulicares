import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-brand-600">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
              i + 1 < currentStep
                ? 'bg-brand-500 text-white'
                : i + 1 === currentStep
                  ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                  : 'bg-gray-200 text-gray-400'
            )}
          >
            {i + 1 < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
