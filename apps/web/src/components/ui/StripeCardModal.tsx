import { useState, useEffect, useCallback } from 'react';
import type { StripeCardElementOptions } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { payments as paymentsApi } from '@/lib/api';
import Button from '@/components/ui/Button';

// ── Card element styles ────────────────────────────────────────────────────────
const CARD_STYLE: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1f2937',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
      iconColor: '#6b7280',
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
  },
  hidePostalCode: false,
};

// ── Inner form (must live inside <Elements>) ───────────────────────────────────
interface CardFormProps {
  clientSecret: string;
  onSuccess: (pm: any) => void;
  onClose: () => void;
}

function CardForm({ clientSecret, onSuccess, onClose }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;

    setSaving(true);
    setError('');

    const { error: stripeErr, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardEl },
    });

    if (stripeErr) {
      setError(stripeErr.message || 'Card verification failed');
      setSaving(false);
      return;
    }

    if (!setupIntent?.payment_method) {
      setError('Card setup failed — no payment method returned');
      setSaving(false);
      return;
    }

    try {
      const res: any = await paymentsApi.addPaymentMethod(setupIntent.payment_method as string);
      onSuccess(res.paymentMethod);
    } catch (apiErr: any) {
      setError(apiErr.message || 'Failed to save card');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
        <div className="px-4 py-3.5 rounded-xl border border-gray-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all bg-white">
          <CardElement options={CARD_STYLE} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Test card: <span className="font-mono">4242 4242 4242 4242</span> · any future expiry · any CVC
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" fullWidth disabled={!stripe || saving}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </span>
          ) : (
            'Add Card'
          )}
        </Button>
      </div>
    </form>
  );
}

// ── Public modal wrapper ───────────────────────────────────────────────────────
interface StripeCardModalProps {
  onSuccess: (pm: any) => void;
  onClose: () => void;
}

export default function StripeCardModal({ onSuccess, onClose }: StripeCardModalProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loadError, setLoadError] = useState('');

  const init = useCallback(async () => {
    try {
      const [configRes, intentRes]: any[] = await Promise.all([
        paymentsApi.config(),
        paymentsApi.setupIntent(),
      ]);
      if (!configRes.publishableKey) throw new Error('Stripe not configured');
      setStripePromise(loadStripe(configRes.publishableKey));
      setClientSecret(intentRes.clientSecret);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to initialize payment form');
    }
  }, []);

  useEffect(() => { init(); }, [init]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Add Payment Method</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loadError ? (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Unable to load payment form</p>
                <p className="text-red-500 mt-1">{loadError}</p>
                <button onClick={init} className="mt-2 text-red-600 underline text-xs">Try again</button>
              </div>
            </div>
          ) : !stripePromise || !clientSecret ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading secure form…</span>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CardForm clientSecret={clientSecret} onSuccess={onSuccess} onClose={onClose} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
