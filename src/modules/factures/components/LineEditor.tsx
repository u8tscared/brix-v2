// Éditeur de lignes simple : une ligne = désignation, quantité, unité, prix HT, TVA.
// Sur téléphone, chaque ligne devient une carte avec de grandes zones tactiles.

import { Lock, Plus, Rows3, Trash2 } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { money, uid } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';

const UNITS = ['u', 'h', 'm', 'm²', 'forfait', 'jour', 'kg', 'ens'];
const RATES = [20, 10, 5.5, 0];

const cell = 'h-10 w-full rounded-lg border border-transparent bg-transparent px-2 max-md:h-11 max-md:border-line2 max-md:bg-white text-[13.5px] transition hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-vi-100';

export function LineEditor({ lines, onChange, readOnly, defaultVat, negativeNote }: { lines: DevisLigne[]; onChange: (l: DevisLigne[]) => void; readOnly?: boolean; defaultVat: number; negativeNote?: string }) {
  const patch = (id: string, p: Partial<DevisLigne>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id));
  const add = (kind: 'ouvrage' | 'section') =>
    onChange([...lines, { id: uid('l'), kind, designation: kind === 'section' ? 'Nouveau lot' : '', quantity: kind === 'section' ? 0 : 1, unit: kind === 'section' ? '' : 'u', unitPriceHt: 0, unitCostHt: 0, vatRate: kind === 'section' ? 0 : defaultVat, source: 'manuel' }]);

  if (readOnly) return <ReadOnlyLines lines={lines} />;

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_64px_84px_104px_72px_104px_36px] gap-1.5 border-b border-line px-1 pb-2 text-[11.5px] font-medium text-ink-3 md:grid">
        <span className="px-2">Désignation</span>
        <span className="px-2 text-right">Qté</span>
        <span className="px-2">Unité</span>
        <span className="px-2 text-right">PU HT</span>
        <span className="px-2">TVA</span>
        <span className="px-2 text-right">Total HT</span>
        <span />
      </div>
      <div className="divide-y divide-line">
        {lines.map((l) =>
          l.kind === 'section' ? (
            <div key={l.id} className="flex items-center gap-2 py-2">
              <input disabled={readOnly} value={l.designation} onChange={(e) => patch(l.id, { designation: e.target.value })} className={cn(cell, 'font-semibold disabled:hover:border-transparent')} aria-label="Nom du lot" />
              {!readOnly && <DelBtn onClick={() => remove(l.id)} />}
            </div>
          ) : (
            <div key={l.id} className="grid grid-cols-[1fr_auto] gap-x-1.5 gap-y-1 py-2 md:grid-cols-[minmax(0,1fr)_64px_84px_104px_72px_104px_36px] md:items-start">
              <div className="col-span-2 md:col-span-1">
                <input disabled={readOnly} placeholder="Ex. Pose d’un tableau électrique" value={l.designation} onChange={(e) => patch(l.id, { designation: e.target.value })} className={cn(cell, 'font-medium disabled:text-ink')} aria-label="Désignation" />
                {(l.detail || !readOnly) && (
                  <input disabled={readOnly} placeholder="Détail (facultatif)" value={l.detail ?? ''} onChange={(e) => patch(l.id, { detail: e.target.value })} className={cn(cell, 'h-8 text-[12.5px] text-ink-2')} aria-label="Détail" />
                )}
              </div>
              <div className="col-span-2 grid grid-cols-[64px_84px_1fr_72px] gap-1.5 md:contents">
                <input disabled={readOnly} type="number" inputMode="decimal" step="any" value={l.quantity} onChange={(e) => patch(l.id, { quantity: Number(e.target.value) })} className={cn(cell, 'num text-right')} aria-label="Quantité" />
                <select disabled={readOnly} value={l.unit} onChange={(e) => patch(l.id, { unit: e.target.value })} className={cn(cell, 'appearance-none')} aria-label="Unité">
                  {[...new Set([l.unit, ...UNITS])].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <input disabled={readOnly} type="number" inputMode="decimal" step="any" value={l.unitPriceHt} onChange={(e) => patch(l.id, { unitPriceHt: Number(e.target.value) })} className={cn(cell, 'num text-right')} aria-label="Prix unitaire HT" />
                <select disabled={readOnly} value={l.vatRate} onChange={(e) => patch(l.id, { vatRate: Number(e.target.value) })} className={cn(cell, 'appearance-none')} aria-label="Taux de TVA">
                  {[...new Set([l.vatRate, ...RATES])].map((r) => (
                    <option key={r} value={r}>{String(r).replace('.', ',')} %</option>
                  ))}
                </select>
              </div>
              <div className={cn('num flex h-10 items-center justify-end px-2 text-[13.5px] font-medium max-md:col-start-1 max-md:justify-start max-md:px-2 max-md:text-ink-2', l.unitPriceHt < 0 && 'text-vi-700')}>{money(l.quantity * l.unitPriceHt)}</div>
              <div className="flex justify-end">{!readOnly && <DelBtn onClick={() => remove(l.id)} />}</div>
            </div>
          ),
        )}
      </div>
      {!readOnly && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
          <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => add('ouvrage')} className="max-md:h-11 max-md:flex-1">
            Ajouter une ligne
          </Button>
          <Button variant="ghost" size="sm" icon={<Rows3 className="h-4 w-4" />} onClick={() => add('section')} className="max-md:h-11">
            Ajouter un lot
          </Button>
        </div>
      )}
      {negativeNote && <p className="mt-2 text-[12px] text-ink-3">{negativeNote}</p>}
    </div>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Supprimer la ligne" className="grid h-10 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-bad-bg hover:text-bad">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function ReadOnlyLines({ lines }: { lines: DevisLigne[] }) {
  return (
    <div>
      <div className="mb-3 flex items-start gap-2 rounded-lg bg-sub px-3 py-2 text-[12.5px] text-ink-2">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Facture émise : elle ne se modifie plus (c’est la loi). Pour corriger, créez un avoir depuis le menu.
      </div>
      <div className="divide-y divide-line">
        {lines.map((l) =>
          l.kind === 'section' ? (
            <div key={l.id} className="pb-1.5 pt-3 text-[13px] font-semibold">{l.designation}</div>
          ) : (
            <div key={l.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{l.designation}</div>
                <div className="text-[12px] text-ink-3">
                  {l.kind === 'texte' ? '' : `${String(l.quantity).replace('.', ',')} ${l.unit} × ${money(l.unitPriceHt)} HT · TVA ${String(l.vatRate).replace('.', ',')} %`}
                  {l.detail ? ` · ${l.detail}` : ''}
                </div>
              </div>
              {l.kind !== 'texte' && <div className={cn('num shrink-0 text-[13.5px] font-medium', l.unitPriceHt < 0 && 'text-vi-700')}>{money(l.quantity * l.unitPriceHt)}</div>}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
