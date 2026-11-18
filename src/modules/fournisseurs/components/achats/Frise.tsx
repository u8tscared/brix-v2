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
          <li key={e.statut} className="relative flex min-w-0 flex-1 flex-col items-center text-center" aria-current={courant ? 'step' : undefined}>
            {trait && (
              <span className="absolute right-1/2 top-[19px] h-[3px] w-[calc(100%-44px)] -translate-x-[22px] overflow-hidden rounded-full bg-halo-track md:top-[21px] md:w-[calc(100%-50px)] md:-translate-x-[25px]">
                {trait !== 'vide' && <span className={cn('fx-trace block h-full rounded-full', trait === 'plein' ? 'w-full bg-[#7fd8b4]' : 'w-1/2 bg-dawn')} style={{ animationDelay: `${i * 0.12}s` }} />}
              </span>
            )}
            <span
              className={cn(
                'relative z-[1] grid h-10 w-10 place-items-center rounded-full transition duration-500 ease-spring md:h-11 md:w-11 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.9]',
                fait && !partiel && 'bg-pale-g text-deep-g',
                courant && !partiel && 'scale-105 bg-dawn text-white shadow-[0_8px_20px_-6px_rgba(217,70,239,.6),inset_0_1px_0_rgba(255,255,255,.25)]',
                partiel && 'bg-pale-a text-deep-a shadow-[0_0_0_4px_#fff8eb]',
                !fait && !courant && 'bg-white text-ink-3 shadow-halo-sm',
              )}
            >
              {fait && !partiel ? <Check className="bx-pop" strokeWidth={2.6} /> : <span className={cn(roule && 'fx-roule')}>{ICONES[i]}</span>}
              {courant && !partiel && <span className="fx-ping absolute inset-0 rounded-full" />}
            </span>
            <span className={cn('mt-2.5 px-0.5 text-[11px] leading-tight md:text-[13px]', courant ? 'font-semibold text-ink' : fait ? 'font-medium text-ink-2' : 'text-ink-3')}>{partiel ? 'Reçue en partie' : e.label}</span>
            {sousTitres[i] && <span className="mt-0.5 hidden px-1 text-[11.5px] leading-tight text-ink-3 sm:block">{sousTitres[i]}</span>}
          </li>
        );
      })}
    </ol>
  );
}
