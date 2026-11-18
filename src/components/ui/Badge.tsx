import type { ReactNode } from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'violet' | 'ok' | 'warn' | 'bad' | 'info' | 'dark' | 'peach' | 'mag' | 'blue' | 'white' | 'glass';

// Halo : pilules à fond pâle et encre franche, sans filet.
const tones: Record<Tone, string> = {
  neutral: 'bg-[#f3f1f8] text-ink-2',
  violet: 'bg-pale-v text-deep-v',
  ok: 'bg-pale-g text-deep-g',
  warn: 'bg-pale-a text-deep-a',
  bad: 'bg-pale-r text-deep-r',
  info: 'bg-pale-b text-deep-b',
  blue: 'bg-pale-b text-deep-b',
  dark: 'bg-ink text-white',
  peach: 'bg-pale-p text-deep-p',
  mag: 'bg-pale-m text-deep-m',
  white: 'bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6]',
  glass: 'glass text-ink-2',
};

/**
 * Pastille de statut en pilule. `size="md"` = chip Halo (26 px, 12,5 px) ; par défaut 22 px pour les listes denses.
 * `dot` ajoute un point de couleur, `pulse` le fait battre (en direct).
 */
export function Badge({ tone = 'neutral', children, icon, className, dot, pulse, size = 'sm' }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; dot?: boolean; pulse?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full font-medium',
        size === 'md' ? 'h-[26px] gap-1.5 px-2.5 text-[12.5px] [&_svg]:h-3.5 [&_svg]:w-3.5' : 'h-[22px] gap-1 px-2 text-[11.5px] [&_svg]:h-3 [&_svg]:w-3',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5">
          {pulse && <span className="absolute inset-0 animate-ping2 rounded-full bg-current" />}
          <i className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}

/** Chip Halo (26 px) : raccourci de <Badge size="md">. `onClick` en fait une pilule filtrante, `active` la remplit d'encre. */
export function Chip({ tone = 'neutral', children, icon, className, onClick, active }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; onClick?: () => void; active?: boolean }) {
  if (!onClick) return <Badge tone={tone} size="md" icon={icon} className={className}>{children}</Badge>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium transition-[background,box-shadow,color,transform] duration-300 ease-spring active:scale-95 [&_svg]:h-3.5 [&_svg]:w-3.5',
        active ? 'bg-ink text-white shadow-ink' : cn(tones[tone === 'neutral' ? 'white' : tone], 'hover:-translate-y-px'),
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
