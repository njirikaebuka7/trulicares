import { useNavigate } from 'react-router-dom';
import { Baby, Heart, UserCheck, Sparkles, ArrowRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';

import imgChildCare from '@/assets/service-childcare.jpg';
import imgSeniorCare from '@/assets/service-seniorcare.jpg';
import imgAdultCare from '@/assets/service-adultcare.jpg';
import imgCleaning from '@/assets/service-cleaning.jpg';

const services = [
  {
    id: 'child-care',
    icon: <Baby className="w-8 h-8" />,
    title: 'Child Care',
    tagline: 'Trusted care for your little ones',
    description: 'Find experienced, background-checked nannies, babysitters, and daycare providers who will nurture, educate, and protect your children while you\'re away. Whether you need full-time care, after-school supervision, or occasional date-night help — we match you with the perfect caregiver.',
    features: ['CPR-certified & background-checked', 'Flexible full-time, part-time, or one-time', 'Age-appropriate activities & learning', 'School pickup, meals & homework help'],
    gradient: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    price: 'From $15/hr',
    image: imgChildCare,
  },
  {
    id: 'senior-care',
    icon: <Heart className="w-8 h-8" />,
    title: 'Senior Care',
    tagline: 'Compassionate support for aging loved ones',
    description: 'Connect with compassionate companions and certified personal care aides who provide dignified, respectful support for elderly family members. From daily companionship to overnight and live-in care, our verified caregivers help seniors maintain independence and quality of life.',
    features: ['Companionship & emotional support', 'Medication management & reminders', 'Mobility assistance & fall prevention', 'Bathing, dressing & meal preparation'],
    gradient: 'from-brand-500 to-brand-700',
    bgLight: 'bg-brand-50',
    price: 'From $18/hr',
    image: imgSeniorCare,
  },
  {
    id: 'adult-care',
    icon: <UserCheck className="w-8 h-8" />,
    title: 'Adult Care',
    tagline: 'Personalized support for independence',
    description: 'Professional care providers offering personal, behavioral, and community support for adults with diverse needs. Our verified caregivers help individuals maintain independence, manage daily routines, and engage with their communities through tailored support plans.',
    features: ['Daily living & personal care assistance', 'Behavioral health & emotional support', 'Community integration & social activities', 'Transportation & errand support'],
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    price: 'From $20/hr',
    image: imgAdultCare,
  },
  {
    id: 'cleaning',
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Cleaning Services',
    tagline: 'Professional cleaning for any space',
    description: 'Vetted, insured cleaning professionals for homes, apartments, condos, and offices. Whether you need a routine weekly clean, a deep move-in/move-out service, or post-construction cleanup — our matched cleaners deliver spotless results every time.',
    features: ['Standard, deep & specialized cleaning', 'Eco-friendly product options available', 'Move-in/move-out & post-construction', 'Flexible one-time or recurring schedules'],
    gradient: 'from-warm-500 to-amber-600',
    bgLight: 'bg-warm-50',
    price: 'From $25/hr',
    image: imgCleaning,
  },
];

export default function Services() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-brand-200 text-sm font-semibold mb-6">
            Our Services
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Care for every{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">stage of life</span>
          </h1>
          <p className="text-lg text-brand-200 max-w-2xl mx-auto leading-relaxed">
            From nurturing children to caring for seniors — find the right verified professional for every need with TruliCares.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20 lg:space-y-28">
            {services.map((service, i) => (
              <div
                key={service.id}
                className={cn(
                  'grid lg:grid-cols-2 gap-8 lg:gap-16 items-center',
                )}
              >
                {/* Image */}
                <div className={cn(
                  'relative rounded-3xl overflow-hidden shadow-2xl shadow-gray-300/30 group',
                  i % 2 === 1 && 'lg:order-2'
                )}>
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-72 sm:h-80 lg:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  {/* Price badge */}
                  <div className="absolute top-4 right-4 glass-dark rounded-full px-4 py-2">
                    <span className="text-sm text-white font-bold">{service.price}</span>
                  </div>
                </div>

                {/* Content */}
                <div className={cn(i % 2 === 1 && 'lg:order-1')}>
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5',
                    'bg-gradient-to-br', service.gradient
                  )}>
                    {service.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{service.tagline}</span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{service.title}</h2>
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">{service.description}</p>

                  <ul className="space-y-3 mb-8">
                    {service.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-brand-600" />
                        </div>
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="primary"
                    size="lg"
                    icon={<ArrowRight className="w-5 h-5" />}
                    onClick={() => navigate('/find-care', { state: { preselectedCategory: service.id } })}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-coral-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Not sure which service you need?
          </h2>
          <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
            Our guided questionnaire will help you find the perfect match for your care needs in just a few minutes.
          </p>
          <Button
            variant="primary"
            size="xl"
            onClick={() => navigate('/find-care')}
            className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] shadow-[#e2fcd6]/30 border-0"
          >
            Start Finding Care
          </Button>
        </div>
      </section>
    </div>
  );
}
