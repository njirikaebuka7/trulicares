import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Building2, Calendar, FileText, Loader2, CheckCircle, ChevronRight, Check, Briefcase } from 'lucide-react';
import { shifts as shiftApi, applications as appApi } from '@/lib/staffingApi';
import { Shift } from '@/types/staffing';
import { cn } from '@/utils/cn';

export default function ShiftDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/professional-dashboard/browse');
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const shiftData = await shiftApi.get(id as string);
        setShift(shiftData);
      } catch (err: any) {
        console.error('Failed to load shift', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  const handleApply = async () => {
    if (!shift) return;
    setApplying(true);
    try {
      await appApi.apply(shift.id, "I am interested in this shift and available to work.");
      setApplied(true);
    } catch (err: any) {
      alert(err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading shift details...</p>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Shift Not Found</h2>
        <p className="text-gray-500 mb-6">The shift you're looking for doesn't exist or has been removed.</p>
        <Link to="/professional-dashboard/browse" className="text-brand-600 font-medium hover:underline">
          Return to Browse
        </Link>
      </div>
    );
  }

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Header Back Button */}
      <div>
        <Link 
          to="/professional-dashboard/browse"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shifts
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-brand-900 to-brand-800 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Briefcase className="w-40 h-40" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                {shift.role} {shift.specialty ? `• ${shift.specialty}` : ''}
              </span>
              {shift.status === 'open' ? (
                <span className="px-3 py-1 bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                  Accepting Applications
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-500 rounded-lg text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                  {shift.status}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold mb-2">{shift.facility_name}</h1>
            <p className="text-brand-100 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 opacity-80" /> {shift.facility_type || 'Healthcare Facility'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Col - Details */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Date</span>
                  </div>
                  <p className="font-bold text-gray-900">{new Date(shift.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Time</span>
                  </div>
                  <p className="font-bold text-gray-900">{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time || new Date(new Date(shift.start_time).getTime() + shift.duration_hours*60*60*1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{shift.duration_hours} hours • {countdownText}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MapPin className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Location</span>
                  </div>
                  <p className="font-bold text-gray-900">{shift.facility_city}, {shift.facility_state || shift.state || 'Location available upon booking'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{shift.location || 'Unit details provided after acceptance'}</p>
                </div>
              </div>

              {/* Description */}
              {shift.description && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" /> Shift Details
                  </h3>
                  <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap bg-gray-50 p-5 rounded-2xl">
                    {shift.description}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col - Pay & Action */}
            <div>
              <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 sticky top-24">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1 text-center">Total Pay</p>
                <p className="text-4xl font-black text-emerald-600 text-center mb-1">${Number(shift.total_pay || (shift.pay_rate * shift.duration_hours)).toFixed(2)}</p>
                <p className="text-sm font-medium text-emerald-700/70 text-center mb-8">${shift.pay_rate}/hr</p>

                <div className="space-y-3">
                  {applied ? (
                    <div className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-emerald-200 text-emerald-700 font-bold shadow-sm">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                      Application Sent
                      <span className="text-xs font-medium text-emerald-600/70 text-center">You will be notified if accepted</span>
                    </div>
                  ) : shift.status !== 'open' ? (
                    <button disabled className="w-full py-4 bg-gray-200 text-gray-500 rounded-2xl font-bold">
                      Shift No Longer Open
                    </button>
                  ) : (
                    <button 
                      onClick={handleApply}
                      disabled={applying}
                      className="w-full py-4 bg-brand-900 hover:bg-brand-800 text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-brand-900/20 disabled:opacity-70"
                    >
                      {applying ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                      ) : (
                        <>Apply for Shift <ChevronRight className="w-5 h-5" /></>
                      )}
                    </button>
                  )}
                  
                  {!applied && shift.status === 'open' && (
                    <p className="text-xs text-center text-emerald-700/60 font-medium">
                      By applying, you confirm you are available for the entirety of this shift.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
