// Petites briques de motion design, partagées par toute l'app.
// Règles : sorties douces (easeOutQuint), 150-600 ms, jamais de boucle qui distrait,
// tout se coupe avec prefers-reduced-motion.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/** Valeur numérique qui glisse vers sa cible (au montage puis à chaque changement). */
/** Départ du comptage : la plus petite valeur qui a le même nombre de chiffres (6 838 part de 1 000).
 *  Avec les chiffres tabulaires, la largeur du nombre ne change pas pendant qu'il compte : rien ne bouge autour. */
const sameWidthStart = (t: number) => (Math.abs(t) < 10 ? 0 : Math.sign(t) * 10 ** Math.floor(Math.log10(Math.abs(t))));

export function useCountUp(target: number, { duration = 900, delay = 0, from }: { duration?: number; delay?: number; from?: number } = {}) {
  const start0 = from ?? sameWidthStart(target);
  const [v, setV] = useState(prefersReducedMotion() ? target : start0);
  const prev = useRef(start0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setV(target);
      return;
    }
    const start = prev.current;
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0 - delay) / duration);
      if (p >= 0) setV(start + (target - start) * easeOutQuint(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      prev.current = target;
    };
  }, [target]);
  return v;
}

/** Nombre animé. format reçoit la valeur courante (ex. money). */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('fr-FR'), duration, delay, className }: { value: number; format?: (n: number) => string; duration?: number; delay?: number; className?: string }) {
  const v = useCountUp(value, { duration, delay });
  // La valeur finale (transparente) réserve la place : le texte autour ne bouge pas pendant le comptage,
  // et c'est elle que lisent les lecteurs d'écran ; les chiffres qui défilent sont posés par-dessus.
  return (
    <span className={cn('num', className)}>
      <span className="inline-grid">
        <span data-num-final className="text-transparent [grid-area:1/1]">{format(value)}</span>
        <span aria-hidden className="[grid-area:1/1]">{format(v)}</span>
      </span>
    </span>
  );
}

/** Vrai dès que l'élément entre dans l'écran (une seule fois). */
export function useInView<T extends Element>(opts: IntersectionObserverInit = { rootMargin: '0px 0px -8% 0px' }) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) return setSeen(true);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, opts);
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/** Apparition douce quand le bloc arrive à l'écran. */
export function Reveal({ children, className, delay = 0, as: As = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <As
      ref={ref as never}
      className={cn('transition-[opacity,transform] duration-700 ease-out-quint', seen ? 'opacity-100' : 'translate-y-3 opacity-0', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  );
}

/** Garde un enfant monté le temps de son animation de sortie. */
export function usePresence(open: boolean, exitMs = 220) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(t);
  }, [open]);
  return { mounted, closing };
}

/** Coche qui se dessine. */
export function DrawCheck({ className, delay = 0, strokeWidth = 2.4 }: { className?: string; delay?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 22, ['--len' as string]: 22, animation: `draw .5s var(--ease) ${delay}ms both` } as CSSProperties}
      />
    </svg>
  );
}

/** Pastille ronde validée (cercle qui pop + coche qui se dessine). */
export function SuccessDot({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-grid shrink-0 animate-pop place-items-center rounded-full bg-ok text-white', className)} style={{ width: size, height: size }}>
      <DrawCheck className="h-[70%] w-[70%]" delay={120} strokeWidth={3} />
    </span>
  );
}

/**
 * Anneau de progression Halo : rail lavande, arc qui se ferme à l'arrivée à l'écran.
 * `tone="dawn"` = dégradé Aube (objectif du mois). `children` = contenu centré (ex. « 74 % » + « de l'objectif »).
 * Pour un grand anneau (150 px, trait 12), passer `size={150} stroke={12}` : le texte centré n'est plus réduit.
 */
export function Ring({ value, size = 40, stroke = 4, tone = 'ink', children, className }: { value: number; size?: number; stroke?: number; tone?: 'ink' | 'dawn' | 'ok' | 'warn' | 'vi'; children?: ReactNode; className?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const gid = `ring${useId().replace(/:/g, '')}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = { ink: 'var(--ink)', ok: '#10b981', warn: '#f59e0b', vi: '#6d28d9', dawn: `url(#${gid})` }[tone];
  return (
    <span ref={ref} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {tone === 'dawn' && (
          <defs>
            <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#6d28d9" />
              <stop offset=".6" stopColor="#d946ef" />
              <stop offset="1" stopColor="#fb923c" />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1edf9" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={seen ? c * (1 - pct / 100) : c}
          style={{ transition: `stroke-dashoffset ${size > 80 ? 1.6 : 1.1}s var(--ease) .15s` }}
        />
      </svg>
      {children && <span className={cn('absolute inset-0 grid place-items-center font-semibold num', size > 80 ? 'text-[15px]' : 'text-[10.5px]')}>{children}</span>}
    </span>
  );
}

/** Barre qui se remplit à l'arrivée à l'écran. */
export function GrowBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn('h-1.5 overflow-hidden rounded-full bg-halo-track', className)}>
      <div className={cn('h-full rounded-full bg-ink transition-[width] duration-[1100ms] ease-out-quint', barClassName)} style={{ width: seen ? `${Math.max(0, Math.min(100, value))}%` : '0%' }} />
    </div>
  );
}

/** Point « en direct » qui pulse doucement. */
export function LiveDot({ className, tone = 'ok' }: { className?: string; tone?: 'ok' | 'vi' | 'peach' | 'bad' }) {
  const c = { ok: 'bg-[#22c55e]', vi: 'bg-vi-500', peach: 'bg-peach', bad: 'bg-bad' }[tone];
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)}>
      <span className={cn('absolute inset-0 animate-ping2 rounded-full', c)} />
      <span className={cn('relative h-2 w-2 rounded-full', c)} />
    </span>
  );
}

/** Texte qui défile lettre par lettre (réponses de Brix AI). */
export function Typewriter({ text, speed = 14, className, onDone }: { text: string; speed?: number; className?: string; onDone?: () => void }) {
  const [n, setN] = useState(prefersReducedMotion() ? text.length : 0);
  useEffect(() => {
    if (prefersReducedMotion()) return onDone?.();
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setN(i);
      if (i >= text.length) {
        clearInterval(t);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span className={className}>{text.slice(0, n)}</span>;
}
