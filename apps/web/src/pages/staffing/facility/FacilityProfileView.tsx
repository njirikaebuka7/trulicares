import { useState, useEffect } from 'react';
import { 
  Building2, Globe, FileText, MapPin, 
  Shield, CheckCircle, Clock, Save, Edit3, 
  X, Loader2, Briefcase, Info
} from 'lucide-react';
import { facility as facApi } from '@/lib/staffingApi';
import { FacilityProfile } from '@/types/staffing';
import { useFacilityDashboard } from './FacilityDashboardContext';

const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'nursing_home', label: 'Nursing Home' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'rehab_center', label: 'Rehab Center' },
  { value: 'home_health', label: 'Home Health Agency' },
  { value: 'other', label: 'Other' },
];

export default function FacilityProfileView() {
  const { refresh: refreshDashboard } = useFacilityDashboard();
  const [profile, setProfile] = useState<FacilityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({
    facilityName: '',
    facilityType: '',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    contactName: '',
    contactTitle: '',
    website: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await facApi.me();
      setProfile(data);
      setForm({
        facilityName: data.facility_name || '',
        facilityType: data.facility_type || '',
        ein: data.ein || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        phone: data.phone || '',
        contactName: data.contact_name || '',
        contactTitle: data.contact_title || '',
        website: data.website || '',
      });
    } catch (err) {
      console.error('Failed to load facility profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await facApi.updateProfile(form);
      setProfile(updated);
      setEditing(false);
      await refreshDashboard();
      alert('Facility profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update facility profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Fetching facility records...</p>
      </div>
    );
  }

  const currentTypeLabel = FACILITY_TYPES.find(t => t.value === profile?.facility_type)?.label || profile?.facility_type || 'Facility';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header / Basic Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-emerald-600 to-teal-700" />
        <div className="px-6 pb-6">
          <div className="relative flex flex-col md:flex-row items-end gap-6 -mt-12 mb-6">
            <div className="w-32 h-32 rounded-xl bg-white p-1.5 shadow-md shrink-0">
              <div className="w-full h-full rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={profile.facility_name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-14 h-14" />
                )}
              </div>
            </div>
            
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{profile?.facility_name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-lg text-sm">
                  <Building2 className="w-4 h-4" /> {currentTypeLabel}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-lg text-sm border border-gray-100">
                  <MapPin className="w-4 h-4" /> {profile?.city}, {profile?.state}
                </span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                  profile?.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {profile?.verification_status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {profile?.verification_status?.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              {editing ? (
                <>
                  <button 
                    onClick={() => setEditing(false)} 
                    className="px-5 py-2 border border-gray-200 text-gray-600 font-semibold rounded-full hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95 text-sm"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button 
                    onClick={handleSave} 
                    className="px-5 py-2 bg-brand-600 text-white font-semibold rounded-full hover:bg-brand-700 transition-all flex items-center gap-2 active:scale-95 text-sm shadow-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setEditing(true)} 
                  className="px-5 py-2 bg-gray-900 text-white font-semibold rounded-full hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95 text-sm shadow-sm"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form / Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main profile form card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <Building2 className="w-5 h-5 text-brand-600" /> Operational Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Facility Name</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.facilityName}
                    onChange={(e) => setForm({ ...form, facilityName: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.facility_name || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Facility Type</label>
                {editing ? (
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.facilityType}
                    onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                  >
                    {FACILITY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{currentTypeLabel}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">EIN (Employer ID Number)</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.ein}
                    onChange={(e) => setForm({ ...form, ein: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.ein || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Business Phone</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 10) val = val.slice(0, 10);
                      let formatted = val;
                      if (val.length > 0) {
                        if (val.length <= 3) formatted = `(${val}`;
                        else if (val.length <= 6) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                        else formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                      }
                      setForm({ ...form, phone: formatted });
                    }}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.phone || 'N/A'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Street Address</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.address || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">City</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.city || 'N/A'}</p>
                )}
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">State</label>
                    {editing ? (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all text-center uppercase"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        maxLength={2}
                      />
                    ) : (
                      <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl text-center">{profile?.state || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">ZIP Code</label>
                    {editing ? (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all text-center"
                        value={form.zip}
                        onChange={(e) => setForm({ ...form, zip: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl text-center">{profile?.zip || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Website URL</label>
                {editing ? (
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50/50 rounded-xl flex items-center justify-between">
                    <p className="text-gray-800 text-sm font-bold truncate">{profile?.website || 'N/A'}</p>
                    {profile?.website && (
                      <a href={profile.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Person Details */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <Briefcase className="w-5 h-5 text-brand-600" /> Primary Contact Person
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Contact Name</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.contact_name || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Contact Title</label>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl text-sm font-medium outline-none transition-all"
                    value={form.contactTitle}
                    onChange={(e) => setForm({ ...form, contactTitle: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 text-sm font-bold p-3 bg-gray-50/50 rounded-xl">{profile?.contact_title || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Status & Helpful Widget */}
        <div className="space-y-6">
          
          {/* Account Status / Security Verification */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <Shield className="w-5 h-5 text-brand-600" /> Trust & Compliance
            </h3>
            
            <div className="space-y-3">
              {[
                { label: 'Business verification', status: profile?.verification_status === 'approved' ? 'Approved' : 'Under Review', desc: 'Regulatory review of healthcare facility status.' },
                { label: 'EIN validation', status: profile?.ein ? 'Verified' : 'Required', desc: 'Validates federal employment tax identification.' },
                { label: 'Staffing capability', status: 'Active', desc: 'Permission to post shifts to local professionals.' }
              ].map((item, i) => (
                <div key={i} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-4">
                  <div className="mt-1">
                    {item.status === 'Approved' || item.status === 'Verified' || item.status === 'Active' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner animate-pulse">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        item.status === 'Approved' || item.status === 'Verified' || item.status === 'Active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-brand-50 border border-brand-100 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-700 font-medium leading-relaxed">
                Need to change your EIN or Facility Name? Please contact our compliance desk directly at compliance@trulicares.com.
              </p>
            </div>
          </div>

          {/* Verification Statistics and Premium info */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] -mr-10 -mt-10" />
            <h4 className="text-base font-bold tracking-tight mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-300" /> Facility Profile Grade
            </h4>
            <div className="space-y-4 relative">
              <div>
                <div className="flex justify-between text-xs font-semibold text-emerald-100 mb-1.5 uppercase tracking-wider">
                  <span>Profile Strength</span>
                  <span>100%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-full rounded-full" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-100 font-semibold leading-relaxed opacity-90">
                Awesome! Your business details are fully completed. Verified professionals see detailed profiles and are 75% more likely to apply for your shifts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
