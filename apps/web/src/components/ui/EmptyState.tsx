import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  /** 'card' = dashed bordered card (default); 'plain' = inline, no border. */
  variant?: 'card' | 'plain';
  className?: string;
}

/** Consistent empty state used across dashboard tabs/cards. Mobile-friendly. */
export default function EmptyState({ icon, title, subtitle, action, variant = 'card', className }: Props) {
  return (
    <div
      className={cn(
        'text-center px-6 py-10 sm:py-12',
        variant === 'card' && 'bg-white rounded-2xl border border-dashed border-gray-200',
        className
      )}
    >
      {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">{icon}</div>}
      <p className="font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
