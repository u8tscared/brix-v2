import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, cn } from '@/components/ui';
import { AnimatedNumber, Ring } from '@/components/motion';
import { money, pct } from '@/lib/format';

export type StageKey = 'brouillon' | 'envoye' | 'vu' | 'signe' | 'refuse';
export interface Stage {
  key: StageKey;
  label: string;
  count: number;
  amount: number;
  color: string;
}

const fmt0 = (n: number) => money(n, true);

/** Pipeline des devis : montant en attente en grand, 4 étapes en barre segmentée, taux de signature. */
export function Pipeline({ stages, active, onPick, rate, pending, pendingCount }: { stages: Stage[]; active: string; onPick: (k: StageKey | 'tous') => void; rate: number; pending: number; pendingCount: number }) {
  const flow = stages.filter((s) => s.key !== 'refuse');
  const refused = stages.find((s) => s.key === 'refuse');
  const total = flow.reduce((s, x) => s + x.amount, 0) || 1;
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 px-5 pb-5 pt-5 sm:flex-row sm:items-end sm:justify-between md:px-7 md:pt-6">
        <div>
          <div className="label-halo">En attente de signature</div>
          <div className="num-halo mt-1.5 text-[38px] text-ink md:text-[48px]">
            <AnimatedNumber value={pending} format={fmt0} />
          </div>
          <div className="mt-2 text-[12.5px] text-ink-2">
            {pendingCount} devis chez vos clients · {refused?.count ? `${refused.count} refusé${refused.count > 1 ? 's' : ''}` : 'aucun refus'}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:pb-1">
          <Ring value={rate} size={64} stroke={6} tone="ok">
            <span className="text-[13px]">{Math.round(rate)}%</span>
          </Ring>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Taux de signature</div>
            <div className="text-[12px] text-ink-3">moyenne du métier {pct(42)}</div>
          </div>
        </div>
      </div>

      {/* Barre segmentée : chaque étape prend la place de son montant */}
      <div className="mx-5 flex h-2 gap-[3px] overflow-hidden rounded-full md:mx-7" aria-hidden>
        {flow.map((s, i) => (
          <i
            key={s.key}
            className={cn('h-full rounded-full transition-[width,opacity] duration-[1100ms] ease-out-quint', active !== 'tous' && active !== s.key && 'opacity-30')}
            style={{ width: grown ? `${Math.max(s.amount ? 2 : 0, (s.amount / total) * 100)}%` : '0%', background: s.color, transitionDelay: `${i * 90}ms` }}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 p-2 sm:grid-cols-4">
        {flow.map((s, i) => (
          <button
            key={s.key}
            onClick={() => onPick(active === s.key ? 'tous' : s.key)}
            className={cn('group relative min-h-[72px] rounded-[16px] px-4 py-3 text-left transition-colors duration-300 hover:bg-halo-hover md:px-5', active === s.key && 'bg-halo-track')}
            aria-pressed={active === s.key}
          >
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
              <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="num rounded-full bg-[#f3f1f8] px-1.5 text-[11px] font-semibold text-ink-2">{s.count}</span>
            </div>
            <div className="num-halo mt-1 text-[20px]">
              <AnimatedNumber value={s.amount} format={fmt0} delay={i * 80} />
            </div>
            {i < flow.length - 1 && <ChevronRight className="absolute right-[-10px] top-1/2 z-[1] hidden h-[18px] w-[18px] -translate-y-1/2 text-[#c9c4d9] sm:block" />}
          </button>
        ))}
      </div>
    </Card>
  );
}
