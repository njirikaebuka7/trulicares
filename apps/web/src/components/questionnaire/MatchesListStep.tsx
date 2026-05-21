import { useState, useEffect } from 'react';
import { Star, Shield, MapPin, DollarSign, Check, ArrowLeft, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { get } from '@/lib/api';
import { cn } from '@/utils/cn';
import { extractZip } from '@/utils/geolocation';
import logoImg from '@/assets/logo.png';

interface Props {
  requestId?: string;
  onSelectMatch: (matchId: string, caregiverId?: string) => void;
  onBack: () => void;
  familyLocation?: string;
  onCancel?: () => void;
}

const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400', 'bg-warm-400', 'bg-purple-400'];

export default function MatchesListStep({ requestId, onSelectMatch, onBack, familyLocation, onCancel }: Props) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchesList, setMatchesList] = useState<any[]>([]);

  useEffect(() => {
    get('/matches').then((d: any) => {
      const all = d.matches || [];
      const relevant = requestId ? all.filter((m: any) => m.careRequestId === requestId) : all;
      setMatchesList(relevant);
    }).catch(() => {});
  }, [requestId]);

  const familyZip = familyLocation ? extractZip(familyLocation) : '';

  const sortedMatches = [...matchesList].sort((a, b) => {
    if (!familyZip) return 0;
    const aServes = a.caregiver?.serviceZips?.includes(familyZip) ? 1 : 0;
    const bServes = b.caregiver?.serviceZips?.includes(familyZip) ? 1 : 0;
    return bServes - aServes;
  });

  const nearYouCount = familyZip
    ? sortedMatches.filter(m => m.caregiver?.serviceZips?.includes(familyZip)).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 flex justify-center">
            <Link to="/"><img src={logoImg} alt="TruliCares" className="h-6 w-auto" /></Link>
          </div>
          {onCancel ? (
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0 text-xs text-gray-400 font-medium"
            >
              Exit
            </button>
          ) : (
            <div className="w-10 shrink-0" />
          )}
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3">
          <h1 className="text-xl font-bold text-gray-900">Your Matches</h1>
          <p className="text-sm text-gray-500">{sortedMatches.length} caregivers available for your request</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">

        {/* Location context banner */}
        {familyLocation && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-brand-50 border border-brand-100">
            <Navigation className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="text-brand-800">Showing caregivers near </span>
              <span className="font-semibold text-brand-900">{familyLocation}</span>
              {nearYouCount > 0 && (
                <span className="text-brand-700"> — {nearYouCount} serve your area</span>
              )}
            </div>
          </div>
        )}

        {sortedMatches.map((m, i) => {
          const cg = m.caregiver;
          if (!cg) return null;
          const isSelected = selectedMatchId === m.id;
          const servesFamily = Boolean(familyZip && cg.serviceZips?.includes(familyZip));

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMatchId(m.id);
                }
              }}
              className={cn(
                'w-full bg-white rounded-3xl border-2 p-5 text-left transition-all duration-200',
                isSelected
                  ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                  : 'border-gray-100 hover:border-brand-300 hover:shadow-md'
              )}
            >
              <div className="flex items-start gap-4">
                {cg.photoUrl ? (
                  <img
                    src={cg.photoUrl}
                    alt={cg.name}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                  />
                ) : (
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0',
                    avatarColors[i % avatarColors.length]
                  )}>
                    {cg.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{cg.name}</h3>
                    {cg.verified && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {cg.backgroundChecked && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
                        <Check className="w-3 h-3" /> Background
                      </span>
                    )}
                    {servesFamily && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <MapPin className="w-3 h-3" /> Near You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warm-400 fill-warm-400" />
                      <span className="font-semibold text-gray-700">{cg.rating}</span>
                      <span>({cg.reviewCount})</span>
                    </span>
                    <span>•</span>
                    <span>{cg.yearsExperience} yrs exp</span>
                  </div>

                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{cg.bio}</p>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-4 h-4" /> {cg.location}
                    </span>
                    <span className="flex items-center gap-1 text-brand-600 font-semibold">
                      <DollarSign className="w-4 h-4" /> ${cg.hourlyRate[0]}–${cg.hourlyRate[1]}/hr
                    </span>
                  </div>

                  {cg.serviceZips && cg.serviceZips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cg.serviceZips.slice(0, 3).map((zip: string) => (
                        <span
                          key={zip}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-lg font-medium',
                            servesFamily && zip === familyZip
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {zip}
                        </span>
                      ))}
                      {cg.serviceZips.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400 font-medium">
                          +{cg.serviceZips.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Link to={`/caregivers/${cg.id}`} state={{ matchId: m.id, requestId }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="sm">View Profile</Button>
                    </Link>
                    {isSelected && <span className="text-xs font-semibold text-brand-600">Selected caregiver</span>}
                  </div>
                </div>

                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                )}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
          <p className="text-sm text-brand-800">
            <strong>Note:</strong> You'll unlock messaging with your selected caregiver after payment and verification.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={() => {
              const match = sortedMatches.find(m => m.id === selectedMatchId);
              if (match) onSelectMatch(match.id, match.caregiver?.id);
            }}
            disabled={!selectedMatchId}
          >
            Continue with Selected Caregiver
          </Button>
        </div>
      </div>
    </div>
  );
}
