import { useEffect, useState } from 'react';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';
import { get } from '@/lib/api';

interface Props {
  requestId?: string | null;
  onComplete: () => void;
  onCancel?: () => void;
}

const steps = [
  'Analyzing your care request...',
  'Finding caregivers in your area...',
  'Matching based on your preferences...',
  'Notifying caregivers...',
  'Ready to view matches!',
];

export default function MatchingStep({ requestId, onComplete, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [matchCount, setMatchCount] = useState<number | null>(null);

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
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  useEffect(() => {
    if (!requestId) return;
    const fetchMatches = async () => {
      try {
        // Poll a couple of times as matches are created in background
        const res: any = await get('/matches');
        const relevant = res.matches?.filter((m: any) => m.careRequestId === requestId) || [];
        setMatchCount(relevant.length);
      } catch (err) {
        console.error('Error fetching dynamic match count:', err);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 1500);
    return () => clearInterval(interval);
  }, [requestId]);

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
        <p className="text-brand-200 text-sm mb-6">This usually takes less than a minute</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-brand-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-coral-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Match Count Display */}
        {matchCount !== null ? (
          <div className="bg-brand-800/60 border border-brand-500/30 rounded-2xl p-4 mb-6 transition-all duration-500 transform translate-y-0 opacity-100">
            <p className="text-white text-sm font-semibold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              Found <span className="text-emerald-300 text-base font-bold">{matchCount}</span> qualified caregiver{matchCount === 1 ? '' : 's'} near you!
            </p>
          </div>
        ) : (
          <div className="bg-brand-900/40 border border-brand-800/40 rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-brand-300 text-sm">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
            <span>Searching database for local professionals...</span>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 text-left max-w-xs mx-auto mb-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-300 ${i <= currentStep ? 'opacity-100 font-medium' : 'opacity-30'}`}
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

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-brand-300 hover:text-white text-sm underline underline-offset-2 transition-colors"
          >
            Cancel and go back
          </button>
        )}
      </div>
    </div>
  );
}
