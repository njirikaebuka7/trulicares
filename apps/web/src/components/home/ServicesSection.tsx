import { useNavigate } from 'react-router-dom';
import { Baby, Heart, UserCheck, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const services = [
  {
    id: 'child-care',
    icon: <Baby className="w-7 h-7" />,
    title: 'Child Care',
    description: 'Nannies, babysitters, and daycare providers for your little ones.',
    gradient: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    id: 'senior-care',
    icon: <Heart className="w-7 h-7" />,
    title: 'Senior Care',
    description: 'Compassionate companions and personal care for elderly loved ones.',
    gradient: 'from-brand-500 to-brand-700',
    bgLight: 'bg-brand-50',
    textColor: 'text-brand-600',
  },
  {
    id: 'adult-care',
    icon: <UserCheck className="w-7 h-7" />,
    title: 'Adult Care',
    description: 'Personal, behavioral, and community support for adult care needs.',
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  {
    id: 'cleaning',
    icon: <Sparkles className="w-7 h-7" />,
    title: 'Cleaning Services',
    description: 'Professional cleaning for homes, apartments, and offices.',
    gradient: 'from-warm-500 to-amber-600',
    bgLight: 'bg-warm-50',
    textColor: 'text-warm-600',
  },
];

export default function ServicesSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
            Our Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Care and Essential Services for{' '}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-brand-600 to-coral-500 bg-clip-text text-transparent">
              Every Stage of Life
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            From nurturing children to caring for seniors — find the right professional for every need.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <button
              key={service.id}
              onClick={() => navigate('/find-care', { state: { preselectedCategory: service.id } })}
              className={cn(
                'group relative p-6 rounded-3xl border-2 border-gray-100 bg-white text-left transition-all duration-300',
                'hover:border-transparent hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1',
                'cursor-pointer'
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300',
                'bg-gradient-to-br', service.gradient, 'text-white',
                'group-hover:scale-110 group-hover:shadow-lg'
              )}>
                {service.icon}
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">
                {service.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {service.description}
              </p>

              <span className={cn(
                'inline-flex items-center gap-1 text-sm font-semibold transition-all',
                service.textColor,
                'group-hover:gap-2'
              )}>
                Get started <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
