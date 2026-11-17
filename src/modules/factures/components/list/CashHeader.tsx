import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money, monthName } from '@/lib/format';

export type CashFilter = 'a_encaisser' | 'en_retard' | 'payees';

interface Props {
  cashed: number;
  cashedCount: number;
  onTime: number;
  onTimeCount: number;
  late: number;
  lateCount: number;
  active: string;
  onPick: (f: CashFilter) => void;
}

/** En-tête de trésorerie : encaissé ce mois (le chiffre qui compte), à encaisser, en retard. */
export function CashHeader({ cashed, cashedCount, onTime, onTimeCount, late, lateCount, active, onPick }: Props) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const total = cashed + onTime + late || 1;
  const segs = [
    { key: 'payees' as const, value: cashed, color: '#16a34a', label: 'Encaissé' },
    { key: 'a_encaisser' as const, value: onTime, color: '#6366f1', label: 'Dans les temps' },
    { key: 'en_retard' as const, value: late, color: '#e5484d', label: 'En retard' },
  ];
  const month = monthName().split(' ')[0];

  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 p-4 md:col-span-1 md:p-5">
          <div className="text-[12.5px] font-medium text-ink-2">Encaissé en {month}</div>
          <div className="num mt-1 text-[34px] font-semibold leading-[1.1] tracking-[-0.04em] md:text-[40px]">
            <AnimatedNumber value={cashed} format={(n) => money(n, true)} className="dawn-text" />
          </div>
          <div className="mt-1 text-[12.5px] text-ink-3">
            {cashedCount ? `${cashedCount} paiement${cashedCount > 1 ? 's' : ''} reçu${cashedCount > 1 ? 's' : ''}` : 'Aucun paiement reçu ce mois-ci'}
          </div>
        </div>
        <Kpi
          label="À encaisser"
          value={onTime}
          hint={onTimeCount ? `${onTimeCount} facture${onTimeCount > 1 ? 's' : ''} dans les temps` : 'Rien en attente'}
          dot="#6366f1"
          active={active === 'a_encaisser'}
          onClick={() => onPick('a_encaisser')}
        />
        <Kpi
          label="En retard"
          value={late}
          tone={lateCount ? 'bad' : undefined}
          hint={
            lateCount ? (
              <Link to="/app/relances" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-medium text-vi-700 hover:underline">
                {lateCount} à relancer <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              'Tous vos clients sont à jour'
            )
          }
          dot="#e5484d"
          active={active === 'en_retard'}
          onClick={() => onPick('en_retard')}
        />
      </div>
      <div className="border-t border-line px-4 pb-3.5 pt-3 md:px-5">
        <div className="flex h-2 gap-[3px] overflow-hidden rounded-full bg-sub">
          {segs.map((s, i) => (
            <button
              key={s.key}
              aria-label={`${s.label} : ${money(s.value)}`}
              onClick={() => onPick(s.key)}
              className="h-full rounded-full transition-[width,opacity] duration-700 ease-out-quint hover:opacity-80"
              style={{ width: grown ? `${(s.value / total) * 100}%` : '0%', background: s.color, transitionDelay: `${i * 90}ms`, display: s.value ? undefined : 'none' }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
          {segs.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label} <span className="num text-ink-2">{Math.round((s.value / total) * 100)} %</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, dot, tone, active, onClick }: { label: string; value: number; hint: React.ReactNode; dot: string; tone?: 'bad'; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn('group relative min-w-0 border-t border-line p-4 text-left transition-colors duration-150 hover:bg-[#faf9fd] last:border-l md:border-l md:border-t-0 md:p-5', active && 'bg-[#faf9fd]')}
    >
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
        <i className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
        <ChevronRight className="ml-auto h-3.5 w-3.5 -translate-x-1 text-ink-3 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      <div className={cn('num mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.03em]', tone === 'bad' && 'text-bad')}>
        <AnimatedNumber value={value} format={(n) => money(n, true)} delay={120} />
      </div>
      <div className="mt-1 text-[12.5px] text-ink-3">{hint}</div>
      {active && <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-ink md:inset-x-5" />}
    </button>
  );
}
