// Schémas SVG des outils métier : simples, au trait, qui s'animent quand les valeurs changent.
import { cn } from '@/components/ui';
import { num } from '@/lib/format';

const T = 'transition-all duration-500 ease-out-quint';

/** Coupe d'un câble : gaine, conducteurs colorés dont le diamètre suit la section. */
export function CableSection({ section, conductors }: { section: number; conductors: 3 | 5 }) {
  const r0 = 9 + Math.sqrt(section) * 4.6; // rayon visuel du cuivre + isolant
  const ring0 = conductors === 3 ? r0 * 1.25 : r0 * 1.75;
  const k = Math.min(1, 66 / (ring0 + r0 + 6)); // on réduit l'ensemble si ça déborde
  const r = r0 * k;
  const core = r * 0.62;
  const colors = conductors === 3 ? ['#2563eb', '#8b5a2b', '#16a34a'] : ['#8b5a2b', '#15122a', '#9ca3af', '#2563eb', '#16a34a'];
  const ring = ring0 * k;
  const outer = ring + r + 6;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="-80 -80 160 160" className="h-[132px] w-[132px] shrink-0" aria-hidden>
        <circle r={Math.min(78, outer)} fill="#efedf5" stroke="#dfdce9" className={T} />
        <circle r={Math.min(74, outer - 4)} fill="#fff" className={T} />
        {colors.map((c, i) => {
          const a = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * ring;
          const y = Math.sin(a) * ring;
          const yellow = conductors === 3 ? i === 2 : i === 4;
          return (
            <g key={i} style={{ transform: `translate(${x}px, ${y}px)` }} className={T}>
              <circle r={r} fill={c} className={T} />
              {yellow && <circle r={r} fill="none" stroke="#facc15" strokeWidth={r * 0.5} strokeDasharray={`${r * 0.9} ${r * 0.9}`} className={T} />}
              <circle r={core} fill="#e7a565" className={T} />
              <circle r={core} fill="url(#cu)" className={T} />
            </g>
          );
        })}
        <defs>
          <radialGradient id="cu" cx=".35" cy=".35" r=".8">
            <stop offset="0" stopColor="#fde2c0" />
            <stop offset="1" stopColor="#c2783b" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <div className="min-w-0 space-y-1.5 text-[12.5px] text-ink-2">
        <div className="text-[13px] font-semibold text-ink">R2V {conductors}G{num(section, 1)}</div>
        <Legend c="#8b5a2b" label="Phase" />
        {conductors === 5 && <Legend c="#15122a" label="Phases 2 et 3" />}
        <Legend c="#2563eb" label="Neutre" />
        <Legend c="#16a34a" stripe label="Terre" />
      </div>
    </div>
  );
}

function Legend({ c, label, stripe }: { c: string; label: string; stripe?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <i className="h-2.5 w-2.5 rounded-full" style={{ background: stripe ? `repeating-linear-gradient(45deg,${c} 0 2px,#facc15 2px 4px)` : c }} />
      {label}
    </div>
  );
}

/** Profil de toit : la pente s'incline, le rampant est coté. */
export function RoofProfile({ slopePct, width, pans, rampant }: { slopePct: number; width: number; pans: 1 | 2 | 4; rampant: number }) {
  const W = 220;
  const base = 108;
  const span = pans === 1 ? W - 40 : (W - 40) / 2;
  const h = Math.min(80, span * (slopePct / 100));
  const left = 20;
  const ridgeX = pans === 1 ? left + span : left + span;
  const angle = Math.round((Math.atan(slopePct / 100) * 180) / Math.PI);
  const pts = pans === 1 ? `${left},${base} ${ridgeX},${base - h} ${ridgeX},${base}` : `${left},${base} ${ridgeX},${base - h} ${W - 20},${base}`;
  return (
    <svg viewBox={`0 0 ${W} 126`} className="mx-auto block h-auto w-full max-w-[380px]" aria-hidden>
      <line x1="8" x2={W - 8} y1={base + 0.5} y2={base + 0.5} stroke="#dfdce9" />
      <polygon points={pts} fill="#fff1e7" stroke="#c2410c" strokeWidth="1.6" strokeLinejoin="round" className={T} />
      {/* tuiles */}
      {Array.from({ length: 7 }, (_, i) => {
        const t = (i + 1) / 8;
        return <line key={i} x1={left + span * t} y1={base - h * t} x2={left + span * t + 4} y2={base - h * t + 4} stroke="#c2410c" strokeOpacity=".35" className={T} />;
      })}
      <path d={`M ${left + 26} ${base} A 26 26 0 0 0 ${left + 26 * Math.cos(Math.atan(h / span))} ${base - 26 * Math.sin(Math.atan(h / span))}`} fill="none" stroke="#15122a" strokeOpacity=".5" className={T} />
      <text x={left + 32} y={base - 6} fontSize="10" fill="#5d5a72" fontWeight="600">{angle}°</text>
      <text x={(left + ridgeX) / 2 - 18} y={base - h / 2 - 10} fontSize="10.5" fill="#15122a" fontWeight="600" className={T}>{num(rampant, 2)} m</text>
      <text x={W / 2} y={base + 16} fontSize="10" fill="#9794aa" textAnchor="middle">largeur {num(width, 1)} m · pente {num(slopePct, 0)} %</text>
    </svg>
  );
}

