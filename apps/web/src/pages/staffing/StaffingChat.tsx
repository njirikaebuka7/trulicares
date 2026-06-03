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

// ── Date/time helpers (WhatsApp-style) ───────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}
function timeOnly(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
/** Conversation-list stamp: time if today, otherwise short date. */
function listStamp(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  return sameDay(date, new Date()) ? timeOnly(d) : dayLabel(date);
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
    // h-[...] gives the card a fixed height; min-h-0 on the flex children is what lets
    // the inner lists actually scroll instead of pushing the page taller.
    <div className="max-w-6xl mx-auto h-[calc(100dvh-8.5rem)] min-h-[460px]">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-full min-h-0">
        {/* Conversation list */}
        <aside className={cn('w-full md:w-80 lg:w-96 border-r border-gray-100 flex-col min-h-0', activeId ? 'hidden md:flex' : 'flex')}>
          <div className="px-5 h-14 flex items-center border-b border-gray-100 shrink-0">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" /> Messages
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                  <Avatar name={c.otherName} src={c.otherPhoto} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.otherName}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{listStamp(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 truncate">{c.lastMessage || c.otherRole}</p>
                      {c.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={cn('flex-1 flex-col min-h-0', activeId ? 'flex' : 'hidden md:flex')}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 h-14 flex items-center gap-3 border-b border-gray-100 shrink-0 bg-white">
                <button onClick={() => setActiveId(null)} className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-900">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Avatar name={active.otherName} src={active.otherPhoto} size={38} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{active.otherName}</p>
                  <p className="text-xs text-emerald-600">{active.otherRole}</p>
                </div>
              </div>

              {/* Messages (scrollable) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-1 bg-[#f7f8fa]">
                {loadingThread ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-10">No messages yet. Say hello 👋</div>
                ) : (
                  messages.map((m, i) => {
                    const prev = messages[i - 1];
                    const showDayDivider = !prev || !sameDay(new Date(prev.createdAt), new Date(m.createdAt));
                    return (
                      <div key={m.id}>
                        {showDayDivider && (
                          <div className="flex justify-center my-3">
                            <span className="px-3 py-1 rounded-full bg-white text-gray-500 text-[11px] font-medium shadow-sm border border-gray-100">
                              {dayLabel(new Date(m.createdAt))}
                            </span>
                          </div>
                        )}
                        <div className={cn('flex', m.isOwn ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
                              m.isOwn
                                ? 'bg-emerald-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <p className={cn('text-[10px] mt-0.5 text-right', m.isOwn ? 'text-emerald-100' : 'text-gray-400')}>
                              {timeOnly(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0 bg-white">
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
