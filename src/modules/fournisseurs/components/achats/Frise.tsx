// Frise de suivi façon colis : Envoyée → Confirmée → En livraison → Reçue → Facturée.
// Les traits se tracent, l'étape en cours respire, le camion roule quand la commande est en route.
import { Check, CircleCheckBig, PackageCheck, Receipt, Send, Truck } from 'lucide-react';
import { cn } from '@/components/ui';
import { ETAPES_COMMANDE } from '@/modules/fournisseurs/data/helpers';
import type { StatutCommande } from '@/modules/fournisseurs/data/types';

const ICONES = [<Send key="s" />, <CircleCheckBig key="c" />, <Truck key="t" />, <PackageCheck key="p" />, <Receipt key="r" />];

/** Position sur la frise : 0 = Envoyée … 4 = Facturée ; 2,5 = livrée en partie ; -1 = pas encore envoyée. */
function position(s: StatutCommande): number {
  if (s === 'livree_partiel') return 2.5;
  return ETAPES_COMMANDE.findIndex((e) => e.statut === s);
}

export default function Frise({ statut, sousTitres = {} }: { statut: StatutCommande; sousTitres?: Partial<Record<number, string>> }) {
  const pos = position(statut);
  return (
    <ol className="flex items-start" aria-label="Suivi de la commande">
      {ETAPES_COMMANDE.map((e, i) => {
        const fait = pos > i;
        const partiel = statut === 'livree_partiel' && i === 3;
        const courant = partiel || pos === i;
        const trait = i === 0 ? null : pos >= i ? 'plein' : pos > i - 1 ? 'moitie' : 'vide';
        const roule = courant && e.statut === 'expediee';
        return (
          <li key={e.statut} className="relative flex flex-1 flex-col items-center text-center" aria-current={courant ? 'step' : undefined}>
            {trait && (
              <span className="absolute right-1/2 top-[17px] h-[3px] w-[calc(100%-36px)] -translate-x-[18px] overflow-hidden rounded-full bg-line2 md:top-[19px] md:w-[calc(100%-40px)] md:-translate-x-[20px]">
                {trait !== 'vide' && <span className={cn('fx-trace block h-full rounded-full', pos >= 3 ? 'bg-ok' : 'bg-ink', trait === 'plein' ? 'w-full' : 'w-1/2')} style={{ animationDelay: `${i * 0.12}s` }} />}
              </span>
            )}
            <span
              className={cn(
                'relative z-[1] grid h-9 w-9 place-items-center rounded-full border-2 transition md:h-10 md:w-10 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[1.75]',
                fait && !partiel && (pos >= 3 ? 'border-ok bg-ok text-white' : 'border-ink bg-ink text-white'),
                courant && !partiel && 'border-ink bg-white text-ink shadow-[0_0_0_5px_#ebe2fe]',
                partiel && 'border-warn bg-white text-warn shadow-[0_0_0_5px_#fff7e8]',
                !fait && !courant && 'border-line2 bg-white text-ink-3',
              )}
            >
              {fait && !partiel ? <Check className="bx-pop" strokeWidth={2.5} /> : <span className={cn(roule && 'fx-roule')}>{ICONES[i]}</span>}
              {courant && !partiel && <span className="fx-ping absolute inset-0 rounded-full" />}
            </span>
            <span className={cn('mt-2 px-0.5 text-[11px] leading-tight md:text-[12.5px]', courant ? 'font-semibold text-ink' : fait ? 'text-ink-2' : 'text-ink-3')}>{partiel ? 'Reçue en partie' : e.label}</span>
            {sousTitres[i] && <span className="mt-0.5 hidden px-1 text-[11px] leading-tight text-ink-3 sm:block">{sousTitres[i]}</span>}
          </li>
        );
      })}
    </ol>
  );
}
