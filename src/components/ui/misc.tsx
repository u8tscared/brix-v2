import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * En-tête de page Halo : libellé (kicker) au-dessus, grand titre 40 px serré, seconde ligne grisée (`titleMuted`),
 * sous-titre, actions à droite (pilules). `icon` = IconTile du domaine (ordinateur). Apparaît en douceur.
 */
export function PageHeader({ title, titleMuted, subtitle, actions, kicker, icon, className, size = 'lg' }: { title: ReactNode; titleMuted?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; kicker?: ReactNode; icon?: ReactNode; className?: string; size?: 'md' | 'lg' }) {
  return (
    <div className={cn('flex animate-[page-in_.55s_var(--ease)_both] flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between md:pt-3', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {icon && <div className="hidden sm:block">{icon}</div>}
        <div className="min-w-0">
          {kicker && <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">{kicker}</div>}
          <h1 className={cn('font-semibold text-ink', size === 'lg' ? 'text-[30px] leading-[1.06] tracking-[-0.042em] md:text-[40px] md:leading-[1.02] md:tracking-[-0.045em]' : 'text-[26px] leading-[1.1] tracking-[-0.04em] md:text-[30px]')}>
            {title}
            {titleMuted && (
              <>
                <br />
                <span className="text-halo-mute">{titleMuted}</span>
              </>
            )}
          </h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[14px] leading-snug text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** État vide : une petite scène plutôt qu'un trou (carte Halo, halo doux, pastille qui flotte). */
export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative isolate flex flex-col items-center justify-center overflow-hidden rounded-card bg-white px-6 py-14 text-center shadow-halo', className)}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-60px] -z-10 h-[220px] w-[320px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#f1dcfb,transparent)] opacity-80 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38px] h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-dashed border-[#e6e1f1] opacity-70" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[78px] h-[140px] w-[140px] -translate-x-1/2 rounded-full border border-[#efebf7] opacity-80" />
      {icon && (
        <div className="relative mb-4 grid h-14 w-14 animate-float place-items-center rounded-[18px] bg-white text-deep-v shadow-halo-lg [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      )}
      <div className="relative text-[17px] font-semibold tracking-[-0.025em]">{title}</div>
      {text && <p className="relative mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-2">{text}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

/**
 * Chiffre clé Halo. `hero` = grand chiffre en dégradé (un par écran). `icon` = pastille au-dessus (carte KPI de la maquette),
 * `size="xl"` = 48 px (chiffre principal d'un écran).
 */
export function Stat({ label, value, sub, hero, icon, size, className, children }: { label: ReactNode; value: ReactNode; sub?: ReactNode; hero?: boolean; icon?: ReactNode; size?: 'md' | 'lg' | 'xl'; className?: string; children?: ReactNode }) {
  const big = size === 'xl' ? 'text-[38px] md:text-[48px]' : size === 'lg' || hero ? 'text-[34px] md:text-[38px]' : 'text-[26px] md:text-[30px]';
  return (
    <div className={cn('relative min-w-0 p-4 md:p-5', className)}>
      {icon && <div className="mb-4">{icon}</div>}
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2">{label}</div>
      <div className={cn('num-halo mt-1.5', big, hero && 'dawn-text')}>{value}</div>
      {sub && <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">{sub}</div>}
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
      <span role="tooltip" className={cn('pointer-events-none absolute z-50 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium text-white opacity-0 shadow-pop transition duration-150 group-hover/tip:opacity-100 group-hover/tip:delay-300 max-md:hidden touch:hidden', pos)}>
        {label}
      </span>
    </span>
  );
}

/** Avatar rond. Par défaut pâle violet (Halo) ; `dawn` = dégradé Aube (l'utilisateur, Brix). */
export function Avatar({ initials, color = '#f1eafe', fg, size = 28, className, ring, dawn }: { initials: string; color?: string; fg?: string; size?: number; className?: string; ring?: boolean; dawn?: boolean }) {
  const dark = dawn || /^#(0|1|2|3|4|5|6)/i.test(color) || color === '#17171f';
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-[-0.02em]', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, background: dawn ? 'var(--dawn-d)' : color, color: fg ?? (dark ? '#fff' : color === '#f1eafe' ? '#6d28d9' : '#17171f'), fontSize: Math.max(9, size * 0.36), boxShadow: dawn ? '0 4px 12px -4px rgba(217,70,239,.5)' : undefined }}
    >
      {initials}
    </span>
  );
}

/** Barre de progression Halo : rail lavande, remplissage arrondi (encre, Aube, vert, ambre). */
export function Progress({ value, className, tone = 'ink' }: { value: number; className?: string; tone?: 'ink' | 'dawn' | 'ok' | 'warn' }) {
  const bg = { ink: 'bg-ink', dawn: 'bg-dawn', ok: 'bg-[#10b981]', warn: 'bg-[#f59e0b]' }[tone];
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-halo-track', className)}>
      <div className={cn('h-full origin-left animate-grow rounded-full transition-[width] duration-700 ease-out-quint', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd-hint inline-grid h-5 min-w-5 place-items-center rounded-[6px] bg-white px-1 font-sans text-[11px] font-medium text-ink-3 shadow-[0_0_0_1px_#e6e1f1,0_1px_0_#e6e1f1]">{children}</kbd>;
}

export function Row({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('flex min-h-[56px] items-center gap-3 border-b border-[#f2eff8] px-4 py-2.5 last:border-b-0 md:px-5', onClick && 'cursor-pointer transition-colors duration-150 hover:bg-halo-hover active:bg-[#f1edf9]', className)}>
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
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(60,30,120,.28)] transition-all duration-300 ease-spring', checked ? 'left-[18px]' : 'left-0.5')} />
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
