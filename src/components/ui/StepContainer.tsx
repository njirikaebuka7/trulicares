import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './Button';
import ProgressBar from './ProgressBar';
import logoImg from '@/assets/logo.png';

interface StepContainerProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
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
  onCancel,
  cancelLabel,
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
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex-1 flex flex-col items-center gap-1">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-6 w-auto" />
            </Link>
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </div>
          {onCancel ? (
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0 text-xs text-gray-500 font-medium"
              title={cancelLabel || 'Cancel'}
            >
              <span className="text-[11px] leading-tight text-center">{cancelLabel || 'Exit'}</span>
            </button>
          ) : (
            <div className="w-10 shrink-0" />
          )}
        </div>
        {onCancel && (
          <div className="max-w-lg mx-auto px-4 pb-1.5 flex justify-end">
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium underline underline-offset-2"
            >
              {cancelLabel || 'Cancel'}
            </button>
          </div>
        )}
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
