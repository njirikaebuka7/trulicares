import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Baby, Heart, UserCheck, Sparkles, ShieldCheck, MapPin, ArrowRight,
  CheckCircle, Search, Star, Building2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Seo, { SITE_URL, organizationSchema } from '@/components/Seo';
import { getLocation, nearbyLocations } from '@/data/locations';

const services = [
  { icon: <Baby className="w-6 h-6" />, name: 'Child Care', desc: 'Nannies, babysitters, and after-school help', color: 'bg-coral-100 text-coral-600' },
  { icon: <Heart className="w-6 h-6" />, name: 'Senior Care', desc: 'Companionship and in-home support for older adults', color: 'bg-brand-100 text-brand-600' },
  { icon: <UserCheck className="w-6 h-6" />, name: 'Adult Care', desc: 'Personal care and daily living assistance', color: 'bg-sky-100 text-sky-600' },
  { icon: <Sparkles className="w-6 h-6" />, name: 'Cleaning', desc: 'Trusted home cleaning and household help', color: 'bg-violet-100 text-violet-600' },
];

const trust = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Background-checked caregivers' },
  { icon: <Star className="w-5 h-5" />, label: 'Ratings & verified reviews' },
  { icon: <Search className="w-5 h-5" />, label: 'Matched to your needs' },
];

export default function LocationLanding() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const loc = getLocation(slug);

  if (!loc) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-28 pb-20">
        <Seo title="Location not found | TruliCares" description="This location page could not be found." path={`/care/${slug}`} noindex />
        <MapPin className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">We couldn't find that location</h1>
        <p className="text-gray-500 mb-6">Browse all the areas we serve instead.</p>
        <Button variant="primary" onClick={() => navigate('/locations')}>View all locations</Button>
      </div>
    );
  }

  const { city, state, stateAbbr } = loc;
  const place = `${city}, ${stateAbbr}`;
  const nearby = nearbyLocations(loc);

  const title = `Caregivers in ${place} | Child, Senior & Adult Care | TruliCares`;
  const description = `Find trusted, background-checked caregivers in ${city}, ${state}. TruliCares matches families with verified child care, senior care, adult care, and home cleaning help near you.`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations` },
      { '@type': 'ListItem', position: 3, name: place, item: `${SITE_URL}/care/${slug}` },
    ],
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Caregiver matching and home care services',
    provider: organizationSchema,
    areaServed: { '@type': 'City', name: city, containedInPlace: { '@type': 'State', name: state } },
    description,
  };

  return (
    <div className="bg-white">
      <Seo title={title} description={description} path={`/care/${slug}`} jsonLd={[breadcrumbSchema, serviceSchema]} />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-brand-200/70 mb-6 justify-center" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link to="/locations" className="hover:text-white">Locations</Link>
            <span>/</span>
            <span className="text-white font-medium">{place}</span>
          </nav>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold mb-6 border border-white/15">
              <MapPin className="w-4 h-4" /> Serving {city}, {state}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight max-w-4xl mx-auto">
              Find trusted caregivers in{' '}
              <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">{place}</span>
            </h1>
            <p className="text-lg text-brand-100/90 mb-9 max-w-2xl mx-auto leading-relaxed">
              TruliCares matches {city} families with verified, background-checked caregivers for child care,
              senior care, adult care, and home cleaning — in just a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="xl" icon={<ArrowRight className="w-5 h-5" />}
                onClick={() => navigate('/find-care')}
                className="bg-[#e2fcd6] text-brand-900 hover:bg-[#d0f5bf] border-0">
                Find Care in {city}
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/provide-care')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Become a Caregiver
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-9 text-sm text-brand-200/80">
              {trust.map((t) => (
                <span key={t.label} className="inline-flex items-center gap-1.5">{t.icon}{t.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services in city */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">Care services in {city}</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Every kind of care your {city} family needs</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.name} className="p-6 rounded-3xl border-2 border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}>{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.name} in {city}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why families here */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why {city} families choose TruliCares</h2>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Finding care in {state} should feel safe and simple. Every caregiver on TruliCares is identity-verified and
            background-checked, and you only pay when you're matched.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              { title: 'Verified & background-checked', desc: `Each caregiver serving ${city} completes identity verification and a background check before matching.` },
              { title: 'Matched, not just listed', desc: `We match ${city} families by need, schedule, and location — not an endless list of profiles.` },
              { title: 'Pay only when matched', desc: 'No subscriptions. Families pay only when a caregiver accepts the match.' },
            ].map((b) => (
              <div key={b.title} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <CheckCircle className="w-6 h-6 text-brand-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staffing cross-sell */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border-2 border-gray-100 p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Run a healthcare facility in {city}?</h3>
              <p className="text-sm text-gray-500">Post shifts and hire verified, licensed nursing professionals on demand.</p>
            </div>
            <Link to="/for-facilities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:gap-2.5 transition-all">
              Staff your facility <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Nearby locations — internal linking */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Caregivers in other areas</h2>
          <div className="flex flex-wrap gap-2.5">
            {nearby.map((n) => (
              <Link key={n.slug} to={`/care/${n.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 transition-colors">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> Caregivers in {n.city}, {n.stateAbbr}
              </Link>
            ))}
            <Link to="/locations" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
              View all locations <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
