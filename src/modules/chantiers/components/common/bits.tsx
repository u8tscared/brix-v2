// Petits composants partagés du département Chantiers.

import { ArrowDownRight, ArrowRight, ArrowUpRight, Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSun, Sun, type LucideProps } from 'lucide-react';
import { Avatar, cn } from '@/components/ui';
import type { Employee } from '@/lib/types';
import type { Sky } from '../../lib/weather';

export function WeatherIcon({ sky, ...p }: { sky: Sky } & LucideProps) {
  const C = { soleil: Sun, eclaircies: CloudSun, nuageux: Cloud, pluie: CloudRain, averses: CloudDrizzle, orage: CloudLightning }[sky];
  const color = { soleil: '#f59e0b', eclaircies: '#f59e0b', nuageux: '#9898a8', pluie: '#3b82f6', averses: '#3b82f6', orage: '#6d28d9' }[sky];
  return <C strokeWidth={1.75} color={color} {...p} />;
}

export function TeamAvatars({ team, size = 26, max = 4 }: { team: (Employee | undefined)[]; size?: number; max?: number }) {
  const list = team.filter(Boolean) as Employee[];
  if (!list.length) return <span className="text-xs text-ink-3">Personne</span>;
  return (
    <span className="flex items-center" title={list.map((e) => `${e.firstName} ${e.lastName}`).join(', ')}>
      {list.slice(0, max).map((e, i) => (
        <Avatar key={e.id} initials={e.initials} color={e.color} size={size} ring className={i ? '-ml-1.5' : ''} />
      ))}
      {list.length > max && <span className="-ml-1.5 grid place-items-center rounded-full bg-halo-track text-[10px] font-semibold text-ink-2 ring-2 ring-white" style={{ width: size, height: size }}>+{list.length - max}</span>}
    </span>
  );
}

/** Marge réelle comparée à la marge prévue, avec une flèche. */
export function MarginDelta({ real, planned, compact }: { real: number; planned: number; compact?: boolean }) {
  const delta = real - planned;
  const tone = delta < -6 ? 'text-bad' : delta < -2 ? 'text-warn' : 'text-ok';
  const Arrow = delta < -2 ? ArrowDownRight : delta > 2 ? ArrowUpRight : ArrowRight;
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className={cn('num inline-flex items-center gap-0.5 font-semibold', tone)}>
        {Math.round(real)} %
        <Arrow className="h-3.5 w-3.5 self-center" strokeWidth={2} />
      </span>
      {!compact && <span className="num hidden text-xs text-ink-3 xl:inline">prévu {Math.round(planned)} %</span>}
    </span>
  );
}

export function Ring({ value, size = 44, stroke = 4, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ink)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="num absolute text-[11px] font-semibold">{Math.round(value)} %</span>
    </span>
  );
}

/** Barres dégradées Halo : la teinte dit si ça tient (vert), glisse (ambre), décroche (rose) ou avance (violet). */
export const BAR = {
  ok: 'bg-[linear-gradient(90deg,#6ee7b7,#10b981)]',
  warn: 'bg-[linear-gradient(90deg,#fcd34d,#f59e0b)]',
  bad: 'bg-[linear-gradient(90deg,#fb923c,#f43f5e)]',
  vi: 'bg-[linear-gradient(90deg,#a78bfa,#6d28d9)]',
  dawn: 'bg-[linear-gradient(90deg,#6d28d9,#d946ef_60%,#fb923c)]',
} as const;
