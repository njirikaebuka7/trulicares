import { useState, useRef } from 'react';
import {
  Download, Printer, Shield, MapPin, Mail,
  Award, Briefcase, Star, CheckCircle, Clock, User, ArrowLeft, Languages
} from 'lucide-react';
import logoImg from '@/assets/logo.png';

interface CaregiverResumeGeneratorProps {
  user: any;
  profile: {
    photoUrl: string | null;
    jobTitle: string;
    location: string;
    yearsExperience: number;
    bio: string;
    specialties: string[];
    certifications: any[];
    availability: string;
    languages: string;
    idVerificationStatus?: string;
    backgroundCheckStatus?: string;
  };
  onBack: () => void;
}

export default function CaregiverResumeGenerator({ user, profile, onBack }: CaregiverResumeGeneratorProps) {
  const [printing, setPrinting] = useState(false);
  const [resumeStyle, setResumeStyle] = useState<'professional' | 'modern' | 'minimal'>('professional');
  const resumeRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 500);
  };

  const isVerified = profile.idVerificationStatus === 'passed' || profile.backgroundCheckStatus === 'passed' || profile.backgroundCheckStatus === 'approved';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Resume Generator</h2>
            <p className="text-gray-500 text-sm mt-0.5 font-medium">Generate a professional resume based on your TruliCares profile.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Style Picker */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            {(['professional', 'modern', 'minimal'] as const).map(s => (
              <button
                key={s}
                onClick={() => setResumeStyle(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  resumeStyle === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95 shadow-sm text-sm"
              title="Print"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-full hover:bg-brand-700 transition-all active:scale-95 shadow-sm text-sm"
              title="Save PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div
        ref={resumeRef}
        className={`bg-white shadow-md rounded-2xl overflow-hidden print:shadow-none print:rounded-none ${
          resumeStyle === 'minimal' ? 'border border-gray-200' : ''
        }`}
        id="resume-printable"
      >
        {/* Header */}
        {resumeStyle === 'professional' && (
          <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 px-10 py-8 text-white">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-3xl font-bold text-white overflow-hidden flex-shrink-0">
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt={user?.name} className="w-full h-full object-cover" />
                    : (user?.name?.charAt(0) || 'C')
                  }
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">{user?.name || 'Caregiver'}</h1>
                  <p className="text-brand-300 font-semibold text-lg">{profile.jobTitle || 'Professional Caregiver'}</p>
                  <div className="flex items-center gap-4 mt-2 text-brand-200 text-sm font-medium">
                    {profile.location && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {profile.location}</span>
                    )}
                    {user?.email && (
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-70" />
                <span className="text-xs text-brand-400 font-medium">{isVerified ? 'TruliCares Verified Caregiver' : 'TruliCares Caregiver'}</span>
                <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {profile.yearsExperience > 1 ? `${profile.yearsExperience}+ Years Experience` : '< 1 Year Experience'}
                </div>
              </div>
            </div>
          </div>
        )}

        {resumeStyle === 'modern' && (
          <div className="bg-gray-900 px-10 py-8 text-white flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {profile.photoUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20 flex-shrink-0">
                  <img src={profile.photoUrl} alt={user?.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-1">Professional Caregiver</p>
                <h1 className="text-3xl font-bold text-white">{user?.name || 'Caregiver'}</h1>
                <p className="text-emerald-400 font-bold mt-1 text-lg">{profile.jobTitle || 'Caregiver'}</p>
              </div>
            </div>
            <div className="text-right text-gray-400 text-sm space-y-1 font-medium">
              {user?.email && <p className="flex items-center justify-end gap-2"><Mail className="w-3.5 h-3.5" /> {user.email}</p>}
              {profile.location && <p className="flex items-center justify-end gap-2"><MapPin className="w-3.5 h-3.5" /> {profile.location}</p>}
              {isVerified && (
                <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-bold mt-2">
                  <Shield className="w-4 h-4" /> TruliCares Verified
                </div>
              )}
            </div>
          </div>
        )}

        {resumeStyle === 'minimal' && (
          <div className="px-10 py-8 border-b-2 border-gray-900">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user?.name || 'Caregiver'}</h1>
                <p className="text-gray-500 font-semibold mt-1">{profile.jobTitle || 'Caregiver'} · {profile.location}</p>
              </div>
              <div className="text-right text-sm text-gray-500 space-y-0.5 font-medium">
                <p>{user?.email}</p>
                {isVerified && (
                  <p className="text-brand-600 font-bold flex items-center justify-end gap-1.5"><Shield className="w-3.5 h-3.5" /> TruliCares Verified</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resume Body */}
        <div className="px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Professional Summary */}
            {profile.bio && (
              <section>
                <SectionTitle style={resumeStyle} icon={<User className="w-4 h-4" />} title="Professional Summary" />
                <p className="text-gray-600 leading-relaxed text-sm mt-3 font-medium">{profile.bio}</p>
              </section>
            )}

            {/* Specialties */}
            {profile.specialties.length > 0 && (
              <section>
                <SectionTitle style={resumeStyle} icon={<Star className="w-4 h-4" />} title="Specialties & Care Focus" />
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.specialties.map((sp: string, i: number) => (
                    <span key={i} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                      resumeStyle === 'professional' ? 'bg-brand-50 text-brand-700 border border-brand-100' :
                      resumeStyle === 'modern' ? 'bg-gray-100 text-gray-800' :
                      'border border-gray-300 text-gray-700'
                    }`}>
                      {sp}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Experience */}
            <section>
              <SectionTitle style={resumeStyle} icon={<Briefcase className="w-4 h-4" />} title="Caregiving Experience" />
              <div className="mt-4 border-l-2 border-brand-200 pl-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900">{profile.jobTitle || 'Caregiver'}</h4>
                    <span className="text-xs text-gray-400 font-medium">
                      {profile.yearsExperience > 0 ? `${profile.yearsExperience}+ years` : 'Entry Level'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">TruliCares Network</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 font-medium">
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Providing compassionate, individualized care based on family needs</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Maintaining a safe and healthy environment for care recipients</li>
                    {profile.specialties.length > 0 && (
                      <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Specialized in: {profile.specialties.slice(0, 3).join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">

            {/* Certifications */}
            <section>
              <SectionTitle style={resumeStyle} icon={<Award className="w-4 h-4" />} title="Certifications" />
              <div className="mt-3 space-y-3">
                {profile.certifications.length > 0 ? profile.certifications.map((cert: any, i: number) => (
                  <div key={i} className={`p-3 rounded-xl border ${
                    resumeStyle === 'professional' ? 'bg-brand-50 border-brand-100' :
                    resumeStyle === 'modern' ? 'bg-gray-50 border-gray-200' :
                    'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold text-gray-900 text-sm">{cert.name}</span>
                    </div>
                    {cert.issuedBy && <p className="text-xs text-gray-500 font-medium">Issuer: {cert.issuedBy}</p>}
                    {cert.year && <p className="text-xs text-gray-500 font-medium">Year: {cert.year}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-bold">Verified</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 font-medium italic">No active certifications listed.</p>
                )}
              </div>
            </section>

            {/* Availability */}
            <section>
              <SectionTitle style={resumeStyle} icon={<Clock className="w-4 h-4" />} title="Availability & Location" />
              <div className="mt-3 space-y-2 text-sm text-gray-600 font-medium">
                <div className="flex items-center justify-between">
                  <span>Schedule</span>
                  <span className="font-bold text-gray-900 capitalize">{profile.availability}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Location</span>
                  <span className="font-bold text-gray-900">{profile.location || 'On request'}</span>
                </div>
              </div>
            </section>

            {/* Languages */}
            {profile.languages && (
              <section>
                <SectionTitle style={resumeStyle} icon={<Languages className="w-4 h-4" />} title="Languages" />
                <div className="mt-3 text-sm text-gray-900 font-bold">
                  {profile.languages}
                </div>
              </section>
            )}

            {/* TruliCares Badge */}
            <div className={`p-4 rounded-xl text-center ${
              resumeStyle === 'professional' ? 'bg-brand-900 text-white' :
              resumeStyle === 'modern' ? 'bg-gray-900 text-white' :
              'border-2 border-gray-900'
            }`}>
              <img src={logoImg} alt="TruliCares" className="h-6 w-auto mx-auto mb-2 brightness-0 invert" />
              <p className="text-xs font-bold opacity-80">{isVerified ? 'Verified via TruliCares' : 'Member of TruliCares'}</p>
              <p className="text-[10px] opacity-50 mt-0.5">trulicares.com</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
          <span>Generated by TruliCares · trulicares.com</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-printable, #resume-printable * { visibility: visible; }
          #resume-printable { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ title, icon, style }: { title: string; icon: React.ReactNode; style: string }) {
  if (style === 'professional') {
    return (
      <div className="flex items-center gap-2 border-b-2 border-brand-100 pb-2">
        <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600">{icon}</div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">{title}</h3>
      </div>
    );
  }
  if (style === 'modern') {
    return (
      <div className="flex items-center gap-2">
        <div className="text-gray-400">{icon}</div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">{title}</h3>
        <div className="flex-1 h-px bg-gray-200 ml-2" />
      </div>
    );
  }
  return (
    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider border-b border-gray-300 pb-1">{title}</h3>
  );
}
