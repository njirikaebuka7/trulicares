import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toaster';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle, MapPin, Briefcase, Loader2,
  Shield, ArrowLeft, Mail, Phone
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
      toast(err.message || 'Failed to accept applicant', 'error');
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
      toast('Failed to reject applicant', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading applicants...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Applicants</h2>
            <p className="text-gray-500 text-sm font-medium">Select the best professional for your shift.</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand-100">
          <Users className="w-4 h-4" /> {applicants.length} Applicants
        </div>
      </div>

      {!shiftId ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No shift selected</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm font-medium">Please select a shift from the management dashboard to view applicants.</p>
          <button onClick={() => navigate('/facility-dashboard/shifts')} className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-brand-600 transition-all active:scale-95 text-sm shadow-sm">
            Go to Management
          </button>
        </div>
      ) : applicants.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No applicants yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm font-medium">As soon as professionals apply to your shift, they will appear here for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applicants.map((app) => (
            <div 
              key={app.id} 
              className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300 flex flex-col lg:flex-row gap-6 sm:gap-8"
            >
              {/* Profile Sidebar */}
              <div className="lg:w-64 flex-shrink-0 flex flex-col items-center lg:items-start border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
                <div className="w-28 h-28 rounded-xl bg-brand-50 p-1 mb-4 shadow-sm">
                  <div className="w-full h-full rounded-lg bg-white overflow-hidden flex items-center justify-center border border-gray-100">
                    {app.photo_url ? (
                      <img src={app.photo_url} alt={app.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-10 h-10 text-brand-300" />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center lg:text-left">{app.name}</h3>
                <p className="text-brand-600 font-semibold text-xs mb-4">{app.license_type} Professional</p>
                
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100/50">
                    <Shield className="w-4 h-4 text-emerald-500" /> Verified Credentials
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100/50">
                    <Briefcase className="w-4 h-4 text-gray-400" /> {app.years_experience} Years Exp.
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100/50">
                    <MapPin className="w-4 h-4 text-gray-400" /> {app.city || 'Local'}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">About this professional</h4>
                    <div className="flex gap-2">
                      <button className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center border border-gray-100">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center border border-gray-100">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium line-clamp-4">
                    {app.bio || "No professional bio provided. This professional has verified credentials and is ready for duty."}
                  </p>
                  
                  {app.specialties && app.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {app.specialties.slice(0, 4).map((s, i) => (
                        <span key={i} className="px-2.5 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase rounded-lg border border-brand-100/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {app.cover_note && (
                    <div className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 italic text-xs text-gray-500 font-medium">
                      " {app.cover_note} "
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                  <button 
                    onClick={() => handleReject(app.id)}
                    disabled={!!processingId}
                    className="w-full sm:w-auto px-5 py-2.5 text-gray-500 font-semibold hover:text-red-500 hover:bg-red-50 rounded-full transition-all text-sm active:scale-95"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => handleAccept(app.id)}
                    disabled={!!processingId}
                    className="flex-1 w-full px-5 py-2.5 bg-brand-600 text-white font-semibold rounded-full hover:bg-brand-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 text-sm shadow-sm"
                  >
                    {processingId === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Accept & Book Shift <CheckCircle className="w-4 h-4" /></>
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
