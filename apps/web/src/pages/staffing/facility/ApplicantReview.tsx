import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle, XCircle, Star, 
  MapPin, Briefcase, FileText, Loader2,
  Stethoscope, Clock, Shield, ArrowLeft,
  ChevronRight, ExternalLink, Mail, Phone
} from 'lucide-react';
import { applications as appApi } from '@/lib/staffingApi';
import { ShiftApplication } from '@/types/staffing';

export default function ApplicantReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shiftId = searchParams.get('shift');
  
  const [applicants, setApplicants] = useState<ShiftApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadApplicants() {
      if (!shiftId) {
        setLoading(false);
        return;
      }
      try {
        const data = await appApi.forShift(shiftId);
        setApplicants(data.applicants);
      } catch (err) {
        console.error('Failed to load applicants', err);
      } finally {
        setLoading(false);
      }
    }
    loadApplicants();
  }, [shiftId]);

  const handleAccept = async (appId: string) => {
    if (!confirm('Accept this professional and proceed to payment?')) return;
    setProcessingId(appId);
    try {
      const res = await appApi.accept(appId);
      if (res.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept applicant');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    if (!confirm('Are you sure you want to reject this applicant?')) return;
    setProcessingId(appId);
    try {
      await appApi.reject(appId);
      setApplicants(prev => prev.filter(a => a.id !== appId));
    } catch (err) {
      alert('Failed to reject applicant');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading applicants...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Review Applicants</h2>
            <p className="text-gray-500 font-medium">Select the best professional for your shift.</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4" /> {applicants.length} Applicants
        </div>
      </div>

      {!shiftId ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No shift selected</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">Please select a shift from the management dashboard to view applicants.</p>
          <button onClick={() => navigate('/facility-dashboard/shifts')} className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl">
            Go to Management
          </button>
        </div>
      ) : applicants.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No applicants yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">As soon as professionals apply to your shift, they will appear here for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applicants.map((app) => (
            <div 
              key={app.id} 
              className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all duration-300 flex flex-col lg:flex-row gap-8"
            >
              {/* Profile Sidebar */}
              <div className="lg:w-72 flex-shrink-0 flex flex-col items-center lg:items-start">
                <div className="w-32 h-32 rounded-[2.5rem] bg-violet-100 p-1 mb-4 shadow-lg shadow-violet-50">
                  <div className="w-full h-full rounded-[2.25rem] bg-white overflow-hidden flex items-center justify-center">
                    {app.photo_url ? (
                      <img src={app.photo_url} alt={app.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-12 h-12 text-violet-200" />
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 text-center lg:text-left">{app.name}</h3>
                <p className="text-violet-600 font-bold text-sm mb-4">{app.license_type} Professional</p>
                
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                    <Shield className="w-4 h-4 text-emerald-500" /> Verified Credentials
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                    <Briefcase className="w-4 h-4 text-gray-400" /> {app.years_experience} Years Exp.
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                    <MapPin className="w-4 h-4 text-gray-400" /> {app.city || 'Local'}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">About this professional</h4>
                    <div className="flex gap-2">
                      <button className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all flex items-center justify-center border border-transparent hover:border-violet-100">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all flex items-center justify-center border border-transparent hover:border-violet-100">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium line-clamp-4">
                    {app.bio || "No professional bio provided. This professional has verified credentials and is ready for duty."}
                  </p>
                  
                  {app.specialties && app.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {app.specialties.slice(0, 4).map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-violet-50 text-violet-700 text-[10px] font-black uppercase rounded-lg border border-violet-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {app.cover_note && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-sm text-gray-500">
                      " {app.cover_note} "
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col sm:flex-row gap-4 items-center">
                  <button 
                    onClick={() => handleReject(app.id)}
                    disabled={!!processingId}
                    className="w-full sm:w-auto px-8 py-3 text-gray-400 font-bold hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => handleAccept(app.id)}
                    disabled={!!processingId}
                    className="flex-1 w-full px-8 py-4 bg-violet-600 text-white font-black rounded-2xl shadow-xl shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingId === app.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Accept & Book Shift <CheckCircle className="w-5 h-5" /></>
                    )}
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
