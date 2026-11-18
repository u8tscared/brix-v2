import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';

/** Affiche un contenu conçu pour `width` px, réduit pour tenir dans la place disponible (aperçu navigateur). */
export function ScaledFrame({ width, height, url, children }: { width: number; height: number; url: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(width);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = cw > 0 ? Math.min(1, cw / width) : 1;
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-halo-lg">
      <div className="flex h-10 items-center gap-2 border-b border-halo-line bg-halo-track/60 px-3.5">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
        <span className="mx-auto flex h-6 min-w-0 max-w-[70%] items-center gap-1.5 rounded-full bg-white px-3.5 text-[11.5px] text-ink-2 shadow-halo-sm"><Lock className="h-3 w-3 shrink-0" /><span className="truncate">{url}</span></span>
      </div>
      <div ref={ref} className="relative overflow-hidden" style={{ height }}>
        <div className="scrollbar-none overflow-y-auto" style={{ width, height: height / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
