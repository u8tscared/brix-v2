import type { ReactNode } from 'react';
import { cn } from './cn';

/** En-tête de page : petite tuile du domaine, titre, sous-titre, actions. Apparaît en douceur. */
export function PageHeader({ title, subtitle, actions, kicker, icon, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; kicker?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex animate-[page-in_.5s_var(--ease)_both] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 items-center gap-3.5">
        {icon && <div className="hidden sm:block">{icon}</div>}
        <div className="min-w-0">
          {kicker && <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3">{kicker}</div>}
          <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** État vide : une petite scène plutôt qu'un trou. */
export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex flex-col items-center justify-center overflow-hidden rounded-[18px] bg-white px-6 py-14 text-center shadow-card', className)}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38px] h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-dashed border-line2 opacity-70" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[78px] h-[140px] w-[140px] -translate-x-1/2 rounded-full border border-line opacity-80" />
      {icon && (
        <div className="relative mb-4 grid h-14 w-14 animate-float place-items-center rounded-[18px] bg-white text-vi-700 shadow-lift [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      )}
      <div className="relative text-[16px] font-semibold tracking-[-0.02em]">{title}</div>
      {text && <p className="relative mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-2">{text}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, hero, className, children }: { label: ReactNode; value: ReactNode; sub?: ReactNode; hero?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('relative min-w-0 p-4 md:p-5', className)}>
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-2 font-semibold', hero ? 'text-[34px] leading-none tracking-[-0.045em] dawn-text' : 'text-[24px] leading-none tracking-[-0.035em]')}>{value}</div>
      {sub && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-2">{sub}</div>}
      {children}
    </div>
  );
}

/** Bloc de chargement scintillant. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

/** Info-bulle légère au survol (ordinateur). */
export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'right' }) {
  const pos = { top: 'bottom-full left-1/2 mb-2 -translate-x-1/2', bottom: 'top-full left-1/2 mt-2 -translate-x-1/2', right: 'left-full top-1/2 ml-2 -translate-y-1/2' }[side];
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute z-50 whitespace-nowrap rounded-[8px] bg-ink px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-pop transition duration-150 group-hover/tip:opacity-100 group-hover/tip:delay-300 max-md:hidden', pos)}>
        {label}
      </span>
    </span>
  );
}

export function Avatar({ initials, color = '#ebe2fe', fg, size = 28, className, ring }: { initials: string; color?: string; fg?: string; size?: number; className?: string; ring?: boolean }) {
  const dark = /^#(0|1|2|3|4|5|6)/i.test(color) || color === '#17171f';
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, background: color, color: fg ?? (dark ? '#fff' : '#17171f'), fontSize: Math.max(9, size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function Progress({ value, className, tone = 'ink' }: { value: number; className?: string; tone?: 'ink' | 'dawn' | 'ok' | 'warn' }) {
  const bg = { ink: 'bg-ink', dawn: 'bg-dawn', ok: 'bg-ok', warn: 'bg-warn' }[tone];
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-sub', className)}>
      <div className={cn('h-full origin-left animate-grow rounded-full transition-[width] duration-700 ease-out-quint', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-[5px] bg-white px-1 font-sans text-[11px] font-medium text-ink-3 shadow-[0_0_0_1px_var(--line2),0_1px_0_var(--line2)]">{children}</kbd>;
}

export function Row({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('flex min-h-[56px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 md:px-5', onClick && 'cursor-pointer transition-colors duration-150 hover:bg-[#faf9fd] active:bg-sub', className)}>
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-[\'\'] disabled:opacity-50', checked ? 'bg-vi-700' : 'bg-[#dcd9e6]')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(19,15,38,.25)] transition-all duration-300 ease-spring', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}

export function Sparkline({ data, className, stroke = 'url(#dawnStroke)' }: { data: number[]; className?: string; stroke?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 36 - ((v - min) / (max - min || 1)) * 32]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id="dawnStroke" x1="0" x2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset=".55" stopColor="#d946ef" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="dawnFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d946ef" stopOpacity=".18" />
          <stop offset="1" stopColor="#d946ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L100,40 L0,40 Z`} fill="url(#dawnFill)" className="animate-[fade-in_1.2s_ease_.4s_both]" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, ['--len' as string]: 1, animation: 'draw 1.4s var(--ease) .15s both' }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill="#fb923c" className="animate-[pop_.4s_var(--ease)_1.3s_both]" style={{ transformOrigin: `${pts[pts.length - 1][0]}px ${pts[pts.length - 1][1]}px` }} />
    </svg>
  );
}
