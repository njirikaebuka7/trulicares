import { useState } from 'react';
import { 
  AlertTriangle, X, Send, 
  MessageSquare, Loader2, Info 
} from 'lucide-react';
import { disputes as disputeApi } from '@/lib/staffingApi';

interface DisputeModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisputeModal({ bookingId, onClose, onSuccess }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    
    setLoading(true);
    try {
      await disputeApi.raise(bookingId, reason);
      alert('Dispute raised successfully. An admin will review it shortly.');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to raise dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">Raise a Dispute</h3>
            <p className="text-gray-500 font-medium">Something went wrong? Let us know.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Raising a dispute will pause any pending payments for this shift. Our support team will review the details and reach out to both parties.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Reason for Dispute</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-300" />
              <textarea 
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-2xl text-sm font-medium outline-none transition-all resize-none"
                rows={5}
                placeholder="Please describe exactly what happened (e.g. professional was late, facility had safety issues...)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
            >
              Back
            </button>
            <button 
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-[2] py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Dispute <Send className="w-4 h-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
