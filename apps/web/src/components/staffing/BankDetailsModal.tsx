import { useState } from 'react';
import { toast } from '@/components/ui/Toaster';
import { 
  Building2, X, Save, 
  CreditCard, Loader2, ShieldCheck, Info
} from 'lucide-react';
import { wallet as walletApi } from '@/lib/staffingApi';

interface BankDetailsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BankDetailsModal({ onClose, onSuccess }: BankDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await walletApi.saveBankDetails(form);
      toast('Bank details updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast('Failed to save bank details', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">Payout Method</h3>
            <p className="text-gray-500 font-medium">Link your bank for direct deposits.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Holder Name</label>
            <input 
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
              placeholder="e.g. John Doe"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bank Name</label>
            <input 
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
              placeholder="e.g. Chase, Wells Fargo"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Number</label>
              <input 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                placeholder="0000000000"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Routing Number</label>
              <input 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                placeholder="000000000"
                value={form.routingNumber}
                onChange={(e) => setForm({ ...form, routingNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 flex gap-3 border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Your data is encrypted and stored securely.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Save Bank Details <Save className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
