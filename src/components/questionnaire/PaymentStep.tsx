import { useState } from 'react';
import { ArrowLeft, CreditCard, Lock, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { mockMatches } from '@/data/mock';

interface Props {
  matchId: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function PaymentStep({ matchId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const match = mockMatches.find(m => m.id === matchId);
  const caregiver = match?.caregiver;

  const handlePayment = async () => {
    setLoading(true);
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onComplete();
  };

  const features = [
    'Unlock direct messaging',
    'View full caregiver profile',
    'Share contact information',
    'Schedule interviews',
  ];

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
          <div className="flex-1 text-center">
            <span className="text-sm font-medium text-gray-500">Unlock Messaging</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Connection</h2>
          <p className="text-gray-500 text-sm">
            Pay to unlock messaging with <span className="font-semibold text-gray-700">{caregiver?.name}</span>
          </p>
        </div>

        {/* Price card */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-brand-100">Match unlock fee</span>
            <span className="text-3xl font-bold">$9.99</span>
          </div>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-200" />
                <span className="text-sm text-brand-100">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mock payment form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card number</label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-gray-500">
          <Lock className="w-4 h-4" />
          Secure payment powered by Stripe
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <Button variant="primary" size="xl" fullWidth onClick={handlePayment} loading={loading}>
            Pay $9.99 & Continue
          </Button>
          <p className="text-xs text-gray-400 text-center mt-3">
            One-time payment. No subscriptions. Caregiver wages paid separately.
          </p>
        </div>
      </div>
    </div>
  );
}
