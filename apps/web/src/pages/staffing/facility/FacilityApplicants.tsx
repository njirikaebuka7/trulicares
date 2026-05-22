import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, CheckCircle, XCircle, Clock, MapPin, Briefcase, FileText, ChevronDown, ChevronUp, Stethoscope, GraduationCap, ShieldCheck } from 'lucide-react';
import { applications as appApi, shifts as shiftApi } from '@/lib/staffingApi';
import { cn } from '@/utils/cn';
import { Shift } from '@/types/staffing';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function FacilityApplicants() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get('shift');
  const navigate = useNavigate();

  const [shift, setShift] = useState<Shift | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shiftId) {
      navigate('/facility-dashboard/shifts');
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const [shiftData, appsData] = await Promise.all([
          shiftApi.get(shiftId as string),
          appApi.forShift(shiftId as string)
        ]);
        setShift(shiftData);
        setApplicants(appsData.applicants || []);
      } catch (err: any) {
        console.error('Failed to load applicants', err);
        setError('Failed to load applicants or shift details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    if (!user) return;

    const channel = supabase.channel(`facility:${user.id}`)
      .on('broadcast', { event: 'shift_status_change' }, () => {
        // A professional applied or withdrew, reload applicants
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftId, navigate, user]);

  const handleAccept = async (appId: string) => {
    try {
      setProcessing(appId);
      const res = await appApi.accept(appId);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setApplicants(apps => apps.map(a => a.id === appId ? { ...a, status: 'accepted' } : { ...a, status: 'rejected' }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept applicant');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (appId: string) => {
    try {
      setProcessing(appId);
      await appApi.reject(appId);
      setApplicants(apps => apps.map(a => a.id === appId ? { ...a, status: 'rejected' } : a));
    } catch (err: any) {
      alert(err.message || 'Failed to reject applicant');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading applicants...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/facility-dashboard/shifts"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Applicants</h1>
          {shift && (
            <p className="text-sm text-gray-500 font-medium mt-1">
              {shift.role} • {new Date(shift.start_time).toLocaleDateString()} • {shift.location}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Applicant List */}
      <div className="grid grid-cols-1 gap-4">
        {applicants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Applicants Yet</h3>
            <p className="text-gray-500">Professionals in your area have been notified and can apply soon.</p>
          </div>
        ) : (
          applicants.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                
                {/* Profile Info */}
                <div className="flex items-start gap-4 flex-1">
                  {app.photo_url ? (
                    <img src={app.photo_url} alt={app.name} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold shrink-0">
                      {app.name?.charAt(0) || 'P'}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                      {app.verification_status === 'approved' && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">{app.license_type}</span>
                      {app.years_experience && <span>{app.years_experience} yrs exp</span>}
                      {app.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.location}</span>}
                    </div>
                    
                    {app.specialties && app.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {app.specialties.map((s: string) => (
                          <span key={s} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Details & Actions */}
                <div className="flex flex-col md:items-end justify-between gap-4 md:w-64 shrink-0">
                  <div className="text-sm text-gray-500 flex items-center gap-1.5 md:justify-end">
                    <Clock className="w-4 h-4" /> Applied {new Date(app.applied_at).toLocaleDateString()}
                  </div>

                  {app.status === 'pending' ? (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleReject(app.id)}
                        disabled={!!processing}
                        className="flex-1 md:flex-none px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {processing === app.id ? '...' : 'Reject'}
                      </button>
                      <button 
                        onClick={() => handleAccept(app.id)}
                        disabled={!!processing}
                        className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {processing === app.id ? 'Processing...' : 'Hire & Pay'}
                      </button>
                    </div>
                  ) : (
                    <div className={cn(
                      'px-4 py-2 rounded-xl font-bold text-sm text-center w-full md:w-auto uppercase tracking-wider',
                      app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                      app.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {app.status}
                    </div>
                  )}
                </div>

              </div>

              {/* Cover Note & Expand Toggle */}
              <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {app.cover_note ? (
                  <div className="flex items-start gap-2 text-sm text-gray-600 flex-1">
                    <FileText className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <p className="leading-relaxed italic">"{app.cover_note}"</p>
                  </div>
                ) : <div className="flex-1" />}
                
                <button
                  onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                  className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors shrink-0"
                >
                  {expandedApp === app.id ? (
                    <>Hide Full Profile <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>View Full Profile <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              {/* Expanded Profile Details */}
              {expandedApp === app.id && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 animate-fade-in bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  {/* Bio */}
                  {app.bio && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" /> About
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{app.bio}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Roles & Specialties */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" /> Credentials & Specialties
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1.5">Roles/Licenses:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[app.license_type, ...(app.extra_licenses || [])].filter(Boolean).map((r, i) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        {app.specialties && app.specialties.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1.5">Specialties:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {app.specialties.map((s: string) => (
                                <span key={s} className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-bold">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Certifications
                      </h4>
                      <div className="space-y-2">
                        {app.certifications && (typeof app.certifications === 'string' ? JSON.parse(app.certifications) : app.certifications).length > 0 ? (
                          (typeof app.certifications === 'string' ? JSON.parse(app.certifications) : app.certifications).map((cert: any, i: number) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 shadow-sm">
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{cert.name}</p>
                                <p className="text-xs text-gray-500">Expires: {cert.expiry || 'Never'}</p>
                              </div>
                              {cert.docUrl && (
                                <a href={cert.docUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition-colors">
                                  <FileText className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No certifications listed.</p>
                        )}
                      </div>
                    </div>

                    {/* Work Experience */}
                    <div className="md:col-span-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Work Experience
                      </h4>
                      <div className="space-y-3">
                        {app.work_experience && (typeof app.work_experience === 'string' ? JSON.parse(app.work_experience) : app.work_experience).length > 0 ? (
                          (typeof app.work_experience === 'string' ? JSON.parse(app.work_experience) : app.work_experience).map((we: any, i: number) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                              <h5 className="font-bold text-gray-900">{we.role}</h5>
                              <p className="text-sm text-gray-600 font-medium mb-2">{we.facility} • {we.startDate} to {we.endDate || 'Present'}</p>
                              {we.description && <p className="text-sm text-gray-600">{we.description}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No work experience listed.</p>
                        )}
                      </div>
                    </div>

                    {/* Background Check */}
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          app.background_check_status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                          app.background_check_status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
                        )}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Background Check</p>
                          <p className="text-xs font-medium text-gray-500">
                            {app.background_check_status === 'approved' ? 'Verified clear by TruliCares' :
                             app.background_check_status === 'pending' ? 'Verification in progress' : 'Not submitted'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
