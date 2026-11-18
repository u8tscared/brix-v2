import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronUp, Mic, Receipt, Send } from 'lucide-react';
import { Button, Card, Chip, Tip, cn } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money, pct, type Totals } from '@/lib/format';
import type { Devis } from '@/lib/types';

const DEPOSITS = [0, 20, 30, 40, 50];
const fmtMoney = (n: number) => money(n);

const vatLine = (t: Totals) => (t.byVat.length === 1 ? `TVA ${pct(t.byVat[0].rate, t.byVat[0].rate % 1 ? 1 : 0)} incluse` : `dont TVA ${money(t.tva)}`);

/** Choix de l'acompte : rail lavande, pilule blanche sur le pourcentage choisi. */
function DepositPicker({ d, update, className }: { d: Devis; update: (p: Partial<Devis>) => void; className?: string }) {
  const i = Math.max(0, DEPOSITS.indexOf(d.depositPercent));
  return (
    <div data-field="deposit" role="radiogroup" aria-label="Acompte à la signature" className={cn('relative grid grid-cols-5 rounded-full bg-halo-track p-[3px]', className)}>
      <span aria-hidden className="absolute inset-y-[3px] left-[3px] rounded-full bg-white shadow-pill transition-transform duration-500 ease-spring" style={{ width: 'calc((100% - 6px) / 5)', transform: `translateX(${i * 100}%)` }} />
      {DEPOSITS.map((p) => (
        <button key={p} role="radio" aria-checked={d.depositPercent === p} onClick={() => update({ depositPercent: p })} className={cn('num relative h-8 rounded-full text-[12.5px] font-medium transition-colors duration-200', d.depositPercent === p ? 'text-ink' : 'text-ink-2 hover:text-ink')}>
          {p ? `${p} %` : 'Aucun'}
        </button>
      ))}
    </div>
  );
}

/** Carte total (ordinateur) : dégradé très pâle, gros chiffre qui compte, marge, acompte. */
export function TotalCard({ d, t, update, className }: { d: Devis; t: Totals; update: (p: Partial<Devis>) => void; className?: string }) {
  const low = t.ht > 0 && t.marginRate < 25;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const deposit = (t.ttc * d.depositPercent) / 100;
  return (
    <Card tone="dawn" className={cn('p-6', className)} aria-label="Total du devis">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-halo">Total TTC</span>
        <span className="num text-[12px] text-ink-3">
          <AnimatedNumber value={t.ht} format={fmtMoney} duration={600} /> HT
        </span>
      </div>
      <AnimatedNumber value={t.ttc} format={fmtMoney} duration={800} className="num-halo mt-1 block text-[38px] leading-[1.1] text-ink" />
      <div className="mt-0.5 text-[12.5px] text-ink-2">{aides > 0 ? `Reste à charge ${money(t.ttc - aides)} après aides` : vatLine(t)}</div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Tip label="Prix de vente moins vos coûts (fournitures et main-d’œuvre)">
          <Chip tone={low ? 'warn' : 'ok'} icon={low ? <AlertTriangle /> : undefined}>
            Marge <AnimatedNumber value={t.marginRate} format={(n) => pct(n)} duration={600} />
          </Chip>
        </Tip>
        <Chip tone="white">{d.depositPercent ? <>Acompte {money(deposit)}</> : 'Sans acompte'}</Chip>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-ink-2">Acompte à la signature</span>
          <span className="text-ink-3">{d.depositPercent ? 'payable en ligne' : 'paiement à la fin'}</span>
        </div>
        <DepositPicker d={d} update={update} />
      </div>
    </Card>
  );
}

/** Barre de pied (tablette) : marge, acompte, total TTC, en pilule de verre. */
export function TotalsBar({ d, t, update }: { d: Devis; t: Totals; update: (p: Partial<Devis>) => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  return (
    <div className="shrink-0 px-3 pb-3">
      <div className="glass-strong grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-[22px] px-5 py-3">
        <div className="min-w-0">
          <div className="text-[12px] text-ink-3">Marge estimée</div>
          <div className={cn('num mt-0.5 flex items-center gap-1 text-[15px] font-semibold', low ? 'text-deep-a' : 'text-ink')}>
            {low && <AlertTriangle className="h-3.5 w-3.5" />}
            <AnimatedNumber value={t.marginRate} format={(n) => pct(n)} duration={600} /> · <AnimatedNumber value={t.margin} format={(n) => money(n, true)} duration={600} />
          </div>
        </div>
        <div className="min-w-0 max-w-[360px]">
          <div className="mb-1 text-[12px] text-ink-3">Acompte à la signature</div>
          <DepositPicker d={d} update={update} />
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-3">Total TTC</div>
          <AnimatedNumber value={t.ttc} format={fmtMoney} duration={700} className="num-halo block text-[28px] leading-[1.1] text-ink" />
          <div className="text-[11.5px] text-ink-2">{aides > 0 ? `Reste à charge ${money(t.ttc - aides)}` : vatLine(t)}</div>
        </div>
      </div>
    </div>
  );
}

/** Barre de verre du téléphone, posée juste au-dessus de la barre d'onglets flottante. */
export function MobileTotals({ t, onSend, sendLabel, onDetails, onVoice }: { t: Totals; onSend: () => void; sendLabel: string; onDetails: () => void; onVoice: () => void }) {
  const low = t.ht > 0 && t.marginRate < 25;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(82px+var(--safe-b))] z-[39] animate-[slide-up_.45s_var(--ease)_both] px-3 md:hidden">
      <div className="glass-strong mx-auto flex max-w-[440px] items-center gap-2 rounded-[24px] py-2 pl-2 pr-2">
        <button onClick={onDetails} className="min-w-0 flex-1 rounded-[18px] px-2.5 py-1 text-left transition active:bg-white/70" aria-label="Voir le détail des totaux">
          <div className="flex items-center gap-1">
            <AnimatedNumber value={t.ttc} format={fmtMoney} duration={600} className="num-halo text-[21px] leading-tight text-ink" />
            <ChevronUp className="h-4 w-4 text-ink-3" />
          </div>
          <div className={cn('num truncate text-[11.5px]', low ? 'font-medium text-deep-a' : 'text-ink-3')}>
            TTC · marge {pct(t.marginRate)}
            {low ? ', trop basse' : ''}
          </div>
        </button>
        <Button variant="secondary" size="icon" onClick={onVoice} aria-label="Dicter des lignes" className="!h-12 !w-12">
          <Mic />
        </Button>
        <Button variant="dawn" size="lg" icon={sendLabel === 'Facturer' ? <Receipt /> : <Send />} onClick={onSend} className="!h-12 px-5">
          {sendLabel}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
