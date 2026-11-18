import { AnimatedNumber } from '@/components/motion';
import { money } from '@/lib/format';
import type { Facture } from '@/lib/types';
import { ScaledPages } from '@/modules/devis/components/doc/ScaledPages';
import type { DocSpec } from '@/modules/devis/components/doc/PagedDoc';
import { amounts } from '../lib/model';

export function ScaledInvoice({ spec, onExpand }: { spec: DocSpec; onExpand: () => void }) {
  return <ScaledPages spec={spec} onExpand={onExpand} label="Agrandir" />;
}

/** Totaux de la facture, sous les lignes. */
export function DetailTotals({ f }: { f: Facture }) {
  const a = amounts(f);
  const sign = a.sign === -1 ? '−' : '';
  return (
    <div className="flex flex-col gap-4 rounded-card bg-dawn-pale p-5 shadow-halo md:flex-row md:items-end md:justify-between md:p-6">
      <div className="space-y-1 text-[13px] text-ink-2">
        <div className="flex gap-6">
          <span>Total HT</span>
          <span className="num ml-auto text-ink md:ml-0">
            {sign}
            {money(a.ht)}
          </span>
        </div>
        {a.byVat.map((v) => (
          <div key={v.rate} className="flex gap-6">
            <span>TVA {String(v.rate).replace('.', ',')} %</span>
            <span className="num ml-auto text-ink md:ml-0">
              {sign}
              {money(v.tva)}
            </span>
          </div>
        ))}
        {a.retenue > 0 && (
          <div className="flex gap-6">
            <span>Retenue de garantie {f.retenueGarantie} %</span>
            <span className="num ml-auto text-ink md:ml-0">−{money(a.retenue)}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="label-halo">{f.kind === 'avoir' ? 'Montant de l’avoir' : a.retenue ? 'Net à payer TTC' : 'Total TTC'}</div>
        <div className="num-halo mt-1 text-[34px] md:text-[38px]">
          {sign}
          <AnimatedNumber value={f.kind === 'avoir' ? a.ttc : a.net} format={(n) => money(n)} duration={600} />
        </div>
      </div>
    </div>
  );
}
