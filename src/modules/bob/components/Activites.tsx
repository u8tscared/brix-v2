import { ArrowUpRight, Check, CircleAlert, Loader2 } from 'lucide-react';
import { cn } from '@/components/ui';
import type { Activite } from '../chat';

/** Pastilles discrètes de ce que Bob fait (« Recherche des impayés… », « Devis D-2026-123 créé »). */
export function Activites({ items, onOpen }: { items: Activite[]; onOpen: (to: string) => void }) {
  return (
    <div className="stagger-fast flex flex-wrap gap-1.5" aria-live="polite">
      {items.map((a, i) => {
        const icon = a.enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.ton === 'warn' ? <CircleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />;
        const cls = cn(
          'inline-flex min-h-[28px] max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
          a.enCours ? 'bg-halo-track text-ink-2' : a.ton === 'warn' ? 'tone-amber' : a.ton === 'ok' ? 'tone-green' : 'bg-white text-ink-2 shadow-halo-sm',
        );
        const body = (
          <>
            {icon}
            <span className="truncate">{a.label}</span>
          </>
        );
        return a.to && !a.enCours ? (
          <button key={i} type="button" onClick={() => onOpen(a.to!)} className={cn(cls, 'transition duration-300 ease-spring hover:-translate-y-px')}>
            {body}
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
          </button>
        ) : (
          <span key={i} className={cls}>{body}</span>
        );
      })}
    </div>
  );
}
