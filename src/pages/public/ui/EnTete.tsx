// En-tête des pages publiques : une pilule de verre qui flotte sur le halo.
// L'artisan d'abord (c'est lui que le client connaît), avec sa pastille « Vérifié » ; Brix en discret, en pied de page.
import { BadgeCheck, Download, Phone } from 'lucide-react';
import type { Company } from '@/lib/types';
import { PastilleArtisan } from './primitives';

export function EnTete({ company, sous, onPdf }: { company: Company; sous: string; onPdf?: () => void }) {
  const verifs = ['SIRET actif', company.decennale && 'assurance décennale', company.rge && 'qualification RGE'].filter(Boolean).join(', ');
  return (
    <header className="sticky top-0 z-40 px-3 pt-[calc(10px+var(--safe-t,0px))] sm:px-6 sm:pt-4">
      <div className="glass mx-auto flex h-[62px] max-w-[1160px] items-center gap-3 rounded-[22px] pl-2.5 pr-2 sm:pl-3">
        <PastilleArtisan initiales={company.logoInitials || company.name.slice(0, 2).toUpperCase()} taille={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]">{company.name}</span>
            <span className="chip tone-green h-6 shrink-0 px-2 text-[11.5px] max-[350px]:hidden" title={`Vérifié par Brix : ${verifs}`}>
              <BadgeCheck className="h-[13px] w-[13px]" strokeWidth={2} /> Vérifié
            </span>
          </div>
          <div className="truncate text-[12.5px] text-ink-2">{sous}</div>
        </div>
        {onPdf && (
          <button onClick={onPdf} className="hidden h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium text-ink-2 transition hover:bg-white hover:text-ink sm:inline-flex">
            <Download className="h-4 w-4" strokeWidth={1.75} /> PDF
          </button>
        )}
        <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full bg-white px-3.5 text-[13.5px] font-medium shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px sm:px-4" aria-label={`Appeler ${company.name}`}>
          <Phone className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">{company.phone}</span>
        </a>
      </div>
    </header>
  );
}
