import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Check, ExternalLink, ShieldCheck, CreditCard, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { caregivers as caregiversApi } from '@/lib/api';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

interface Props {
  matchId: string;
  caregiverId?: string;
  onComplete: () => void;
  onBack: () => void;
}

type PaymentState = 'idle' | 'redirecting' | 'processing' | 'success';

const features = [
  'Unlock direct messaging with caregiver',
  'View full profile & contact details',
  'Schedule interviews directly',
  'Share location & care instructions',
];

export default function PaymentStep({ matchId, caregiverId, onComplete, onBack }: Props) {
  const [state, setState] = useState<PaymentState>('idle');
  const [caregiver, setCaregiver] = useState<any>(null);

  useEffect(() => {
    const fetchId = caregiverId || matchId;
    if (fetchId) {
      caregiversApi.get(fetchId).then(d => setCaregiver(d.caregiver || d)).catch(() => {});
    }
  }, [matchId, caregiverId]);

  const handleStripeCheckout = async () => {
    setState('redirecting');
    await new Promise(r => setTimeout(r, 1800));
    setState('processing');
    await new Promise(r => setTimeout(r, 1600));
    setState('success');
    await new Promise(r => setTimeout(r, 1000));
    onComplete();
  };

  if (state === 'redirecting') {
    return (
      <div className="min-h-screen bg-[#635BFF] flex flex-col items-center justify-center px-4 text-white">
        <div className="text-center space-y-6 max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none">
                <path d="M13.76 9.6c0-1.15.94-1.6 2.5-1.6 2.24 0 5.06.68 7.3 1.89V3.63A19.4 19.4 0 0 0 16.26 2C10.58 2 6.76 5 6.76 9.86c0 7.52 10.34 6.32 10.34 9.57 0 1.36-1.18 1.8-2.83 1.8-2.44 0-5.56-.99-8.02-2.34v6.35A20.32 20.32 0 0 0 14.26 27c5.84 0 9.86-2.88 9.86-7.82-.02-8.12-10.36-6.68-10.36-9.58z" fill="white"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Stripe</span>
          </div>
          <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-xl font-semibold mb-1">Redirecting to Stripe…</p>
            <p className="text-white/70 text-sm">You're being securely redirected to complete your payment.</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-white/60 text-xs">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-brand-600" />
          </div>
          <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-lg font-bold text-gray-900">Processing payment…</p>
            <p className="text-gray-500 text-sm mt-1">Please don't close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 flex justify-center">
            <Link to="/"><img src={logoImg} alt="TruliCares" className="h-6 w-auto" /></Link>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-5">

        {/* Title */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Direct Messaging</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Connect directly with <span className="font-semibold text-gray-800">{caregiver?.name}</span> to get started on your care journey.
          </p>
        </div>

        {/* Caregiver card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          {caregiver?.photoUrl ? (
            <img src={caregiver.photoUrl} alt={caregiver.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-coral-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {caregiver?.name?.split(' ').map((n: string) => n[0]).join('') ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{caregiver?.name}</p>
            <p className="text-sm text-gray-500">{caregiver?.availability} · {caregiver?.location}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Rate</p>
            <p className="font-bold text-brand-600 text-sm">${caregiver?.hourlyRate[0]}–${caregiver?.hourlyRate[1]}/hr</p>
          </div>
        </div>

        {/* Price + features */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white shadow-xl shadow-brand-600/20">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-brand-200 text-sm mb-0.5">One-time unlock fee</p>
              <p className="text-4xl font-bold">$9.99</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-brand-100">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe badge */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#635BFF] rounded-lg flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-4 h-4" fill="none">
                <path d="M13.76 9.6c0-1.15.94-1.6 2.5-1.6 2.24 0 5.06.68 7.3 1.89V3.63A19.4 19.4 0 0 0 16.26 2C10.58 2 6.76 5 6.76 9.86c0 7.52 10.34 6.32 10.34 9.57 0 1.36-1.18 1.8-2.83 1.8-2.44 0-5.56-.99-8.02-2.34v6.35A20.32 20.32 0 0 0 14.26 27c5.84 0 9.86-2.88 9.86-7.82-.02-8.12-10.36-6.68-10.36-9.58z" fill="white"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Powered by Stripe</p>
              <p className="text-xs text-gray-400">You'll be redirected to Stripe's secure checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL encrypted</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> PCI compliant</span>
            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> All major cards</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          One-time payment only. No subscriptions. Caregiver wages are arranged separately.
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            onClick={handleStripeCheckout}
            disabled={state !== 'idle'}
            className={cn(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-base transition-all duration-200 shadow-lg',
              state !== 'idle'
                ? 'bg-brand-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30 active:scale-[0.98]'
            )}
          >
            <svg viewBox="0 0 28 28" className="w-5 h-5 shrink-0" fill="none">
              <path d="M13.76 9.6c0-1.15.94-1.6 2.5-1.6 2.24 0 5.06.68 7.3 1.89V3.63A19.4 19.4 0 0 0 16.26 2C10.58 2 6.76 5 6.76 9.86c0 7.52 10.34 6.32 10.34 9.57 0 1.36-1.18 1.8-2.83 1.8-2.44 0-5.56-.99-8.02-2.34v6.35A20.32 20.32 0 0 0 14.26 27c5.84 0 9.86-2.88 9.86-7.82-.02-8.12-10.36-6.68-10.36-9.58z" fill="white"/>
            </svg>
            Pay $9.99 with Stripe
            <ExternalLink className="w-4 h-4 shrink-0" />
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>Secure checkout — your card details never touch our servers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
