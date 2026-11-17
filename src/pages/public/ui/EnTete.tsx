// En-tête des pages publiques : l'artisan d'abord (c'est lui que le client connaît), Brix en discret.
import { Download, Phone } from 'lucide-react';
import type { Company } from '@/lib/types';
import { PastilleArtisan } from './primitives';

export function EnTete({ company, sous, onPdf }: { company: Company; sous: string; onPdf?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/80 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1160px] items-center gap-3 px-4 sm:px-6">
        <PastilleArtisan initiales={company.logoInitials || company.name.slice(0, 2).toUpperCase()} taille={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{company.name}</div>
          <div className="truncate text-[12.5px] text-ink-3">{sous}</div>
        </div>
        {onPdf && (
          <button onClick={onPdf} className="hidden h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium text-ink-2 transition hover:bg-page hover:text-ink sm:inline-flex">
            <Download className="h-4 w-4" strokeWidth={1.75} /> PDF
          </button>
        )}
        <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-3.5 text-[13.5px] font-medium shadow-[0_0_0_1px_#e7e5f0] transition hover:shadow-[0_0_0_1px_#d3cfe4] sm:px-4" aria-label={`Appeler ${company.name}`}>
          <Phone className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">{company.phone}</span>
        </a>
      </div>
    </header>
  );
}
