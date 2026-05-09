import { Heart, Users, Shield, Target, Lightbulb, Handshake, CheckCircle, ArrowRight, Quote, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

const values = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Compassion at Our Core',
    desc: 'We believe every person deserves to be treated with dignity and kindness. Our platform is designed around empathy — connecting families who need help with caregivers who truly care.',
    gradient: 'from-coral-400 to-coral-600',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Uncompromising Trust & Safety',
    desc: 'From identity verification and background checks to secure messaging, every feature is built to protect both families and caregivers at every step of their journey.',
    gradient: 'from-brand-500 to-brand-700',
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: 'Innovation with Purpose',
    desc: 'We use smart, thoughtful matching — not just keyword search. Our algorithm considers location, budget, schedule, and specific care needs for better-fit connections.',
    gradient: 'from-warm-500 to-amber-600',
  },
  {
    icon: <Handshake className="w-6 h-6" />,
    title: 'Caregivers as Partners',
    desc: 'Caregivers join for free. They set their own rates, receive direct matches, and are never paywalled. We believe empowering caregivers leads to better care for everyone.',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Accessibility for All',
    desc: 'Families only pay when a caregiver accepts their match — no subscriptions, no wasted spend. We keep access friction low so more people can find the care they need.',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Stronger Communities',
    desc: 'Every match we make strengthens the fabric of a community. We are building a world where quality care is available, affordable, and built on lasting trust.',
    gradient: 'from-brand-400 to-brand-600',
  },
];

const timeline = [
  { year: '2021', title: 'The Idea', desc: 'Founded on the belief that finding trustworthy care should be simple, safe, and accessible to every family.' },
  { year: '2022', title: 'First Launch', desc: 'Launched in New York with 200 caregivers and 500 families. Refined our matching algorithm based on real user feedback.' },
  { year: '2023', title: 'Rapid Growth', desc: 'Expanded to 20+ cities, crossed 5,000 caregivers, and introduced background check verification badges.' },
  { year: '2024', title: 'Platform Evolution', desc: 'Added cleaning services, adult care, and an overhauled mobile-first experience with conversational questionnaires.' },
  { year: '2025', title: 'Trusted Nationwide', desc: '10,000+ families served across 50+ cities. Recognized as one of the most trusted care marketplaces in the industry.' },
];



export default function About() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      {/* ═══ HERO ═══ */}
      <section className="relative bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass text-brand-200 text-sm font-semibold mb-8">
            <Heart className="w-4 h-4" /> About TruliCares
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Redefining How Families{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">
              Find & Trust Care
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-brand-200 max-w-2xl mx-auto leading-relaxed">
            TruliCares is the care marketplace that puts trust first — connecting families with verified caregivers through thoughtful, intelligent matching for child care, senior care, adult care, and cleaning services.
          </p>
        </div>
      </section>

      {/* ═══ MISSION ═══ */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-5">
                Our Mission
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Making quality care accessible, safe, and deeply personal
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                TruliCares was born from a simple but powerful observation: finding trustworthy care is still too hard for families, and too many talented caregivers are undervalued. We set out to build a marketplace that solves both problems at once.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Unlike traditional care directories that leave families scrolling through endless profiles, TruliCares uses <strong>intelligent matching</strong> — analyzing care type, schedule, budget, location, and specific requirements to deliver the right caregiver, not just any caregiver.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                For caregivers, we eliminate the pay-to-play model. Registration is free, matches are direct, and professionals set their own rates. When caregivers are treated as partners, families receive better care. It's that simple.
              </p>
            </div>

            {/* Quote card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-brand-50 via-white to-warm-50 rounded-3xl p-8 lg:p-10 border border-brand-100">
                <Quote className="w-10 h-10 text-brand-200 mb-4" />
                <p className="text-xl lg:text-2xl text-gray-800 font-serif italic leading-relaxed mb-6">
                  "We don't just connect people — we create relationships built on trust, verification, and genuine compatibility. Every match we make is a step toward a more caring world."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-coral-400 flex items-center justify-center text-white font-bold">FO</div>
                  <div>
                    <h4 className="font-bold text-gray-900">Femi Oloyede</h4>
                    <p className="text-sm text-gray-500">Founder & CEO, TruliCares</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-100 rounded-2xl -z-10" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-coral-100 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-brand-950 to-gray-900" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-brand-300 text-sm font-semibold mb-4">
              <CheckCircle className="w-4 h-4" /> Our Values
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              The Principles That{' '}
              <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">Guide Us</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Every decision we make is measured against these values — from how we design features to how we treat our community.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <div key={i} className="glass rounded-3xl p-6 hover:bg-white/15 transition-all duration-300 group">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform', v.gradient)}>
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">{v.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW WE'RE DIFFERENT ═══ */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-coral-50 text-coral-600 text-sm font-semibold mb-4">
              What Sets Us Apart
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Families and Caregivers Choose TruliCares
            </h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Pay Only When Matched',
                desc: 'Unlike subscription-based platforms that charge upfront, TruliCares only charges families a small fee when a caregiver accepts their specific request. No wasted spend, no hidden costs.',
                icon: '💳',
              },
              {
                title: 'Caregivers Join Free — Always',
                desc: 'We never paywall caregivers. Free registration, free matching, free access. Caregivers can optionally invest in background check badges and profile boosts to stand out.',
                icon: '🤝',
              },
              {
                title: 'Intelligent, Not Random, Matching',
                desc: 'Our questionnaire-driven flow captures exact needs — schedule, budget, care type, special requirements — then matches families with caregivers who genuinely fit, not just who\'s available.',
                icon: '🎯',
              },
              {
                title: 'Verified Before Connected',
                desc: 'Both parties undergo identity verification before messaging is unlocked. Families verify after payment; caregivers verify upon registration. Trust is baked in from the start.',
                icon: '🛡️',
              },
              {
                title: 'Built for Real Life',
                desc: 'From one-time babysitting to live-in senior care to weekly house cleaning — we handle the full spectrum of care needs with flows designed for each specific category.',
                icon: '🏠',
              },
              {
                title: 'Direct Payments to Caregivers',
                desc: 'TruliCares never holds caregiver wages. Families pay caregivers directly for their services, ensuring faster payments and full earning transparency for care professionals.',
                icon: '💰',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border-2 border-gray-100 hover:border-brand-200 hover:shadow-xl transition-all duration-300 group">
                <span className="text-3xl block mb-4">{item.icon}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-brand-50/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
              <Clock className="w-4 h-4 inline mr-1" /> Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              From Vision to Trusted Platform
            </h2>
          </div>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-6">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-brand-500/20">
                    {item.year.slice(2)}
                  </div>
                  {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-brand-200 my-2" />}
                </div>
                {/* Content */}
                <div className="pb-10">
                  <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">{item.year}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ═══ CTA ═══ */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-coral-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/4 w-64 h-64 bg-brand-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Ready to Experience Care{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">Done Right?</span>
          </h2>
          <p className="text-lg text-brand-200 mb-10 max-w-xl mx-auto">
            Whether you need care or provide it — TruliCares is built for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="xl"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/find-care')}
              className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] shadow-[#e2fcd6]/30 border-0"
            >
              Find Care
            </Button>
            <Button
              variant="secondary"
              size="xl"
              onClick={() => navigate('/provide-care')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
            >
              Become a Caregiver
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
