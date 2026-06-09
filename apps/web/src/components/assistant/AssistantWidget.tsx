import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Send, Shield, Sparkles, X } from 'lucide-react';
import { assistant as assistantApi, type AssistantMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toaster';
import { cn } from '@/utils/cn';
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

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
// Bare internal paths in prose (e.g. "/contact"), not preceded by an alphanumeric.
const BARE_PATH = /(^|[^A-Za-z0-9/])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)/g;
const LINK_CLASS =
  'font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 transition hover:text-brand-800';

function renderLink(label: string, target: string, onNavigate: () => void, key: number | string) {
  if (target.startsWith('/')) {
    return (
      <Link key={key} to={target} onClick={onNavigate} className={LINK_CLASS}>
        {label}
      </Link>
    );
  }
  const isWeb = /^https?:/i.test(target);
  return (
    <a
      key={key}
      href={target}
      target={isWeb ? '_blank' : undefined}
      rel={isWeb ? 'noreferrer' : undefined}
      className={LINK_CLASS}
    >
      {label}
    </a>
  );
}

// Turns bare "/path" mentions inside a plain-text run into in-app links.
function linkifyBarePaths(text: string, onNavigate: () => void, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const regex = new RegExp(BARE_PATH);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [, prefix, path] = match;
    const start = match.index + prefix.length;
    if (start > lastIndex) out.push(text.slice(lastIndex, start));
    out.push(renderLink(path, path, onNavigate, `${keyBase}-${out.length}`));
    lastIndex = start + path.length;
  }

  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

function renderRichSegments(text: string, onNavigate: () => void) {
  const nodes: ReactNode[] = [];
  const regex = new RegExp(MARKDOWN_LINK);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (chunk: string) => {
    nodes.push(...linkifyBarePaths(chunk, onNavigate, `p${nodes.length}`));
  };

  while ((match = regex.exec(text)) !== null) {
    const [full, label, target] = match;
    if (match.index > lastIndex) pushPlain(text.slice(lastIndex, match.index));
    nodes.push(renderLink(label, target, onNavigate, nodes.length));
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) pushPlain(text.slice(lastIndex));
  return nodes;
}

function RichText({ content, onNavigate }: { content: string; onNavigate: () => void }) {
  return <p className="whitespace-pre-wrap">{renderRichSegments(content, onNavigate)}</p>;
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
            'fixed left-3 right-3 top-3 z-[960] flex flex-col overflow-hidden rounded-3xl border border-brand-100/80 bg-white shadow-[0_28px_90px_rgba(18,59,46,0.22)]',
            mobilePanelOffset,
            'sm:left-auto sm:right-6 sm:top-auto sm:h-[min(34rem,calc(100dvh-3rem))] sm:w-[21rem] sm:max-w-[calc(100vw-3rem)]',
            desktopPanelOffset
          )}
        >
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-3 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-brand-400/20 blur-2xl" />
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-coral-400/15 blur-2xl" />
            </div>
            <div className="relative flex items-center gap-3">
              <img
                src={assistantPortraitImg}
                alt="TruliCares assistant"
                className="h-10 w-10 shrink-0 rounded-full border border-white/20 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                style={{ objectPosition: ASSISTANT_AVATAR_POSITION }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold sm:text-base">TruliCares Assistant</h2>
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
                className="shrink-0 rounded-full border border-white/10 bg-white/10 p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
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
                        'max-w-[88%] break-words rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[20rem]',
                        message.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'border border-brand-100 bg-white text-slate-700'
                      )}
                    >
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <RichText content={message.content} onNavigate={() => setOpen(false)} />
                      )}
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

            <div className="shrink-0 border-t border-slate-100 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] leading-4 text-slate-400">
                <Shield className="h-3 w-3 shrink-0 text-brand-600" />
                <span className="truncate">Never share card numbers, passwords, or ID numbers here.</span>
              </div>

              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend(draft);
                    }
                  }}
                  rows={1}
                  placeholder="Ask about care, staffing, or support..."
                  className="max-h-28 min-h-[2.5rem] w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-slate-700 outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={() => void handleSend(draft)}
                  disabled={!draft.trim() || sending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 px-1 text-[10px] text-slate-400">Press Enter to send</p>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-[0_18px_42px_rgba(14,58,47,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-[0_22px_48px_rgba(14,58,47,0.35)]"
          aria-label="Open TruliCares Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
