// Le devis en clair : les lots dépliables, lisibles sur téléphone (le PDF reste à côté pour le détail juridique).
import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, num } from '@/lib/format';
import type { Devis } from '@/lib/types';
import { groupLots, isPriced, lotName } from '@/modules/devis/logic';

export function Contenu({ devis, facteur }: { devis: Devis; facteur: number }) {
  const lots = groupLots(devis.lines);
  const [ouverts, setOuverts] = useState<Set<number>>(() => new Set([0]));
  const basculer = (i: number) => setOuverts((s) => {
    const n = new Set(s);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    return n;
  });
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_#ebe9f2]">
      {lots.map((lot, i) => {
        const lignes = lot.items.filter(isPriced);
        const total = lignes.reduce((s, l) => s + l.quantity * l.unitPriceHt * facteur, 0);
        const ouvert = ouverts.has(i);
        return (
          <div key={lot.section?.id ?? i} className="border-b border-line last:border-b-0">
            <button onClick={() => basculer(i)} className="flex min-h-[64px] w-full items-center gap-3.5 px-5 text-left transition hover:bg-[#fbfafe]" aria-expanded={ouvert}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-page text-[13px] font-semibold text-ink-2">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{lot.section ? lotName(lot.section.designation) : 'Prestations'}</span>
                <span className="block text-[12.5px] text-ink-3">{lignes.length} poste{lignes.length > 1 ? 's' : ''}</span>
              </span>
              <span className="num text-[14.5px] font-semibold">{money(total)} <span className="text-[11px] font-medium text-ink-3">HT</span></span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-300', ouvert && 'rotate-180')} />
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]', ouvert ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <ul className="space-y-0.5 px-5 pb-4">
                  {lignes.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-page">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4b5fd]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] leading-snug">{l.designation}</span>
                        {l.detail && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{l.detail}</span>}
                        <span className="num mt-0.5 block text-[12px] text-ink-3">
                          {num(l.quantity)} {l.unit} × {money(l.unitPriceHt * facteur)}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[13.5px] font-medium">{money(l.quantity * l.unitPriceHt * facteur)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
      {!lots.length && (
        <div className="flex items-center gap-3 px-5 py-6 text-[14px] text-ink-3">
          <Layers className="h-4 w-4" /> Aucun poste
        </div>
      )}
    </div>
  );
}
