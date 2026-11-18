import { useId } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * Logo Brix « B validé » (piste Plein, déclinaison Aube, 17/11/2026).
 * Symbole : B de Geist ExtraBold, la coche découpée laisse voir le fond.
 * Toujours passer par ces composants, ne jamais redessiner le B.
 */
export const B_PATH =
  'M0 710H319.2Q452 710 523.8 661.8Q595.6 613.6 595.6 514.2Q595.6 439.4 549.9 394.9Q504.2 350.4 414.8 343.2L415 342.8Q463.6 338 497.4 319.3Q531.2 300.6 548.4 268.8Q565.6 237 565.6 193.4Q565.6 92.8 493.4 46.4Q421.2 0 287.2 0H0ZM174 289.4V136.8H280.8Q331.4 136.8 361.1 155.1Q390.8 173.4 390.8 213.4Q390.8 251.2 360.4 270.3Q330 289.4 280.8 289.4ZM174 416.5 262.8 505.4 380.9 387.3H491.3L262.8 615.8L174 527Z';
export const B_VIEWBOX = '0 0 595.6 710';

/** Le B seul, en aplat (blanc, encre ou violet). */
export function BrandSymbol({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox={B_VIEWBOX} className={className} aria-hidden>
      <path fillRule="evenodd" fill={color} d={B_PATH} />
    </svg>
  );
}

/** Tuile Aube (icône d'app) : dégradé violet → magenta → pêche, B blanc. */
export function BrandTile({ size = 32, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('shrink-0', animated && 'brand-tile-anim', className)}
      role="img"
      aria-label="Brix"
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset=".62" stopColor="#d946ef" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#g${id})`} />
      <rect width="100" height="100" rx="24" fill={`url(#s${id})`} />
      <svg x="28" y="25" width="44" height="52" viewBox={B_VIEWBOX}>
        <path fillRule="evenodd" fill="#fff" d={B_PATH} />
      </svg>
    </svg>
  );
}

/** Tuile + « Brix » en Geist. tone = couleur du nom. */
export function BrandLogo({ size = 28, className, tone = 'ink', stacked = false }: { size?: number; className?: string; tone?: 'ink' | 'white'; stacked?: boolean }) {
  return (
    <span className={cn('inline-flex select-none items-center', stacked ? 'flex-col gap-2' : 'gap-[0.42em]', className)} style={{ fontSize: size }}>
      <BrandTile size={size} />
      <span
        className={cn('font-display font-bold leading-none', tone === 'white' ? 'text-white' : 'text-[#130f26]')}
        style={{ fontSize: size * 0.82, letterSpacing: '-0.045em' }}
      >
        Brix
      </span>
    </span>
  );
}

// Compatibilité avec les anciens appels.
export function Wordmark({ className }: { className?: string }) {
  return <BrandLogo size={24} className={className?.replace(/\bh-\S+/g, '')} />;
}
export function LogoIcon({ className }: { className?: string }) {
  const m = className?.match(/h-(\d+)/);
  const size = m ? +m[1] * 4 : 32;
  return <BrandTile size={size} className={className?.replace(/\b[hw]-\S+/g, '')} />;
}
