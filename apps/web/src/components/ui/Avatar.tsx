import { useState } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number; // px
  className?: string;
}

// Deterministic, pleasant background derived from the name so fallbacks are stable.
const PALETTE = [
  'bg-emerald-600', 'bg-brand-600', 'bg-coral-500', 'bg-blue-600',
  'bg-violet-600', 'bg-amber-600', 'bg-teal-600', 'bg-rose-600',
];

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function colorFor(name?: string | null): string {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Shows a real profile photo when available, otherwise a colored initials circle.
 * Falls back to initials if the image fails to load.
 */
export default function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const dim = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };

  if (showImage) {
    return (
      <img
        src={src!}
        alt={name || 'User'}
        onError={() => setErrored(true)}
        style={{ width: size, height: size }}
        className={cn('rounded-full object-cover bg-gray-100 shrink-0', className)}
      />
    );
  }

  return (
    <div
      style={dim}
      className={cn(
        'rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none',
        colorFor(name),
        className
      )}
      aria-label={name || 'User'}
    >
      {initials(name)}
    </div>
  );
}
