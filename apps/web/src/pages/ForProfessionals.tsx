import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Wallet, CalendarCheck, BadgeCheck,
  ArrowRight, CheckCircle, Search, ShieldCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Seo from '@/components/Seo';

const benefits = [
  { icon: <Wallet className="w-7 h-7" />, title: 'Fast Wallet Payouts', desc: 'Get paid quickly after every completed shift — funds land in your TruliCares wallet, ready to withdraw.', gradient: 'from-emerald-500 to-teal-600' },
  { icon: <CalendarCheck className="w-7 h-7" />, title: 'Work On Your Terms', desc: 'Pick the shifts that fit your life — per-diem, part-time, or full schedules at facilities near you.', gradient: 'from-blue-500 to-indigo-600' },
  { icon: <BadgeCheck className="w-7 h-7" />, title: 'Verify Once, Apply Anywhere', desc: 'Complete credential and background verification a single time, then apply to any shift instantly.', gradient: 'from-violet-500 to-purple-600' },
  { icon: <ShieldCheck className="w-7 h-7" />, title: 'Guaranteed, Protected Pay', desc: 'Every shift is escrow-backed before you start, so the pay you see is the pay you get.', gradient: 'from-amber-500 to-orange-600' },
];

const steps = [
  { n: '01', icon: <BadgeCheck className="w-6 h-6" />, title: 'Create Your Profile', desc: 'Add your license, specialties, and experience. Setup takes just a few minutes.' },
  { n: '02', icon: <ShieldCheck className="w-6 h-6" />, title: 'Get Verified', desc: 'We confirm your credentials and run your background check so facilities can hire with confidence.' },
  { n: '03', icon: <Search className="w-6 h-6" />, title: 'Browse & Book Shifts', desc: 'Find open shifts near you, apply in a tap, and get confirmed. Then clock in and get paid.' },
];

const roles = ['Registered Nurse (RN)', 'Licensed Practical Nurse (LPN)', 'Certified Nursing Assistant (CNA)', 'Nurse Practitioner (NP)', 'Physical Therapist (PT)', 'Occupational Therapist (OT)'];

export default function ForProfessionals() {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Per-Diem & Travel Healthcare Shifts for Professionals | TruliCares"
        description="Nurses and allied health professionals: find per-diem and travel shifts that fit your schedule. Verify once, apply anywhere, and get fast escrow-protected payouts."
        path="/for-professionals"
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-brand-900 to-brand-950" />
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold mb-6 border border-white/15">
            <Stethoscope className="w-4 h-4" /> For Healthcare Professionals
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight max-w-4xl mx-auto">
            Shifts that fit{' '}
            <span className="bg-gradient-to-r from-blue-300 to-brand-300 bg-clip-text text-transparent">
              your life.
            </span>
          </h1>
          <p className="text-lg text-brand-100/90 mb-9 max-w-2xl mx-auto leading-relaxed">
            Browse per-diem and travel shifts at verified facilities near you. Set your availability,
            apply in a tap, and get paid fast — with your pay protected in escrow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="xl" icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/professional-onboarding')}
              className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] border-0">
              Find Per-Diem Shifts
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/for-facilities')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              I Run a Facility
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-sm text-brand-200/80">
            {[['Clock', 'Flexible scheduling'], ['Wallet', 'Fast payouts'], ['MapPin', 'Shifts near you']].map(([, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-brand-300" /> {label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-4">Why professionals choose us</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Built around your schedule and your pay</h2>
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Start earning in three steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="relative bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
                <span className="absolute top-6 right-7 text-5xl font-black text-gray-100">{s.n}</span>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Roles */}
          <div className="mt-14 bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Roles we staff</h3>
            <p className="text-sm text-gray-500 mb-6">Licensed and certified healthcare professionals across disciplines.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {roles.map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">Your next shift is waiting</h2>
          <p className="text-lg text-brand-200 mb-9 max-w-2xl mx-auto">Create your profile, get verified once, and start booking shifts that work for you.</p>
          <Button variant="primary" size="xl" icon={<ArrowRight className="w-5 h-5" />}
            onClick={() => navigate('/professional-onboarding')}
            className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] border-0">
            Create Your Free Profile
          </Button>
        </div>
      </section>
    </>
  );
}
