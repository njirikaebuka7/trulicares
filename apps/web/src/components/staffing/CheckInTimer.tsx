import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toaster';
import { 
  Clock, Play, Square, CheckCircle, 
  AlertCircle, MapPin, Shield, Loader2
} from 'lucide-react';
import { bookings as checkinApi } from '@/lib/staffingApi';
import { supabase } from '@/lib/supabase';

interface CheckInTimerProps {
  bookingId: string;
  status: 'paid' | 'checked_in' | 'in_progress' | 'checked_out' | 'completed' | 'disputed';
  startTime: string;
  endTime: string;
  onUpdate: () => void;
  role: 'professional' | 'facility';
}

export default function CheckInTimer({ bookingId, status, startTime, endTime, onUpdate, role }: CheckInTimerProps) {
  const [loading, setLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState('');
  const isNearLocation = false;

  // Calculate elapsed time if checked in
  useEffect(() => {
    if (status !== 'in_progress') return;

    const timer = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeElapsed(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [status, startTime]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on('broadcast', { event: '*' }, (payload) => {
        console.log('Real-time event received:', payload);
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, onUpdate]);

  const handleAction = async (action: 'check-in' | 'confirm-start' | 'check-out' | 'confirm-complete') => {
    setLoading(true);
    try {
      if (action === 'check-in') await checkinApi.checkIn(bookingId);
      if (action === 'confirm-start') await checkinApi.confirmStart(bookingId);
      if (action === 'check-out') await checkinApi.checkOut(bookingId);
      if (action === 'confirm-complete') await checkinApi.confirmComplete(bookingId);
      onUpdate();
    } catch (err: any) {
      toast(err.message || `Failed to ${action}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-blue-100 p-6 shadow-xl shadow-blue-50">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            status === 'in_progress' ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-blue-100 text-blue-600'
          }`}>
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                status === 'in_progress' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                {status.replace('_', ' ')}
              </span>
              {isNearLocation && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  <MapPin className="w-3 h-3" /> Near Site
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {status === 'paid' && 'Ready to start?'}
              {status === 'checked_in' && 'At facility. Awaiting start...'}
              {status === 'in_progress' && `Active Shift: ${timeElapsed}`}
              {status === 'checked_out' && 'Shift ended. Awaiting facility...'}
              {status === 'completed' && 'Shift successfully completed'}
            </h3>
            <p className="text-gray-500 text-sm font-medium">
              {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* PROFESSIONAL ACTIONS */}
          {role === 'professional' && (
            <>
              {status === 'paid' && (
                <button 
                  onClick={() => handleAction('check-in')}
                  disabled={loading}
                  className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> Check In</>}
                </button>
              )}
              {status === 'checked_in' && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Awaiting Facility to Start Shift</p>
                </div>
              )}
              {status === 'in_progress' && (
                <button 
                  onClick={() => handleAction('check-out')}
                  disabled={loading}
                  className="flex-1 md:flex-none px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Square className="w-5 h-5" /> Check Out</>}
                </button>
              )}
              {status === 'checked_out' && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Awaiting Facility Confirmation</p>
                </div>
              )}
            </>
          )}

          {/* FACILITY ACTIONS */}
          {role === 'facility' && (
            <>
              {status === 'paid' && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-sm font-bold text-gray-500">Awaiting Professional Check-In</p>
                </div>
              )}
              {status === 'checked_in' && (
                <button 
                  onClick={() => handleAction('confirm-start')}
                  disabled={loading}
                  className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> Confirm Start</>}
                </button>
              )}
              {status === 'in_progress' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-bold text-emerald-700">Shift In Progress</p>
                </div>
              )}
              {status === 'checked_out' && (
                <button 
                  onClick={() => handleAction('confirm-complete')}
                  disabled={loading}
                  className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirm & Pay</>}
                </button>
              )}
            </>
          )}

          {status === 'completed' && (
            <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="text-sm font-black text-emerald-700 uppercase">Shift Completed</p>
                <p className="text-xs text-emerald-600 font-bold">Payment Processed Successfully</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
