import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, Shield, Check, MapPin, Clock, DollarSign, Calendar,
  ChevronLeft, MessageCircle, Heart, Award, Briefcase, CheckCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { mockCaregivers } from '@/data/mock';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

const categoryLabels: Record<string, string> = {
  'child-care': 'Child Care',
  'senior-care': 'Senior Care',
  'adult-care': 'Adult Care',
  'cleaning': 'Cleaning Services',
};

const categoryColors: Record<string, string> = {
  'child-care': 'bg-coral-100 text-coral-700',
  'senior-care': 'bg-brand-100 text-brand-700',
  'adult-care': 'bg-sky-100 text-sky-700',
  'cleaning': 'bg-violet-100 text-violet-700',
};

const mockReviews = [
  { author: 'The Martinez Family', rating: 5, text: 'Absolutely wonderful. Our kids adored her from day one. Punctual, caring, and communicates brilliantly.', date: 'April 2026' },
  { author: 'Rebecca T.', rating: 5, text: 'Professional and warm. The house was spotless and our grandmother was comfortable and happy all day.', date: 'March 2026' },
  { author: 'The Chen Family', rating: 4, text: 'Very reliable and great with the kids. We\'ve already rebooked for next month. Highly recommend!', date: 'February 2026' },
];

export default function CaregiverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caregiver = mockCaregivers.find(cg => cg.id === id);

  if (!caregiver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">Profile not found</p>
          <Link to="/" className="text-brand-600 hover:underline font-medium">← Go home</Link>
        </div>
      </div>
    );
  }

  const initials = caregiver.name.split(' ').map(n => n[0]).join('');

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 pt-8 pb-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-coral-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back nav */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-brand-200 hover:text-white transition-colors mb-6 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Link to="/" className="inline-block mb-8">
            <img src={logoImg} alt="TruliCares" className="h-7 w-auto brightness-0 invert opacity-80" />
          </Link>
        </div>
      </div>

      {/* Profile card — overlaps hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              {caregiver.photoUrl ? (
                <img
                  src={caregiver.photoUrl}
                  alt={caregiver.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-4xl shadow-lg">
                  {initials}
                </div>
              )}
              {caregiver.verified && (
                <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{caregiver.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {caregiver.verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {caregiver.backgroundChecked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        <Check className="w-3 h-3" /> Background Checked
                      </span>
                    )}
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full border border-gray-200 hover:border-red-300 hover:text-red-500 flex items-center justify-center transition-colors text-gray-400 shrink-0">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={cn('w-4 h-4', i <= Math.round(caregiver.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                  ))}
                </div>
                <span className="font-bold text-gray-900">{caregiver.rating}</span>
                <span className="text-gray-400 text-sm">({caregiver.reviewCount} reviews)</span>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {caregiver.location}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {caregiver.availability}</span>
                <span className="flex items-center gap-1.5 font-semibold text-brand-600">
                  <DollarSign className="w-4 h-4" /> ${caregiver.hourlyRate[0]}–${caregiver.hourlyRate[1]}/hr
                </span>
                <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-gray-400" /> {caregiver.yearsExperience} yrs experience</span>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100 flex-wrap">
            <Button variant="primary" size="lg" onClick={() => navigate('/find-care')} className="flex-1 sm:flex-none">
              Request Care
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/find-care')} className="flex-1 sm:flex-none">
              <MessageCircle className="w-4 h-4" /> Message
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6 pb-16">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed">{caregiver.bio}</p>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-gray-900">{caregiver.rating}</span>
                  <span className="text-gray-400 text-sm">· {caregiver.reviewCount} reviews</span>
                </div>
              </div>
              <div className="space-y-5">
                {mockReviews.map((review, i) => (
                  <div key={i} className="pb-5 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                          {review.author[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{review.author}</p>
                          <p className="text-xs text-gray-400">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Specialties */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {caregiver.specialties.map(s => (
                  <span key={s} className={cn('px-3 py-1.5 rounded-full text-xs font-bold', categoryColors[s] || 'bg-gray-100 text-gray-600')}>
                    {categoryLabels[s] || s}
                  </span>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Details</h3>
              {[
                { icon: <DollarSign className="w-4 h-4" />, label: 'Rate', value: `$${caregiver.hourlyRate[0]}–$${caregiver.hourlyRate[1]}/hr` },
                { icon: <Calendar className="w-4 h-4" />, label: 'Availability', value: caregiver.availability },
                { icon: <Award className="w-4 h-4" />, label: 'Experience', value: `${caregiver.yearsExperience} years` },
                { icon: <MapPin className="w-4 h-4" />, label: 'Location', value: caregiver.location },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-gray-400">{item.icon}</span> {item.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Credentials</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Identity Verified', done: caregiver.verified },
                  { label: 'Background Check', done: caregiver.backgroundChecked },
                  { label: 'Profile Complete', done: true },
                  { label: 'References Checked', done: caregiver.rating > 4.5 },
                ].map(cred => (
                  <div key={cred.label} className="flex items-center gap-2.5">
                    <CheckCircle className={cn('w-4 h-4 shrink-0', cred.done ? 'text-green-500' : 'text-gray-300')} />
                    <span className={cn('text-sm', cred.done ? 'text-gray-800 font-medium' : 'text-gray-400 line-through')}>{cred.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 text-white text-center">
              <p className="font-bold mb-1">Ready to book?</p>
              <p className="text-brand-200 text-xs mb-4">Post a care request and get matched in minutes.</p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/find-care')}
                className="bg-white text-brand-700 border-white hover:bg-brand-50"
              >
                Post a Request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
