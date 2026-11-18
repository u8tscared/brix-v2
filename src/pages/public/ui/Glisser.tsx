// « Glissez pour signer » : un vrai curseur à glisser (doigt, souris), utilisable au clavier
// (Entrée, Espace, flèches) et par les lecteurs d'écran (activation simple). Un repli « d'un appui » reste proposé.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/components/ui';
import { prefersReducedMotion } from '@/components/motion';

const KNOB = 50;
const PAD = 5;
const SEUIL = 0.82;

interface Props {
  label?: string;
  labelFait?: string;
  /** Appelé une fois le geste terminé. Le curseur revient à zéro après `reinitialiser` ms (0 = reste au bout). */
  onDone: () => void;
  disabled?: boolean;
  reinitialiser?: number;
  /** Texte du lien de repli (activation d'un simple appui). */
  repli?: string | false;
  className?: string;
}

export function Glisser({ label = 'Glissez pour signer', labelFait = 'C’est parti', onDone, disabled, reinitialiser = 900, repli = 'Glisser est difficile ? Signer d’un appui', className }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [max, setMax] = useState(0);
  const [drag, setDrag] = useState(false);
  const [fait, setFait] = useState(false);
  const depart = useRef<{ px: number; x: number } | null>(null);
  const bouge = useRef(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mesure = () => setMax(Math.max(0, el.clientWidth - KNOB - PAD * 2));
    mesure();
    const ro = new ResizeObserver(mesure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Petit coup de pouce au premier affichage : le bouton avance un peu puis revient (montre le geste).
  useEffect(() => {
    if (disabled || prefersReducedMotion() || !max) return;
    const a = setTimeout(() => !depart.current && setX(Math.min(56, max * 0.22)), 900);
    const b = setTimeout(() => !depart.current && setX(0), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [max, disabled]);

  const terminer = useCallback(() => {
    if (fait || disabled) return;
    setX(max);
    setFait(true);
    navigator.vibrate?.(12);
    const lent = prefersReducedMotion() ? 0 : 280;
    setTimeout(onDone, lent);
    if (reinitialiser) {
      setTimeout(() => {
        setFait(false);
        setX(0);
      }, lent + reinitialiser);
    }
  }, [fait, disabled, max, onDone, reinitialiser]);

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || fait) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { px: e.clientX, x };
    bouge.current = false;
    setDrag(true);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!depart.current) return;
    const dx = e.clientX - depart.current.px;
    if (Math.abs(dx) > 3) bouge.current = true;
    setX(Math.max(0, Math.min(max, depart.current.x + dx)));
  };
  const up = () => {
    if (!depart.current) return;
    depart.current = null;
    setDrag(false);
    if (max && x >= max * SEUIL) terminer();
    else setX(0);
  };

  const clavier = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || fait) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.min(max, x + max * 0.25);
      setX(n);
      if (n >= max * SEUIL) terminer();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setX(Math.max(0, x - max * 0.25));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setX(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      terminer();
    }
  };

  const p = max ? x / max : 0;
  const anim = drag ? 'none' : 'transform .5s cubic-bezier(.34,1.56,.64,1), width .5s cubic-bezier(.34,1.56,.64,1)';

  return (
    <div className={className}>
      <div ref={track} className={cn('bx-swipe', disabled && 'opacity-50')}>
        <div className="bx-swipe-fill" style={{ width: x + KNOB + PAD * 2, transition: anim, opacity: x > 2 || fait ? 1 : 0 }} aria-hidden />
        <span className={cn('bx-swipe-label', !fait && !disabled && 'bx-shine-text')} style={{ opacity: fait ? 0 : Math.max(0, 1 - p * 1.6) }} aria-hidden>
          {label}
        </span>
        {fait && (
          <span className="bx-fade absolute inset-0 z-[1] grid place-items-center pr-14 text-[15px] font-semibold text-white" aria-hidden>
            {labelFait}
          </span>
        )}
        <button
          type="button"
          disabled={disabled}
          className="bx-swipe-knob"
          style={{ transform: `translateX(${x}px)`, transition: anim }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={clavier}
          onClick={(e) => {
            // Clic sans glisser : vient du clavier (Entrée/Espace) ou d'un lecteur d'écran → on valide.
            // Un appui souris ou doigt sans geste ne signe pas (évite les signatures par mégarde).
            if (bouge.current) return;
            if (e.detail === 0) terminer();
          }}
          aria-label={`${label}. Entrée pour valider, ou flèche droite.`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p * 100)}
          role="slider"
        >
          {fait ? <Check className="h-5 w-5 text-[#c026d3]" strokeWidth={2.6} /> : <ArrowRight className="h-5 w-5 text-[#d946ef]" strokeWidth={2.2} />}
        </button>
      </div>
      {repli && !disabled && (
        <button type="button" onClick={terminer} className="mx-auto mt-1 flex min-h-[36px] items-center rounded-full px-3 text-[12.5px] font-medium text-ink-3 underline-offset-4 transition hover:text-ink-2 hover:underline">
          {repli}
        </button>
      )}
    </div>
  );
}
