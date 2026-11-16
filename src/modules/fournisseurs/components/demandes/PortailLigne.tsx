// Une ligne de la demande côté fournisseur : prix unitaire, « pas disponible », équivalent proposé.
import { Repeat2 } from 'lucide-react';
import { cn, Input } from '@/components/ui';
import { money } from '@/lib/format';
import type { LigneDemande } from '../../data/types';
import { Coche, lirePrix, saisieDecimale } from './commun';

export interface SaisieLigne {
  prix: string;
  indispo: boolean;
  equivalent: boolean;
  designation: string;
  reference: string;
}

export const saisieVide = (): SaisieLigne => ({ prix: '', indispo: false, equivalent: false, designation: '', reference: '' });

export default function PortailLigne({ l, v, onChange, index }: { l: LigneDemande; v: SaisieLigne; onChange: (p: Partial<SaisieLigne>) => void; index: number }) {
  const p = lirePrix(v.prix);
  return (
    <li className={cn('border-b border-line px-4 py-4 last:border-b-0 transition', v.indispo && 'bg-[#fafafc]')}>
      <div className="flex items-start gap-3">
        <span className="num mt-0.5 w-5 shrink-0 text-[12px] text-ink-3">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className={cn('text-[14.5px] font-medium leading-snug', v.indispo && 'text-ink-3 line-through decoration-line2')}>{l.designation}</div>
          <div className="num mt-0.5 text-[12.5px] text-ink-2">
            Quantité <span className="font-semibold text-ink">{String(l.quantite).replace('.', ',')} {l.unite}</span>
            {l.reference && <span className="text-ink-3"> · réf. {l.reference}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 pl-8">
        <Input
          inputMode="decimal"
          enterKeyHint="next"
          value={v.prix}
          disabled={v.indispo}
          onChange={(e) => onChange({ prix: saisieDecimale(e.target.value) })}
          placeholder="Prix unitaire"
          suffix="€ HT"
          aria-label={`Prix unitaire HT de ${l.designation}`}
          className="w-[168px] shrink-0 [&_input]:num [&_input]:h-12 [&_input]:text-[16px] [&_input]:font-medium"
        />
        <div className="num min-w-0 flex-1 text-right text-[13px] text-ink-2">
          {v.indispo ? <span className="text-ink-3">Pas disponible</span> : p != null ? <>= <span className="font-semibold text-ink">{money(p * l.quantite)}</span></> : <span className="text-ink-3">—</span>}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-1 pl-6">
        <button type="button" onClick={() => onChange({ indispo: !v.indispo, equivalent: false })} aria-pressed={v.indispo} className="flex h-11 items-center gap-2 rounded-lg px-2 text-[13px] text-ink-2 hover:text-ink">
          <Coche on={v.indispo} className="h-[18px] w-[18px] rounded-[5px]" />
          Pas disponible
        </button>
        {!v.indispo && (
          <button type="button" onClick={() => onChange({ equivalent: !v.equivalent })} aria-expanded={v.equivalent} className={cn('flex h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] hover:text-ink', v.equivalent ? 'font-medium text-ink' : 'text-ink-2')}>
            <Repeat2 className="h-4 w-4" strokeWidth={1.75} />
            Proposer un équivalent
          </button>
        )}
      </div>

      {v.equivalent && !v.indispo && (
        <div className="mt-1 grid gap-2 pl-8 sm:grid-cols-[1fr_160px]">
          <Input value={v.designation} onChange={(e) => onChange({ designation: e.target.value })} placeholder="Article proposé (marque, modèle)" aria-label="Article proposé" />
          <Input value={v.reference} onChange={(e) => onChange({ reference: e.target.value })} placeholder="Référence" aria-label="Référence proposée" />
        </div>
      )}
    </li>
  );
}
