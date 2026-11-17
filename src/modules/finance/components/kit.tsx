// Petites briques partagées par Argent, Équipe et Achats internes.
// Elles s'appuient sur le kit UI et le motion design communs, sans les modifier.
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatedNumber, useInView } from '@/components/motion';
import { BobWave } from '@/components/layout/BobWave';
import { cn } from '@/components/ui';
import { money } from '@/lib/format';

/** Bob prend la parole : marque nuit + texte au tutoiement + actions éventuelles. */
export function BobSays({ children, actions, tone = 'calm', className, title = 'Bob' }: { children: ReactNode; actions?: ReactNode; tone?: 'calm' | 'warn'; className?: string; title?: ReactNode }) {
  return (
    <div className={cn('relative flex flex-col gap-3 overflow-hidden rounded-[16px] bg-white p-4 shadow-card sm:flex-row sm:items-center md:px-5', tone === 'warn' && 'shadow-[0_0_0_1px_#fde3b0,0_1px_2px_rgba(19,15,38,.04)]', className)}>
      {tone === 'warn' && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#f59e0b]" />}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-night text-white shadow-ink">
          <BobWave active className="h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold uppercase tracking-[.08em] text-ink-3">{title}</div>
          <div className="mt-0.5 text-[14px] leading-relaxed text-ink">{children}</div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:pl-2">{actions}</div>}
    </div>
  );
}

/** Grand chiffre animé, le seul de l'écran en dégradé Aube si `dawn`. */
export function BigMoney({ value, className, dawn, signed, cents }: { value: number; className?: string; dawn?: boolean; signed?: boolean; cents?: boolean }) {
  return (
    <AnimatedNumber
      value={value}
      format={(n) => `${signed && n > 0 ? '+' : ''}${money(n, !cents)}`}
      className={cn('font-semibold leading-none tracking-[-0.045em]', dawn && 'dawn-text', className)}
    />
  );
}

/** Ligne de libellé discret au-dessus d'un chiffre. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2', className)}>{children}</div>;
}

const RING_COLOR = { ok: '#16a34a', warn: '#d97706', bad: '#dc2626', ink: 'var(--ink)', vi: '#6d28d9', teal: '#0891b2' } as const;
export type RingTone = keyof typeof RING_COLOR;

/** Anneau compte à rebours (jours restants), rouge si dépassé. */
export function DaysRing({ days, horizon = 90, size = 44, stroke = 4, className, label }: { days: number; horizon?: number; size?: number; stroke?: number; className?: string; label?: ReactNode }) {
  const tone: RingTone = days < 0 ? 'bad' : days <= horizon ? 'warn' : 'ok';
  const value = days < 0 ? 100 : Math.max(4, Math.min(100, (days / horizon) * 100));
  return (
    <ToneRing value={value} tone={tone} size={size} stroke={stroke} className={className}>
      <span className={cn('flex flex-col items-center leading-none', days < 0 ? 'text-bad' : days <= horizon ? 'text-warn' : 'text-ink')}>
        {label ?? (
          <>
            <span className="num text-[12px] font-semibold">{Math.abs(days) > 999 ? '999+' : Math.abs(days)}</span>
            <span className="text-[8.5px] font-medium opacity-70">{days < 0 ? 'retard' : 'jours'}</span>
          </>
        )}
      </span>
    </ToneRing>
  );
}

/** Anneau de progression avec toutes les teintes de statut (dont rouge). */
export function ToneRing({ value, tone = 'ink', size = 40, stroke = 4, children, className }: { value: number; tone?: RingTone; size?: number; stroke?: number; children?: ReactNode; className?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span ref={ref} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING_COLOR[tone]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={seen ? c * (1 - pct / 100) : c} style={{ transition: 'stroke-dashoffset 1.1s var(--ease) .1s' }} />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}

/** Barre segmentée (répartition) qui se dessine à l'arrivée. */
export function SplitBar({ parts, className }: { parts: { value: number; color: string; label?: string }[]; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  return (
    <div ref={ref} className={cn('flex h-2 gap-[3px] overflow-hidden rounded-full', className)}>
      {parts.map((p, i) => (
        <span key={i} title={p.label} className="h-full rounded-full transition-[width] duration-[1100ms] ease-out-quint" style={{ width: seen ? `${(Math.max(0, p.value) / total) * 100}%` : '0%', background: p.color, transitionDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}

/** En-tête de section léger (sans boîte). */
export function SectionHead({ title, meta, action, className }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[32px] items-end justify-between gap-3', className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="text-[15.5px] font-semibold tracking-[-0.02em]">{title}</h2>
        {meta && <span className="truncate text-[12.5px] text-ink-3">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

/** Ligne qui disparaît en douceur quand elle est traitée (validée, payée…). */
export function useLeaving(ms = 420) {
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});
  const leave = (id: string, after: () => void) => {
    setLeaving((l) => ({ ...l, [id]: true }));
    setTimeout(() => {
      after();
      setLeaving((l) => {
        const n = { ...l };
        delete n[id];
        return n;
      });
    }, ms);
  };
  return { leaving, leave };
}

/** Classe de sortie pour une ligne traitée. */
export const leaveCls = (on?: boolean) => (on ? 'pointer-events-none translate-x-3 opacity-0 transition-[opacity,transform] duration-[400ms] ease-out-quint' : 'transition-[opacity,transform] duration-300');

/** Horloge qui avance chaque seconde. */
export function useNow(every = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

/** Durée en « 3 h 05 ». */
export const hhmm = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
