import { ClipboardList, Users, MessageCircle, Briefcase, UserPlus, Handshake } from 'lucide-react';
import { cn } from '@/utils/cn';

const familySteps = [
  { icon: <ClipboardList className="w-6 h-6" />, title: 'Share Your Needs', desc: 'Answer a few quick questions about the care you need.' },
  { icon: <Users className="w-6 h-6" />, title: 'Get Matched', desc: 'We match you with verified caregivers near you.' },
  { icon: <MessageCircle className="w-6 h-6" />, title: 'Connect & Book', desc: 'Unlock messaging, verify identity, and start care.' },
];

const caregiverSteps = [
  { icon: <UserPlus className="w-6 h-6" />, title: 'Create Profile', desc: 'Sign up for free and build your caregiver profile.' },
  { icon: <Briefcase className="w-6 h-6" />, title: 'Receive Matches', desc: 'Get matched with families looking for your skills.' },
  { icon: <Handshake className="w-6 h-6" />, title: 'Get Hired', desc: 'Accept matches, connect, and start earning.' },
];

export default function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-brand-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Simple. Thoughtful.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">Secure.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Families path */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-coral-100 flex items-center justify-center">
                <span className="text-lg">👨‍👩‍👧</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">For Families</h3>
            </div>
            <div className="space-y-6">
              {familySteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center',
                      'bg-gradient-to-br from-coral-400 to-coral-600 text-white',
                      'shadow-lg shadow-coral-500/20'
                    )}>
                      {step.icon}
                    </div>
                    {i < familySteps.length - 1 && (
                      <div className="w-0.5 h-8 bg-coral-200 mx-auto mt-2" />
                    )}
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Caregivers path */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <span className="text-lg">💚</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">For Caregivers</h3>
            </div>
            <div className="space-y-6">
              {caregiverSteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center',
                      'bg-gradient-to-br from-brand-400 to-brand-700 text-white',
                      'shadow-lg shadow-brand-500/20'
                    )}>
                      {step.icon}
                    </div>
                    {i < caregiverSteps.length - 1 && (
                      <div className="w-0.5 h-8 bg-brand-200 mx-auto mt-2" />
                    )}
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
