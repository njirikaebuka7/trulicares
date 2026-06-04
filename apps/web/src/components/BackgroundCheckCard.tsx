import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, Loader2, ArrowRight, ExternalLink, RefreshCw
} from 'lucide-react';
import { backgroundCheck as bgApi } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type BgStatus = 'not_started' | 'pending' | 'processing' | 'passed' | 'needs_review' | 'failed' | 'expired' | 'cancelled';

interface BgState {
  status: BgStatus;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  feeAmount: number;
  hostedUrl: string | null;
  provider: 'turn' | 'manual';
}

/**
 * Payment-first Turn.ai background check. Used by caregivers (marketplace) and
 * professionals (staffing). The user pays our platform first; the Turn check is created
 * by the backend only after payment succeeds. Turn handles consent + sensitive data via
 * its hosted URL — we never collect SSN/ID docs here.
 */
export default function BackgroundCheckCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [state, setState] = useState<BgState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await bgApi.status();
      setState(s);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Returning from Stripe checkout — refresh shortly so the webhook has time to land.
    if (new URLSearchParams(window.location.search).get('bg_payment') === 'success') {
      toast('Payment received — starting your background check…');
      setTimeout(load, 2500);
    }
    if (!user) return;
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('broadcast', { event: 'verification_update' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const res = await bgApi.start();
      if (res?.alreadyPaid) {
        if (res.hostedUrl) window.open(res.hostedUrl, '_blank');
        else toast('Your background check is already in progress.', 'info');
        load();
      } else if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl; // Stripe Checkout
      } else {
        toast('Could not start background check', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to start background check', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    try {
      const res = await bgApi.resend();
      if (res?.url) { window.open(res.url, '_blank'); }
      else toast('No active link found', 'error');
    } catch (err: any) {
      toast(err.message || 'Failed to get your link', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-3 shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-sm text-gray-500 font-medium">Loading background check status…</span>
      </div>
    );
  }

  const status = state?.status || 'not_started';
  const fee = state?.feeAmount ?? 39;

  // Visual config per state.
  const cfg: Record<string, { icon: any; tone: string; title: string; sub: string }> = {
    not_started: { icon: ShieldCheck, tone: 'gray', title: 'Background check required', sub: 'Get verified to start receiving work. A one-time processing fee applies.' },
    pending: { icon: Clock, tone: 'amber', title: 'Background check pending', sub: 'Complete your details with our partner Turn to continue. This can take a few minutes to a few days.' },
    processing: { icon: Clock, tone: 'amber', title: 'Background check processing', sub: 'Turn is running your check. We’ll update your status automatically — no action needed.' },
    passed: { icon: ShieldCheck, tone: 'emerald', title: 'Background check passed', sub: 'You’re verified and active. Thanks for keeping the community safe.' },
    needs_review: { icon: ShieldAlert, tone: 'amber', title: 'Needs review', sub: 'Your check returned results our team is reviewing. We’ll be in touch shortly.' },
    failed: { icon: ShieldX, tone: 'red', title: 'Background check failed', sub: 'Your check did not meet our requirements. Contact support if you believe this is an error.' },
    expired: { icon: ShieldX, tone: 'red', title: 'Background check expired', sub: 'Your check link expired. You can start a new one below.' },
    cancelled: { icon: ShieldX, tone: 'red', title: 'Background check cancelled', sub: 'Your check was cancelled. You can start a new one below.' },
  };
  const c = cfg[status] || cfg.not_started;
  const Icon = c.icon;
  const toneMap: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-500 border-gray-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  const showStart = ['not_started', 'expired', 'cancelled', 'failed'].includes(status) && state?.paymentStatus !== 'paid';
  const showResend = ['pending', 'processing'].includes(status);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${compact ? 'p-5' : 'p-6'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${toneMap[c.tone]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">{c.title}</h3>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${toneMap[c.tone]}`}>
              {status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{c.sub}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {showStart && (
              <button
                onClick={handleStart}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full text-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Background Check · ${fee.toFixed(0)} <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
            {showResend && (
              <>
                {state?.hostedUrl && (
                  <a
                    href={state.hostedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-emerald-600 text-white font-semibold rounded-full text-sm transition-all active:scale-95"
                  >
                    Complete Background Check <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={handleResend}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-full text-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Resend Link</>}
                </button>
              </>
            )}
          </div>

          {showStart && (
            <p className="text-[11px] text-gray-400 mt-3">
              You pay TruliCares a one-time processing fee. Your check is run securely by our partner <span className="font-semibold">Turn</span> — your SSN and documents go directly to Turn and are never stored by TruliCares.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
