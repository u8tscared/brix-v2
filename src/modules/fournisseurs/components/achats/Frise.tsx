// Frise de suivi façon colis : Envoyée → Confirmée → En livraison → Reçue → Facturée.
import { Check } from 'lucide-react';
import { cn } from '@/components/ui';
import { ETAPES_COMMANDE } from '../../data/helpers';
import type { StatutCommande } from '../../data/types';

/** Position sur la frise : 0 = Envoyée … 4 = Facturée ; 2,5 = livrée en partie ; -1 = pas encore envoyée. */
function position(s: StatutCommande): number {
  if (s === 'livree_partiel') return 2.5;
  return ETAPES_COMMANDE.findIndex((e) => e.statut === s);
}

export default function Frise({ statut }: { statut: StatutCommande }) {
  const pos = position(statut);
  return (
    <ol className="flex items-start" aria-label="Suivi de la commande">
      {ETAPES_COMMANDE.map((e, i) => {
        const fait = pos > i;
        const partiel = statut === 'livree_partiel' && i === 3;
        const courant = partiel || pos === i;
        // Le trait à gauche de l'étape i relie l'étape i-1 à i
        const trait = i === 0 ? null : pos >= i ? 'plein' : pos > i - 1 ? 'moitie' : 'vide';
        return (
          <li key={e.statut} className="relative flex flex-1 flex-col items-center text-center" aria-current={courant ? 'step' : undefined}>
            {trait && (
              <span className="absolute right-1/2 top-[13px] h-[3px] w-[calc(100%-28px)] -translate-x-[14px] overflow-hidden rounded-full bg-line2 md:top-[15px] md:w-[calc(100%-32px)] md:-translate-x-[16px]">
                <span className={cn('block h-full rounded-full bg-ink transition-[width] duration-700', trait === 'plein' ? 'w-full' : trait === 'moitie' ? 'w-1/2' : 'w-0')} />
              </span>
            )}
            <span
              className={cn(
                'relative z-[1] grid h-7 w-7 place-items-center rounded-full border-2 transition md:h-8 md:w-8',
                fait && !partiel && 'border-ink bg-ink text-white',
                courant && !partiel && 'border-ink bg-white ring-4 ring-vi-100',
                partiel && 'border-warn bg-white ring-4 ring-warn-bg',
                !fait && !courant && 'border-line2 bg-white',
              )}
            >
              {fait && !partiel ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : courant ? <i className={cn('h-2.5 w-2.5 rounded-full', partiel ? 'bg-warn' : 'bg-ink')} /> : null}
            </span>
            <span className={cn('mt-2 px-0.5 text-[11px] leading-tight md:text-[12.5px]', courant ? 'font-semibold text-ink' : fait ? 'text-ink-2' : 'text-ink-3')}>
              {partiel ? 'Reçue en partie' : e.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
