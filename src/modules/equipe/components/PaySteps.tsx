// Parcours de paie en 4 étapes : on voit où on en est, et ce qui reste à faire.
import type { ReactNode } from 'react';
import { cn } from '@/components/ui';
import { DrawCheck } from '@/components/motion';

export interface PayStep { title: string; sub: ReactNode; done: boolean; action?: ReactNode }

export function PaySteps({ steps }: { steps: PayStep[] }) {
  const current = steps.findIndex((s) => !s.done);
  const pct = current === -1 ? 100 : (current / (steps.length - 1)) * 100;
  return (
    <div className="relative rounded-[16px] bg-white p-4 shadow-card md:p-5">
      {/* Ordinateur : frise horizontale */}
      <div className="relative hidden md:block">
        <div className="absolute left-[16px] right-[16px] top-[15px] h-[2px] rounded-full bg-sub" />
        <div className="absolute left-[16px] top-[15px] h-[2px] rounded-full bg-[#0891b2] transition-[width] duration-700 ease-out-quint" style={{ width: `calc((100% - 32px) * ${pct / 100})` }} />
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
          {steps.map((s, i) => (
            <li key={s.title} className={cn('min-w-0 pr-4', i === steps.length - 1 && 'pr-0')}>
              <Dot i={i} done={s.done} active={i === current} />
              <div className={cn('mt-3 text-[13.5px] font-semibold', !s.done && i !== current && 'text-ink-3')}>{s.title}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{s.sub}</div>
              {i === current && s.action && <div className="mt-2.5">{s.action}</div>}
            </li>
          ))}
        </ol>
      </div>
      {/* Téléphone : liste verticale */}
      <ol className="space-y-4 md:hidden">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-3">
            {i < steps.length - 1 && <span className={cn('absolute bottom-[-16px] left-[15px] top-[34px] w-[2px] rounded-full', s.done ? 'bg-[#0891b2]' : 'bg-sub')} />}
            <Dot i={i} done={s.done} active={i === current} />
            <div className="min-w-0 flex-1 pt-1">
              <div className={cn('text-[14px] font-semibold', !s.done && i !== current && 'text-ink-3')}>{s.title}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-3">{s.sub}</div>
              {i === current && s.action && <div className="mt-2.5">{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Dot({ i, done, active }: { i: number; done: boolean; active: boolean }) {
  return (
    <span className={cn('relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors duration-300', done ? 'bg-[#0891b2] text-white' : active ? 'bg-white text-[#0e7490] shadow-[0_0_0_2px_#0891b2,0_0_0_6px_#e8f7fa]' : 'bg-white text-ink-3 shadow-[0_0_0_1px_var(--line2)]')}>
      {done ? <DrawCheck className="h-4 w-4" strokeWidth={3} /> : i + 1}
    </span>
  );
}
