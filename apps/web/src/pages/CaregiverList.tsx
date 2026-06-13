import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Check, Filter, X } from 'lucide-react';
import { caregivers as caregiverApi } from '@/lib/api';
import type { CareCategory, CaregiverProfile } from '@/types';
import { cn } from '@/utils/cn';
import Button from '@/components/ui/Button';
import CaregiverCard from '@/components/CaregiverCard';

const CATEGORIES: { id: CareCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Caregivers', icon: '🌟' },
  { id: 'child-care', label: 'Child Care', icon: '👶' },
  { id: 'senior-care', label: 'Senior Care', icon: '❤️' },
  { id: 'adult-care', label: 'Adult Care', icon: '🧑' },
  { id: 'cleaning', label: 'Cleaning', icon: '✨' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
];

export default function CaregiverList() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CareCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState('rating');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [bgCheckedOnly, setBgCheckedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [serverCaregivers, setServerCaregivers] = useState<CaregiverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch from API whenever server-driven params change
  useEffect(() => {
    setLoading(true);
    caregiverApi.list({
      category: activeCategory !== 'all' ? activeCategory : undefined,
      sort: sortBy,
      verified: verifiedOnly || undefined,
      backgroundChecked: bgCheckedOnly || undefined,
      search: search.trim() || undefined,
    })
      .then((d: any) => setServerCaregivers(d.caregivers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory, sortBy, verifiedOnly, bgCheckedOnly, search]);

  // Keep a defensive client-side filter on top of server results.
  const filtered = useMemo(() => {
    if (!search.trim()) return serverCaregivers;
    const q = search.toLowerCase();
    return serverCaregivers.filter(cg =>
      (cg.name || '').toLowerCase().includes(q) ||
      (cg.bio || '').toLowerCase().includes(q) ||
      (cg.location || '').toLowerCase().includes(q) ||
      (cg.serviceZips || []).some(zip => zip.toLowerCase().includes(q)) ||
      (cg.specialties || []).some(s => s.toLowerCase().replace(/-/g, ' ').includes(q))
    );
  }, [search, serverCaregivers]);

  const activeFiltersCount = (verifiedOnly ? 1 : 0) + (bgCheckedOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 pt-28 pb-16 lg:pt-36 lg:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-brand-200 text-sm font-semibold mb-5 backdrop-blur-sm border border-white/10">
            {loading ? '…' : serverCaregivers.length} Verified Caregivers
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Find Your Perfect<br />
            <span className="text-coral-400">Caregiver</span>
          </h1>
          <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
            Browse background-checked, verified caregivers for child care, senior care, adult care, and cleaning services.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, location, or specialty…"
              className="w-full pl-14 pr-5 py-4 rounded-2xl text-gray-900 text-base bg-white shadow-xl border border-white/20 outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category chips */}
      <div className="sticky top-16 lg:top-[72px] z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0',
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <p className="text-gray-500 text-sm">
            <span className="font-bold text-gray-900">{filtered.length}</span> caregiver{filtered.length !== 1 ? 's' : ''} found
            {activeCategory !== 'all' && (
              <span> in <span className="font-semibold text-brand-700">{CATEGORIES.find(c => c.id === activeCategory)?.label}</span></span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors',
                filtersOpen || activeFiltersCount > 0
                  ? 'border-brand-600 text-brand-700 bg-brand-50'
                  : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative', verifiedOnly ? 'bg-brand-600' : 'bg-gray-200')}
                >
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', verifiedOnly ? 'translate-x-5' : 'translate-x-1')} />
                </div>
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-brand-600" /> Verified only
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setBgCheckedOnly(!bgCheckedOnly)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative', bgCheckedOnly ? 'bg-brand-600' : 'bg-gray-200')}
                >
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', bgCheckedOnly ? 'translate-x-5' : 'translate-x-1')} />
                </div>
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Background checked
                </span>
              </label>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setVerifiedOnly(false); setBgCheckedOnly(false); }}
                className="mt-4 text-sm text-coral-600 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 h-36 sm:h-44 animate-pulse shadow-sm flex gap-4 sm:gap-6 items-center" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No caregivers found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <Button variant="secondary" onClick={() => { setSearch(''); setActiveCategory('all'); setVerifiedOnly(false); setBgCheckedOnly(false); }}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {filtered.map((cg, i) => (
              <CaregiverCard
                key={cg.id}
                caregiver={cg}
                index={i}
              />
            ))}
          </div>
        )}

        {/* CTA banner */}
        <div className="mt-12 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Not sure where to start?</h2>
          <p className="text-brand-200 mb-6">Answer a few quick questions and we'll match you with the best caregivers for your specific needs.</p>
          <Link to="/find-care">
            <Button variant="primary" size="lg" className="bg-white text-brand-700 hover:bg-brand-50 font-bold shadow-lg">
              Get Matched for Free →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
