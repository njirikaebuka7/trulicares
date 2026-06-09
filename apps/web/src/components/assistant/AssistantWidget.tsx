import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, Shield, Sparkles, X } from 'lucide-react';
import { assistant as assistantApi, type AssistantMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toaster';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';
import assistantPortraitImg from '@/assets/blog-nanny-interview.jpg';

const GUEST_TOKEN_KEY = 'tc_assistant_guest_token';
const GUEST_CONVERSATION_KEY = 'tc_assistant_conversation_guest';
const ASSISTANT_AVATAR_POSITION = '76% 24%';

function defaultPrompts(role?: string | null) {
  if (role === 'family') {
    return [
      'Can you summarize my account?',
      'How do I post a care request?',
      'How does messaging unlock work?',
      'What should I do if a match is not the right fit?',
    ];
  }
  if (role === 'caregiver') {
    return [
      'Can you summarize my profile status?',
      'How do verification badges work?',
      'What can families see on my profile?',
      'How do I prepare for better matches?',
    ];
  }
  if (role === 'professional') {
    return [
      'Can you summarize my staffing account?',
      'How do wallet payouts work?',
      'What do I need before applying to shifts?',
      'How do I finish verification?',
    ];
  }
  if (role === 'facility') {
    return [
      'Can you summarize my facility account?',
      'How do I post a shift?',
      'How do escrow-protected bookings work?',
      'What can I review before accepting an applicant?',
    ];
  }
  return [
    'How does TruliCares work?',
    'What services do you offer?',
    'How do I become a caregiver or professional?',
    'How can I contact support?',
  ];
}

function ensureGuestToken() {
  const existing = localStorage.getItem(GUEST_TOKEN_KEY);
  if (existing) return existing;
  const generated = window.crypto?.randomUUID?.() || `guest-${Date.now()}`;
  localStorage.setItem(GUEST_TOKEN_KEY, generated);
  return generated;
}

export default function AssistantWidget() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [starterPrompts, setStarterPrompts] = useState<string[]>(defaultPrompts(user?.role));
  const [draft, setDraft] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const role = user?.role ?? 'guest';
  const isAdmin = user?.role === 'admin';
  const isDashboardLike =
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/professional-dashboard') ||
    location.pathname.startsWith('/facility-dashboard');

  const storageKey = useMemo(
    () => (user?.id ? `tc_assistant_conversation_${user.id}` : GUEST_CONVERSATION_KEY),
    [user?.id]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setGuestToken(ensureGuestToken());
    } else {
      setGuestToken(undefined);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading || isAdmin) return;

    const storedConversationId = localStorage.getItem(storageKey);
    setConversationId(storedConversationId);
    setStarterPrompts(defaultPrompts(user?.role));
    startTransition(() => {
      setMessages([]);
    });

    if (!storedConversationId) return;

    setLoadingConversation(true);
    assistantApi
      .getConversation(storedConversationId, user ? undefined : ensureGuestToken())
      .then((data) => {
        startTransition(() => {
          setMessages(data.messages || []);
          setStarterPrompts(data.starterPrompts?.length ? data.starterPrompts : defaultPrompts(user?.role));
        });
        if (data.guestToken) {
          localStorage.setItem(GUEST_TOKEN_KEY, data.guestToken);
          setGuestToken(data.guestToken);
        }
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
        startTransition(() => setMessages([]));
      })
      .finally(() => setLoadingConversation(false));
  }, [isAdmin, isLoading, storageKey, user, user?.role]);

  useEffect(() => {
    if (!open) return;
    const element = messagesRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, open, sending]);

  if (isLoading || isAdmin) return null;

  const launcherOffset = isDashboardLike ? 'bottom-24' : 'bottom-5';
  const mobilePanelOffset = isDashboardLike ? 'bottom-24' : 'bottom-3';
  const desktopPanelOffset = isDashboardLike ? 'sm:bottom-24' : 'sm:bottom-6';

  const handleSend = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || sending) return;

    const optimisticMessage: AssistantMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setDraft('');
    setSending(true);
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await assistantApi.chat({
        conversationId: conversationId || undefined,
        guestToken: user ? undefined : guestToken || ensureGuestToken(),
        message,
        pagePath: location.pathname,
        pageTitle: document.title,
      });

      setConversationId(response.conversationId);
      localStorage.setItem(storageKey, response.conversationId);
      if (response.guestToken) {
        localStorage.setItem(GUEST_TOKEN_KEY, response.guestToken);
        setGuestToken(response.guestToken);
      }

      setStarterPrompts(response.starterPrompts?.length ? response.starterPrompts : defaultPrompts(role));
      setMessages((prev) => [...prev, response.assistantMessage]);
    } catch (err: any) {
      toast(err.message || 'Assistant is unavailable right now.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('fixed right-4 z-[950] sm:right-6', launcherOffset)}>
      {open && (
        <div
          className={cn(
            'fixed left-3 right-3 top-3 z-[960] flex flex-col overflow-hidden rounded-[30px] border border-brand-100/80 bg-white shadow-[0_28px_90px_rgba(18,59,46,0.22)]',
            mobilePanelOffset,
            'sm:left-auto sm:right-6 sm:top-auto sm:h-[calc(100dvh-2.5rem)] sm:max-h-[46rem] sm:w-[calc(100vw-3rem)] sm:max-w-[28rem]',
            desktopPanelOffset
          )}
        >
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 pb-4 pt-4 text-white sm:px-5 sm:pb-5">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-brand-400/20 blur-2xl" />
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-coral-400/15 blur-2xl" />
              <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <img
                  src={assistantPortraitImg}
                  alt="TruliCares assistant"
                  className="h-12 w-12 shrink-0 rounded-2xl border border-white/20 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                  style={{ objectPosition: ASSISTANT_AVATAR_POSITION }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-bold sm:text-lg">TruliCares Assistant</h2>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-100">
                      24/7
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-brand-100/80">
                    {user ? 'Secure account-aware guidance' : 'Warm care and staffing guidance'}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label="Close assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-brand-100/85">
                Real-time help for care, staffing, support, and the next step that fits your account.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,#f5fcf7_0%,#ffffff_32%),linear-gradient(180deg,#fffaf4_0%,#ffffff_24%)]">
            <div ref={messagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {loadingConversation ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-3xl bg-brand-50" />
                  <div className="ml-auto h-12 w-3/4 animate-pulse rounded-3xl bg-slate-100" />
                  <div className="h-14 w-5/6 animate-pulse rounded-3xl bg-brand-50" />
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-brand-100 bg-white/85 p-4 shadow-sm backdrop-blur">
                    <div className="mb-3 flex items-center gap-3">
                      <img
                        src={assistantPortraitImg}
                        alt="TruliCares assistant"
                        className="h-11 w-11 rounded-2xl object-cover"
                        style={{ objectPosition: ASSISTANT_AVATAR_POSITION }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-brand-700">
                          <Sparkles className="h-4 w-4" />
                          <span className="text-xs font-semibold uppercase tracking-[0.18em]">Ask anything</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">Grounded in TruliCares</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">
                      I can explain how TruliCares works, point you to the right page, and help with support or your own account when that access is available.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {starterPrompts.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => void handleSend(prompt)}
                        className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-800"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-end gap-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role !== 'user' && (
                      <img
                        src={assistantPortraitImg}
                        alt="TruliCares assistant"
                        className="h-9 w-9 shrink-0 rounded-2xl border border-brand-100 object-cover shadow-sm"
                        style={{ objectPosition: ASSISTANT_AVATAR_POSITION }}
                      />
                    )}
                    <div
                      className={cn(
                        'max-w-[88%] break-words rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[26rem]',
                        message.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'border border-brand-100 bg-white text-slate-700'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <img
                      src={assistantPortraitImg}
                      alt="TruliCares assistant"
                      className="h-9 w-9 shrink-0 rounded-2xl border border-brand-100 object-cover shadow-sm"
                      style={{ objectPosition: ASSISTANT_AVATAR_POSITION }}
                    />
                    <div className="rounded-[24px] border border-brand-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:220ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur sm:px-5">
              <div className="mb-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                <Shield className="h-3.5 w-3.5 text-brand-600" />
                Never share card numbers, passwords, or government ID numbers here.
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend(draft);
                    }
                  }}
                  rows={2}
                  placeholder="Ask about care, staffing, support, or your next step..."
                  className="min-h-[4.5rem] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400">Press Enter to send</p>
                  <button
                    onClick={() => void handleSend(draft)}
                    disabled={!draft.trim() || sending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    Send
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="group flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-brand-200 bg-white/95 px-3 py-3 shadow-[0_18px_42px_rgba(14,58,47,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(14,58,47,0.2)] sm:px-4"
        aria-label="Open TruliCares Assistant"
      >
        <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-white shadow-inner ring-1 ring-brand-100">
          <img src={logoImg} alt="" className="h-8 w-auto" aria-hidden="true" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-white shadow">
            <MessageCircle className="h-3 w-3" />
          </span>
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Need Help?</span>
          <span className="block text-sm font-semibold text-slate-800">Ask TruliCares</span>
        </span>
      </button>
    </div>
  );
}
