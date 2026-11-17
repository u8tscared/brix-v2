import { useEffect, useRef, useState } from 'react';
import { dateShort, money } from '@/lib/format';
import type { ForecastPoint } from './tresorerieForecast';

const H = 240;
const PAD = { l: 8, r: 8, t: 16, b: 26 };

/** Courbe du solde prévu, jour par jour, avec réticule et infobulle au survol. */
export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = points.map((p) => p.balance);
  const rawMin = Math.min(0, ...vals);
  const rawMax = Math.max(...vals);
  const step = niceStep((rawMax - rawMin) / 4);
  const lo = Math.floor(rawMin / step) * step;
  const hi = Math.ceil(rawMax / step) * step;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1; v += step) ticks.push(v);
  const months = points.map((p, i) => ({ p, i })).filter(({ p, i }) => i > 3 && p.date.endsWith('-01'));
  const minI = vals.indexOf(Math.min(...vals));
  const big = points.map((p, i) => ({ i, out: p.events.reduce((a, e) => a + Math.min(0, e.amount), 0) })).filter((d) => d.out < -1500);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative select-none">
      <svg width={w} height={H} className="block touch-pan-y" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Solde prévu sur 90 jours">
        <defs>
          <linearGradient id="tresoFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6d28d9" stopOpacity=".14" />
            <stop offset="1" stopColor="#6d28d9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#dc2626' : '#ececf1'} strokeDasharray={t === 0 ? '4 4' : undefined} />
            <text x={PAD.l + 2} y={y(t) - 4} className="fill-ink-3 text-[10.5px]">{Math.round(t / 1000)} k€</text>
          </g>
        ))}
        {months.map(({ p, i }) => (
          <g key={p.date}>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} stroke="#ececf1" />
            <text x={x(i) + 4} y={H - 8} className="fill-ink-3 text-[10.5px]">{new Date(p.date + 'T12:00').toLocaleDateString('fr-FR', { month: 'long' })}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} className="fill-ink-3 text-[10.5px]">Aujourd'hui</text>
        <path d={area} fill="url(#tresoFill)" />
        <path d={path} fill="none" stroke="#6d28d9" strokeWidth={2} strokeLinejoin="round" />
        {big.map((b) => <circle key={b.i} cx={x(b.i)} cy={y(points[b.i].balance)} r={3} fill="#fff" stroke="#6d28d9" strokeWidth={1.5} />)}
        <circle cx={x(minI)} cy={y(vals[minI])} r={5} fill="#fff" stroke="#17171f" strokeWidth={2} />
        {hover === null && (
          <text x={Math.min(Math.max(x(minI), 50), w - 60)} y={y(vals[minI]) + 20} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
            Point bas · {money(vals[minI], true)}
          </text>
        )}
        {hp && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#17171f" strokeOpacity=".35" />
            <circle cx={x(hover)} cy={y(hp.balance)} r={5} fill="#6d28d9" stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div className="pointer-events-none absolute top-0 z-10 w-56 rounded-xl bg-white p-3 text-[12px] shadow-pop" style={{ left: Math.min(Math.max(x(hover) - 112, 0), w - 224) }}>
          <div className="text-ink-3">{dateShort(hp.date)}</div>
          <div className="num text-[15px] font-semibold">{money(hp.balance, true)}</div>
          {hp.events.slice(0, 4).map((e, i) => (
            <div key={i} className="mt-1 flex justify-between gap-2">
              <span className="truncate text-ink-2">{e.label}</span>
              <span className={`num shrink-0 ${e.amount > 0 ? 'text-ok' : 'text-ink'}`}>{e.amount > 0 ? '+' : ''}{money(e.amount, true)}</span>
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
