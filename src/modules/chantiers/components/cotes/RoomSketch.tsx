import { cn } from '@/components/ui';
import { DOOR, WINDOW, type Room } from './compute';

export type Focus = 'L' | 'W' | 'H' | 'ouvertures' | null;

const f = (n?: number) => (n ? `${n.toFixed(2).replace('.', ',')} m` : '?');

/** Plan de la pièce qui se dessine au fil des mesures. */
export function RoomSketch({ room, focus, className }: { room: Room; focus: Focus; className?: string }) {
  const L = room.L ?? (focus === 'L' ? 0 : 4);
  const W = room.W ?? 3;
  const VW = 320;
  const VH = 230;
  const pad = 46;
  const s = Math.min((VW - pad * 2) / Math.max(L || 4, 1), (VH - pad * 2) / Math.max(W, 1));
  const w = (L || 4) * s;
  const h = W * s;
  const x = (VW - w) / 2;
  const y = (VH - h) / 2;
  const hiL = focus === 'L';
  const hiW = focus === 'W';
  const known = !!room.L && !!room.W;
  const stroke = (on: boolean) => (on ? '#6d28d9' : '#17171f');

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={cn('h-auto w-full', className)} role="img" aria-label={`Plan de ${room.name}`}>
      <defs>
        <pattern id="floorGrid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="#ececf1" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={known ? 'url(#floorGrid)' : '#fafafc'} className="transition-all duration-500" />
      {/* murs */}
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={stroke(hiL)} strokeWidth={hiL ? 6 : 4} strokeLinecap="round" strokeDasharray={!room.L ? '8 6' : undefined} />
      <line x1={x + w} y1={y} x2={x + w} y2={y + h} stroke={stroke(hiW)} strokeWidth={hiW ? 6 : 4} strokeLinecap="round" strokeDasharray={!room.W ? '8 6' : undefined} />
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke="#17171f" strokeWidth="4" strokeLinecap="round" strokeDasharray={!known ? '8 6' : undefined} opacity={known ? 1 : 0.3} />
      <line x1={x} y1={y} x2={x} y2={y + h} stroke="#17171f" strokeWidth="4" strokeLinecap="round" strokeDasharray={!known ? '8 6' : undefined} opacity={known ? 1 : 0.3} />
      {/* fenêtres sur le mur du haut */}
      {Array.from({ length: room.windows }, (_, i) => {
        const ww = Math.min(WINDOW.w * s, w / (room.windows + 1));
        const cx = x + ((i + 1) * w) / (room.windows + 1);
        return (
          <g key={'w' + i}>
            <rect x={cx - ww / 2} y={y - 4} width={ww} height={8} fill="#fff" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1={cx - ww / 2} y1={y} x2={cx + ww / 2} y2={y} stroke="#3b82f6" strokeWidth="1" />
          </g>
        );
      })}
      {/* portes sur le mur du bas */}
      {Array.from({ length: room.doors }, (_, i) => {
        const dw = Math.min(DOOR.w * s, w / (room.doors + 1));
        const dx = x + ((i + 1) * w) / (room.doors + 1) - dw / 2;
        return (
          <g key={'d' + i}>
            <line x1={dx} y1={y + h} x2={dx + dw} y2={y + h} stroke="#fff" strokeWidth="6" />
            <path d={`M${dx} ${y + h} L ${dx} ${y + h - dw} A ${dw} ${dw} 0 0 1 ${dx + dw} ${y + h}`} fill="none" stroke="#9898a8" strokeWidth="1.2" strokeDasharray="3 2" />
          </g>
        );
      })}
      {/* cotes */}
      <text x={x + w / 2} y={y - 14} textAnchor="middle" fontSize="13" fontWeight={hiL ? 700 : 600} fill={hiL ? '#6d28d9' : '#17171f'} fontFamily="Inter">
        {f(room.L)}
      </text>
      <text x={x + w + 14} y={y + h / 2} textAnchor="middle" fontSize="13" fontWeight={hiW ? 700 : 600} fill={hiW ? '#6d28d9' : '#17171f'} fontFamily="Inter" transform={`rotate(90 ${x + w + 14} ${y + h / 2})`}>
        {f(room.W)}
      </text>
      {known && (
        <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill="#5f5f70" fontFamily="Inter">
          {((room.L ?? 0) * (room.W ?? 0)).toFixed(2).replace('.', ',')} m²
        </text>
      )}
      <g transform={`translate(${VW - 76} ${VH - 30})`}>
        <rect width="68" height="22" rx="11" fill={focus === 'H' ? '#f5f0ff' : '#f6f6f9'} stroke={focus === 'H' ? '#b9a2f5' : '#ececf1'} />
        <text x="34" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={focus === 'H' ? '#6d28d9' : '#5f5f70'} fontFamily="Inter">
          H {room.H ? room.H.toFixed(2).replace('.', ',') : '?'}
        </text>
      </g>
    </svg>
  );
}
