import { useState, useEffect } from 'react';
import { 
  Briefcase, PlusCircle, Users, Clock, 
  MapPin, MoreVertical, Search,
  Loader2, Filter, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { shifts as shiftApi } from '@/lib/staffingApi';
import { Shift } from '@/types/staffing';

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShifts = async () => {
    try {
      const data = await shiftApi.my();
      setShifts(data.shifts);
    } catch (err) {
      console.error('Failed to load shifts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'filled': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'completed': return 'bg-teal-50 text-teal-700 border border-teal-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border border-red-100';
      default: return 'bg-gray-50 text-gray-700 border border-gray-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Shifts</h2>
          <p className="text-gray-500 text-sm font-medium">Manage and track your posted shifts.</p>
        </div>
        <Link 
          to="/facility-dashboard/post"
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all active:scale-95 text-sm shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Shift
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search shifts by role or ID..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-2">
            <Filter className="w-4 h-4" /> All Status
          </button>
        </div>
      </div>

      {/* Shift List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading your shifts...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Briefcase className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No shifts posted yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm font-medium">Start by posting your first shift to find healthcare professionals.</p>
          <Link 
            to="/facility-dashboard/post"
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-semibold transition-all active:scale-95 shadow-sm text-sm"
          >
            Post Your First Shift
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shifts.map((shift) => (
            <div 
              key={shift.id} 
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border ${getStatusColor(shift.status)}`}>
                    <span className="text-[9px] uppercase opacity-75">{new Date(shift.start_time).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg leading-tight">{new Date(shift.start_time).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-lg font-bold text-gray-900">{shift.role} Shift</h3>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${getStatusColor(shift.status)}`}>
                        {shift.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({shift.duration_hours}h)</div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {shift.location}</div>
                      <div className="flex items-center gap-1.5 text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-lg"><Users className="w-4 h-4" /> {shift.pending_applicants || 0} Applicants</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                  <div className="text-left md:text-right mr-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Budget</p>
                    <p className="text-base font-bold text-gray-900">${shift.total_pay.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/facility-dashboard/applicants?shift=${shift.id}`}
                      className="px-4 py-2 bg-gray-900 text-white rounded-full font-semibold text-xs hover:bg-brand-600 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      View Applicants <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <button className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
