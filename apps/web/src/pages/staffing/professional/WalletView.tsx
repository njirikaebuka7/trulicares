import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/Toaster';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock,
  ChevronRight, CreditCard,
  Loader2, CheckCircle, Info, DollarSign, ShieldCheck, Hourglass
} from 'lucide-react';
import { wallet as walletApi } from '@/lib/staffingApi';
import { ProfessionalWallet } from '@/types/staffing';

export default function WalletView() {
  const [data, setData] = useState<ProfessionalWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const payouts = data?.payouts;
  const payoutsReady = !!payouts?.payoutsEnabled;

  const loadWallet = async () => {
    try {
      const res = await walletApi.get();
      setData(res);
    } catch (err) {
      console.error('Failed to load wallet', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
    // Returning from Stripe onboarding — refresh the live Connect status, then clean the URL.
    if (searchParams.get('connect')) {
      walletApi.connectStatus().catch(() => {}).finally(() => {
        loadWallet();
        searchParams.delete('connect');
        setSearchParams(searchParams, { replace: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectOnboard = async () => {
    setConnecting(true);
    try {
      const res = await walletApi.connectOnboard();
      if (res?.url) {
        window.location.href = res.url; // Hosted Stripe onboarding
      } else {
        toast('Could not start payout setup', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Payouts are not available yet', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setWithdrawing(true);
    try {
      const res = await walletApi.withdraw(parseFloat(withdrawAmount));
      toast(res?.message || 'Payout sent!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      loadWallet();
    } catch (err: any) {
      toast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const openWithdraw = () => {
    if (!payoutsReady) {
      toast(
        payouts?.connectEnabled
          ? 'Finish setting up payouts before withdrawing.'
          : 'Payouts aren’t live yet — your earnings are safely tracked here.',
        'info'
      );
      return;
    }
    setShowWithdrawModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Securing your wallet...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Wallet Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-sm">
          {/* Abstract Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-20 -mb-20" />
          
          <div className="relative flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Available Balance</p>
                  <h2 className="text-3xl font-bold mt-0.5">${(data?.balance ?? 0).toFixed(2)}</h2>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10">
                Ready for Withdrawal
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openWithdraw}
                className="px-6 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold rounded-full transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2"
              >
                Withdraw Funds <ArrowUpRight className="w-4 h-4" />
              </button>
              <div className="flex gap-4 ml-auto text-emerald-100">
                <div className="text-right">
                  <p className="text-[10px] opacity-75 font-semibold uppercase tracking-wider">Escrow</p>
                  <p className="text-lg font-bold text-white">${((data as any)?.escrow ?? 0).toFixed(2)}</p>
                </div>
                <div className="w-px h-10 bg-white/25 mx-2" />
                <div className="text-right">
                  <p className="text-[10px] opacity-75 font-semibold uppercase tracking-wider">Total Earned</p>
                  <p className="text-lg font-bold text-white">${(data?.totalEarned ?? 0).toFixed(2)}</p>
                </div>
                <div className="w-px h-10 bg-white/25 mx-2" />
                <div className="text-right">
                  <p className="text-[10px] opacity-75 font-semibold uppercase tracking-wider">Withdrawn</p>
                  <p className="text-lg font-bold text-white">${(data?.totalWithdrawn ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Setup (Stripe Connect) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          {!payouts?.connectEnabled ? (
            // Connect not yet enabled on the platform — earnings tracked, payouts coming soon.
            <>
              <div>
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                  <Hourglass className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Payouts coming soon</h3>
                <p className="text-gray-500 text-xs leading-relaxed font-medium">
                  Your earnings are safely tracked in your wallet. Bank payouts will be enabled shortly — you’ll be able to set them up here.
                </p>
              </div>
              <div className="w-full py-2.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400 font-semibold text-sm flex items-center justify-center gap-2 mt-6">
                <Clock className="w-4 h-4" /> Not yet available
              </div>
            </>
          ) : payoutsReady ? (
            // Onboarded — payouts active.
            <>
              <div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  Payouts active <CheckCircle className="w-4 h-4 text-emerald-500" />
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed font-medium">
                  Your Stripe payout account is verified. Earnings are paid out automatically when a shift completes.
                </p>
              </div>
              <button
                onClick={handleConnectOnboard}
                disabled={connecting}
                className="w-full py-2.5 border border-gray-200 rounded-full text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mt-6 active:scale-95 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Manage payout account <ChevronRight className="w-4 h-4" /></>}
              </button>
            </>
          ) : (
            // Enabled but not finished onboarding.
            <>
              <div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
                  <CreditCard className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {payouts?.onboardingStatus === 'pending' ? 'Finish payout setup' : 'Set up payouts'}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed font-medium">
                  {payouts?.onboardingStatus === 'pending'
                    ? 'Stripe is still verifying your details. Complete any remaining steps to start receiving payouts.'
                    : 'Securely verify your identity and bank account with Stripe to receive direct payouts.'}
                </p>
              </div>
              <button
                onClick={handleConnectOnboard}
                disabled={connecting}
                className="w-full py-2.5 bg-emerald-600 rounded-full text-white font-semibold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-6 active:scale-95 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{payouts?.onboardingStatus === 'pending' ? 'Continue setup' : 'Set up payouts'} <ChevronRight className="w-4 h-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-full text-xs font-semibold border border-gray-100 hover:bg-gray-100 transition-all active:scale-95">Export CSV</button>
          </div>
        </div>

        {data?.transactions.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium text-sm">No transactions yet. Complete your first shift to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{tx.description}</p>
                          {tx.booking_ref && <p className="text-[10px] font-medium text-gray-400">Ref: {tx.booking_ref}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                        tx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-sm text-gray-500">
                      ${tx.balance_after.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !withdrawing && setShowWithdrawModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Withdraw Funds</h3>
            <p className="text-gray-500 text-sm mb-6 font-medium">Available balance: <span className="text-emerald-600 font-bold">${(data?.balance ?? 0).toFixed(2)}</span></p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount to withdraw</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input 
                    type="number"
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl text-xl font-bold outline-none transition-all"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">Payouts are sent securely via Stripe to your verified bank account, typically arriving in 1-2 business days.</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={withdrawing}
                  className="flex-1 py-2.5 text-gray-500 font-semibold hover:bg-gray-50 rounded-full transition-colors active:scale-95 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount}
                  className="flex-[2] py-2.5 bg-emerald-600 text-white font-semibold rounded-full shadow-sm hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                >
                  {withdrawing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
