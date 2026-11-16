import { AlertTriangle, Send } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { money, pct, type Totals } from '@/lib/format';
import type { Devis } from '@/lib/types';

const DEPOSITS = [0, 20, 30, 40, 50];

function MarginBar({ rate }: { rate: number }) {
  const low = rate < 25;
  return (
    <div className="relative mt-1.5 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-sub">
      <div className={cn('h-full rounded-full transition-[width] duration-500', low ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.max(0, Math.min(100, rate * 2))}%` }} />
      <i className="absolute top-0 h-full w-px bg-ink/40" style={{ left: '50%' }} title="Seuil 25 %" />
    </div>
  );
}

/** Pied fixe de l'éditeur : marge, acompte, total TTC (ordinateur et tablette). */
export function TotalsBar({ d, t, update }: { d: Devis; t: Totals; update: (p: Partial<Devis>) => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const vatText = t.byVat.length === 1 ? `TVA ${pct(t.byVat[0].rate, t.byVat[0].rate % 1 ? 1 : 0)} incluse` : `dont TVA ${money(t.tva)}`;
  return (
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end gap-4 border-t border-line bg-white px-5 py-3.5 xl:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
          Marge estimée {low && <AlertTriangle className="h-3.5 w-3.5 text-warn" />}
        </div>
        <div className={cn('num text-[15px] font-semibold', low ? 'text-warn' : 'text-ink')}>
          {pct(t.marginRate)} · {money(t.margin, true)}
        </div>
        <MarginBar rate={t.marginRate} />
        {low && <div className="mt-1 text-[11.5px] text-warn">Sous 25 % : vérifiez vos prix</div>}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] text-ink-3">Acompte à la signature</div>
        <label className="relative inline-flex items-center">
          <select value={d.depositPercent} onChange={(e) => update({ depositPercent: Number(e.target.value) })} className="num cursor-pointer appearance-none border-b border-dashed border-ink-3 bg-transparent text-[15px] font-semibold focus:outline-none" aria-label="Pourcentage d'acompte">
            {DEPOSITS.map((p) => (
              <option key={p} value={p}>
                {p} %
              </option>
            ))}
          </select>
                    <span className="num ml-1 text-[15px] font-semibold">· {money((t.ttc * d.depositPercent) / 100)}</span>
        </label>
        <div className="truncate text-[11.5px] text-ink-3">Carte, virement ou 3 fois, lien dans l'e-mail</div>
      </div>
      <div className="text-right">
        <div className="num text-[12px] text-ink-3">Total TTC · {money(t.ht)} HT</div>
        <div className="num dawn-text font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">{money(t.ttc)}</div>
        <div className="text-[11.5px] text-ink-2">{aides > 0 ? `Reste à charge ${money(t.ttc - aides)} après aides` : vatText}</div>
      </div>
    </div>
  );
}

/** Barre collante du téléphone, posée au-dessus de la barre d'onglets. */
export function MobileTotals({ t, onSend, sendLabel, onDetails }: { t: Totals; onSend: () => void; sendLabel: string; onDetails: () => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  return (
    <div className="fixed inset-x-0 bottom-[calc(62px+var(--safe-b))] z-[35] border-t border-line bg-white/95 px-4 py-2.5 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onDetails} className="min-w-0 flex-1 text-left" aria-label="Voir le détail des totaux">
          <div className="num dawn-text font-display text-[22px] font-semibold leading-tight">{money(t.ttc)}</div>
          <div className={cn('num truncate text-[11.5px]', low ? 'font-medium text-warn' : 'text-ink-3')}>
            TTC · marge {pct(t.marginRate)}
            {low ? ' : trop basse' : ''}
          </div>
        </button>
        <Button variant="primary" size="lg" icon={<Send className="h-4 w-4" />} onClick={onSend}>
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}
