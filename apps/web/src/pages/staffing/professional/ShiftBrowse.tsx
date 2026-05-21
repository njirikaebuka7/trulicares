import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, MapPin, Clock, DollarSign, 
  Building2, ArrowRight, Briefcase, ChevronRight,
  Info, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { shifts as shiftApi, applications as appApi } from '@/lib/staffingApi';
import { Shift } from '@/types/staffing';

export default function ShiftBrowse() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
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
  }, []);

  const handleApply = async (shiftId: string) => {
    setApplyingId(shiftId);
    try {
      await appApi.apply(shiftId, "I am interested in this shift and available to work.");
      alert('Application submitted successfully!');
      loadShifts(); // Refresh
    } catch (err: any) {
      alert(err.message || 'Failed to apply');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by city or facility..."
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all"
            value={filters.city}
            onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && loadShifts()}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all font-semibold text-gray-700"
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
            className="px-6 py-2.5 bg-brand-600 text-white font-semibold rounded-full hover:bg-brand-700 transition-all active:scale-95 shadow-sm text-sm"
          >
            Search
          </button>
        </div>
      </div>

      {/* Matching Toggle */}
      <div className="flex items-center gap-3 bg-brand-50/50 p-2 pl-4 rounded-xl border border-brand-100 w-fit">
        <span className="text-xs font-bold text-brand-700">Show Best Matches Only</span>
        <button 
          onClick={() => setFilters(f => ({ ...f, matchesOnly: !f.matchesOnly }))}
          className={`w-12 h-6 rounded-full transition-all relative ${filters.matchesOnly ? 'bg-brand-600' : 'bg-gray-300'}`}
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
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
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
              // Calculate countdown
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
                className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300 relative"
              >
                {/* Status Badge */}
                {shift.status === 'open' && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl rounded-tr-2xl">
                    Open for Application
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mt-2 md:mt-0">
                  {/* Main Info */}
                  <div className="flex items-start gap-4">
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex flex-col items-center justify-center text-brand-700 flex-shrink-0">
                      <span className="text-[10px] font-extrabold uppercase">{startTime.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-xl font-black leading-none">{startTime.getDate()}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-brand-600 text-white text-[10px] font-bold tracking-wide">{shift.role}</span>
                        {shift.specialty && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">{shift.specialty}</span>}
                        {shift.is_match && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide">
                            <CheckCircle className="w-3 h-3" /> Best Match
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">{shift.facility_name}</h3>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-2 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-900">{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time || new Date(startTime.getTime() + shift.duration_hours*60*60*1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-gray-400">({shift.duration_hours}h)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{shift.city}, {shift.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pay & Actions */}
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total Pay</p>
                      <p className="text-2xl font-black text-emerald-600 leading-none mb-1">${Number(shift.total_pay || (shift.pay_rate * shift.duration_hours)).toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-bold">${shift.pay_rate}/hr</span>
                        <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full font-bold">{countdownText}</span>
                      </div>
                    </div>
                    
                    <Link 
                      to={`/professional-dashboard/shifts/${shift.id}`}
                      className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold text-sm hover:bg-brand-600 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                    >
                      View Details <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )})}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-brand-600 to-emerald-700 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-sm mt-12">
        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Info className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold mb-2">How it works</h3>
          <p className="text-brand-55 text-sm leading-relaxed max-w-xl opacity-90">
            When you apply for a shift, the facility will review your profile and credentials. If accepted, the shift is locked in your schedule. You'll check in via the app when you arrive at the facility.
          </p>
        </div>
        <Link 
          to="/professional-dashboard/profile"
          className="px-6 py-2.5 bg-white text-brand-700 font-semibold rounded-full hover:bg-brand-50 transition-colors whitespace-nowrap active:scale-95 text-sm"
        >
          Check My Credentials
        </Link>
      </div>
    </div>
  );
}
