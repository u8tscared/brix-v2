// Petites briques visuelles de l'onboarding (en-tête d'étape, coche, interrupteur, compteur animé).
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { reducedMotion } from './draft';

export const StepHeader = forwardRef<HTMLHeadingElement, { kicker: string; title: ReactNode; lead?: ReactNode }>(function StepHeader({ kicker, title, lead }, ref) {
  return (
    <div className="mb-7 md:mb-9">
      <div className="ob-kicker mb-3">{kicker}</div>
      <h1 ref={ref} tabIndex={-1} className="ob-title outline-none">{title}</h1>
      {lead && <p className="ob-lead mt-3 max-w-[500px]">{lead}</p>}
    </div>
  );
});

/** Pastille noire avec une coche qui se dessine. */
export const CheckDot = ({ children, mid }: { children?: ReactNode; mid?: boolean }) => (
  <span className="ob-check" aria-hidden style={mid ? { top: '50%', marginTop: -11, right: 16, width: 22, height: 22 } : undefined}>
    {children ?? (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.6-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className="ob-switch disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/** Nombre qui défile jusqu'à sa valeur (désactivé si l'utilisateur réduit les animations). */
export function useCountUp(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 4);
      const v = a + (value - a) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export const CountUp = ({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) => {
  const v = useCountUp(value);
  return <span className="num">{format(v)}</span>;
};
