// Bandeau de chiffres « un héros, des seconds rôles » : un chiffre qui compte, mis en scène,
// puis quelques repères discrets. Remplace les rangées de 4 cases identiques.

import type { ReactNode } from 'react';
import { AnimatedNumber, useInView } from '@/components/motion';
import { cn } from '@/components/ui';

export interface Kpi {
  label: ReactNode;
  value: number | string;
  format?: (n: number) => string;
  sub?: ReactNode;
  tone?: 'bad' | 'warn' | 'ok';
}

const TONE = { bad: 'text-bad', warn: 'text-warn', ok: 'text-ok' } as const;

function Value({ k, className }: { k: Kpi; className?: string }) {
  return (
    <span className={cn('num', k.tone && TONE[k.tone], className)}>
      {typeof k.value === 'number' ? <AnimatedNumber value={k.value} format={k.format} /> : k.value}
    </span>
  );
}

export function KpiBand({ hero, items, aside, className }: { hero: Kpi & { extra?: ReactNode }; items: Kpi[]; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[18px] bg-white shadow-card', className)}>
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-56 w-72 rounded-full bg-dawn-soft opacity-80 blur-2xl" />
      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
        <div className="p-5 md:p-6">
          <div className="eyebrow">{hero.label}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Value k={hero} className="dawn-text whitespace-nowrap text-[40px] font-semibold leading-none tracking-[-0.05em] md:text-[46px]" />
            {hero.sub && <span className="text-[13px] text-ink-2">{hero.sub}</span>}
          </div>
          {hero.extra && <div className="mt-4">{hero.extra}</div>}
        </div>
        <div className="grid grid-cols-3 border-t border-line lg:border-l lg:border-t-0">
          {items.map((k, i) => (
            <div key={i} className={cn('min-w-0 px-4 py-4 md:px-5 md:py-6', i > 0 && 'border-l border-line')}>
              <div className="text-[12px] font-medium leading-tight text-ink-3 md:truncate md:text-[12.5px]">{k.label}</div>
              <Value k={k} className="mt-1.5 block text-[19px] font-semibold leading-none tracking-[-0.035em] md:text-[24px]" />
              {k.sub && <div className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-ink-2 md:text-[12px]">{k.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      {aside}
    </div>
  );
}

/** Deux barres superposées : réalisé contre prévu. */
export function VersusBars({ real, planned, realLabel, plannedLabel, max = 60 }: { real: number; planned: number; realLabel: string; plannedLabel: string; max?: number }) {
  const bad = real < planned - 6;
  const warn = !bad && real < planned - 2;
  return (
    <div className="space-y-2 text-[12px]">
      {[
        { l: realLabel, v: real, c: bad ? 'bg-bad' : warn ? 'bg-warn' : 'bg-ok', strong: true },
        { l: plannedLabel, v: planned, c: 'bg-[#d6d3e2]', strong: false },
      ].map((r) => (
        <div key={r.l} className="flex items-center gap-3">
          <span className={cn('w-16 shrink-0', r.strong ? 'font-medium text-ink' : 'text-ink-3')}>{r.l}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-sub">
            <GrowFill value={(r.v / max) * 100} className={r.c} />
          </div>
          <span className={cn('num w-10 shrink-0 text-right', r.strong ? 'font-semibold' : 'text-ink-3')}>{Math.round(r.v)} %</span>
        </div>
      ))}
    </div>
  );
}

function GrowFill({ value, className }: { value: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={cn('h-full rounded-full transition-[width] duration-[1100ms] ease-out-quint', className)} style={{ width: seen ? `${Math.max(2, Math.min(100, value))}%` : '0%' }} />;
}
