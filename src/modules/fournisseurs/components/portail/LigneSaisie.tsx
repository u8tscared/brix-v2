// Une ligne de la demande côté fournisseur : quantité bien visible, prix au clavier numérique, disponibilité.
import { memo } from 'react';
import { Check, Clock3, Repeat2, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, num } from '@/lib/format';
import type { LigneDemande } from '@/modules/fournisseurs/data/types';
import { lirePrix, saisieDecimale } from '@/modules/fournisseurs/components/demandes/commun';
import type { DispoSaisie, SaisieLigne } from '@/modules/fournisseurs/components/portail/saisie';

const DISPOS: { v: DispoSaisie; label: string; icon: JSX.Element }[] = [
  { v: 'stock', label: 'En stock', icon: <Check /> },
  { v: 'delai', label: 'Sur délai', icon: <Clock3 /> },
  { v: 'equivalent', label: 'Équivalent', icon: <Repeat2 /> },
  { v: 'indispo', label: 'Pas dispo', icon: <X /> },
];

/** Passe au champ de prix suivant avec « Entrée » (ou « Suivant » sur le clavier du téléphone). */
function suivant(index: number) {
  const n = document.querySelector<HTMLInputElement>(`[data-prix="${index + 1}"]`);
  if (n) n.focus();
  else (document.activeElement as HTMLElement | null)?.blur();
}

function LigneSaisie({ l, v, index, onChange }: { l: LigneDemande; v: SaisieLigne; index: number; onChange: (id: string, p: Partial<SaisieLigne>) => void }) {
  const p = v.dispo === 'indispo' ? null : lirePrix(v.prix);
  const off = v.dispo === 'indispo';
  const maj = (x: Partial<SaisieLigne>) => onChange(l.id, x);

  return (
    <li className={cn('relative grid grid-cols-[52px_minmax(0,1fr)] gap-x-3.5 px-4 py-4 transition-colors sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:px-5', off && 'bg-halo-hover')}>
      <div className="contents">
        <span className={cn('flex h-[52px] min-w-[52px] shrink-0 flex-col items-center justify-center rounded-field border px-1.5 transition', off ? 'border-halo-line bg-white text-ink-3' : 'border-[#e3ddf0] bg-halo-track text-ink')}>
          <span className="num text-[17px] font-semibold leading-none tracking-[-0.02em]">{num(l.quantite)}</span>
          <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.04em] text-ink-3">{l.unite}</span>
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className={cn('text-[15px] font-medium leading-snug tracking-[-0.01em]', off && 'text-ink-3 line-through decoration-[#c4bfd6]')}>{l.designation}</div>
          {l.reference && <div className="bx-mono mt-1 truncate text-[12px] text-ink-3">{l.reference}</div>}
        </div>
      </div>

      <div className="col-span-2 mt-3.5 flex items-center gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0">
        <label className={cn('fx-prix flex h-[52px] w-[172px] shrink-0 sm:w-[156px] items-center rounded-field border bg-white pl-4 pr-3 transition', off ? 'border-halo-line opacity-50' : p != null ? 'border-[#d9c9fd]' : 'border-[#e3ddf0]')}>
          <input
            data-prix={index}
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            value={v.prix}
            disabled={off}
            onChange={(e) => maj({ prix: saisieDecimale(e.target.value) })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), suivant(index))}
            placeholder="0,00"
            aria-label={`Prix unitaire HT de ${l.designation}`}
            className="h-full w-full min-w-0 bg-transparent text-[18px] font-semibold tracking-[-0.01em] text-ink placeholder:font-normal placeholder:text-[#c4bfd6] focus:outline-none"
          />
          <span className="shrink-0 text-[12.5px] font-medium text-ink-3">€ HT</span>
        </label>
        <div className="min-w-0 flex-1 text-right sm:w-[104px] sm:flex-none">
          {off ? (
            <span className="text-[13px] text-ink-3">Non chiffré</span>
          ) : p != null ? (
            <span key={p} className="bx-fade block">
              <span className="block text-[11.5px] text-ink-3">{num(l.quantite)} × {money(p)}</span>
              <span className="num block text-[16px] font-semibold tracking-[-0.01em]">{money(p * l.quantite)}</span>
            </span>
          ) : (
            <span className="text-[13px] text-[#c4bfd6]">à chiffrer</span>
          )}
        </div>
      </div>

      <div role="radiogroup" aria-label="Disponibilité" className="col-span-2 mt-3 grid grid-cols-4 gap-1 rounded-[22px] bg-halo-track p-1 sm:col-start-2 sm:max-w-[440px]">
        {DISPOS.map((d) => (
          <button
            key={d.v}
            type="button"
            role="radio"
            aria-checked={v.dispo === d.v}
            onClick={() => maj({ dispo: d.v })}
            className={cn(
              'flex h-11 min-w-0 items-center justify-center gap-1 rounded-pill px-1 text-[12.5px] font-medium transition sm:h-10 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
              v.dispo === d.v ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:text-ink',
              v.dispo === d.v && d.v === 'stock' && '[&_svg]:text-deep-g',
              v.dispo === d.v && d.v === 'indispo' && '[&_svg]:text-[#dc2626]',
            )}
          >
            <span className="hidden min-[400px]:inline-flex">{d.icon}</span>
            <span className="truncate">{d.label}</span>
          </button>
        ))}
      </div>

      {v.dispo === 'delai' && (
        <div className="bx-rise col-span-2 mt-2.5 flex items-center gap-2 text-[13.5px] text-ink-2 sm:col-start-2">
          Disponible sous
          <input
            inputMode="numeric"
            value={v.jours}
            onChange={(e) => maj({ jours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
            aria-label="Nombre de jours"
            className="num h-11 w-14 rounded-field border border-[#e3ddf0] bg-white text-center text-[16px] font-semibold text-ink focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe]"
          />
          jour{Number(v.jours) > 1 ? 's' : ''}
        </div>
      )}
      {v.dispo === 'equivalent' && (
        <div className="bx-rise col-span-2 mt-2.5 grid gap-2 sm:col-start-2 sm:grid-cols-[1fr_170px]">
          <input
            value={v.designation}
            onChange={(e) => maj({ designation: e.target.value })}
            placeholder="Article proposé (marque, modèle)"
            aria-label="Article proposé"
            className="h-11 rounded-field border border-[#e3ddf0] bg-white px-3.5 text-[16px] placeholder:text-ink-3 focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe] sm:text-[14px]"
          />
          <input
            value={v.reference}
            onChange={(e) => maj({ reference: e.target.value })}
            placeholder="Référence"
            aria-label="Référence proposée"
            className="bx-mono h-11 rounded-field border border-[#e3ddf0] bg-white px-3.5 text-[16px] placeholder:text-ink-3 focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe] sm:text-[13px]"
          />
        </div>
      )}
    </li>
  );
}

export default memo(LigneSaisie);
