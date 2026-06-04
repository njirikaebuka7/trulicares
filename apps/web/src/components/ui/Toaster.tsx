import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType }

// Module-level pub/sub so any code can call toast() without prop drilling.
let listeners: Array<(t: ToastItem) => void> = [];
let counter = 0;

/** Show a toast from anywhere: toast('Saved!') or toast('Oops', 'error'). */
export function toast(message: string, type: ToastType = 'success') {
  const item = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

/** Mount once near the app root. Renders active toasts (mobile-friendly, bottom-center). */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3800);
    };
    listeners.push(onToast);
    return () => { listeners = listeners.filter((l) => l !== onToast); };
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2',
            t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'info' ? 'bg-gray-900 text-white' : 'bg-emerald-600 text-white'
          )}
        >
          {t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : t.type === 'info' ? <Info className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100 shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
