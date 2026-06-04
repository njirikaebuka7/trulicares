import { useState, useEffect, useCallback } from 'react';
import { Loader2, StickyNote } from 'lucide-react';
import { admin as adminApi } from '@/lib/api';

/** Internal admin notes panel for an entity (e.g. a user). Notes are admin-only. */
export default function AdminNotes({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r: any = await adminApi.notes(entityType, entityId);
      setNotes(r.notes || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await adminApi.addNote(entityType, entityId, draft.trim());
      setDraft('');
      load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5" /> Admin Notes
      </h4>
      <div className="flex gap-2 mb-3">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an internal note…"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400" />
        <button onClick={add} disabled={saving || !draft.trim()}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
        </button>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400">No notes yet.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-sm text-gray-800">{n.note}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{n.admin_name || 'Admin'} · {new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
