import { useState, useEffect } from 'react';
import { 
  UserCircle, Stethoscope, FileText, MapPin, 
  Shield, CheckCircle, AlertCircle, Clock, 
  Upload, ExternalLink, ChevronRight, Edit3, 
  Save, X, Loader2
} from 'lucide-react';
import { professional as proApi } from '@/lib/staffingApi';
import { ProfessionalProfile } from '@/types/staffing';

export default function ProfessionalProfileView() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await proApi.me();
        setProfile(data);
        setForm({
          bio: data.bio || '',
          specialties: data.specialties || [],
          location: data.location || '',
          preferredRadiusMiles: data.preferred_radius_miles || 25,
        });
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await proApi.updateProfile(form);
      setProfile(updated);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Fetching your credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header / Basic Info */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-emerald-700" />
        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-end gap-6 -mt-12 mb-6">
            <div className="w-32 h-32 rounded-[2rem] bg-white p-1.5 shadow-xl">
              <div className="w-full h-full rounded-[1.75rem] bg-brand-50 flex items-center justify-center text-brand-600 overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-16 h-16" />
                )}
              </div>
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-3xl font-bold text-gray-900">{profile?.name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-xl text-sm">
                  <Stethoscope className="w-4 h-4" /> {profile?.license_type}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-xl text-sm border border-gray-100">
                  <MapPin className="w-4 h-4" /> {profile?.location}
                </span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  profile?.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {profile?.verification_status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {profile?.verification_status}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="px-6 py-3 border-2 border-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center gap-2">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button onClick={handleSave} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-100">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-200">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio Section */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-600" /> Professional Summary
            </h3>
            {editing ? (
              <textarea 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 rounded-3xl text-sm font-medium resize-none outline-none transition-all"
                rows={6}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Write a brief professional bio..."
              />
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {profile?.bio || 'No professional summary provided yet.'}
              </p>
            )}
          </div>

          {/* Specialties & Skills */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Shield className="w-5 h-5 text-brand-600" /> Specialties & Skills
            </h3>
            <div className="flex flex-wrap gap-3">
              {profile?.specialties.map((s, i) => (
                <div key={i} className="px-4 py-2 bg-brand-50 text-brand-700 rounded-2xl text-sm font-bold border border-brand-100 shadow-sm">
                  {s}
                </div>
              ))}
              {editing && (
                <button className="px-4 py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl text-sm font-bold hover:border-brand-300 hover:text-brand-500 transition-all flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Add Specialty
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Docs */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Shield className="w-5 h-5 text-brand-600" /> Verification Documents
            </h3>
            <div className="space-y-4">
              {[
                { label: 'State Nursing License', status: profile?.verification_status === 'approved' ? 'Verified' : 'Pending', icon: Stethoscope },
                { label: 'Background Check', status: profile?.background_check_status === 'approved' ? 'Verified' : 'Not Started', icon: Shield },
                { label: 'Certification Docs', status: 'Pending', icon: FileText },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-brand-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 group-hover:text-brand-600 shadow-sm transition-colors">
                      <doc.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{doc.label}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${doc.status === 'Verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{doc.status}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-brand-50 text-gray-300 hover:text-brand-600 rounded-lg transition-all">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-brand-50 border border-brand-100 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-700 font-medium leading-relaxed">Keeping your credentials updated ensures you never miss out on shift opportunities.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 text-white shadow-xl">
            <h4 className="text-lg font-bold mb-4">Verification Statistics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
                  <span>Profile Strength</span>
                  <span>85%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Add a professional photo and certifications to reach 100% and get priority shift matching.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  );
}
