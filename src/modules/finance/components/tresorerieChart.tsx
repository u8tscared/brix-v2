import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/components/ui';
import { capitalize, dateLong, money } from '@/lib/format';
import type { ForecastPoint } from './tresorerieForecast';

const PAD = { l: 4, r: 4, t: 20, b: 28 };

/**
 * Courbe du solde prévu, jour par jour.
 * Le tracé se dessine à l'arrivée, la zone apparaît ensuite, le seuil d'alerte est en pointillés ambre.
 * Survol (ou doigt) : réticule + info-bulle avec les mouvements du jour.
 */
export function ForecastChart({ points, threshold, height = 260 }: { points: ForecastPoint[]; threshold?: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const H = height;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = points.map((p) => p.balance);
  const rawMin = Math.min(0, ...vals, threshold ?? Infinity);
  const rawMax = Math.max(...vals);
  const step = niceStep((rawMax - rawMin) / 4);
  const lo = Math.floor(rawMin / step) * step;
  const hi = Math.ceil((rawMax * 1.05) / step) * step;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  // Tracé en marches : le solde change d'un coup le jour du mouvement.
  const path = points.map((p, i) => (i ? `H${x(i).toFixed(1)}V${y(p.balance).toFixed(1)}` : `M${x(0).toFixed(1)},${y(p.balance).toFixed(1)}`)).join('');
  const area = `${path} L${x(points.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1; v += step) ticks.push(v);
  const months = points.map((p, i) => ({ p, i })).filter(({ p, i }) => i > 4 && p.date.endsWith('-01'));
  const minI = vals.indexOf(Math.min(...vals));
  const big = points.map((p, i) => ({ i, sum: p.events.reduce((a, e) => a + e.amount, 0) })).filter((d) => Math.abs(d.sum) > 1500);
  const under = threshold !== undefined && vals.some((v) => v < threshold);

  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover !== null ? points[hover] : null;
  const tipW = 236;

  return (
    <div ref={ref} className="relative select-none" style={{ height: H }}>
      {w > 0 && (
        <svg width={w} height={H} className="block touch-pan-y" onPointerMove={(e) => pick(e.clientX, e.currentTarget)} onPointerDown={(e) => pick(e.clientX, e.currentTarget)} onPointerLeave={() => setHover(null)} role="img" aria-label="Solde prévu sur 90 jours">
          <defs>
            <linearGradient id={`f${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#8b5cf6" stopOpacity=".22" />
              <stop offset=".7" stopColor="#d946ef" stopOpacity=".04" />
              <stop offset="1" stopColor="#d946ef" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`s${uid}`} x1="0" x2="1">
              <stop offset="0" stopColor="#6d28d9" />
              <stop offset=".65" stopColor="#c026d3" />
              <stop offset="1" stopColor="#fb923c" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#e7a3a3' : 'var(--line)'} strokeDasharray={t === 0 ? '3 4' : undefined} />
              <text x={PAD.l + 2} y={y(t) - 5} className="fill-ink-3 text-[10.5px]">{t === 0 ? '0 €' : `${Math.round(t / 1000)} k€`}</text>
            </g>
          ))}
          {months.map(({ p, i }) => (
            <g key={p.date}>
              <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" strokeDasharray="2 4" />
              <text x={x(i) + 5} y={H - 9} className="fill-ink-3 text-[11px]">{capitalize(new Date(p.date + 'T12:00').toLocaleDateString('fr-FR', { month: 'long' }))}</text>
            </g>
          ))}
          <text x={PAD.l + 2} y={H - 9} className="fill-ink-2 text-[11px] font-medium">Aujourd'hui</text>

          {threshold !== undefined && (
            <g className="animate-[fade-in_.6s_ease_.9s_both]">
              <line x1={PAD.l} x2={w - PAD.r} y1={y(threshold)} y2={y(threshold)} stroke="#f59e0b" strokeWidth={1.25} strokeDasharray="5 5" />
              <rect x={PAD.l + 74} y={y(threshold) - 20} width={150} height={16} rx={8} fill="#fff8eb" />
              <text x={PAD.l + 149} y={y(threshold) - 9} textAnchor="middle" className="fill-warn text-[10.5px] font-medium">Seuil : 1 mois de salaires</text>
            </g>
          )}

          <path d={area} fill={`url(#f${uid})`} className="animate-[fade-in_1s_ease_.6s_both]" />
          <path d={path} fill="none" stroke={`url(#s${uid})`} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" pathLength={1} style={{ strokeDasharray: 1, ['--len' as string]: 1, animation: 'draw 1.6s var(--ease) .1s both' }} />
          {big.map((b, k) => (
            <circle key={b.i} cx={x(b.i)} cy={y(points[b.i].balance)} r={3} fill="#fff" stroke={b.sum > 0 ? '#16a34a' : '#8b5cf6'} strokeWidth={1.6} className="animate-[pop_.4s_var(--ease)_both]" style={{ animationDelay: `${0.9 + k * 0.04}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
          ))}
          <circle cx={x(0)} cy={y(vals[0])} r={4.5} fill="#6d28d9" stroke="#fff" strokeWidth={2} />
          <g className="animate-[fade-in_.4s_ease_1.1s_both]">
            <circle cx={x(minI)} cy={y(vals[minI])} r={5.5} fill="#fff" stroke={under ? '#d97706' : 'var(--ink)'} strokeWidth={2} />
            {hover === null && (
              <text x={Math.min(Math.max(x(minI), 60), w - 70)} y={y(vals[minI]) + 22} textAnchor="middle" className={cn('text-[11.5px] font-semibold', under ? 'fill-warn' : 'fill-ink')}>
                Point bas · {money(vals[minI], true)}
              </text>
            )}
          </g>
          {hp && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t - 8} y2={H - PAD.b} stroke="var(--ink)" strokeOpacity=".25" />
              <circle cx={x(hover)} cy={y(hp.balance)} r={8} fill="#8b5cf6" fillOpacity=".15" />
              <circle cx={x(hover)} cy={y(hp.balance)} r={4.5} fill="#6d28d9" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hp && hover !== null && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-[12px] bg-night/95 p-3 text-[12px] text-white shadow-pop backdrop-blur" style={{ width: tipW, left: Math.min(Math.max(x(hover) - tipW / 2, 0), w - tipW) }}>
          <div className="text-white/60">{capitalize(dateLong(hp.date))}</div>
          <div className="num mt-0.5 text-[17px] font-semibold tracking-[-0.02em]">{money(hp.balance, true)}</div>
          {hp.events.length === 0 && <div className="mt-1 text-white/50">Aucun mouvement ce jour</div>}
          {hp.events.slice(0, 4).map((e, i) => (
            <div key={i} className="mt-1 flex justify-between gap-2">
              <span className="truncate text-white/75">{e.label}</span>
              <span className={cn('num shrink-0 font-medium', e.amount > 0 ? 'text-[#4ade80]' : 'text-white')}>{e.amount > 0 ? '+' : ''}{money(e.amount, true)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
