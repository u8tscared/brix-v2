import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/ui';

/** En-tête de carte de l'accueil : titre serré, ligne grise, lien discret à droite. */
export function CardTitle({ title, meta, action, onAction, right, className }: { title: ReactNode; meta?: ReactNode; action?: string; onAction?: () => void; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {meta && <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{meta}</p>}
      </div>
      {right}
      {action && onAction && (
        <button onClick={onAction} className="-my-1.5 -mr-1.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink-2 transition hover:bg-halo-hover hover:text-ink">
          {action} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
