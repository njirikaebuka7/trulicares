import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { admin as adminApi } from '@/lib/api';

/** Platform general settings (name, support email, links, defaults). */
export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, { value: string; label: string }>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.generalSettings().then((d: any) => {
      setSettings(d.settings || {});
      setDraft(Object.fromEntries(Object.entries(d.settings || {}).map(([k, v]: any) => [k, v.value])));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const d: any = await adminApi.updateGeneralSettings(draft);
      setSettings(d.settings || {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Platform Settings</h2>
        <p className="text-sm text-gray-500">General configuration. API keys are managed via environment variables, never here.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {Object.entries(settings).map(([key, cfg]) => (
          <div key={key} className="p-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{cfg.label}</label>
            <input value={draft[key] ?? cfg.value} onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}
