import { Link } from 'react-router-dom';
import { Building2, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';

const cards = [
  {
    icon: <Building2 className="w-7 h-7" />,
    eyebrow: 'For Facilities',
    title: 'Staff your shifts, on demand',
    desc: 'Hospitals, clinics, and care homes post open shifts and hire verified, licensed professionals — with escrow-protected payments.',
    cta: 'Staff Your Facility',
    to: '/for-facilities',
    accent: 'from-violet-500 to-purple-600',
    ctaColor: 'text-violet-300',
  },
  {
    icon: <Stethoscope className="w-7 h-7" />,
    eyebrow: 'For Professionals',
    title: 'Find shifts that fit your life',
    desc: 'Nurses and allied pros browse per-diem and travel shifts near them, verify once, and get fast, protected payouts.',
    cta: 'Find Per-Diem Shifts',
    to: '/for-professionals',
    accent: 'from-blue-500 to-indigo-600',
    ctaColor: 'text-blue-300',
  },
];

export default function HealthcareStaffing() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Dark gradient background (matches Trust & Safety) */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-brand-950 to-gray-900" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-brand-300 text-sm font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" /> Healthcare Staffing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            More than home care.
            <br className="hidden lg:block" />{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">
              On-demand medical staffing.
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            TruliCares connects healthcare facilities with verified nursing and allied professionals for per-diem and travel shifts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group glass rounded-3xl p-8 hover:bg-white/15 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br text-white ${c.accent} group-hover:scale-110 transition-transform duration-300`}>
                {c.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{c.eyebrow}</span>
              <h3 className="text-xl font-bold text-white mt-1 mb-2 group-hover:text-brand-300 transition-colors">{c.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{c.desc}</p>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${c.ctaColor} group-hover:gap-2.5 transition-all`}>
                {c.cta} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
