import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import RoleSelectionModal from '@/components/staffing/RoleSelectionModal';
import heroBg from '@/assets/hero-bg.jpg';

export default function HeroSection() {
  const navigate = useNavigate();
  const [showRoleModal, setShowRoleModal] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Family caregiving scene"
            className="w-full h-full object-cover"
          />
          {/* Multi-layer overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-950/80 via-brand-950/65 to-brand-950/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/40 via-transparent to-brand-950/40" />
        </div>

        {/* Content — fully centered */}
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-8 animate-fade-in-up">
            <Shield className="w-4 h-4 text-brand-300" />
            <span className="text-sm text-brand-100 font-medium">Trusted by 10,000+ families</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Find care you can{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-brand-300 via-warm-300 to-coral-400 bg-clip-text text-transparent">
                truly trust
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="url(#underline-grad)" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="underline-grad" x1="0" y1="0" x2="200" y2="0">
                    <stop offset="0%" stopColor="#85c2a6" />
                    <stop offset="100%" stopColor="#ff8566" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{' '}
            near you.
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-brand-100/90 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Thoughtful matching with verified caregivers for child care, senior care, adult care, and cleaning — plus on-demand staffing that connects healthcare facilities with licensed professionals. All in one trusted platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button
              variant="primary"
              size="xl"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/find-care')}
              className="text-base bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] shadow-[#e2fcd6]/30 hover:shadow-[#d0f5bf]/40 border-0"
            >
              Find Care
            </Button>
            <Button
              variant="secondary"
              size="xl"
              onClick={() => setShowRoleModal(true)}
              className="text-base bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
            >
              Provide Care
            </Button>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute -bottom-px left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full block">
            <path d="M0 40 C360 80, 720 0, 1080 40 C1260 60, 1380 50, 1440 40 L1440 80 L0 80 Z" fill="white" />
          </svg>
        </div>
      </section>

      <RoleSelectionModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} />
    </>
  );
}
