import { useState, useEffect, useCallback } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { admin as adminApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';

interface Ticket {
  id: string; name?: string; email?: string; subject: string; message: string;
  category?: string; status: string; created_at: string;
}

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

/** Support tickets queue — view + change status. */
export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await adminApi.tickets({ status: filter === 'all' ? undefined : filter });
      setTickets(r.tickets || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Real-time: refresh when a support ticket is created/updated (e.g. contact form).
  useEffect(() => {
    const channel = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    try { await adminApi.updateTicket(id, status); } catch { load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500">Messages from the contact form and in-app support.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold">
          <option value="all">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No tickets.</div>
        ) : tickets.map((t) => (
          <div key={t.id} className="p-4 border-b border-gray-50 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <button className="min-w-0 text-left flex-1" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <p className="text-sm font-bold text-gray-900 truncate">{t.subject}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {t.name || 'Anon'} · {t.email} · {new Date(t.created_at).toLocaleDateString()}</p>
                {expanded === t.id && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{t.message}</p>}
              </button>
              <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}
                className={cn('shrink-0 text-[10px] font-bold uppercase rounded-lg px-2 py-1 border-0 outline-none',
                  t.status === 'open' ? 'bg-red-50 text-red-700' :
                  t.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                  t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
