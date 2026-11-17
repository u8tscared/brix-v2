import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronUp, Mic, Receipt, Send } from 'lucide-react';
import { Button, Tip, cn } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money, pct, type Totals } from '@/lib/format';
import type { Devis } from '@/lib/types';

const DEPOSITS = [0, 20, 30, 40, 50];
const fmtMoney = (n: number) => money(n);

/** Jauge de marge avec repère des 25 %. */
function MarginBar({ rate }: { rate: number }) {
  const low = rate < 25;
  return (
    <div className="relative mt-2 h-1.5 w-full max-w-[170px] overflow-hidden rounded-full bg-sub">
      <div className={cn('h-full rounded-full transition-[width,background-color] duration-700 ease-out-quint', low ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.max(0, Math.min(100, rate * 2))}%` }} />
      <i className="absolute top-0 h-full w-px bg-ink/30" style={{ left: '50%' }} />
    </div>
  );
}

/** Pied fixe de l'éditeur : marge, acompte, total TTC (ordinateur et tablette). Toujours visible. */
export function TotalsBar({ d, t, update }: { d: Devis; t: Totals; update: (p: Partial<Devis>) => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const vatText = t.byVat.length === 1 ? `TVA ${pct(t.byVat[0].rate, t.byVat[0].rate % 1 ? 1 : 0)} incluse` : `dont TVA ${money(t.tva)}`;
  return (
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto] items-end gap-5 border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur xl:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <Tip label="Prix de vente moins vos coûts (fournitures et main d’œuvre)">
            <span className="cursor-help border-b border-dotted border-ink-3/60">Marge estimée</span>
          </Tip>
          {low && <AlertTriangle className="h-3.5 w-3.5 text-warn" />}
        </div>
        <div className={cn('num mt-0.5 text-[15px] font-semibold', low ? 'text-warn' : 'text-ink')}>
          <AnimatedNumber value={t.marginRate} format={(n) => pct(n)} duration={600} /> · <AnimatedNumber value={t.margin} format={(n) => money(n, true)} duration={600} />
        </div>
        <MarginBar rate={t.marginRate} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] text-ink-3">Acompte à la signature</div>
        <div data-field="deposit" className="mt-1 inline-flex rounded-[10px] bg-[#efedf5] p-[3px]">
          {DEPOSITS.map((p) => (
            <button key={p} onClick={() => update({ depositPercent: p })} className={cn('num h-7 rounded-[7px] px-2 text-[12.5px] font-medium transition-all duration-200', d.depositPercent === p ? 'bg-white text-ink shadow-[0_1px_2px_rgba(19,15,38,.1)]' : 'text-ink-2 hover:text-ink')} aria-pressed={d.depositPercent === p}>
              {p ? `${p} %` : 'Aucun'}
            </button>
          ))}
        </div>
        <div className="num mt-1 truncate text-[11.5px] text-ink-3">{d.depositPercent ? `${money((t.ttc * d.depositPercent) / 100)} payables en ligne` : 'Le client paie à la fin des travaux'}</div>
      </div>
      <div className="text-right">
        <div className="num text-[12px] text-ink-3">
          Total TTC · <AnimatedNumber value={t.ht} format={fmtMoney} duration={600} /> HT
        </div>
        <div className="num text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink">
          <AnimatedNumber value={t.ttc} format={fmtMoney} duration={700} />
        </div>
        <div className="text-[11.5px] text-ink-2">{aides > 0 ? `Reste à charge ${money(t.ttc - aides)} après aides` : vatText}</div>
      </div>
    </div>
  );
}

/** Barre collante du téléphone, posée juste au-dessus de la barre d'onglets. */
export function MobileTotals({ t, onSend, sendLabel, onDetails, onVoice }: { t: Totals; onSend: () => void; sendLabel: string; onDetails: () => void; onVoice: () => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(64px+var(--safe-b))] z-[39] animate-[slide-up_.45s_var(--ease)_both] border-t border-line bg-white/95 px-3 pb-[26px] pt-2.5 shadow-[0_-8px_24px_-16px_rgba(19,15,38,.25)] backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-2">
        <button onClick={onDetails} className="min-w-0 flex-1 rounded-[12px] px-1.5 py-0.5 text-left active:bg-sub" aria-label="Voir le détail des totaux">
          <div className="flex items-center gap-1">
            <span className="num text-[22px] font-semibold leading-tight tracking-[-0.035em] text-ink">
              <AnimatedNumber value={t.ttc} format={fmtMoney} duration={600} />
            </span>
            <ChevronUp className="h-4 w-4 text-ink-3" />
          </div>
          <div className={cn('num truncate text-[11.5px]', low ? 'font-medium text-warn' : 'text-ink-3')}>
            TTC · marge {pct(t.marginRate)}
            {low ? ', trop basse' : ''}
          </div>
        </button>
        <Button variant="secondary" size="icon" onClick={onVoice} aria-label="Dicter des lignes" className="h-12 w-12 rounded-full">
          <Mic />
        </Button>
        <Button variant="dawn" size="lg" icon={sendLabel === 'Facturer' ? <Receipt className="h-4 w-4" /> : <Send className="h-4 w-4" />} onClick={onSend} className="h-12">
          {sendLabel}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
