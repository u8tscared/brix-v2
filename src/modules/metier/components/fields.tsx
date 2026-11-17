import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Minus, Plus } from 'lucide-react';
import { cn } from '@/components/ui';
import { num } from '@/lib/format';

/**
 * Champ numérique tolérant (virgule ou point), pensé pour le téléphone.
 * `step` ajoute des boutons − / + (pratique au pouce pour les petites quantités).
 */
export function NumField({ label, value, onChange, suffix, hint, min = 0, max, step, className }: { label: ReactNode; value: number; onChange: (v: number) => void; suffix?: string; hint?: ReactNode; min?: number; max?: number; step?: number; className?: string }) {
  const [raw, setRaw] = useState(String(value).replace('.', ','));
  useEffect(() => {
    const parsed = Number(raw.replace(',', '.'));
    if (parsed !== value) setRaw(String(value).replace('.', ','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));
  const bump = (d: number) => onChange(clamp(Math.round((value + d) * 100) / 100));
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1.5 block truncate text-[12.5px] font-medium text-ink-2">{label}</span>
      <span className="group/num relative flex h-11 items-center rounded-[11px] border border-line2 bg-white shadow-xs transition-[border-color,box-shadow] duration-200 focus-within:border-vi-400 focus-within:shadow-focus hover:border-[#cfcbdd]">
        {step && (
          <button type="button" tabIndex={-1} aria-label="Moins" onClick={() => bump(-step)} className="press grid h-full w-9 shrink-0 place-items-center rounded-l-[11px] text-ink-3 transition-colors hover:bg-sub hover:text-ink">
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          inputMode="decimal"
          value={raw}
          className={cn('num h-full w-full min-w-0 bg-transparent text-[15px] font-medium text-ink outline-none', step ? 'text-center' : 'px-3')}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.,-]/g, '');
            setRaw(v);
            const n = Number(v.replace(',', '.'));
            if (v !== '' && Number.isFinite(n)) onChange(clamp(n));
          }}
          onBlur={() => setRaw(String(value).replace('.', ','))}
        />
        {suffix && <span className={cn('pointer-events-none shrink-0 text-[12.5px] text-ink-3', step ? 'pr-1' : 'pr-3')}>{suffix}</span>}
        {step && (
          <button type="button" tabIndex={-1} aria-label="Plus" onClick={() => bump(step)} className="press grid h-full w-9 shrink-0 place-items-center rounded-r-[11px] text-ink-3 transition-colors hover:bg-sub hover:text-ink">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
      {hint && <span className="mt-1.5 block text-[11.5px] leading-snug text-ink-3">{hint}</span>}
    </label>
  );
}

/** Choix en pastilles : la sélection glisse d'une option à l'autre, et passe à la ligne sur téléphone. */
export function Choice<T extends string | number>({ label, value, onChange, options, hint }: { label: ReactNode; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; hint?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-k="${CSS.escape(String(value))}"]`);
      if (el) setBox({ l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div ref={wrap} role="radiogroup" className="relative flex flex-wrap gap-1 rounded-[12px] bg-[#f1eff6] p-1">
        {box && (
          <span
            aria-hidden
            className="absolute rounded-[9px] bg-white shadow-[0_1px_2px_rgba(19,15,38,.1),0_0_0_1px_rgba(19,15,38,.05)] transition-all duration-300 ease-out-quint"
            style={{ left: box.l, top: box.t, width: box.w, height: box.h }}
          />
        )}
        {options.map((o) => (
          <button
            key={String(o.value)}
            data-k={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('relative z-[1] min-h-[38px] flex-auto rounded-[9px] px-3 text-[13px] font-medium transition-colors duration-200', value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

/** Interrupteur présenté comme une ligne (étiquette + aide). */
export function ToggleRow({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-[11px] border border-line2 bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[11.5px] text-ink-3">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** Ligne de résultat : la valeur « clignote » doucement quand elle change. */
export function ResultRow({ label, value, sub, tone, strong }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'bad'; strong?: boolean }) {
  const key = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] text-ink-2">{label}</div>
        {sub && <div className="text-[11.5px] text-ink-3">{sub}</div>}
      </div>
      <div
        key={key}
        className={cn('num shrink-0 animate-[fade-up_.35s_var(--ease)_both] text-right text-[14px]', strong ? 'font-semibold' : 'font-medium', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn', tone === 'bad' && 'text-bad')}
      >
        {value}
      </div>
    </div>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  const I = tone === 'warn' ? AlertTriangle : tone === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={cn('flex animate-[fade-up_.35s_var(--ease)_both] gap-2 rounded-[11px] px-3 py-2.5 text-[12.5px] leading-snug', tone === 'warn' ? 'bg-warn-bg text-[#8a4b05]' : tone === 'ok' ? 'bg-ok-bg text-[#0f6b33]' : 'bg-[#f3f0fb] text-[#4c3a8f]')}>
      <I className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Jauge horizontale : remplissage animé, repère de limite (ex. 5 % de chute de tension).
 * value et limit dans la même unité ; max = fin d'échelle.
 */
export function Gauge({ label, value, max, limit, format = (v) => num(v, 1), unit = '', invert }: { label: ReactNode; value: number; max: number; limit?: number; format?: (v: number) => string; unit?: string; invert?: boolean }) {
  const pctV = Math.max(0, Math.min(100, (value / max) * 100));
  const over = limit !== undefined && (invert ? value < limit : value > limit);
  const near = limit !== undefined && !over && (invert ? value < limit * 1.15 : value > limit * 0.8);
  const color = over ? 'bg-bad' : near ? 'bg-warn' : 'bg-ok';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-ink-2">{label}</span>
        <span className={cn('num font-semibold', over ? 'text-bad' : near ? 'text-warn' : 'text-ok')}>
          {format(value)}{unit}
          {limit !== undefined && <span className="font-normal text-ink-3"> / {format(limit)}{unit}</span>}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[#eeecf4]">
        <div className={cn('absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700 ease-out-quint', color)} style={{ width: `${pctV}%` }} />
        {limit !== undefined && <span aria-hidden className="absolute -top-1 h-4 w-[2px] rounded-full bg-ink/70" style={{ left: `calc(${Math.min(100, (limit / max) * 100)}% - 1px)` }} />}
      </div>
    </div>
  );
}

/** Petite case de chiffre secondaire (3 par ligne sous le résultat principal). */
export function MiniStat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[#f7f6fb] px-3 py-2.5">
      <div className="truncate text-[11.5px] font-medium text-ink-3">{label}</div>
      <div key={String(value)} className="num mt-0.5 animate-[fade-up_.35s_var(--ease)_both] truncate text-[16px] font-semibold tracking-[-0.02em]">{value}</div>
      {sub && <div className="truncate text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** Titre de groupe dans la colonne de saisie. */
export function Group({ title, children, aside }: { title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const n1 = (v: number) => num(v, 1);
export const n2 = (v: number) => num(v, 2);
export const n0 = (v: number) => num(v, 0);
