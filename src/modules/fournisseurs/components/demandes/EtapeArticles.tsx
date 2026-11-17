// Étape 2 : la liste des articles. Pré-remplie depuis le devis, chaque ligne se coche, la quantité se corrige.
import { useEffect, useRef } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { uid } from '@/lib/format';
import type { LigneDemande } from '../../data/types';
import { Coche, pluriel, saisieDecimale } from './commun';

export type LigneBrouillon = Omit<LigneDemande, 'id' | 'quantite'> & { cle: string; actif: boolean; quantite: string; libre?: boolean };

export const UNITES = ['u', 'm', 'm²', 'ml', 'lot', 'kg', 'boîte', 'rouleau'];

export const nouvelleLigne = (): LigneBrouillon => ({ cle: uid('nl'), designation: '', quantite: '1', unite: 'u', actif: true, libre: true });

export const quantite = (l: LigneBrouillon) => Number(l.quantite.replace(',', '.')) || 0;
export const ligneValide = (l: LigneBrouillon) => l.actif && l.designation.trim().length > 1 && quantite(l) > 0;

export default function EtapeArticles({ lignes, onChange }: { lignes: LigneBrouillon[]; onChange: (l: LigneBrouillon[]) => void }) {
  const dernier = useRef<HTMLInputElement>(null);
  const nbAjout = useRef(0);
  const maj = (cle: string, patch: Partial<LigneBrouillon>) => onChange(lignes.map((l) => (l.cle === cle ? { ...l, ...patch } : l)));
  const ajouter = () => {
    nbAjout.current++;
    onChange([...lignes, nouvelleLigne()]);
  };
  useEffect(() => {
    if (nbAjout.current) dernier.current?.focus();
  }, [lignes.length]);

  const choisis = lignes.filter(ligneValide).length;
  const tous = lignes.length > 0 && lignes.every((l) => l.actif);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-2">
          {lignes.some((l) => !l.libre) ? 'Décochez ce que vous avez déjà en stock.' : 'Ajoutez les articles à chiffrer.'}
        </p>
        {lignes.length > 1 && (
          <button type="button" className="h-10 shrink-0 text-[13px] md:h-9 font-medium text-ink-2 hover:text-ink" onClick={() => onChange(lignes.map((l) => ({ ...l, actif: !tous })))}>
            {tous ? 'Tout décocher' : 'Tout cocher'}
          </button>
        )}
      </div>

      {lignes.length > 0 && (
        <ul className="overflow-hidden rounded-[14px] border border-line">
          {lignes.map((l, i) => (
            <li key={l.cle} className={cn('flex items-center gap-1 border-b border-line py-1.5 pl-1 pr-2.5 last:border-b-0 transition', !l.actif && 'bg-[#fafafc]')}>
              <button type="button" aria-label={l.actif ? 'Retirer de la demande' : 'Ajouter à la demande'} onClick={() => maj(l.cle, { actif: !l.actif })} className="grid h-11 w-11 shrink-0 place-items-center">
                <Coche on={l.actif} />
              </button>

              <div className={cn('min-w-0 flex-1 py-1', !l.actif && 'opacity-50')}>
                {l.libre ? (
                  <input
                    ref={i === lignes.length - 1 ? dernier : undefined}
                    value={l.designation}
                    onChange={(e) => maj(l.cle, { designation: e.target.value })}
                    placeholder="Ex. : disjoncteur 20 A courbe C"
                    aria-label="Désignation"
                    className="h-10 w-full rounded-lg border border-transparent bg-transparent px-2 text-[14px] placeholder:text-ink-3 hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-vi-100"
                  />
                ) : (
                  <div className="px-0.5">
                    <div className={cn('text-[14px] leading-snug', !l.actif && 'line-through decoration-ink-3')}>{l.designation}</div>
                    {l.reference && <div className="truncate text-[12px] text-ink-3">{l.reference}</div>}
                  </div>
                )}
              </div>

              <div className={cn('flex shrink-0 items-center gap-1.5', !l.actif && 'pointer-events-none opacity-40')}>
                <div className="flex h-10 items-center rounded-[10px] border border-line2 bg-white">
                  <button type="button" aria-label="Moins" onClick={() => maj(l.cle, { quantite: String(Math.max(1, Math.ceil(quantite(l)) - 1)) })} className="hidden h-10 w-8 place-items-center text-ink-3 hover:text-ink sm:grid">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    inputMode="decimal"
                    value={l.quantite}
                    onChange={(e) => maj(l.cle, { quantite: saisieDecimale(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    aria-label="Quantité"
                    className="num h-10 w-12 bg-transparent text-center text-[14px] font-medium focus:outline-none sm:w-11"
                  />
                  <button type="button" aria-label="Plus" onClick={() => maj(l.cle, { quantite: String(Math.floor(quantite(l)) + 1) })} className="hidden h-10 w-8 place-items-center text-ink-3 hover:text-ink sm:grid">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {l.libre ? (
                  <select value={l.unite} onChange={(e) => maj(l.cle, { unite: e.target.value })} aria-label="Unité" className="h-10 w-[68px] rounded-[10px] border border-line2 bg-white px-1.5 text-[13px] text-ink-2 focus:outline-none">
                    {UNITES.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                ) : (
                  <span className="w-8 text-[12.5px] text-ink-3">{l.unite}</span>
                )}
              </div>

              {l.libre && (
                <button type="button" aria-label="Supprimer la ligne" onClick={() => onChange(lignes.filter((x) => x.cle !== l.cle))} className="grid h-11 w-9 shrink-0 place-items-center text-ink-3 hover:text-bad">
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" className="h-11 w-full justify-center border-dashed" icon={<Plus className="h-4 w-4" />} onClick={ajouter}>
        Ajouter un article
      </Button>

      <p className="text-center text-[12.5px] text-ink-3">{choisis ? `${pluriel(choisis, 'article')} dans la demande` : 'Aucun article pour l’instant'}</p>
    </div>
  );
}
