import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star, Shield, Check, MapPin, Clock, DollarSign,
  Briefcase, CheckCircle, MessageCircle, Award, Calendar, ArrowLeft, X, LockKeyhole
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { caregivers, get, post } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { CaregiverProfile as CGProfile, CareCategory } from '@/types';
import { cn } from '@/utils/cn';

const categoryColors: Record<string, string> = {
  'child-care': 'bg-brand-100 text-brand-700',
  'senior-care': 'bg-coral-100 text-coral-700',
  'adult-care': 'bg-sky-100 text-sky-700',
  'cleaning': 'bg-violet-100 text-violet-700',
};

const categoryLabels: Record<string, string> = {
  'child-care': 'Child Care',
  'senior-care': 'Senior Care',
  'adult-care': 'Adult Care',
  'cleaning': 'Cleaning Services',
};

const categoryIcons: Record<string, string> = {
  'child-care': '👶',
  'senior-care': '❤️',
  'adult-care': '🧑',
  'cleaning': '✨',
};

export default function CaregiverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [caregiver, setCaregiver] = useState<CGProfile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [existingMatch, setExistingMatch] = useState<any | null>(null);
  const [unlockingMsg, setUnlockingMsg] = useState(false);

  useEffect(() => {
    if (!id) return;
    caregivers.get(id)
      .then((d: any) => {
        setCaregiver(d.caregiver);
        setReviews(d.caregiver?.sampleReviews || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id || user?.role !== 'family') return;
    get('/matches')
      .then((d: any) => {
        const m = (d.matches || []).find((x: any) => x.caregiver?.id === id || x.caregiverId === id);
        if (m) setExistingMatch(m);
      })
      .catch(() => {});
  }, [id, isAuthenticated, user]);

  const handleRequestCare = () => {
    if (!caregiver) return;
    if (caregiver.specialties.length === 1) {
      navigate('/find-care', {
        state: {
          directRequest: true,
          caregiverId: caregiver.id,
          preselectedCategory: caregiver.specialties[0],
        },
      });
    } else {
      setShowSpecialtyPicker(true);
    }
  };

  const handleSelectSpecialty = (specialty: CareCategory) => {
    setShowSpecialtyPicker(false);
    navigate('/find-care', {
      state: {
        directRequest: true,
        caregiverId: caregiver!.id,
        preselectedCategory: specialty,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (notFound || !caregiver) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-6xl mb-2">😢</div>
        <h2 className="text-2xl font-bold text-gray-900">Caregiver not found</h2>
        <p className="text-gray-500">This profile doesn't exist or has been removed.</p>
        <Link to="/caregivers">
          <Button variant="primary" size="lg">Browse Caregivers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Specialty picker modal */}
      {showSpecialtyPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Select Care Type</h3>
              <button
                onClick={() => setShowSpecialtyPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {caregiver.name} offers multiple services. Which type of care do you need?
            </p>
            <div className="space-y-3">
              {caregiver.specialties.map(s => (
                <button
                  key={s}
                  onClick={() => handleSelectSpecialty(s as CareCategory)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                    'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                  )}
                >
                  <span className="text-2xl">{categoryIcons[s] || '🤝'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{categoryLabels[s] || s}</p>
                    <p className="text-xs text-gray-500">${caregiver.hourlyRate[0]}–${caregiver.hourlyRate[1]}/hr</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-800 pt-24 lg:pt-28 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-brand-200 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to caregivers
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative shrink-0">
              {caregiver.photoUrl ? (
                <img
                  src={caregiver.photoUrl}
                  alt={caregiver.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md">
                  {caregiver.name.charAt(0)}
                </div>
              )}
              {caregiver.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{caregiver.name}</h1>
                {caregiver.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                )}
                {caregiver.backgroundChecked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    <CheckCircle className="w-3 h-3" /> Background Checked
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={cn('w-4 h-4', i <= Math.round(caregiver.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                  ))}
                </div>
                <span className="font-bold text-gray-900">{caregiver.rating}</span>
                <span className="text-gray-400 text-sm">({caregiver.reviewCount} reviews)</span>
              </div>

              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {caregiver.location}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {caregiver.availability}</span>
                <span className="flex items-center gap-1.5 font-semibold text-brand-600">
                  <DollarSign className="w-4 h-4" /> ${caregiver.hourlyRate[0]}–${caregiver.hourlyRate[1]}/hr
                </span>
                <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-gray-400" /> {caregiver.yearsExperience} yrs experience</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100 flex-wrap">
            <Button variant="primary" size="lg" onClick={handleRequestCare} className="flex-1 sm:flex-none">
              Request Care
            </Button>
            {/* ── Messaging CTA — gated on match status ── */}
            {(() => {
              if (!isAuthenticated) {
                return (
                  <Button variant="secondary" size="lg" onClick={handleRequestCare} className="flex-1 sm:flex-none">
                    <MessageCircle className="w-4 h-4" /> Message
                  </Button>
                );
              }
              if (!existingMatch) {
                return (
                  <Button variant="secondary" size="lg" onClick={handleRequestCare} className="flex-1 sm:flex-none">
                    <MessageCircle className="w-4 h-4" /> Message
                  </Button>
                );
              }
              if (existingMatch.status === 'pending') {
                return (
                  <div className="relative group">
                    <Button variant="secondary" size="lg" disabled className="flex-1 sm:flex-none opacity-60 cursor-not-allowed">
                      <Clock className="w-4 h-4" /> Awaiting Acceptance
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 text-center text-xs bg-gray-900 text-white rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      Messaging unlocks once the caregiver accepts your request.
                    </div>
                  </div>
                );
              }
              const messagingExpired = existingMatch.messagingExpired;
              if (messagingExpired) {
                return (
                  <Button variant="coral" size="lg" disabled={unlockingMsg} onClick={async () => {
                    setUnlockingMsg(true);
                    try { await post(`/matches/${existingMatch.id}/unlock-messaging`); setExistingMatch((m: any) => ({ ...m, messagingUnlocked: true, careDate: null })); } catch {}
                    setUnlockingMsg(false);
                  }} className="flex-1 sm:flex-none">
                    <LockKeyhole className="w-4 h-4" /> Re-unlock Messaging
                  </Button>
                );
              }
              if (existingMatch.status === 'accepted' && !existingMatch.messagingUnlocked) {
                return (
                  <Button variant="coral" size="lg" disabled={unlockingMsg} onClick={async () => {
                    setUnlockingMsg(true);
                    try { await post(`/matches/${existingMatch.id}/unlock-messaging`); setExistingMatch((m: any) => ({ ...m, messagingUnlocked: true })); } catch {}
                    setUnlockingMsg(false);
                  }} className="flex-1 sm:flex-none">
                    <LockKeyhole className="w-4 h-4" /> {unlockingMsg ? 'Unlocking…' : 'Unlock Messaging'}
                  </Button>
                );
              }
              return (
                <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard', { state: { tab: 'Messages' } })} className="flex-1 sm:flex-none">
                  <MessageCircle className="w-4 h-4" /> Message
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Body */}
        <div className="grid lg:grid-cols-3 gap-6 pb-16">
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
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No reviews yet.</p>
              ) : (
                <div className="space-y-5">
                  {reviews.map((review: any, i: number) => (
                    <div key={review.id || i} className="pb-5 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                            {(review.author || review.familyName || 'A')[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{review.author || review.familyName}</p>
                            <p className="text-xs text-gray-400">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                </div>
              )}
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
              <p className="text-brand-200 text-xs mb-4">Connect directly with {caregiver.name} in minutes.</p>
              <Button
                variant="secondary"
                fullWidth
                onClick={handleRequestCare}
                className="bg-white text-brand-700 border-white hover:bg-brand-50"
              >
                Request Care
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