/** Pente d'évacuation : un tuyau incliné avec la goutte qui descend. */
export function PipeSlope({ slopePct, diameter }: { slopePct: number; diameter: number }) {
  const drop = Math.min(36, slopePct * 9);
  const th = Math.max(8, Math.min(18, diameter / 6));
  return (
    <svg viewBox="0 0 240 90" className="mx-auto block h-auto w-full max-w-[380px]" aria-hidden>
      <line x1="10" x2="230" y1="70" y2="70" stroke="#dfdce9" strokeDasharray="3 3" />
      <line x1="20" x2="220" y1={30} y2={30 + drop} stroke="#cbd5e1" strokeWidth={th} strokeLinecap="round" className={T} />
      <line x1="20" x2="220" y1={30} y2={30 + drop} stroke="#0e7490" strokeOpacity=".35" strokeWidth={th * 0.45} strokeLinecap="round" strokeDasharray="10 14" className={T}>
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="3" />
      </line>
      <text x="120" y="86" fontSize="10" fill="#5d5a72" textAnchor="middle">Ø {diameter} mm · {num(slopePct, 1)} cm par mètre</text>
    </svg>
  );
}

/** Coupe de cloison : plaques de part et d'autre de l'ossature. */
export function WallSection({ plates, studs, insulation }: { plates: 1 | 2; studs: number; insulation: boolean }) {
  const w = 200;
  const core = Math.max(24, studs / 1.6);
  const p = 9;
  const total = core + plates * p * 2;
  const x0 = (w - total) / 2;
  return (
    <svg viewBox={`0 0 ${w} 110`} className="mx-auto block h-auto w-full max-w-[220px]" aria-hidden>
      {Array.from({ length: plates }, (_, i) => <rect key={'l' + i} x={x0 + i * p} y="10" width={p - 1} height="90" rx="1.5" fill="#eef0fd" stroke="#4f46e5" strokeOpacity=".55" className={T} />)}
      <rect x={x0 + plates * p} y="10" width={core} height="90" fill={insulation ? '#fde68a' : '#fff'} stroke="#9794aa" strokeDasharray={insulation ? '0' : '3 3'} className={T} />
      {insulation && Array.from({ length: 6 }, (_, i) => <path key={i} d={`M ${x0 + plates * p + 3} ${18 + i * 14} q ${core / 4} -6 ${core / 2 - 3} 0 t ${core / 2 - 3} 0`} fill="none" stroke="#d97706" strokeOpacity=".55" className={T} />)}
      {Array.from({ length: plates }, (_, i) => <rect key={'r' + i} x={x0 + plates * p + core + i * p + 1} y="10" width={p - 1} height="90" rx="1.5" fill="#eef0fd" stroke="#4f46e5" strokeOpacity=".55" className={T} />)}
      <text x={w / 2} y="108" fontSize="9.5" fill="#5d5a72" textAnchor="middle">{Math.round(total)} mm</text>
    </svg>
  );
}

/** Petite pile de sacs : un sac par unité, plafonné, qui pop à l'apparition. */
export function Stack({ count, label, max = 24, tone = '#a16207' }: { count: number; label: string; max?: number; tone?: string }) {
  const shown = Math.min(count, max);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: shown }, (_, i) => (
          <i key={i} className="h-4 w-3 animate-pop rounded-[3px]" style={{ background: tone, opacity: 0.25 + 0.75 * ((i + 1) / shown), animationDelay: `${i * 18}ms` }} />
        ))}
        {count > max && <span className="ml-1 self-center text-[11.5px] font-medium text-ink-3">+{count - max}</span>}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-2">{label}</div>
    </div>
  );
}

/** Barre empilée : répartition (ex. ciment / sable / gravier). */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string; display: string }[] }) {
  const total = parts.reduce((x, p) => x + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-halo-track">
        {parts.map((p) => <div key={p.label} className="h-full transition-[width] duration-700 ease-out-quint first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />{p.label}</div>
            <div className="num truncate text-[13.5px] font-semibold">{p.display}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ballon d'eau chaude : le niveau monte selon le volume. */
export function Tank({ liters, max = 300 }: { liters: number; max?: number }) {
  const fill = Math.max(0.1, Math.min(1, liters / max));
  return (
    <svg viewBox="0 0 80 130" className="h-[120px] w-[74px] shrink-0" aria-hidden>
      <defs>
        <clipPath id="tank"><rect x="12" y="10" width="56" height="110" rx="26" /></clipPath>
        <linearGradient id="hot" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fb923c" /><stop offset="1" stopColor="#e11d48" /></linearGradient>
      </defs>
      <rect x="12" y="10" width="56" height="110" rx="26" fill="#f4f3f8" stroke="#dfdce9" />
      <g clipPath="url(#tank)">
        <rect x="12" width="56" y={120 - 110 * fill} height={110 * fill} fill="url(#hot)" opacity=".85" className={T} />
      </g>
      <text x="40" y="70" fontSize="12" fontWeight="700" textAnchor="middle" fill="#fff" className={cn(fill < 0.5 && 'fill-ink')}>{Math.round(liters)} L</text>
    </svg>
  );
}
