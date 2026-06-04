import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toaster';
import {
  Clock, Play, Square, CheckCircle, MapPin, Loader2, Star, X, ShieldAlert, FileText
} from 'lucide-react';
import { bookings as checkinApi } from '@/lib/staffingApi';
import { supabase } from '@/lib/supabase';
import RatingModal from './RatingModal';

interface CheckInTimerProps {
  bookingId: string;
  status: 'paid' | 'checked_in' | 'in_progress' | 'checked_out' | 'completed' | 'disputed' | 'cancelled';
  startTime: string;
  endTime: string;
  onUpdate: () => void;
  role: 'professional' | 'facility';
  /** Optional lifecycle detail (from /shifts/active) for the timesheet view. */
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  clockedHours?: number | null;
  checkInVerified?: boolean | null;
  checkOutVerified?: boolean | null;
  counterpartName?: string;
}

/** Try to read the device location (best effort). Resolves to null if unavailable/denied. */
function getCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export default function CheckInTimer(props: CheckInTimerProps) {
  const { bookingId, status, startTime, endTime, onUpdate, role,
    checkedInAt, checkedOutAt, clockedHours, checkInVerified, checkOutVerified, counterpartName } = props;
  const [loading, setLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMode, setCancelMode] = useState<'cancel' | 'no-show'>('cancel');
  const [note, setNote] = useState('');
  const [showRate, setShowRate] = useState(false);

  useEffect(() => {
    if (status !== 'in_progress') return;
    const timer = setInterval(() => {
      const start = new Date(checkedInAt || startTime).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeElapsed(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [status, startTime, checkedInAt]);

  useEffect(() => {
    const channel = supabase.channel(`booking:${bookingId}`)
      .on('broadcast', { event: '*' }, () => onUpdate())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, onUpdate]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const coords = await getCoords();
      const res = await checkinApi.checkIn(bookingId, coords || undefined);
      if (res?.locationVerified === false) toast('Checked in, but you appear to be away from the shift location.', 'info');
      else toast('Checked in — your shift has started!');
      onUpdate();
    } catch (err: any) { toast(err.message || 'Failed to check in', 'error'); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const coords = await getCoords();
      await checkinApi.checkOut(bookingId, coords || undefined);
      toast('Checked out. Awaiting facility approval.');
      onUpdate();
    } catch (err: any) { toast(err.message || 'Failed to check out', 'error'); }
    finally { setLoading(false); }
  };

  const handleConfirmComplete = async () => {
    setLoading(true);
    try {
      const res = await checkinApi.confirmComplete(bookingId, note.trim() || undefined);
      toast(res?.payoutMode === 'transferred' ? 'Approved — payout sent to the professional.' : 'Timesheet approved. Funds released.');
      onUpdate();
    } catch (err: any) { toast(err.message || 'Failed to approve', 'error'); }
    finally { setLoading(false); }
  };

  const handleCancelConfirm = async () => {
    setLoading(true);
    try {
      if (cancelMode === 'no-show') await checkinApi.noShow(bookingId, cancelReason.trim() || undefined);
      else await checkinApi.cancel(bookingId, cancelReason.trim() || undefined);
      toast(cancelMode === 'no-show' ? 'Reported as a no-show.' : 'Booking cancelled.');
      setShowCancel(false);
      onUpdate();
    } catch (err: any) { toast(err.message || 'Failed to cancel', 'error'); }
    finally { setLoading(false); }
  };

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const canCancel = ['paid', 'in_progress'].includes(status);

  return (
    <div className="bg-white rounded-3xl border-2 border-blue-100 p-6 shadow-xl shadow-blue-50">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${status === 'in_progress' ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${status === 'in_progress' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                {status.replace('_', ' ')}
              </span>
              {status === 'in_progress' && checkInVerified === true && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  <MapPin className="w-3 h-3" /> Location verified
                </span>
              )}
              {status === 'in_progress' && checkInVerified === false && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                  <ShieldAlert className="w-3 h-3" /> Location not verified
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {status === 'paid' && 'Ready to start'}
              {status === 'in_progress' && `Active Shift: ${timeElapsed}`}
              {status === 'checked_out' && 'Shift ended — timesheet ready'}
              {status === 'completed' && 'Shift completed'}
              {status === 'cancelled' && 'Shift cancelled'}
            </h3>
            <p className="text-gray-500 text-sm font-medium">
              {fmt(startTime)} - {fmt(endTime)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
          {/* PROFESSIONAL */}
          {role === 'professional' && (
            <>
              {status === 'paid' && (
                <button onClick={handleCheckIn} disabled={loading} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> Check In &amp; Start</>}
                </button>
              )}
              {status === 'in_progress' && (
                <button onClick={handleCheckOut} disabled={loading} className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Square className="w-5 h-5" /> Check Out</>}
                </button>
              )}
              {status === 'checked_out' && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Awaiting facility approval</p>
                </div>
              )}
            </>
          )}

          {/* FACILITY */}
          {role === 'facility' && (
            <>
              {status === 'paid' && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Awaiting professional check-in</p>
                </div>
              )}
              {status === 'in_progress' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-bold text-emerald-700">Shift in progress</p>
                </div>
              )}
              {status === 'checked_out' && (
                <button onClick={handleConfirmComplete} disabled={loading} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Approve &amp; Pay</>}
                </button>
              )}
            </>
          )}

          {status === 'completed' && (
            <div className="flex flex-col items-stretch gap-2">
              <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-black text-emerald-700 uppercase">Completed</p>
                  <p className="text-xs text-emerald-600 font-bold">Payment processed</p>
                </div>
              </div>
              <button onClick={() => setShowRate(true)} className="px-6 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-full font-semibold text-sm hover:bg-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95">
                <Star className="w-4 h-4" /> Rate {role === 'professional' ? 'facility' : 'professional'}
              </button>
            </div>
          )}

          {canCancel && (
            <button
              onClick={() => { setCancelMode('cancel'); setShowCancel(true); }}
              className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors"
            >
              Cancel shift
            </button>
          )}
          {role === 'facility' && status === 'paid' && (
            <button
              onClick={() => { setCancelMode('no-show'); setShowCancel(true); }}
              className="text-xs font-semibold text-gray-400 hover:text-amber-600 transition-colors"
            >
              Report no-show
            </button>
          )}
        </div>
      </div>

      {/* Digital timesheet (facility approval view) */}
      {status === 'checked_out' && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Digital Timesheet
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Clock In</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{fmt(checkedInAt)}</p>
              {checkInVerified === false && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Unverified loc.</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Clock Out</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{fmt(checkedOutAt)}</p>
              {checkOutVerified === false && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Unverified loc.</p>}
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Hours</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">{clockedHours != null ? `${clockedHours}h` : '—'}</p>
            </div>
          </div>
          {role === 'facility' && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to this timesheet (optional)…"
              className="mt-3 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm outline-none"
            />
          )}
        </div>
      )}

      {/* Cancel / no-show modal */}
      {showCancel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !loading && setShowCancel(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <button onClick={() => setShowCancel(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {cancelMode === 'no-show' ? 'Report no-show' : 'Cancel this shift?'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {cancelMode === 'no-show'
                ? 'Only do this if the professional never arrived. The charge will be refunded and their reliability score affected.'
                : 'The shift will reopen for others. If already paid, the facility is refunded. Frequent cancellations affect your reliability score.'}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason (optional)…"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-2xl text-sm outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} disabled={loading} className="flex-1 py-2.5 text-gray-500 font-semibold hover:bg-gray-50 rounded-full text-sm">Keep shift</button>
              <button onClick={handleCancelConfirm} disabled={loading} className="flex-[2] py-2.5 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (cancelMode === 'no-show' ? 'Report no-show' : 'Cancel shift')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRate && (
        <RatingModal
          bookingId={bookingId}
          rateeLabel={counterpartName || (role === 'professional' ? 'the facility' : 'the professional')}
          onClose={() => setShowRate(false)}
        />
      )}
    </div>
  );
}
