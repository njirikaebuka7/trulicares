import { Target, CreditCard, Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

const reasons = [
  {
    icon: <Target className="w-7 h-7" />,
    title: 'Thoughtful Matching',
    desc: 'Not just listings — we match you based on needs, location, and preferences for the best fit.',
    gradient: 'from-brand-500 to-brand-700',
  },
  {
    icon: <CreditCard className="w-7 h-7" />,
    title: 'Pay Only When Matched',
    desc: 'Families only pay when a caregiver accepts their match. No subscriptions, no wasted spend.',
    gradient: 'from-coral-500 to-coral-700',
  },
  {
    icon: <Building2 className="w-7 h-7" />,
    title: 'Built for Homes & Facilities',
    desc: 'Whether you need care at home or manage a facility, our platform scales with you.',
    gradient: 'from-sky-500 to-blue-700',
  },
  {
    icon: <ShieldCheck className="w-7 h-7" />,
    title: 'Secure & Transparent',
    desc: 'ID verification, background checks, secure messaging — trust is built into every step.',
    gradient: 'from-warm-500 to-amber-700',
  },
];

export default function WhyChoose() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
            Why TruliCares
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Thoughtful Connections.{' '}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-brand-600 to-coral-500 bg-clip-text text-transparent">
              Stronger Communities.
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason, i) => (
            <div
              key={i}
              className="group p-6 rounded-3xl border-2 border-gray-100 bg-white hover:border-transparent hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
                'bg-gradient-to-br text-white',
                reason.gradient,
                'group-hover:scale-110 transition-transform duration-300'
              )}>
                {reason.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{reason.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{reason.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
