// Petits éléments partagés du module Devis.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/ui';

/** Anneau de probabilité de signature. */
export function ScoreRing({ value, size = 34, title }: { value: number; size?: number; title?: string }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 70 ? '#16a34a' : value >= 45 ? '#d97706' : '#dc2626';
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} title={title}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span className="num absolute text-[10.5px] font-semibold text-ink">{value}</span>
    </span>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hint?: string;
  divider?: boolean;
}

/** Menu déroulant léger (ancré à droite du bouton). */
export function Menu({ trigger, items, align = 'right', className }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; items: MenuItem[]; align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cn('absolute top-full z-[60] mt-1.5 min-w-[220px] animate-scale-in rounded-[18px] bg-white p-1.5 shadow-[0_0_0_1px_#ece8f6,0_24px_48px_-16px_rgba(60,30,120,.28)]', align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left')} role="menu">
          {items.map((it, i) => (
            <div key={i}>
              {it.divider && <div className="my-1 h-px bg-[#f2eff8]" />}
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={cn('flex h-10 w-full items-center gap-2.5 rounded-[12px] px-2.5 text-left text-[13.5px] transition hover:bg-halo-hover md:h-9 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0', it.danger ? 'text-bad' : 'text-ink [&_svg]:text-ink-2')}
              >
                {it.icon}
                <span className="flex-1 whitespace-nowrap">{it.label}</span>
                {it.hint && <span className="text-[11.5px] text-ink-3">{it.hint}</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Champ numérique discret, éditable en place (virgule française acceptée). */
export function NumInput({ value, onChange, className, step = 1, ariaLabel, decimals = 2, fixed }: { value: number; onChange: (v: number) => void; className?: string; step?: number; ariaLabel: string; decimals?: number; fixed?: boolean }) {
  const fmt = (v: number) => (Number.isFinite(v) ? (fixed ? v.toFixed(decimals) : String(Math.round(v * 10 ** decimals) / 10 ** decimals)).replace('.', ',') : '');
  const [txt, setTxt] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setTxt(fmt(value));
  }, [value, focus]);
  return (
    <input
      inputMode="decimal"
      aria-label={ariaLabel}
      value={txt}
      onFocus={(e) => {
        setFocus(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocus(false);
        const v = Number(txt.replace(/\s/g, '').replace(',', '.'));
        if (Number.isFinite(v)) onChange(v);
        else setTxt(fmt(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const v = Number(txt.replace(',', '.')) || 0;
          const nv = Math.max(0, v + (e.key === 'ArrowUp' ? step : -step));
          setTxt(fmt(nv));
          onChange(nv);
        }
      }}
      onChange={(e) => setTxt(e.target.value)}
      className={cn('num h-8 w-full rounded-[10px] border border-transparent bg-transparent px-1.5 text-right text-[13.5px] transition hover:border-[#ece8f6] focus:border-vi-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vi-100', className)}
    />
  );
}

/** Indicateur « Enregistré » qui passe brièvement à « Enregistrement… » à chaque modification. */
export function useSavedFlash(dep: unknown) {
  const [saving, setSaving] = useState(false);
  const prev = useRef(dep);
  useEffect(() => {
    if (prev.current === dep) return;
    prev.current = dep;
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 550);
    return () => clearTimeout(t);
  }, [dep]);
  return saving;
}
