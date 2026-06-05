import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import Seo, { SITE_URL } from '@/components/Seo';
import { locations, locationsByState } from '@/data/locations';

export default function Locations() {
  const grouped = locationsByState();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'TruliCares Care Locations',
    url: `${SITE_URL}/locations`,
    description: 'Cities and states where TruliCares connects families with verified caregivers.',
  };

  return (
    <div className="bg-white">
      <Seo
        title="Find Caregivers Near You — Locations We Serve | TruliCares"
        description={`Browse ${locations.length}+ cities across the United States where TruliCares connects families with trusted, verified caregivers for child, senior, and adult care.`}
        path="/locations"
        jsonLd={collectionSchema}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 pt-28 lg:pt-36 pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold mb-6 border border-white/15">
            <MapPin className="w-4 h-4" /> Locations
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">Find trusted caregivers near you</h1>
          <p className="text-lg text-brand-100/90 max-w-2xl mx-auto">
            TruliCares connects families with verified caregivers across the United States. Choose your city to get started.
          </p>
        </div>
      </section>

      {/* Directory */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {grouped.map((group) => (
              <div key={group.state}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 pb-2 border-b border-gray-100">{group.state}</h2>
                <ul className="space-y-2.5">
                  {group.cities.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/care/${c.slug}`}
                        className="group inline-flex items-center gap-2 text-gray-700 hover:text-brand-700 transition-colors">
                        <MapPin className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                        <span className="text-sm font-medium">Caregivers in {c.city}, {c.stateAbbr}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-transparent group-hover:text-brand-400 transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
