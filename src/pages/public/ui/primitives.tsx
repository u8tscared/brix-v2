// Briques visuelles des pages publiques (client, facture) : feuille, boutons, coche animée, confettis.
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
      <div className={cn('absolute inset-0 bg-[#130f26]/40 backdrop-blur-[3px] transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')} onClick={() => fermable && onClose()} />
      <div
        className={cn(
          'relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(30,15,70,.45)] transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)] sm:rounded-[28px]',
          large ? 'sm:max-w-[640px]' : 'sm:max-w-[480px]',
          visible ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-4 sm:scale-[.98]',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#e4e2ee] sm:hidden" />
        {(titre || fermable) && (
          <div className="flex shrink-0 items-start gap-3 px-6 pb-2 pt-4 sm:pt-6">
            <div className="min-w-0 flex-1">
              {titre && <h2 className="text-[20px] font-semibold leading-tight">{titre}</h2>}
              {sousTitre && <p className="mt-1 text-[13.5px] text-[#5f5f70]">{sousTitre}</p>}
            </div>
            {fermable && (
              <button onClick={onClose} className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5f5f70] transition hover:bg-[#f4f3fa] hover:text-[#130f26]" aria-label="Fermer">
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

export function BoutonAube({ chargement, icone, taille = 'lg', className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || chargement}
      className={cn(
        'bx-btn-dawn inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50',
        taille === 'lg' ? 'h-14 px-6 text-[16px]' : 'h-11 px-4 text-[14px]',
        className,
      )}
    >
      {chargement ? <Loader2 className="h-5 w-5 animate-spin" /> : icone}
      <span className="relative">{children}</span>
    </button>
  );
}

export function BoutonEncre({ chargement, icone, taille = 'lg', className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || chargement}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl bg-[#130f26] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(19,15,38,.7)] transition hover:bg-[#241d45] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-40',
        taille === 'lg' ? 'h-14 px-6 text-[16px]' : 'h-11 px-4 text-[14px]',
        className,
      )}
    >
      {chargement ? <Loader2 className="h-5 w-5 animate-spin" /> : icone}
      {children}
    </button>
  );
}

export function BoutonDoux({ icone, className, children, ...p }: BtnProps) {
  return (
    <button {...p} className={cn('inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-medium text-[#130f26] shadow-[0_0_0_1px_#e7e5f0] transition hover:bg-[#faf9fd] hover:shadow-[0_0_0_1px_#d9d5ea] active:scale-[.985] disabled:opacity-40', className)}>
      {icone}
      {children}
    </button>
  );
}

/** Coche qui se dessine dans un disque, avec onde. */
export function CocheAnimee({ taille = 88, ton = 'aube' }: { taille?: number; ton?: 'aube' | 'vert' }) {
  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: taille, height: taille }}>
      <span className={cn('bx-ring absolute inset-0 rounded-full', ton === 'aube' ? 'bg-[#d946ef]/25' : 'bg-[#16a34a]/20')} />
      <span className={cn('bx-pop absolute inset-0 rounded-full', ton === 'aube' ? 'bx-dawn' : 'bg-[#16a34a]')} style={{ boxShadow: ton === 'aube' ? '0 18px 40px -14px rgba(192,38,211,.7)' : '0 18px 40px -14px rgba(22,163,74,.6)' }} />
      <svg viewBox="0 0 52 52" className="relative" style={{ width: taille * 0.5, height: taille * 0.5 }}>
        <path className="bx-draw" style={{ ['--len' as string]: 48 }} d="M13 27.5l8.5 8.5L39 17.5" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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

/** Pastille de l'artisan (initiales sur encre, liseré aube). */
export function PastilleArtisan({ initiales, taille = 44 }: { initiales: string; taille?: number }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-[14px] bg-[#130f26] font-semibold text-white" style={{ width: taille, height: taille, fontSize: taille * 0.34, borderRadius: taille * 0.3 }}>
      {initiales}
      <span className="bx-dawn absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white" />
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
