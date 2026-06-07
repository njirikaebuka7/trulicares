import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ArrowRight } from 'lucide-react';
import { caregivers as caregiversApi, geo } from '@/lib/api';
import type { CaregiverProfile } from '@/types';
import CaregiverCard from '@/components/CaregiverCard';
import Button from '@/components/ui/Button';

export default function TopCaregivers() {
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [cityName, setCityName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(true);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    let active = true;

    // Fetch caregivers based on whatever coordinates are currently set
    const fetchTopCaregivers = async (lat?: number, lng?: number) => {
      setLoading(true);
      try {
        const res: any = await caregiversApi.listPublic({ lat, lng });
        if (active) {
          setCaregivers(res.caregivers || []);
        }
      } catch (err) {
        console.error('Error loading top caregivers:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Attempt browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!active) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setLocating(false);
          
          // Fetch location-based caregivers
          fetchTopCaregivers(lat, lng);

          // Attempt to reverse geocode city name
          try {
            const geocodeRes: any = await geo.reverse(lat, lng);
            if (geocodeRes && geocodeRes.city) {
              setCityName(geocodeRes.city);
            } else if (geocodeRes && geocodeRes.displayName) {
              const parts = geocodeRes.displayName.split(',');
              setCityName(parts[0] || '');
            }
          } catch {
            // Ignore geocoding failure, fallback to generic title
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          if (!active) return;
          setLocating(false);
          // Geolocation denied or failed, load fallback rating list
          fetchTopCaregivers();
        },
        { timeout: 8000 }
      );
    } else {
      setLocating(false);
      fetchTopCaregivers();
    }

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="py-20 bg-slate-50/30 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-50 border border-coral-200 text-coral-600 text-xs font-bold uppercase tracking-wider animate-pulse">
                <Navigation className="w-3.5 h-3.5 fill-coral-500 text-coral-500" />
                Live Matching
              </span>
              {locating && (
                <span className="text-xs text-gray-400 font-medium">Detecting your location…</span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Top Caregivers {cityName ? `Near ${cityName}` : 'Near You'}
            </h2>
            <p className="text-gray-500 text-base mt-2 max-w-2xl leading-relaxed">
              Connect directly with verified, top-rated caregivers in your area. Book directly without intermediate search gates.
            </p>
          </div>

          <div className="shrink-0">
            <Link to="/caregivers">
              <Button variant="secondary" icon={<ArrowRight className="w-4 h-4" />}>
                View All Caregivers
              </Button>
            </Link>
          </div>
        </div>

        {/* Caregivers Cards List */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 h-36 sm:h-44 animate-pulse shadow-sm flex gap-4 sm:gap-6 items-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gray-100 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-gray-100 rounded w-1/4 mt-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : caregivers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto">
            <span className="text-4xl">📍</span>
            <h3 className="text-lg font-bold text-gray-900 mt-3 mb-1">No local caregivers found</h3>
            <p className="text-sm text-gray-400">We don't have caregivers active in your exact location yet. Try broadening your scope or search.</p>
            <Link to="/caregivers" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
              Search the full network →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {caregivers.map((cg, i) => (
              <CaregiverCard
                key={cg.id}
                caregiver={cg}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
