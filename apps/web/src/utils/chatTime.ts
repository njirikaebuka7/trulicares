/** WhatsApp-style date/time helpers shared by the in-app chats. */

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today" / "Yesterday" / "Mon, Jun 3" (adds year if not the current year). */
export function dayLabel(d: Date): string {
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

export function timeOnly(value: string | Date): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Conversation-list stamp: time if the value is today, otherwise a short date. */
export function listStamp(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  return sameDay(d, new Date()) ? timeOnly(d) : dayLabel(d);
}
