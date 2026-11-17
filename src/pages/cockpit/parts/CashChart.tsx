import { useEffect, useId, useRef, useState } from 'react';
import { money } from '@/lib/format';

/**
 * Courbe d'encaissement cumulé du mois : le mois en cours se dessine au dégradé d'aube,
 * le mois précédent reste en pointillés pour comparer. Le point du jour apparaît en dernier.
 */
export function CashChart({ curve, prev, days, monthLabel, prevLabel, className }: { curve: number[]; prev: number[]; days: number; monthLabel: string; prevLabel: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  // Le tracé est calculé à la largeur réelle : pas de déformation, le trait se dessine proprement.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 132;
  const top = 12;
  const max = Math.max(1, ...curve, ...prev) * 1.1;
  const x = (i: number) => (i / Math.max(1, days - 1)) * W;
  const y = (v: number) => top + (H - top - 2) * (1 - v / max);
  const path = (pts: number[]) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = curve.length - 1;
  const lx = x(last);
  const ly = y(curve[last] ?? 0);
  const leftPct = W ? (lx / W) * 100 : 0;
  return (
    <div className={className}>
      <div ref={box} className="relative h-[132px]">
        {W > 0 && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block overflow-visible" role="img" aria-label={`Encaissements cumulés de ${monthLabel}, comparés à ${prevLabel}`}>
              <defs>
                <linearGradient id={`s${id}`} x1="0" x2="1">
                  <stop offset="0" stopColor="#6d28d9" />
                  <stop offset=".6" stopColor="#d946ef" />
                  <stop offset="1" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id={`f${id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#d946ef" stopOpacity=".16" />
                  <stop offset="1" stopColor="#d946ef" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((g) => (
                <line key={g} x1="0" x2={W} y1={top + (H - top - 2) * g} y2={top + (H - top - 2) * g} stroke="var(--line)" strokeWidth="1" strokeDasharray={g === 1 ? undefined : '2 4'} />
              ))}
              <path d={path(prev)} fill="none" stroke="#c9c5d8" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" className="animate-[fade-in_.8s_ease_.2s_both]" />
              <path d={`${path(curve)} L${lx},${H - 2} L0,${H - 2} Z`} fill={`url(#f${id})`} className="animate-[fade-in_1s_ease_.7s_both]" />
              <path d={path(curve)} fill="none" stroke={`url(#s${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, ['--len' as string]: 1, animation: 'draw 1.4s var(--ease) .15s both' }} />
              <line x1={lx} x2={lx} y1={ly + 6} y2={H - 2} stroke="#fb923c" strokeOpacity=".45" strokeWidth="1" strokeDasharray="2 3" className="animate-[fade-in_.4s_ease_1.4s_both]" />
            </svg>
            <span className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: lx, top: ly }}>
              <span className="absolute h-5 w-5 animate-[ping2_1.8s_ease-out_1.5s_2_both] rounded-full bg-peach/50" />
              <span className="relative h-3 w-3 animate-[pop_.4s_var(--ease)_1.35s_both] rounded-full bg-peach ring-[3px] ring-white" />
            </span>
            <span
              className="num pointer-events-none absolute animate-[fade-in_.4s_var(--ease)_1.5s_both] whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white"
              style={leftPct > 75 ? { top: ly - 30, right: W - lx - 10 } : { top: ly - 30, left: lx, transform: 'translateX(-50%)' }}
            >
              {money(curve[last] ?? 0, true)} au {last + 1}
            </span>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
        <span>1er {monthLabel}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-dawn" />{monthLabel}</span>
          <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-[1.5px] border-dashed border-[#c9c5d8]" />{prevLabel}</span>
        </span>
        <span>{days} {monthLabel.slice(0, 3)}.</span>
      </div>
    </div>
  );
}
