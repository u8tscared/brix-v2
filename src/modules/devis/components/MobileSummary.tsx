import { AlertTriangle } from 'lucide-react';
import { Progress, Segmented, Sheet } from '@/components/ui';
import { money, pct, type Totals } from '@/lib/format';
import type { Devis } from '@/lib/types';

/** Détail des totaux sur téléphone (ouvert depuis la barre collante). */
export function MobileSummary({ open, onClose, d, t, update }: { open: boolean; onClose: () => void; d: Devis; t: Totals; update: (p: Partial<Devis>) => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const row = (a: string, b: string, strong?: boolean) => (
    <div key={a} className={`flex justify-between py-2 text-[14px] ${strong ? 'font-semibold' : 'text-ink-2'}`}>
      <span>{a}</span>
      <span className="num text-ink">{b}</span>
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Totaux du devis">
      <div className="divide-y divide-line">
        {row('Total HT', money(t.ht))}
        {t.byVat.map((v) => row(`TVA ${pct(v.rate, v.rate % 1 ? 1 : 0)}`, money(v.tva)))}
        {row('Total TTC', money(t.ttc), true)}
        {aides > 0 && row('Reste à charge après aides', money(t.ttc - aides))}
      </div>
      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-1.5 text-ink-2">Marge estimée {low && <AlertTriangle className="h-3.5 w-3.5 text-warn" />}</span>
          <span className={`num font-semibold ${low ? 'text-warn' : ''}`}>
            {pct(t.marginRate)} · {money(t.margin, true)}
          </span>
        </div>
        <Progress value={t.marginRate * 2} tone={low ? 'warn' : 'ok'} className="mt-2" />
        {low && <p className="mt-2 text-[12.5px] text-warn">Sous 25 % : Bob peut remonter les lignes trop justes.</p>}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[13px] text-ink-2">Acompte à la signature · {money((t.ttc * d.depositPercent) / 100)}</div>
        <Segmented value={String(d.depositPercent)} onChange={(v) => update({ depositPercent: Number(v) })} options={[0, 20, 30, 40, 50].map((p) => ({ value: String(p), label: `${p} %` }))} />
      </div>
    </Sheet>
  );
}
