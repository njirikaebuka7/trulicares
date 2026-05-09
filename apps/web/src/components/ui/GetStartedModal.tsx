import { useNavigate } from 'react-router-dom';
import { X, Baby, Heart, UserCheck, Sparkles, ArrowRight, Shield } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleSelect = (role: 'family' | 'caregiver') => {
    onClose();
    if (role === 'family') {
      navigate('/find-care');
    } else {
      navigate('/provide-care');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile, centered on sm+ */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up z-10">
        {/* Handle bar — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header — compact */}
        <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 px-5 pt-6 pb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-brand-500/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-coral-500/10 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />

          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Get Started</h2>
            <p className="text-brand-200 text-xs">Choose how you'd like to join</p>
          </div>
        </div>

        {/* Cards — compact */}
        <div className="px-5 py-4 -mt-4 space-y-3">
          {/* Family card */}
          <button
            onClick={() => handleSelect('family')}
            className="group w-full bg-white rounded-2xl border-2 border-gray-100 p-4 text-left hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-coral-50 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <span className="text-xl">👨‍👩‍👧</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                  Join as a Family
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Find trusted caregivers near you
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    { icon: <Baby className="w-2.5 h-2.5" />, label: 'Child' },
                    { icon: <Heart className="w-2.5 h-2.5" />, label: 'Senior' },
                    { icon: <UserCheck className="w-2.5 h-2.5" />, label: 'Adult' },
                    { icon: <Sparkles className="w-2.5 h-2.5" />, label: 'Cleaning' },
                  ].map((tag) => (
                    <span key={tag.label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-semibold">
                      {tag.icon} {tag.label}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>

          {/* Caregiver card */}
          <button
            onClick={() => handleSelect('caregiver')}
            className="group w-full bg-white rounded-2xl border-2 border-gray-100 p-4 text-left hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand-50 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <span className="text-xl">💚</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                  Join as a Caregiver
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Free profile, direct matches, set your rates
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    { icon: <Shield className="w-2.5 h-2.5" />, label: 'Free to join' },
                    { icon: <ArrowRight className="w-2.5 h-2.5" />, label: 'Direct matches' },
                  ].map((tag) => (
                    <span key={tag.label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[9px] font-semibold">
                      {tag.icon} {tag.label}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 text-center">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => { onClose(); navigate('/login'); }}
              className="text-brand-600 font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
