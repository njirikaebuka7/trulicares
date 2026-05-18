import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Stethoscope, Building2, ArrowRight, CheckCircle } from 'lucide-react';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roles = [
  {
    id: 'caregiver',
    icon: Heart,
    title: 'Caregiver',
    subtitle: 'Non-Medical Care Provider',
    description: 'Provide child care, senior care, companionship, and household support services.',
    features: ['Flexible scheduling', 'Choose your clients', 'Set your own rates'],
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    hover: 'hover:border-emerald-400 hover:shadow-emerald-100',
    path: '/provide-care',
  },
  {
    id: 'professional',
    icon: Stethoscope,
    title: 'Licensed Professional',
    subtitle: 'RN · CNA · LPN · NP · PT · OT',
    description: 'Apply to facility-posted shifts. Get paid fast with full credential verification.',
    features: ['Shift-based work', 'Verified credentials', 'Instant wallet payouts'],
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hover: 'hover:border-blue-400 hover:shadow-blue-100',
    path: '/professional-onboarding',
  },
  {
    id: 'facility',
    icon: Building2,
    title: 'Healthcare Facility',
    subtitle: 'Hospital · Clinic · Nursing Home',
    description: 'Post shifts and instantly access a pool of verified, licensed healthcare professionals.',
    features: ['On-demand staffing', 'Verified professionals', 'Escrow-protected payments'],
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    hover: 'hover:border-violet-400 hover:shadow-violet-100',
    path: '/facility-onboarding',
  },
];

export default function RoleSelectionModal({ isOpen, onClose }: RoleSelectionModalProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelected(null);
      setIsExiting(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSelect = (roleId: string, path: string) => {
    setSelected(roleId);
    setTimeout(() => {
      onClose();
      navigate(path);
    }, 300);
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl transition-all duration-300 ${isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Header */}
        <div className="relative p-8 pb-6 text-center border-b border-gray-100">
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Join TruliCares
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What best describes you?</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Choose your role to get started with the right onboarding experience.
          </p>
        </div>

        {/* Role Cards */}
        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isActive = selected === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleSelect(role.id, role.path)}
                className={`group relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${role.bg} ${role.border} ${role.hover} hover:shadow-lg ${isActive ? 'scale-95 opacity-70' : 'hover:scale-[1.02]'}`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl ${role.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${role.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-base mb-0.5">{role.title}</h3>
                <p className="text-xs font-medium text-gray-500 mb-3">{role.subtitle}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{role.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-4">
                  {role.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className={`w-3.5 h-3.5 ${role.iconColor} flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${role.iconColor} group-hover:gap-2.5 transition-all`}>
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Gradient accent bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => { onClose(); navigate('/login'); }}
              className="text-brand-600 font-medium hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
