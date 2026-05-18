
import { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import { post } from '@/lib/api';
import { cn } from '@/utils/cn';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  requestId?: string;
  matchId?: string;
  refId?: string;
}

export default function ReportModal({ 
  isOpen, 
  onClose, 
  reportedUserId, 
  reportedUserName,
  requestId,
  matchId,
  refId
}: ReportModalProps) {
  const [type, setType] = useState('no_show');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await post('/reports', {
        reportedUserId,
        requestId,
        matchId,
        type,
        description,
        priority
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setDescription('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900 text-lg">Report a Dispute</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h4 className="text-xl font-bold text-gray-900">Report Submitted</h4>
            <p className="text-sm text-gray-500">
              Thank you for bringing this to our attention. Our team will review the dispute and get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Involved Party</p>
              <p className="font-bold text-gray-900">{reportedUserName}</p>
              {refId && (
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ref ID: {refId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">What happened?</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm appearance-none bg-white"
              >
                <option value="no_show">Caregiver didn't show up</option>
                <option value="late">Caregiver was significantly late</option>
                <option value="unprofessional">Unprofessional behavior</option>
                <option value="safety">Safety concern</option>
                <option value="payment">Payment/Billing issue</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Severity</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border',
                      priority === p 
                        ? p === 'high' ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Detailed Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide as much detail as possible..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={isSubmitting} className="bg-red-600 hover:bg-red-700">
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
