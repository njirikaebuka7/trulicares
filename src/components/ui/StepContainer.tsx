import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';
import ProgressBar from './ProgressBar';

interface StepContainerProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
  showNext?: boolean;
}

export default function StepContainer({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  children,
  showNext = true,
}: StepContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
        {subtitle && <p className="text-gray-500 text-sm mb-6">{subtitle}</p>}
        {!subtitle && <div className="mb-6" />}

        <div className="space-y-3">
          {children}
        </div>
      </div>

      {/* Bottom CTA */}
      {showNext && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <Button
              variant="primary"
              size="xl"
              fullWidth
              onClick={onNext}
              disabled={nextDisabled}
            >
              {nextLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
