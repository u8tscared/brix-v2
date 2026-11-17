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
    <div className="overflow-hidden rounded-[14px] border border-line2 bg-white shadow-pop">
      <div className="flex h-9 items-center gap-2 border-b border-line bg-sub px-3">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
        <span className="mx-auto flex h-6 min-w-0 max-w-[70%] items-center gap-1.5 rounded-md bg-white px-3 text-[11.5px] text-ink-2"><Lock className="h-3 w-3 shrink-0" /><span className="truncate">{url}</span></span>
      </div>
      <div ref={ref} className="relative overflow-hidden" style={{ height }}>
        <div className="scrollbar-none overflow-y-auto" style={{ width, height: height / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
