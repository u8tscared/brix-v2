// Zone de signature : tracé au doigt / à la souris (courbes lissées, épaisseur selon la vitesse)
// ou nom tapé rendu en écriture manuscrite. Produit une image PNG transparente.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PenLine, RotateCcw, Type } from 'lucide-react';
import { cn } from '@/components/ui';

export interface PadRef {
  image: () => string | null;
}

interface Props {
  nom: string;
  mode: 'dessin' | 'texte';
  onMode: (m: 'dessin' | 'texte') => void;
  onChange: (pret: boolean) => void;
}

export const PadSignature = forwardRef<PadRef, Props>(function PadSignature({ nom, mode, onMode, onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pts = useRef<{ x: number; y: number; t: number }[]>([]);
  const largeur = useRef(2.6);
  const [vide, setVide] = useState(true);
  const dessin = useRef(false);

  const ctx = () => canvas.current?.getContext('2d') ?? null;

  const preparer = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const x = c.getContext('2d');
    if (!x) return;
    x.scale(dpr, dpr);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = '#1b1440';
    setVide(true);
    onChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'dessin') return;
    preparer();
    const r = () => preparer();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, [mode, preparer]);

  useEffect(() => {
    if (mode === 'texte') onChange(nom.trim().length > 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nom]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current?.setPointerCapture(e.pointerId);
    dessin.current = true;
    pts.current = [pos(e)];
    largeur.current = 2.6;
  };
  const move = (e: React.PointerEvent) => {
    if (!dessin.current) return;
    const x = ctx();
    if (!x) return;
    const p = pos(e);
    const a = pts.current;
    a.push(p);
    if (a.length < 3) return;
    const [p0, p1, p2] = a.slice(-3);
    const v = Math.hypot(p2.x - p1.x, p2.y - p1.y) / Math.max(1, p2.t - p1.t);
    const cible = Math.max(1.2, Math.min(3.4, 3.6 - v * 1.6));
    largeur.current = largeur.current * 0.7 + cible * 0.3;
    x.lineWidth = largeur.current;
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    x.beginPath();
    x.moveTo(m1.x, m1.y);
    x.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    x.stroke();
    if (vide) {
      setVide(false);
      onChange(true);
    }
  };
  const up = () => {
    dessin.current = false;
    const x = ctx();
    const a = pts.current;
    if (x && a.length === 1) {
      x.beginPath();
      x.arc(a[0].x, a[0].y, 1.6, 0, Math.PI * 2);
      x.fillStyle = '#1b1440';
      x.fill();
    }
  };

  useImperativeHandle(ref, () => ({
    image: () => {
      if (mode === 'dessin') return vide ? null : canvas.current?.toDataURL('image/png') ?? null;
      if (nom.trim().length < 2) return null;
      const c = document.createElement('canvas');
      c.width = 900;
      c.height = 260;
      const x = c.getContext('2d')!;
      x.fillStyle = '#1b1440';
      x.font = "600 110px Caveat, 'Segoe Script', cursive";
      x.textBaseline = 'middle';
      x.fillText(nom.trim(), 30, 140, 840);
      return c.toDataURL('image/png');
    },
  }));

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="inline-flex rounded-full bg-halo-track p-1 text-[13px] font-medium">
          {(
            [
              ['dessin', 'Dessiner', PenLine],
              ['texte', 'Écrire mon nom', Type],
            ] as const
          ).map(([k, l, I]) => (
            <button key={k} onClick={() => onMode(k)} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 transition', mode === k ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:text-ink')} aria-pressed={mode === k}>
              <I className="h-3.5 w-3.5" strokeWidth={2} /> {l}
            </button>
          ))}
        </div>
        {mode === 'dessin' && !vide && (
          <button onClick={preparer} className="bx-fade inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-2 hover:bg-halo-hover hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} /> Effacer
          </button>
        )}
      </div>
      <div className="relative h-[180px] overflow-hidden rounded-card bg-dawn-mist shadow-[0_0_0_1px_#ece8f6,0_12px_30px_-18px_rgba(60,30,120,.25)]">
        {mode === 'dessin' ? (
          <>
            <canvas ref={canvas} className="absolute inset-0 h-full w-full cursor-crosshair touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label="Zone de signature" />
            {vide && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div className="text-[#a29fb8]">
                  <svg viewBox="0 0 160 40" className="mx-auto mb-1 h-8 w-32 opacity-70">
                    <path className="bx-draw" style={{ ['--len' as string]: 260 }} d="M6 30c12-22 20-24 24-14s-2 18 6 8 14-24 22-12-4 20 8 10 12-16 20-8 6 10 14 4 10-10 18-6 12 6 20 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[13px]">Signez ici avec le doigt ou la souris</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center px-4">
            <span className={cn('bx-script truncate text-[54px] leading-none text-[#1b1440] transition-opacity', nom.trim() ? 'opacity-100' : 'opacity-30')}>{nom.trim() || 'Votre nom'}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-[#d6d2e6]" />
        <span className="pointer-events-none absolute bottom-3 left-6 text-[11px] uppercase tracking-[.12em] text-[#a29fb8]">Bon pour accord</span>
      </div>
    </div>
  );
});
