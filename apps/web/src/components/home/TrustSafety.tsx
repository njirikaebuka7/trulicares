import { Shield, CheckCircle, Lock, Eye, UserCheck, FileCheck } from 'lucide-react';

const trustItems = [
  {
    icon: <UserCheck className="w-7 h-7" />,
    title: 'Identity Verification',
    desc: 'Every user undergoes identity verification before messaging is unlocked.',
    color: 'text-brand-400',
  },
  {
    icon: <FileCheck className="w-7 h-7" />,
    title: 'Background Checks',
    desc: 'Optional background checks available for caregivers to boost trust.',
    color: 'text-sky-400',
  },
  {
    icon: <Lock className="w-7 h-7" />,
    title: 'Secure Messaging',
    desc: 'End-to-end secure messaging only after payment and verification.',
    color: 'text-warm-400',
  },
  {
    icon: <Eye className="w-7 h-7" />,
    title: 'Fraud Monitoring',
    desc: 'Active monitoring systems protect against fraudulent activity 24/7.',
    color: 'text-coral-400',
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Verified Caregivers',
    desc: 'All caregivers are email and identity verified before receiving matches.',
    color: 'text-purple-400',
  },
  {
    icon: <CheckCircle className="w-7 h-7" />,
    title: 'Reviews & Reporting',
    desc: 'Transparent review system with dispute resolution and admin mediation.',
    color: 'text-green-400',
  },
];

export default function TrustSafety() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-brand-950 to-gray-900" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-brand-300 text-sm font-semibold mb-4">
            <Shield className="w-4 h-4" /> Trust & Safety
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Your Safety Comes{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">First</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            We've built multiple layers of protection so you can focus on finding the right care.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="glass rounded-3xl p-6 hover:bg-white/15 transition-all duration-300 group"
            >
              <div className={`mb-4 ${item.color}`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
