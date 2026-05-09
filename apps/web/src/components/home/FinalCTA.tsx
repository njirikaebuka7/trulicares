import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Bell, Star, MapPin, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import logoImg from '@/assets/logo.png';

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
      <div className="absolute inset-0">
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Start with Trust.{' '}
              <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">
                Start with TruliCares.
              </span>
            </h2>
            <p className="text-lg text-brand-200 mb-3 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Join thousands of families and caregivers who trust TruliCares for meaningful care connections.
            </p>
            <p className="inline-flex items-center gap-2 text-brand-300 text-sm font-medium mb-8">
              <Clock className="w-4 h-4" />
              Get matched in minutes
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="primary"
                size="xl"
                icon={<ArrowRight className="w-5 h-5" />}
                onClick={() => navigate('/find-care')}
                className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] shadow-[#e2fcd6]/30 hover:shadow-[#d0f5bf]/40 border-0"
              >
                Find Care
              </Button>
              <Button
                variant="secondary"
                size="xl"
                onClick={() => navigate('/provide-care')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                Provide Care
              </Button>
            </div>
          </div>

          {/* Right - Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-72 sm:w-80">
              {/* Phone frame */}
              <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl shadow-black/40 border border-gray-700">
                <div className="bg-white rounded-[2rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-brand-700 px-5 pt-4 pb-3">
                    <div className="flex items-center justify-between text-white text-xs mb-3">
                      <span className="font-medium">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white/60 rounded-sm" />
                        <div className="w-4 h-2 bg-white/80 rounded-sm" />
                        <div className="w-6 h-2 bg-white rounded-sm" />
                      </div>
                    </div>
                    {/* Logo in phone header */}
                    <div className="flex items-center justify-between">
                      <img
                        src={logoImg}
                        alt="TruliCares"
                        className="h-6 w-auto brightness-0 invert"
                      />
                      <div className="flex gap-3 mt-1">
                        <div className="px-3 py-1 bg-white text-brand-700 rounded-full text-[10px] font-bold">Open (4)</div>
                        <div className="px-3 py-1 bg-white/20 text-white rounded-full text-[10px] font-medium">Closed (12)</div>
                      </div>
                    </div>
                  </div>

                  {/* Notification */}
                  <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-600" />
                    <span className="text-xs text-brand-700 font-medium">3 new applicants for your jobs</span>
                  </div>

                  {/* Job cards */}
                  <div className="p-4 space-y-3">
                    {[
                      { title: 'Child Care Needed', budget: '$18-25/hr', loc: 'Brooklyn, NY', applicants: 3, color: 'bg-pink-100 text-pink-700' },
                      { title: 'Senior Companion', budget: '$20-30/hr', loc: 'Manhattan, NY', applicants: 2, color: 'bg-brand-100 text-brand-700' },
                      { title: 'House Cleaning', budget: '$25-40/hr', loc: 'Queens, NY', applicants: 5, color: 'bg-warm-100 text-warm-700' },
                    ].map((job, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${job.color}`}>
                            {job.applicants} applied
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <BriefcaseBusiness className="w-3 h-3" /> {job.budget}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {job.loc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Caregiver profiles */}
                  <div className="px-4 pb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Top Applicants</p>
                    <div className="flex gap-3">
                      {[
                        { initials: 'SJ', bg: 'bg-coral-400', rating: '4.9' },
                        { initials: 'MS', bg: 'bg-brand-400', rating: '4.8' },
                        { initials: 'JW', bg: 'bg-sky-400', rating: '4.7' },
                      ].map((p, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${p.bg} flex items-center justify-center text-white text-xs font-bold`}>
                            {p.initials}
                          </div>
                          <div className="flex items-center gap-0.5 mt-1">
                            <Star className="w-3 h-3 text-warm-400 fill-warm-400" />
                            <span className="text-[10px] font-bold text-gray-700">{p.rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
