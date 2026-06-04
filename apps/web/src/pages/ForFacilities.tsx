import { useNavigate } from 'react-router-dom';
import {
  Building2, ShieldCheck, Clock, Wallet, BadgeCheck, CalendarCheck,
  ArrowRight, CheckCircle, Users, Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Seo from '@/components/Seo';

const benefits = [
  { icon: <BadgeCheck className="w-7 h-7" />, title: 'Verified Professionals Only', desc: 'Every RN, LPN, CNA, and allied pro is license- and background-checked before they can apply to your shifts.', gradient: 'from-blue-500 to-indigo-600' },
  { icon: <Clock className="w-7 h-7" />, title: 'Fill Shifts Fast', desc: 'Post an open shift and reach a pool of available, credentialed professionals in your area within minutes.', gradient: 'from-violet-500 to-purple-600' },
  { icon: <ShieldCheck className="w-7 h-7" />, title: 'Escrow-Protected Payments', desc: 'Funds are held in escrow and only released after the shift is completed and confirmed. No surprises.', gradient: 'from-emerald-500 to-teal-600' },
  { icon: <Wallet className="w-7 h-7" />, title: 'Transparent, Flat Pricing', desc: 'A clear platform fee on each booking — no agency markups, no long-term contracts, no hidden costs.', gradient: 'from-amber-500 to-orange-600' },
];

const steps = [
  { n: '01', icon: <CalendarCheck className="w-6 h-6" />, title: 'Post a Shift', desc: 'Set the role, date, hours, and pay rate. Posting takes under two minutes.' },
  { n: '02', icon: <Users className="w-6 h-6" />, title: 'Review Verified Applicants', desc: 'Browse credentialed professionals who applied, with ratings, licenses, and experience at a glance.' },
  { n: '03', icon: <Zap className="w-6 h-6" />, title: 'Confirm & Pay Securely', desc: 'Book your pick, funds go into escrow, and you release payment once the shift is done.' },
];

const stats = [
  { value: 'RN · LPN · CNA', label: 'Credentialed roles' },
  { value: 'Minutes', label: 'To post a shift' },
  { value: 'Escrow', label: 'Protected payments' },
  { value: '24/7', label: 'Shift posting' },
];

export default function ForFacilities() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Healthcare Staffing for Facilities | TruliCares"
        description="Post shifts and hire verified, licensed healthcare professionals (RN, LPN, CNA & more) on demand. Escrow-protected payments, transparent pricing, no long-term contracts."
        path="/for-facilities"
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-brand-900 to-brand-950" />
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold mb-6 border border-white/15">
            <Building2 className="w-4 h-4" /> For Healthcare Facilities
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight max-w-4xl mx-auto">
            On-demand staffing,{' '}
            <span className="bg-gradient-to-r from-violet-300 to-brand-300 bg-clip-text text-transparent">
              verified and ready.
            </span>
          </h1>
          <p className="text-lg text-brand-100/90 mb-9 max-w-2xl mx-auto leading-relaxed">
            Post open shifts and hire licensed nurses and allied professionals near you — credential-checked,
            escrow-protected, and without agency markups.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="xl" icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/facility-onboarding')}
              className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] border-0">
              Staff Your Facility
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/contact')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Talk to Our Team
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-brand-200/80 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-semibold mb-4">Why facilities choose us</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Staffing without the agency headache</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="group p-6 rounded-3xl border-2 border-gray-100 bg-white hover:border-transparent hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br text-white ${b.gradient} group-hover:scale-110 transition-transform duration-300`}>
                  {b.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">How it works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">From open shift to filled in three steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="relative bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
                <span className="absolute top-6 right-7 text-5xl font-black text-gray-100">{s.n}</span>
                <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-5">{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">Ready to fill your next shift?</h2>
          <p className="text-lg text-brand-200 mb-9 max-w-2xl mx-auto">Set up your facility in minutes and post your first shift today — no contracts, no commitment.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="xl" icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/facility-onboarding')}
              className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] border-0">
              Get Started Free
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/for-professionals')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              I'm a Professional
            </Button>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-sm text-brand-200/80">
            {['No setup fees', 'Verified professionals', 'Escrow-protected'].map((f) => (
              <li key={f} className="inline-flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-brand-300" /> {f}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
