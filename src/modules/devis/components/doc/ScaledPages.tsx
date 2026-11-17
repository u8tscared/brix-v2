import { useLayoutEffect, useRef, useState } from 'react';
import { Expand } from 'lucide-react';
import { DocPages, PAGE_W, type DocSpec } from './PagedDoc';

/** Pages A4 réduites à la largeur de leur colonne ; un clic ouvre l'aperçu plein écran. */
export function ScaledPages({ spec, onExpand, label = 'Agrandir et vérifier' }: { spec: DocSpec; onExpand?: () => void; label?: string }) {
  const box = useRef<HTMLButtonElement>(null);
  const [w, setW] = useState(240);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return (
    <button ref={box} type="button" onClick={onExpand} className="group/doc relative block w-full cursor-zoom-in text-left" aria-label="Ouvrir l’aperçu plein écran">
      <DocPages spec={spec} scale={w / PAGE_W} gap={10} pageClassName="shadow-[0_1px_2px_rgba(19,15,38,.08),0_8px_24px_-12px_rgba(19,15,38,.2)] transition-shadow duration-300 group-hover/doc:shadow-[0_1px_2px_rgba(19,15,38,.08),0_16px_36px_-14px_rgba(19,15,38,.32)]" />
      <span className="pointer-events-none absolute inset-x-0 top-10 flex translate-y-1 justify-center opacity-0 transition duration-300 ease-out-quint group-hover/doc:translate-y-0 group-hover/doc:opacity-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/90 px-3 py-1.5 text-[12px] font-medium text-white shadow-pop backdrop-blur">
          <Expand className="h-3.5 w-3.5" /> {label}
        </span>
      </span>
    </button>
  );
}
