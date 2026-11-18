import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Carte Halo : blanche, 22 px, ombre teintée violet, elle flotte sur le fond nacré.
 * - `interactive` : cliquable, se soulève de 3 px au survol (curseur main).
 * - `tone="dawn"` : fond dégradé très pâle (carte total, mise en avant) ; `tone="mist"` : blanc qui rosit en bas.
 * - `size="sm"` : rayon 16 px (lignes, cartes imbriquées).
 */
export function Card({ className, interactive, tone, size, ...p }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean; tone?: 'dawn' | 'mist'; size?: 'sm' }) {
  return (
    <div
      className={cn(
        'bg-white shadow-halo transition-[box-shadow,transform] duration-[450ms] ease-out-quint',
        size === 'sm' ? 'rounded-card-sm' : 'rounded-card',
        tone === 'dawn' && 'bg-dawn-pale',
        tone === 'mist' && 'bg-dawn-mist',
        interactive ? 'lift cursor-pointer' : 'hover:shadow-raise',
        className,
      )}
      {...p}
    />
  );
}

export function CardHeader({ title, meta, action, icon, className }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[56px] items-center gap-2.5 border-b border-[#f2eff8] px-5', className)}>
      {icon}
      <h4 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h4>
      {meta && <span className="truncate text-[12.5px] text-ink-3">{meta}</span>}
      <div className="flex-1" />
      {action}
    </div>
  );
}
