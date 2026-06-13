import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, MapPin, Clock,
  ArrowRight,
  Info, CheckCircle, Loader2
} from 'lucide-react';
import { Shift } from '@/types/staffing';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { shifts as shiftApi } from '@/lib/staffingApi';
import { DistanceChip } from '@/components/ui/CaregiverTrust';

export default function ShiftBrowse() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: '',
    city: '',
    minPay: '',
    matchesOnly: false,
  });

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await shiftApi.browse({
        role: filters.role || undefined,
        city: filters.city || undefined,
        minPay: filters.minPay ? parseFloat(filters.minPay) : undefined
      });
      setShifts(data?.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts', err);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
    
    if (!user) return;
    
    const channel = supabase.channel(`professional:${user.id}`)
      .on('broadcast', { event: 'application_accepted' }, () => {
        loadShifts();
      })
      .on('broadcast', { event: 'application_rejected' }, () => {
        loadShifts();
      })
      .on('broadcast', { event: 'booking_status_change' }, () => {
        loadShifts();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by city or facility..."
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
            value={filters.city}
            onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && loadShifts()}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all font-semibold text-gray-700"
            value={filters.role}
            onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
          >
            <option value="">All Roles</option>
            <option value="RN">RN</option>
            <option value="CNA">CNA</option>
            <option value="LPN">LPN</option>
          </select>
          <button 
            onClick={loadShifts}
            className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all active:scale-95 shadow-sm text-sm"
          >
            Search
          </button>
        </div>
      </div>

      {/* Matching Toggle */}
      <div className="flex items-center gap-3 bg-emerald-50/50 p-2 pl-4 rounded-xl border border-emerald-100 w-fit">
        <span className="text-xs font-bold text-emerald-700">Show Best Matches Only</span>
        <button 
          onClick={() => setFilters(f => ({ ...f, matchesOnly: !f.matchesOnly }))}
          className={`w-12 h-6 rounded-full transition-all relative ${filters.matchesOnly ? 'bg-emerald-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${filters.matchesOnly ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Available Shifts ({shifts.length})</h2>
        <p className="text-sm text-gray-500 font-medium">Showing shifts in your area</p>
      </div>

      {/* Shift List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Finding available shifts...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No shifts found</h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm">Try adjusting your filters or checking back later. New shifts are posted daily.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shifts
            .filter(s => !filters.matchesOnly || s.is_match)
            .map((shift) => {
              const startTime = new Date(shift.start_time);
              const now = new Date();
              const hoursUntil = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
              const daysUntil = Math.floor(hoursUntil / 24);
              const countdownText = daysUntil > 0 
                ? `Starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                : hoursUntil > 0 ? `Starts in ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}` 
                : 'Starting soon';

              return (
              <div 
                key={shift.id} 
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border border-emerald-100 bg-emerald-50 text-emerald-700">
                      <span className="text-[9px] uppercase opacity-75">{startTime.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg leading-tight">{startTime.getDate()}</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-900 leading-none">{shift.facility_name}</h3>
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                          {shift.role}
                        </span>
                        {shift.is_match && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> Match
                          </span>
                        )}
                        {shift.instant_book && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                            ⚡ Instant Book
                          </span>
                        )}
                        {shift.status === 'open' && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                            Open
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({shift.duration_hours}h)</div>
                        <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {shift.location ? `${shift.location} • ` : ''}{shift.city}, {shift.state}</div>
                        {(shift as any).distanceMiles != null && <DistanceChip miles={(shift as any).distanceMiles} />}
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg"><Clock className="w-3.5 h-3.5" /> {countdownText}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                    <div className="text-left md:text-right mr-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pay</p>
                      <p className="text-base font-bold text-gray-900">${Number(shift.total_pay || (shift.pay_rate * shift.duration_hours)).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/professional-dashboard/shifts/${shift.id}`}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-full font-semibold text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )})}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-sm mt-12">
        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Info className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold mb-2">How it works</h3>
          <p className="text-emerald-55 text-sm leading-relaxed max-w-xl opacity-90">
            When you apply for a shift, the facility will review your profile and credentials. If accepted, the shift is locked in your schedule. You'll check in via the app when you arrive at the facility.
          </p>
        </div>
        <Link 
          to="/professional-dashboard/profile"
          className="px-6 py-2.5 bg-white text-emerald-700 font-semibold rounded-full hover:bg-emerald-50 transition-colors whitespace-nowrap active:scale-95 text-sm"
        >
          Check My Credentials
        </Link>
      </div>
    </div>
  );
}
