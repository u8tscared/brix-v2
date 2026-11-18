import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money } from '@/lib/format';

/**
 * Coche Halo d'encaissement : disque Aube entouré d'anneaux concentriques de verre, la coche se dessine.
 * Reprend l'écran de succès de la maquette (signature client). Réutilisée par Paiements et Tap to Pay.
 */
export function PaidCheck({ size = 112 }: { size?: number }) {
  const inner = Math.round(size * 0.67);
  return (
    <div
      className="grid animate-[pop_.7s_var(--spring)_.1s_both] place-items-center rounded-full bg-white/60"
      style={{ width: size, height: size, boxShadow: '0 0 0 12px rgba(255,255,255,.4), 0 0 0 26px rgba(255,255,255,.2)' }}
    >
      <div className="grid place-items-center rounded-full" style={{ width: inner, height: inner, background: 'var(--dawn-d)', boxShadow: '0 14px 30px -10px rgba(217,70,239,.8), inset 0 1px 0 rgba(255,255,255,.25)' }}>
        <svg width={inner * 0.5} height={inner * 0.5} viewBox="0 0 38 38" aria-hidden>
          <path
            d="M10 20l6 6 12-13"
            fill="none"
            stroke="#fff"
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 40, ['--len' as string]: 40, animation: 'draw .55s var(--ease) .55s both' } as CSSProperties}
          />
        </svg>
      </div>
    </div>
  );
}

/** Écran de succès d'un encaissement : halo, coche qui se dessine, montant reçu qui compte. */
export function PaidSuccess({ title, amount, text, children, onClose }: { title: string; amount?: number; text: ReactNode; children?: ReactNode; onClose: () => void }) {
  return (
    <div className="relative isolate -mx-5 -mt-2 flex md:-mx-7 min-h-[min(560px,70dvh)] flex-col items-center justify-center overflow-hidden px-6 pb-6 pt-12 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_60%_at_50%_28%,#f6d2f8_0%,#ece4fe_45%,transparent_85%)] opacity-90" />
      <PaidCheck />
      <h3 className="mt-10 animate-[fade-up_.45s_var(--ease)_.35s_both] text-[26px] font-semibold tracking-[-0.045em]">{title}</h3>
      {amount !== undefined && (
        <div className="num-halo mt-1 animate-[fade-up_.45s_var(--ease)_.4s_both] text-[40px]">
          + <AnimatedNumber value={amount} format={(n) => money(n)} delay={400} />
        </div>
      )}
      <div className="mt-2 max-w-sm animate-[fade-up_.45s_var(--ease)_.45s_both] text-[13.5px] leading-relaxed text-ink-2">{text}</div>
      {children && <div className="mt-5 w-full animate-[fade-up_.45s_var(--ease)_.5s_both]">{children}</div>}
      <Button variant="primary" size="lg" className="mt-7 min-w-[180px] animate-[fade-up_.45s_var(--ease)_.55s_both] justify-center" onClick={onClose}>
        Terminé
      </Button>
    </div>
  );
}
