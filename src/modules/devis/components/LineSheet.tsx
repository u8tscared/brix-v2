import { ArrowDown, ArrowUp, Copy, Minus, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Segmented, Sheet } from '@/components/ui';
import { money, num, pct } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import { NumInput } from './bits';
import type { LineHandlers } from './LineRow';
import { VAT_RATES } from './LineRow';

const UNITS = ['u', 'm', 'ml', 'm²', 'm³', 'h', 'jour', 'forfait', 'ens.'];

/** Fiche d'une ligne : gros champs, utilisable avec des gants. */
export function LineSheet({ line, onClose, h }: { line?: DevisLigne; onClose: () => void; h: LineHandlers }) {
  if (!line) return null;
  const l = line;
  const set = (p: Partial<DevisLigne>) => h.onChange(l.id, p);
  const margin = l.unitPriceHt ? ((l.unitPriceHt - l.unitCostHt) / l.unitPriceHt) * 100 : 0;
  return (
    <Sheet
      open
      onClose={onClose}
      title="Modifier la ligne"
      subtitle={l.supplierRef ? `${l.supplierRef}${l.supplier ? ' · ' + l.supplier : ''}` : undefined}
      footer={
        <div className="flex w-full items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Monter" onClick={() => h.onMove(l.id, -1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Descendre" onClick={() => h.onMove(l.id, 1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Dupliquer" onClick={() => h.onDuplicate(l.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Supprimer"
            className="text-bad"
            onClick={() => {
              h.onRemove(l.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="primary" onClick={onClose}>
            Terminé
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Désignation">
          <Input value={l.designation} onChange={(e) => set({ designation: e.target.value })} />
        </Field>
        {l.kind !== 'texte' && (
          <>
            <Field label="Détail (visible sur le devis)">
              <Input value={l.detail ?? ''} placeholder="Marque, référence, précision…" onChange={(e) => set({ detail: e.target.value })} />
            </Field>
            <div>
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Quantité</span>
              <div className="flex items-center gap-2">
                <Button size="icon" className="h-12 w-12" aria-label="Moins" onClick={() => set({ quantity: Math.max(0, l.quantity - 1) })}>
                  <Minus className="h-5 w-5" />
                </Button>
                <div className="flex-1 rounded-[10px] border border-line2">
                  <NumInput value={l.quantity} onChange={(v) => set({ quantity: v })} ariaLabel="Quantité" className="h-12 text-center text-[18px] font-semibold" />
                </div>
                <Button size="icon" className="h-12 w-12" aria-label="Plus" onClick={() => set({ quantity: l.quantity + 1 })}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {UNITS.map((u) => (
                  <button key={u} onClick={() => set({ unit: u })} className={`h-10 min-w-[44px] rounded-full px-3 text-[13px] transition duration-300 ease-spring ${l.unit === u ? 'bg-ink text-white shadow-ink' : 'bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6]'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix unitaire HT">
                <div className="rounded-field bg-white shadow-[0_0_0_1px_#ece8f6]">
                  <NumInput value={l.unitPriceHt} onChange={(v) => set({ unitPriceHt: v, source: l.source === 'bibliotheque' ? 'manuel' : l.source })} ariaLabel="Prix unitaire HT" className="h-11 text-[15px]" />
                </div>
              </Field>
              <Field label="Coût d'achat HT" hint={l.unitPriceHt ? `Marge ${pct(margin)}` : undefined}>
                <div className="rounded-field bg-white shadow-[0_0_0_1px_#ece8f6]">
                  <NumInput value={l.unitCostHt} onChange={(v) => set({ unitCostHt: v })} ariaLabel="Coût d'achat HT" className="h-11 text-[15px]" />
                </div>
              </Field>
            </div>
            <div>
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">TVA</span>
              <Segmented value={String(l.vatRate)} onChange={(v) => set({ vatRate: Number(v) })} options={VAT_RATES.map((r) => ({ value: String(r), label: `${num(r, 1)} %` }))} />
            </div>
            <div className="flex items-center justify-between rounded-card-sm bg-dawn-pale px-4 py-3.5">
              <span className="text-[13px] text-ink-2">Total de la ligne</span>
              <span className="num-halo text-[20px]">{money(l.quantity * l.unitPriceHt)} HT</span>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
