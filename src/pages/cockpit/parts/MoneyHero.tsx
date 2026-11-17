import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { AnimatedNumber, GrowBar } from '@/components/motion';
import { cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { CockpitData } from '../useCockpitData';
import { CashChart } from './CashChart';

const eur = (n: number) => money(n, true);

/** Le chiffre qui compte : l'argent encaissé ce mois-ci, avec sa courbe et ce qui reste à rentrer. */
export function MoneyHero({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const pct = Math.min(100, (data.paidThisMonth / data.goal) * 100);
  const up = data.diff >= 0;
  return (
    <section className={cn('relative overflow-hidden rounded-[20px] bg-white shadow-card', className)} aria-label="Argent du mois">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-dawn-soft opacity-70 blur-2xl" aria-hidden />
      <div className="relative px-5 pb-4 pt-5 md:px-6 md:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink-2">Encaissé en {data.monthLabel}</div>
            <AnimatedNumber value={data.paidThisMonth} format={eur} duration={1100} className="mt-1 block font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] dawn-text md:text-[56px]" />
          </div>
          {data.prevPaid > 0 && (
            <span className={cn('mt-1 inline-flex shrink-0 animate-[fade-up_.4s_var(--ease)_.5s_both] items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', up ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad')}>
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {up ? '+' : '−'}{eur(Math.abs(data.diff))}
              <span className="hidden font-medium opacity-80 sm:inline">vs {data.prevMonthLabel}</span>
            </span>
          )}
        </div>

        <CashChart curve={data.curve} prev={data.prevCurve} days={data.daysInMonth} monthLabel={data.monthLabel} prevLabel={data.prevMonthLabel} className="mt-4 hidden md:block" />

        <div className="mt-4 flex items-center gap-3 md:mt-5">
          <GrowBar value={pct} className="h-[6px] flex-1 bg-sub" barClassName="bg-ink" />
          <span className="num shrink-0 text-[12px] text-ink-3">{Math.round(pct)} % de {eur(data.goal)}</span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 border-t border-line md:grid-cols-3">
        <Figure label="À encaisser" value={data.toCollect} onClick={() => navigate('/app/factures')}
          sub={<>{data.unpaidCount} facture{data.unpaidCount > 1 ? 's' : ''}{data.late.length > 0 && <span className="text-bad"> · {data.late.length} en retard</span>}</>} />
        <Figure label="Devis à signer" value={data.pendingTotal} onClick={() => navigate('/app/devis')}
          sub={<>{data.pending.length} devis · marge {Math.round(data.marginRate)} %</>} className="border-l border-line" />
        <Figure label="Trésorerie à 30 jours" value={data.cash30} onClick={() => navigate('/app/tresorerie')} sub="après salaires et charges" className="hidden border-l border-line md:block" />
      </div>
    </section>
  );
}

function Figure({ label, value, sub, onClick, className }: { label: string; value: number; sub: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn('group min-w-0 px-5 py-3.5 text-left transition-colors hover:bg-[#faf9fd] md:px-6 md:py-4', className)}>
      <div className="flex items-center gap-1 text-[12.5px] text-ink-2">
        {label}
        <ChevronRight className="h-3.5 w-3.5 -translate-x-1 text-ink-3 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      <AnimatedNumber value={value} format={eur} delay={150} className="mt-0.5 block text-[19px] font-semibold tracking-[-0.03em] md:text-[21px]" />
      <div className="mt-0.5 truncate text-[11.5px] text-ink-3">{sub}</div>
    </button>
  );
}
