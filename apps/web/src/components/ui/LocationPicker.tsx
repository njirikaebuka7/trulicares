import { useState } from 'react';
import { MapPin, Loader2, Search, CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { geo as geoApi } from '@/lib/api';
import { getCurrentPosition } from '@/utils/geolocation';
import { cn } from '@/utils/cn';

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formattedAddress: string;
  locationSource: 'gps' | 'manual' | 'geocoded';
}

interface Candidate {
  latitude: number; longitude: number; address: string; city: string;
  state: string; zipCode: string; country: string; formattedAddress: string;
  confidence: 'high' | 'low';
}

interface Props {
  initial?: Partial<LocationData> | null;
  /** Called once the user confirms a normalized location. */
  onConfirm: (displayString: string, data: LocationData) => void;
  /** Theme accent — 'brand' (family) or 'emerald' (caregiver/staffing). */
  accent?: 'brand' | 'emerald';
}

const REQUIRED: Array<keyof Pick<LocationData, 'city' | 'state' | 'zipCode'>> = ['city', 'state', 'zipCode'];

function displayOf(d: LocationData): string {
  return d.formattedAddress || [d.city, d.state, d.zipCode].filter(Boolean).join(', ');
}

/**
 * Robust location capture: never relies on raw GPS alone. GPS (or manual search) is
 * always reverse/forward-geocoded to a normalized {city,state,zip,address,...}, the user
 * must CONFIRM (editing low-confidence/missing fields), and we surface both the
 * coordinates and the normalized address to the parent via onConfirm.
 */
export default function LocationPicker({ initial, onConfirm, accent = 'brand' }: Props) {
  const a = accent === 'emerald'
    ? { text: 'text-emerald-700', bg: 'bg-emerald-50', bgH: 'hover:bg-emerald-100', ring: 'focus:ring-emerald-100 focus:border-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700' }
    : { text: 'text-brand-700', bg: 'bg-brand-50', bgH: 'hover:bg-brand-100', ring: 'focus:ring-brand-100 focus:border-brand-400', btn: 'bg-brand-600 hover:bg-brand-700' };

  const hasInitial = !!(initial && (initial.city || initial.formattedAddress));
  const [confirmed, setConfirmed] = useState<LocationData | null>(hasInitial ? (initial as LocationData) : null);
  const [editing, setEditing] = useState<LocationData | null>(null); // the card being confirmed
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<'gps' | 'search' | null>(null);
  const [error, setError] = useState('');
  const [source, setSource] = useState<LocationData['locationSource']>('manual');

  const toData = (c: Candidate, src: LocationData['locationSource']): LocationData => ({
    latitude: c.latitude ?? null, longitude: c.longitude ?? null,
    address: c.address || '', city: c.city || '', state: c.state || '',
    zipCode: c.zipCode || '', country: c.country || '', formattedAddress: c.formattedAddress || '',
    locationSource: src,
  });

  const useMyLocation = async () => {
    setError(''); setLoading('gps'); setCandidates([]);
    try {
      const pos = await getCurrentPosition();
      const d: any = await geoApi.reverse(pos.coords.latitude, pos.coords.longitude);
      const list: Candidate[] = d.candidates || [];
      if (list.length === 0) { setError('Could not resolve your location. Please search manually.'); return; }
      setSource('gps');
      // start confirming the best candidate, keep coords from GPS as the source of truth
      setEditing({ ...toData(list[0], 'gps'), latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch (e: any) {
      setError(e?.message?.includes('denied') ? 'Location permission denied — search manually instead.' : 'Location unavailable. Please search manually.');
    } finally {
      setLoading(null);
    }
  };

  const search = async () => {
    if (query.trim().length < 3) { setError('Enter at least 3 characters'); return; }
    setError(''); setLoading('search'); setCandidates([]);
    try {
      const d: any = await geoApi.forward(query.trim());
      const list: Candidate[] = d.candidates || [];
      if (list.length === 0) setError('No matches found. Try a more specific address or ZIP.');
      setSource('geocoded');
      setCandidates(list);
    } catch {
      setError('Address lookup failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const missing = editing ? REQUIRED.filter((k) => !String(editing[k] || '').trim()) : [];

  const confirm = () => {
    if (!editing || missing.length > 0) return;
    const data: LocationData = { ...editing, formattedAddress: editing.formattedAddress || displayOf(editing) };
    setConfirmed(data);
    setEditing(null);
    setCandidates([]);
    onConfirm(displayOf(data), data);
  };

  // ── Confirmed summary ──────────────────────────────────────
  if (confirmed && !editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className={cn('w-5 h-5 mt-0.5 shrink-0', a.text)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{displayOf(confirmed)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {confirmed.city}{confirmed.city && confirmed.state ? ', ' : ''}{confirmed.state} {confirmed.zipCode}
              {confirmed.locationSource === 'gps' ? ' · from your device' : ''}
            </p>
          </div>
          <button onClick={() => setEditing(confirmed)} className={cn('flex items-center gap-1 text-xs font-semibold', a.text)}>
            <Pencil className="w-3.5 h-3.5" /> Change
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm / edit card ────────────────────────────────────
  if (editing) {
    const field = (key: keyof LocationData, label: string, required = false, placeholder = '') => (
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          {label}{required && <span className="text-coral-500"> *</span>}
        </label>
        <input
          value={String(editing[key] ?? '')}
          onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
          placeholder={placeholder}
          className={cn('w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2',
            required && !String(editing[key] || '').trim() ? 'border-coral-300' : 'border-gray-200', a.ring)}
        />
      </div>
    );
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Confirm your location</p>
        <p className="text-xs text-gray-500 -mt-1">Please review and correct the details below before continuing.</p>
        {missing.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> City, state, and ZIP are required.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {field('city', 'City', true, 'Brooklyn')}
          {field('state', 'State', true, 'NY')}
          {field('zipCode', 'ZIP code', true, '11201')}
          {field('country', 'Country', false, 'United States')}
        </div>
        {field('address', 'Street address (optional)', false, '123 Main St')}
        <div className="flex gap-2 pt-1">
          <button onClick={() => { setEditing(null); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={confirm} disabled={missing.length > 0}
            className={cn('flex-1 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50', a.btn)}>
            Confirm location
          </button>
        </div>
      </div>
    );
  }

  // ── Search / GPS entry ─────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">City, ZIP, or address</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
            placeholder="e.g. Brooklyn, NY or 11201"
            className={cn('flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2', a.ring)}
          />
          <button onClick={search} disabled={loading === 'search'}
            className={cn('px-4 rounded-xl text-white shrink-0 disabled:opacity-60', a.btn)}>
            {loading === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={useMyLocation} disabled={loading === 'gps'}
          className={cn('flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-60', a.bg, a.text, a.bgH)}>
          {loading === 'gps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {loading === 'gps' ? 'Detecting your location…' : 'Use my current location'}
        </button>
        {error && <p className="text-xs text-coral-600">{error}</p>}
      </div>

      {candidates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
          {candidates.map((c, i) => (
            <button key={i} onClick={() => setEditing(toData(c, source))}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
              <MapPin className={cn('w-4 h-4 mt-0.5 shrink-0', a.text)} />
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{c.formattedAddress || [c.city, c.state, c.zipCode].filter(Boolean).join(', ')}</p>
                {c.confidence === 'low' && <p className="text-[11px] text-amber-600">Low confidence — please verify the details</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
