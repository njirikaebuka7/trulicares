import { useEffect, useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

const steps = [
  'Analyzing your care request...',
  'Finding caregivers in your area...',
  'Matching based on your preferences...',
  'Notifying caregivers...',
  'Waiting for responses...',
];

export default function MatchingStep({ onComplete, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(stepInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated search icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-brand-600/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="w-16 h-16 bg-brand-500/50 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-white animate-bounce" />
            </div>
          </div>
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-brand-400/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border border-brand-400/20 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Finding Your Perfect Match</h2>
        <p className="text-brand-200 text-sm mb-8">This usually takes less than a minute</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-brand-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-coral-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-300 ${i <= currentStep ? 'opacity-100' : 'opacity-30'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${i < currentStep ? 'bg-brand-400' : i === currentStep ? 'bg-brand-500 animate-pulse' : 'bg-brand-700'}`}>
                {i < currentStep ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-brand-300" />
                )}
              </div>
              <span className={`text-sm ${i <= currentStep ? 'text-white' : 'text-brand-400'}`}>{step}</span>
            </div>
          ))}
        </div>

        {/* Mock match preview */}
        {currentStep >= 3 && (
          <div className="mt-8 glass rounded-2xl p-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['bg-coral-400', 'bg-brand-400', 'bg-sky-400'].map((bg, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full ${bg} border-2 border-brand-800 flex items-center justify-center text-white text-xs font-bold`}>
                    {['SJ', 'MS', 'JW'][i]}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">3 caregivers found</p>
                <p className="text-brand-300 text-xs">Waiting for responses...</p>
              </div>
            </div>
          </div>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-8 text-brand-300 hover:text-white text-sm underline underline-offset-2 transition-colors"
          >
            Cancel and go back
          </button>
        )}
      </div>
    </div>
  );
}
