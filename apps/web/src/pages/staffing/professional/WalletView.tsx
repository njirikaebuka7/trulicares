import { useState, useEffect } from 'react';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, 
  ChevronRight, Building2, CreditCard, Banknote,
  Loader2, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { wallet as walletApi } from '@/lib/staffingApi';
import { ProfessionalWallet } from '@/types/staffing';
import BankDetailsModal from '@/components/staffing/BankDetailsModal';

export default function WalletView() {
  const [data, setData] = useState<ProfessionalWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

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
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setWithdrawing(true);
    try {
      await walletApi.withdraw(parseFloat(withdrawAmount));
      alert('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      loadWallet();
    } catch (err: any) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Securing your wallet...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Wallet Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-[2.5rem] p-8 text-white shadow-2xl">
          {/* Abstract Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
          
          <div className="relative flex flex-col h-full justify-between gap-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Available Balance</p>
                  <h2 className="text-5xl font-bold mt-1">${(data?.balance ?? 0).toFixed(2)}</h2>
                </div>
              </div>
              <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30">
                Ready for Withdrawal
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-900/50 flex items-center gap-2"
              >
                Withdraw Funds <ArrowUpRight className="w-5 h-5" />
              </button>
              <div className="flex gap-4 ml-auto">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Earned</p>
                  <p className="text-xl font-bold">${(data?.totalEarned ?? 0).toFixed(2)}</p>
                </div>
                <div className="w-px h-10 bg-gray-700 mx-2" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Withdrawn</p>
                  <p className="text-xl font-bold">${(data?.totalWithdrawn ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Account Quick Link */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payout Method</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Securely link your bank account for fast direct deposits.</p>
          </div>
          <button 
            onClick={() => setShowBankModal(true)}
            className="w-full py-4 border-2 border-gray-100 rounded-2xl text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mt-6"
          >
            Link Bank Account <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-all">Export CSV</button>
          </div>
        </div>

        {data?.transactions.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-400 font-medium">No transactions yet. Complete your first shift to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{tx.description}</p>
                          {tx.booking_ref && <p className="text-[10px] font-medium text-gray-400">Ref: {tx.booking_ref}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        tx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-8 py-5 text-right font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-sm text-gray-500">
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
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-fade-in-up">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Withdraw Funds</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium">Available balance: <span className="text-emerald-600 font-bold">${(data?.balance ?? 0).toFixed(2)}</span></p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Amount to withdraw</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input 
                    type="number"
                    className="w-full pl-12 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-3xl text-2xl font-bold outline-none transition-all"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-brand-50 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-brand-700 font-medium leading-relaxed">Withdrawals are processed instantly to your linked payout method. In some cases, it may take 1-3 business days.</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={withdrawing}
                  className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount}
                  className="flex-[2] py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all disabled:opacity-50"
                >
                  {withdrawing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bank Modal */}
      {showBankModal && (
        <BankDetailsModal 
          onClose={() => setShowBankModal(false)}
          onSuccess={loadWallet}
        />
      )}
    </div>
  );
}
