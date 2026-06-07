import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Check, ChevronRight } from 'lucide-react';
import type { CaregiverProfile } from '@/types';
import { cn } from '@/utils/cn';

interface CaregiverCardProps {
  caregiver: CaregiverProfile;
  index?: number;
}

const avatarColors = ['bg-coral-450', 'bg-brand-450', 'bg-sky-450', 'bg-emerald-450', 'bg-violet-450', 'bg-amber-450', 'bg-pink-450'];

export default function CaregiverCard({ caregiver, index = 0 }: CaregiverCardProps) {
  const ratingValue = caregiver.rating || 0;
  const reviewsCount = caregiver.reviewCount || 0;
  
  // Format price display: either range or minimum rate
  const rateDisplay = caregiver.hourlyRate 
    ? `$${caregiver.hourlyRate[0]}/hr` 
    : `$18/hr`;

  // Render pink/coral stars for rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              'w-3.5 h-3.5',
              i <= Math.round(rating)
                ? 'text-coral-500 fill-coral-500'
                : 'text-gray-200 fill-gray-200'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Link
      to={`/caregivers/${caregiver.id}`}
      className="group block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 overflow-hidden p-4 sm:p-5"
    >
      <div className="flex flex-col xs:flex-row items-center xs:items-stretch gap-4 sm:gap-6">
        {/* Left Side: Photo */}
        <div className="relative w-full xs:w-28 xs:h-28 sm:w-36 sm:h-36 aspect-square shrink-0">
          {caregiver.photoUrl ? (
            <img
              src={caregiver.photoUrl}
              alt={caregiver.name}
              className="w-full h-full rounded-2xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn(
              'w-full h-full rounded-2xl flex items-center justify-center text-white text-3xl font-black',
              avatarColors[index % avatarColors.length]
            )}>
              {caregiver.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {caregiver.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-coral-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
            </div>
          )}
        </div>

        {/* Right Side: Caregiver Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
          <div>
            {/* Top row: Name & Price */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors truncate">
                  {caregiver.name}
                </h3>
                {caregiver.verified && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-coral-50 flex items-center justify-center border border-coral-200" title="Verified Professional">
                    <Check className="w-3 h-3 text-coral-500 stroke-[3px]" />
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-gray-900">{rateDisplay}</span>
              </div>
            </div>

            {/* Specialty / Job Title */}
            <p className="text-sm font-medium text-gray-400 mt-0.5 capitalize">
              {caregiver.jobTitle || (caregiver.specialties && caregiver.specialties[0] ? caregiver.specialties[0].replace('-', ' ') : 'Caregiver')}
            </p>

            {/* Ratings row */}
            <div className="flex items-center gap-1.5 mt-2">
              {reviewsCount > 0 ? (
                <>
                  {renderStars(ratingValue)}
                  <span className="text-xs font-bold text-gray-555">
                    {ratingValue.toFixed(1)} <span className="text-gray-400 font-normal">({reviewsCount})</span>
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-coral-500 bg-coral-50 px-2 py-0.5 rounded-full">
                  ★ New
                </span>
              )}
            </div>
          </div>

          {/* Bottom row: Meta & Action */}
          <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-50 gap-2">
            <div className="space-y-1.5 min-w-0">
              {/* Distance or Coarse Location */}
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="truncate">
                  {caregiver.distanceMiles !== undefined
                    ? `${caregiver.distanceMiles} mi away`
                    : caregiver.city 
                      ? `${caregiver.city}, ${caregiver.state || ''}`
                      : caregiver.location}
                </span>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="truncate">{caregiver.availability || 'Available today'}</span>
              </div>
            </div>

            {/* Book Care CTA */}
            <div className="shrink-0 flex items-center gap-2">
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-coral-500 hover:bg-coral-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-coral-500/10 transition-colors flex items-center gap-1">
                Book Care
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
