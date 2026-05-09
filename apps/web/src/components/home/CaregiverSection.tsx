import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, TrendingUp, Users, Star, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

const highlights = [
  { icon: <Calendar className="w-5 h-5" />, title: 'Flexible Opportunities', desc: 'Choose when and where you work' },
  { icon: <Users className="w-5 h-5" />, title: 'Direct Client Matches', desc: 'No bidding wars or competition' },
  { icon: <DollarSign className="w-5 h-5" />, title: 'Set Your Own Rates', desc: 'You decide what you\'re worth' },
  { icon: <TrendingUp className="w-5 h-5" />, title: 'Career Growth', desc: 'Build your reputation over time' },
];

export default function CaregiverSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-brand-50/20 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-brand-100 via-brand-50 to-warm-50 rounded-3xl p-8 lg:p-10">
              {/* Mock caregiver profile cards */}
              <div className="space-y-4">
                {[
                  { name: 'Sarah J.', role: 'Child Care Specialist', rate: '$18-25/hr', rating: 4.9, badge: true, initials: 'SJ', bg: 'bg-coral-400' },
                  { name: 'Maria S.', role: 'Senior Care Provider', rate: '$20-30/hr', rating: 4.8, badge: true, initials: 'MS', bg: 'bg-brand-400' },
                  { name: 'James W.', role: 'Adult Care Professional', rate: '$22-32/hr', rating: 4.7, badge: false, initials: 'JW', bg: 'bg-sky-400' },
                ].map((cg, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${cg.bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {cg.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{cg.name}</span>
                        {cg.badge && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{cg.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-warm-400 fill-warm-400" />
                        <span className="text-sm font-bold text-gray-900">{cg.rating}</span>
                      </div>
                      <p className="text-xs text-gray-500">{cg.rate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
              For Caregivers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Caregivers and Professionals Are at the{' '}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                Heart of What We Do
              </span>
            </h2>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              Join for free, receive direct matches, set your own rates, and build a rewarding career. No upfront costs — ever.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                    {h.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{h.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/provide-care')}
            >
              Start Earning Today
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
