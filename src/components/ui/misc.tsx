import type { ReactNode } from 'react';
import { cn } from './cn';

export function PageHeader({ title, subtitle, actions, kicker, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; kicker?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {kicker && <div className="mb-1 text-xs font-medium text-ink-3">{kicker}</div>}
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line2 bg-white/60 px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-vi-50 text-vi-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>}
      <div className="text-[15px] font-semibold">{title}</div>
      {text && <p className="mt-1 max-w-sm text-[13px] text-ink-2">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, hero, className, children }: { label: ReactNode; value: ReactNode; sub?: ReactNode; hero?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('relative min-w-0 p-4', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-1.5 font-semibold tracking-[-0.02em]', hero ? 'font-display text-[32px] leading-[1.1] dawn-text' : 'text-[22px] leading-tight')}>{value}</div>
      {sub && <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">{sub}</div>}
      {children}
    </div>
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
      <div className={cn('h-full rounded-full transition-[width] duration-700', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-[5px] border border-line2 bg-white px-1 text-[11px] font-medium text-ink-2 shadow-[0_1px_0_var(--line2)]">{children}</kbd>;
}

export function Row({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('flex min-h-[56px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0', onClick && 'cursor-pointer transition hover:bg-[#fafafc]', className)}>
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-vi-700' : 'bg-line2')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
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
      <path d={`${d} L100,40 L0,40 Z`} fill="url(#dawnFill)" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill="#fb923c" />
    </svg>
  );
}
