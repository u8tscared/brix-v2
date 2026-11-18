// Briques visuelles des pages publiques (client, facture) : feuille, boutons pilule, succès en anneaux, confettis.
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/components/ui';

export function Feuille({ open, onClose, children, titre, sousTitre, large = false, fermable = true }: { open: boolean; onClose: () => void; children: ReactNode; titre?: ReactNode; sousTitre?: ReactNode; large?: boolean; fermable?: boolean }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const esc = (e: KeyboardEvent) => e.key === 'Escape' && fermable && onClose();
      window.addEventListener('keydown', esc);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', esc);
      };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [open, fermable, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="bx-root fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className={cn('absolute inset-0 bg-[#1b1240]/25 backdrop-blur-[6px] transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')} onClick={() => fermable && onClose()} />
      <div
        className={cn(
          'relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-sheet bg-white/95 shadow-[0_1px_2px_rgba(60,30,120,.06),0_40px_90px_-24px_rgba(60,30,120,.45)] ring-1 ring-white backdrop-blur-2xl transition-[transform,opacity] duration-[420ms] ease-spring',
          large ? 'sm:max-w-[640px]' : 'sm:max-w-[480px]',
          visible ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-4 sm:scale-[.98]',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#e4dff0] sm:hidden" />
        {(titre || fermable) && (
          <div className="flex shrink-0 items-start gap-3 px-6 pb-2 pt-4 sm:pt-6">
            <div className="min-w-0 flex-1">
              {titre && <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.03em]">{titre}</h2>}
              {sousTitre && <p className="mt-1 text-[13.5px] text-ink-2">{sousTitre}</p>}
            </div>
            {fermable && (
              <button onClick={onClose} className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-halo-hover hover:text-ink" aria-label="Fermer">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(24px+var(--safe-b))] pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { chargement?: boolean; icone?: ReactNode; taille?: 'md' | 'lg' };

export const BoutonAube = forwardRef<HTMLButtonElement, BtnProps>(function BoutonAube({ chargement, icone, taille = 'lg', className, children, disabled, ...p }, ref) {
  return (
    <button
      ref={ref}
      {...p}
      disabled={disabled || chargement}
      className={cn(
        'bx-btn-dawn inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold tracking-[-0.01em] text-white disabled:cursor-not-allowed disabled:opacity-50',
        taille === 'lg' ? 'h-[54px] px-6 text-[15.5px]' : 'h-11 px-5 text-[14px]',
        className,
      )}
    >
      {chargement ? <Loader2 className="h-5 w-5 animate-spin" /> : icone}
      <span className="relative">{children}</span>
    </button>
  );
});

export function BoutonEncre({ chargement, icone, taille = 'lg', className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || chargement}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-pill bg-ink font-semibold tracking-[-0.01em] text-white shadow-ink transition duration-300 ease-spring hover:-translate-y-px hover:bg-[#241f3f] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0',
        taille === 'lg' ? 'h-[54px] px-6 text-[15.5px]' : 'h-11 px-5 text-[14px]',
        className,
      )}
    >
      {chargement ? <Loader2 className="h-5 w-5 animate-spin" /> : icone}
      {children}
    </button>
  );
}

export const BoutonDoux = forwardRef<HTMLButtonElement, BtnProps>(function BoutonDoux({ icone, className, children, chargement: _c, taille: _t, ...p }, ref) {
  return (
    <button ref={ref} {...p} className={cn('inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-white px-4 text-[14px] font-medium text-ink shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px hover:shadow-[0_0_0_1px_#e0d8f2,0_8px_20px_-10px_rgba(60,30,120,.25)] active:scale-[.985] disabled:opacity-40', className)}>
      {icone}
      {children}
    </button>
  );
});

/** Succès Halo : disque dégradé dans des anneaux concentriques, coche qui se dessine. */
export function CocheAnimee({ taille = 88, ton = 'aube' }: { taille?: number; ton?: 'aube' | 'vert' }) {
  const coeur = Math.round(taille * 0.67);
  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: taille + 60, height: taille + 60 }} aria-hidden>
      <div className="bx-success" style={{ width: taille, height: taille }}>
        <div className={cn('bx-success-core', ton === 'vert' && 'ok')} style={{ width: coeur, height: coeur }}>
          <svg viewBox="0 0 38 38" style={{ width: coeur * 0.5, height: coeur * 0.5 }}>
            <path className="bx-draw" style={{ ['--len' as string]: 40 }} d="M10 20l6 6 12-13" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const COULEURS = ['#6d28d9', '#a855f7', '#d946ef', '#f472b6', '#fb923c', '#fdba74'];

/** Pluie de petits losanges aux couleurs de l'aube, une seule fois. */
export function Confettis({ actif }: { actif: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; dx: number; rot: number; dur: number; delay: number; c: string; w: number }[]>([]);
  const done = useRef(false);
  useEffect(() => {
    if (!actif || done.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    done.current = true;
    setPieces(Array.from({ length: 70 }, (_, i) => ({ id: i, left: Math.random() * 100, dx: (Math.random() - 0.5) * 240, rot: 360 + Math.random() * 720, dur: 2.2 + Math.random() * 1.6, delay: Math.random() * 0.5, c: COULEURS[i % COULEURS.length], w: 6 + Math.random() * 5 })));
    const t = setTimeout(() => setPieces([]), 4600);
    return () => clearTimeout(t);
  }, [actif]);
  if (!pieces.length) return null;
  return createPortal(
    <div aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} className="bx-confetti" style={{ left: `${p.left}%`, width: p.w, height: p.w * 1.5, background: p.c, animationDelay: `${p.delay}s`, ['--dx' as string]: `${p.dx}px`, ['--rot' as string]: `${p.rot}deg`, ['--dur' as string]: `${p.dur}s` }} />
      ))}
    </div>,
    document.body,
  );
}

/** Pastille de l'artisan : initiales blanches sur tuile Aube. */
export function PastilleArtisan({ initiales, taille = 44 }: { initiales: string; taille?: number }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center bg-dawn-diag font-semibold tracking-[-0.02em] text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,.6),inset_0_1px_0_rgba(255,255,255,.25)]" style={{ width: taille, height: taille, fontSize: taille * 0.34, borderRadius: taille * 0.3 }}>
      {initiales}
    </span>
  );
}

/** Montant qui « monte » jusqu'à sa valeur au premier affichage. */
export function MontantAnime({ valeur, format, duree = 900 }: { valeur: number; format: (n: number) => string; duree?: number }) {
  const [v, setV] = useState(valeur);
  const prev = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setV(valeur);
    const from = prev.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from + (valeur - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else prev.current = valeur;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [valeur, duree]);
  return <>{format(v)}</>;
}
