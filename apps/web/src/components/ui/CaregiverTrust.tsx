import { ShieldCheck, BadgeCheck, MapPin } from 'lucide-react';
import { cn } from '@/utils/cn';

/** A "3 mi away" / "Near you" pill. Renders nothing when there's no signal. */
export function DistanceChip({ miles, nearYou, className }: { miles?: number | null; nearYou?: boolean; className?: string }) {
  let label: string | null = null;
  if (typeof miles === 'number' && miles >= 0) {
    label = miles < 1 ? 'Less than 1 mi away' : `${Math.round(miles)} mi away`;
  } else if (nearYou) {
    label = 'Near you';
  }
  if (!label) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap', className)}>
      <MapPin className="w-3 h-3 shrink-0" /> {label}
    </span>
  );
}

/** Verified / Background-checked pills. Compact mode shrinks to icon-only for tight rows. */
export function TrustBadges({
  verified,
  backgroundChecked,
  compact = false,
  className,
}: {
  verified?: boolean;
  backgroundChecked?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (!verified && !backgroundChecked) return null;
  return (
    <div className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      {verified && (
        <span
          title="Identity verified"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap"
        >
          <BadgeCheck className="w-3 h-3 shrink-0" />
          {!compact && 'Verified'}
        </span>
      )}
      {backgroundChecked && (
        <span
          title="Background checked"
          className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap"
        >
          <ShieldCheck className="w-3 h-3 shrink-0" />
          {!compact && 'Checked'}
        </span>
      )}
    </div>
  );
}
