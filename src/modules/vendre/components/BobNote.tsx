import type { ReactNode } from 'react';
import { BrandTile } from '@/components/brand/Logo';
import { cn } from '@/components/ui';

/**
 * Note de Bob, version Halo : carte blanche qui rosit, tuile B Aube, ton calme.
 * Remplace les anciennes bannières sombres (partagée par Vendre, Gestion, Visibilité, Achats).
 */
export function BobNote({ children, action, className, title = 'Bob' }: { children: ReactNode; action?: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <div className={cn('relative isolate flex flex-wrap items-start gap-3.5 overflow-hidden rounded-card bg-dawn-mist px-4 py-4 shadow-halo md:flex-nowrap md:items-center md:px-5', className)}>
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 -z-10 h-40 w-64 rounded-full bg-[radial-gradient(closest-side,#f8dcf6,transparent)] opacity-80 blur-xl" />
      <BrandTile size={34} className="rounded-[11px] shadow-[0_6px_16px_-6px_rgba(217,70,239,.55)]" />
      <div className="min-w-0 flex-1 basis-[200px]">
        <div className="text-[12.5px] font-medium text-ink-3">{title}</div>
        <div className="mt-0.5 text-[13.5px] leading-relaxed text-ink">{children}</div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 max-md:w-full max-md:pl-[48px]">{action}</div>}
    </div>
  );
}
