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
    iconBg: 'bg-violet-100 text-violet-600',
    ctaColor: 'text-violet-700',
  },
  {
    icon: <Stethoscope className="w-7 h-7" />,
    eyebrow: 'For Professionals',
    title: 'Find shifts that fit your life',
    desc: 'Nurses and allied pros browse per-diem and travel shifts near them, verify once, and get fast, protected payouts.',
    cta: 'Find Per-Diem Shifts',
    to: '/for-professionals',
    accent: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100 text-blue-600',
    ctaColor: 'text-blue-700',
  },
];

export default function HealthcareStaffing() {
  return (
    <section className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" /> Healthcare Staffing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            More than home care.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-coral-500 bg-clip-text text-transparent">
              On-demand medical staffing.
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            TruliCares connects healthcare facilities with verified nursing and allied professionals for per-diem and travel shifts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group relative overflow-hidden rounded-3xl border-2 border-gray-100 bg-white p-8 hover:border-transparent hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br text-white ${c.accent} group-hover:scale-110 transition-transform duration-300`}>
                {c.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{c.eyebrow}</span>
              <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{c.desc}</p>
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
