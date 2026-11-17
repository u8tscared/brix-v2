// Visionneuse de document A4 : aperçu intégré (mis à l'échelle) et plein écran avec zoom
// (boutons, Ctrl + molette, pincement à deux doigts), impression / PDF.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Download, Expand, Minus, Plus, ScanLine, X } from 'lucide-react';
import { cn } from '@/components/ui';

const LARGEUR = 794;

/** Mesure la largeur disponible pour mettre le papier à l'échelle. */
function useLargeur<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Aperçu intégré : le papier entier à l'échelle, cliquable pour ouvrir en grand. */
export function ApercuPapier({ children, onOuvrir, hauteurMax, legende }: { children: ReactNode; onOuvrir: () => void; hauteurMax?: number; legende?: string }) {
  const [ref, w] = useLargeur<HTMLDivElement>();
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(1123);
  useLayoutEffect(() => {
    if (inner.current && inner.current.offsetHeight !== h) setH(inner.current.offsetHeight);
  });
  const k = w ? w / LARGEUR : 0.5;
  const visible = hauteurMax ? Math.min(h * k, hauteurMax) : h * k;
  return (
    <div ref={ref} className="group relative w-full">
      <button onClick={onOuvrir} className="bx-paper relative block w-full overflow-hidden rounded-[10px] bg-white text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-28px_rgba(45,20,90,.4)]" style={{ height: visible }} aria-label="Ouvrir le document en grand">
        <div ref={inner} style={{ width: LARGEUR, transform: `scale(${k})`, transformOrigin: 'top left' }} className="pointer-events-none">
          {children}
        </div>
        {hauteurMax && h * k > hauteurMax && <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/85 to-transparent" />}
        <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#130f26]/90 px-4 py-2.5 text-[13px] font-medium text-white opacity-95 shadow-lg backdrop-blur transition group-hover:scale-[1.03] group-hover:opacity-100">
          <Expand className="h-4 w-4" strokeWidth={1.75} />
          {legende ?? 'Lire le document en grand'}
        </span>
      </button>
    </div>
  );
}

/** Plein écran avec zoom. */
export function PleinEcran({ open, onClose, titre, children, onImprimer }: { open: boolean; onClose: () => void; titre: string; children: ReactNode; onImprimer?: () => void }) {
  const [ref, w] = useLargeur<HTMLDivElement>();
  const [zoom, setZoom] = useState<number | null>(null); // null = ajusté à la largeur
  const ajuste = w ? Math.min(1.25, (w - 32) / LARGEUR) : 1;
  const k = zoom ?? ajuste;
  const pinch = useRef<{ d: number; k: number } | null>(null);

  const borne = (z: number) => Math.min(3, Math.max(0.35, z));
  const changer = useCallback((delta: number) => setZoom((z) => borne(Math.round(((z ?? ajuste) + delta) * 100) / 100)), [ajuste]);

  useEffect(() => {
    if (!open) return;
    setZoom(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === '+' || e.key === '=') && !e.metaKey) changer(0.15);
      if (e.key === '-' && !e.metaKey) changer(-0.15);
      if (e.key === '0') setZoom(null);
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  }, [open, onClose, changer]);

  if (!open) return null;
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  return createPortal(
    <div className="bx-root bx-fade fixed inset-0 z-[75] flex flex-col bg-[#ebe9f3]" role="dialog" aria-modal="true" aria-label={titre}>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#e0deea] bg-white/90 px-3 pt-safe backdrop-blur-xl sm:px-5">
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-[#f4f3fa]" aria-label="Fermer">
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{titre}</div>
        <div className="flex items-center rounded-full bg-[#f4f3fa] p-1">
          <button onClick={() => changer(-0.15)} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white" aria-label="Dézoomer">
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button onClick={() => setZoom(null)} className="bx-mono h-9 min-w-[58px] rounded-full px-2 text-[12.5px] font-medium transition hover:bg-white" aria-label="Ajuster à l'écran">
            {Math.round(k * 100)} %
          </button>
          <button onClick={() => changer(0.15)} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white" aria-label="Zoomer">
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <button onClick={() => setZoom(null)} className="hidden h-11 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium transition hover:bg-[#f4f3fa] sm:inline-flex">
          <ScanLine className="h-4 w-4" strokeWidth={1.75} /> Ajuster
        </button>
        {onImprimer && (
          <button onClick={onImprimer} className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-[#f4f3fa] sm:w-auto sm:gap-2 sm:px-3 sm:text-[13.5px] sm:font-medium" aria-label="Télécharger en PDF">
            <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        )}
      </div>
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        style={{ touchAction: 'pan-x pan-y' }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            changer(-e.deltaY / 400);
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) pinch.current = { d: dist(e.touches), k };
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinch.current) setZoom(borne((pinch.current.k * dist(e.touches)) / pinch.current.d));
        }}
        onTouchEnd={() => (pinch.current = null)}
      >
        <div className="mx-auto py-6 sm:py-10" style={{ width: LARGEUR * k + 32, paddingLeft: 16, paddingRight: 16 }}>
          <Mesure k={k}>{children}</Mesure>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Papier mis à l'échelle : le conteneur prend la hauteur réelle (transform ne la change pas). */
function Mesure({ k, children }: { k: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(1123);
  useLayoutEffect(() => {
    if (ref.current && ref.current.offsetHeight !== h) setH(ref.current.offsetHeight);
  });
  return (
    <div className={cn('bx-paper bx-pop overflow-hidden rounded-[6px] bg-white')} style={{ width: LARGEUR * k, height: h * k }}>
      <div ref={ref} style={{ width: LARGEUR, transform: `scale(${k})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
