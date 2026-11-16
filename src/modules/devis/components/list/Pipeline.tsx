import { cn } from '@/components/ui';
import { money, pct } from '@/lib/format';

export type StageKey = 'brouillon' | 'envoye' | 'vu' | 'signe' | 'refuse';
export interface Stage {
  key: StageKey;
  label: string;
  count: number;
  amount: number;
  color: string;
}

/** Pipeline des devis : 5 étapes, montants TTC et taux de signature. */
export function Pipeline({ stages, active, onPick, rate, pending }: { stages: Stage[]; active: string; onPick: (k: StageKey | 'tous') => void; rate: number; pending: number }) {
  const total = stages.reduce((s, x) => s + x.amount, 0) || 1;
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-3.5 md:px-5">
        <div>
          <div className="text-xs font-medium text-ink-2">En attente de signature</div>
          <div className="num mt-0.5 text-[24px] font-semibold leading-tight tracking-[-0.02em]">{money(pending, true)}</div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xs font-medium text-ink-2">Taux de signature</div>
            <div className="num mt-0.5 text-[20px] font-semibold leading-tight text-ok">{pct(rate)}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-ink-2">Moyenne du secteur</div>
            <div className="num mt-0.5 text-[20px] font-semibold leading-tight text-ink-3">{pct(42)}</div>
          </div>
        </div>
      </div>
      <div className="flex h-1.5 w-full bg-sub" aria-hidden>
        {stages.map((s) => (
          <i key={s.key} className="h-full transition-[width] duration-700" style={{ width: `${(s.amount / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5">
        {stages.map((s, i) => (
          <button
            key={s.key}
            onClick={() => onPick(active === s.key ? 'tous' : s.key)}
            className={cn(
              'group relative min-h-[76px] border-line px-4 py-3 text-left transition hover:bg-[#fafafc] md:px-5',
              i % 2 === 0 ? 'border-r' : 'sm:border-r',
              i < 4 && 'border-b sm:border-b-0',
              i === 4 && 'col-span-2 sm:col-span-1 sm:border-r-0',
              active === s.key && 'bg-vi-50/60 hover:bg-vi-50/80',
            )}
            aria-pressed={active === s.key}
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
              <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="num ml-auto text-ink-3">{s.count}</span>
            </div>
            <div className="num mt-1 text-[16px] font-semibold tracking-[-0.01em]">{money(s.amount, true)}</div>
            {active === s.key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-vi-700" />}
          </button>
        ))}
      </div>
    </div>
  );
}
