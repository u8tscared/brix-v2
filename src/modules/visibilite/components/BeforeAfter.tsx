import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import type { ArtKind } from '@/modules/chantiers/store';

/**
 * Avant / après avec curseur glissant (souris, doigt ou flèches du clavier).
 * À l'apparition, le curseur fait un petit aller-retour pour montrer qu'il se déplace.
 */
export function BeforeAfter({ art, seed, className }: { art: ArtKind; seed: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [drag, setDrag] = useState(false);
  const [hinted, setHinted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || hinted) return;
      setHinted(true);
      setTimeout(() => setPos(36), 350);
      setTimeout(() => setPos(50), 950);
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hinted]);

  const move = (e: RPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className={`relative aspect-[16/10] touch-pan-y select-none overflow-hidden bg-sub ${className ?? ''}`}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(true); move(e); }}
      onPointerMove={(e) => drag && move(e)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <div className="absolute inset-0"><PhotoArt art={art} phase="apres" seed={seed + 'apres'} /></div>
      <div className={`absolute inset-0 ${drag ? '' : 'transition-[clip-path] duration-500 ease-out-quint'}`} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <PhotoArt art={art} phase="avant" seed={seed + 'avant'} />
      </div>
      <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">Avant</span>
      <span className="absolute right-2.5 top-2.5 rounded-md bg-[#15122a]/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">Après</span>
      <div className={`absolute inset-y-0 w-0 ${drag ? '' : 'transition-[left] duration-500 ease-out-quint'}`} style={{ left: `${pos}%` }}>
        <span className="absolute inset-y-0 -left-px w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,.25)]" />
        <button
          type="button"
          role="slider"
          aria-label="Comparer avant et après"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
            if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
          }}
          className={`absolute left-0 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-ink shadow-pop transition-transform duration-200 ${drag ? 'scale-110' : 'hover:scale-105'}`}
        >
          <ChevronsLeftRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
