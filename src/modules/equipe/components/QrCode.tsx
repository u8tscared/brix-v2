import { useMemo } from 'react';
import { qrPath } from '../lib/qr';

/** QR code généré localement en SVG (aucun service externe). */
export function QrCode({ value, size = 184, className }: { value: string; size?: number; className?: string }) {
  const q = useMemo(() => {
    try {
      return qrPath(value);
    } catch {
      return null;
    }
  }, [value]);
  if (!q) return null;
  return (
    <svg viewBox={`0 0 ${q.size} ${q.size}`} width={size} height={size} className={className} shapeRendering="crispEdges" role="img" aria-label={`QR code : ${value}`}>
      <rect width={q.size} height={q.size} fill="#fff" />
      <path d={q.d} fill="#17171f" />
    </svg>
  );
}
