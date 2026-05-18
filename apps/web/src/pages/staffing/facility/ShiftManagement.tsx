import { useState, useEffect } from 'react';
import { 
  Briefcase, PlusCircle, Users, Clock, 
  MapPin, ChevronRight, MoreVertical, Search,
  AlertCircle, CheckCircle, Loader2, Filter,
  ArrowUpRight
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
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'filled': return 'bg-violet-100 text-violet-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">My Shifts</h2>
          <p className="text-gray-500 font-medium">Manage and track your posted shifts.</p>
        </div>
        <Link 
          to="/facility-dashboard/post"
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-violet-200"
        >
          <PlusCircle className="w-5 h-5" />
          Post New Shift
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search shifts by role or ID..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-2">
            <Filter className="w-4 h-4" /> All Status
          </button>
        </div>
      </div>

      {/* Shift List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-100">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading your shifts...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-20 text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-12 h-12 text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No shifts posted yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">Start by posting your first shift to find healthcare professionals.</p>
          <Link 
            to="/facility-dashboard/post"
            className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-violet-200"
          >
            Post Your First Shift
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shifts.map((shift) => (
            <div 
              key={shift.id} 
              className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black ${getStatusColor(shift.status)}`}>
                    <span className="text-[10px] uppercase opacity-70">{new Date(shift.start_time).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl">{new Date(shift.start_time).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{shift.role} Shift</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(shift.status)}`}>
                        {shift.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({shift.duration_hours}h)</div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {shift.location}</div>
                      <div className="flex items-center gap-1.5 text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-lg"><Users className="w-4 h-4" /> {shift.pending_applicants || 0} Applicants</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right mr-4 hidden sm:block">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Budget</p>
                    <p className="text-lg font-black text-gray-900">${shift.total_pay.toFixed(2)}</p>
                  </div>
                  <Link 
                    to={`/facility-dashboard/applicants?shift=${shift.id}`}
                    className="flex-1 md:flex-none px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-violet-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                  >
                    View Applicants <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <button className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
