import { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { admin as adminApi } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons/social';

const SOCIAL_KEYS = ['social_facebook', 'social_instagram', 'social_youtube'] as const;
const ARRAY_KEYS = ['contact_emails', 'contact_phones', 'contact_addresses'] as const;
const HIDDEN_GENERIC = new Set<string>([...SOCIAL_KEYS, ...ARRAY_KEYS]);

const SOCIAL_META: Record<string, { label: string; icon: React.ReactNode; placeholder: string }> = {
  social_facebook: { label: 'Facebook', icon: <FacebookIcon className="w-4 h-4" />, placeholder: 'https://facebook.com/yourpage' },
  social_instagram: { label: 'Instagram', icon: <InstagramIcon className="w-4 h-4" />, placeholder: 'https://instagram.com/yourhandle' },
  social_youtube: { label: 'YouTube', icon: <YoutubeIcon className="w-4 h-4" />, placeholder: 'https://youtube.com/@yourchannel' },
};

const ARRAY_META: Record<string, { label: string; placeholder: string }> = {
  contact_emails: { label: 'Contact Emails', placeholder: 'hello@trulicares.com' },
  contact_phones: { label: 'Contact Phones', placeholder: '(555) 123-4567' },
  contact_addresses: { label: 'Contact Addresses', placeholder: '123 Care St, New York, NY 10001' },
};

function parseArr(value: string | undefined): string[] {
  if (!value) return [];
  try { const a = JSON.parse(value); return Array.isArray(a) ? a.map(String) : []; }
  catch { return value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean); }
}

/** Platform general settings — simple fields, social links, and additive contact info. */
export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, { value: string; label: string }>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [arrays, setArrays] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.generalSettings().then((d: any) => {
      const s = d.settings || {};
      setSettings(s);
      setDraft(Object.fromEntries(Object.entries(s).map(([k, v]: any) => [k, v.value])));
      setArrays(Object.fromEntries(ARRAY_KEYS.map((k) => [k, parseArr(s[k]?.value)])));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const setArrayItem = (key: string, idx: number, val: string) =>
    setArrays((p) => ({ ...p, [key]: p[key].map((v, i) => (i === idx ? val : v)) }));
  const addArrayItem = (key: string) => setArrays((p) => ({ ...p, [key]: [...(p[key] || []), ''] }));
  const removeArrayItem = (key: string, idx: number) =>
    setArrays((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const payload: Record<string, string> = { ...draft };
      for (const k of ARRAY_KEYS) {
        payload[k] = JSON.stringify((arrays[k] || []).map((s) => s.trim()).filter(Boolean));
      }
      const d: any = await adminApi.updateGeneralSettings(payload);
      const s = d.settings || {};
      setSettings(s);
      setDraft(Object.fromEntries(Object.entries(s).map(([k, v]: any) => [k, v.value])));
      setArrays(Object.fromEntries(ARRAY_KEYS.map((k) => [k, parseArr(s[k]?.value)])));
      setSaved(true);
      toast('Settings saved successfully', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { 
      console.error(e); 
      toast('Failed to save settings', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const genericEntries = Object.entries(settings).filter(([k]) => !HIDDEN_GENERIC.has(k));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Platform Settings</h2>
        <p className="text-sm text-gray-500">General configuration, social links, and contact info shown on the site. API keys are managed via environment variables, never here.</p>
      </div>

      {/* Generic settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {genericEntries.map(([key, cfg]) => (
          <div key={key} className="p-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{cfg.label}</label>
            <input value={draft[key] ?? cfg.value} onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        ))}
      </div>

      {/* Social links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Social Links</h3>
        {SOCIAL_KEYS.map((key) => {
          const meta = SOCIAL_META[key];
          return (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {meta.icon} {meta.label}
              </label>
              <input
                value={draft[key] ?? settings[key]?.value ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={meta.placeholder}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          );
        })}
      </div>

      {/* Additive contact info */}
      {ARRAY_KEYS.map((key) => {
        const meta = ARRAY_META[key];
        const items = arrays[key] || [];
        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">{meta.label}</h3>
              <button onClick={() => addArrayItem(key)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {items.length === 0 && <p className="text-xs text-gray-400 italic">None yet — click "Add".</p>}
              {items.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={val}
                    onChange={(e) => setArrayItem(key, idx, e.target.value)}
                    placeholder={meta.placeholder}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button onClick={() => removeArrayItem(key, idx)} className="w-9 h-9 shrink-0 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}
