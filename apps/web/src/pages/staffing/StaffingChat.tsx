import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Send, ChevronLeft, Loader2 } from 'lucide-react';
import { get, post } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';

interface Conversation {
  id: string;
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  otherRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

function timeShort(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Facility <-> Professional in-app chat. Role-agnostic; the API returns the "other" party. */
export default function StaffingChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;

  const loadConversations = useCallback(async () => {
    try {
      const d: any = await get('/staffing/conversations');
      setConversations(d.conversations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingThread(true);
    try {
      const d: any = await get(`/staffing/conversations/${id}/messages`);
      setMessages(d.messages || []);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // Realtime: append incoming messages for the open thread.
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`staffing_chat:${activeId}`)
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        const m = payload.payload;
        if (!m || m.sender_id === user?.id) return;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id)
            ? prev
            : [...prev, { id: m.id, senderId: m.sender_id, content: m.content, createdAt: m.created_at, isOwn: false, senderName: m.senderName }]
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const d: any = await post(`/staffing/conversations/${activeId}/messages`, { content });
      setMessages((prev) => [...prev, d.message]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() } : c))
      );
    } catch (e: any) {
      console.error(e);
      setDraft(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[calc(100vh-180px)] min-h-[420px]">
        {/* Conversation list */}
        <aside className={cn('w-full md:w-80 border-r border-gray-100 flex-col', activeId ? 'hidden md:flex' : 'flex')}>
          <div className="px-5 h-14 flex items-center border-b border-gray-100 shrink-0">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" /> Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No conversations yet. A chat opens once a shift application is accepted.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openThread(c.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50',
                    activeId === c.id && 'bg-emerald-50/60'
                  )}
                >
                  <Avatar name={c.otherName} src={c.otherPhoto} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.otherName}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeShort(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.lastMessage || c.otherRole}</p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={cn('flex-1 flex-col', activeId ? 'flex' : 'hidden md:flex')}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <MessageCircle className="w-10 h-10" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 h-14 flex items-center gap-3 border-b border-gray-100 shrink-0">
                <button onClick={() => setActiveId(null)} className="md:hidden p-1 -ml-1 text-gray-500">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Avatar name={active.otherName} src={active.otherPhoto} size={36} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{active.otherName}</p>
                  <p className="text-xs text-emerald-600">{active.otherRole}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40">
                {loadingThread ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn('flex', m.isOwn ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                          m.isOwn ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={cn('text-[10px] mt-1', m.isOwn ? 'text-emerald-100' : 'text-gray-400')}>{timeShort(m.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type a message…"
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-emerald-700 transition-colors shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
