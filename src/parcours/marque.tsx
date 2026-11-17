// Marque Brix pour les parcours externes (pages client, fournisseur, e-mails).
// Symbole « B Aube » validé le 17/11 : tuile au dégradé Aube, B blanc plein avec sa coche.
// Quand src/components/brand/Logo.tsx exposera BrandTile / BrandLogo (fil app), ces composants y renverront.

import { useId } from 'react';

/** Tracé du B (grille 1024), creux du bas = coche. */
export const B_PATH = 'M309.5 768H539.7Q635.5 768 687.3 733.2Q739 698.5 739 626.8Q739 572.9 706.1 540.8Q673.1 508.7 608.7 503.5L608.8 503.2Q643.9 499.7 668.2 486.3Q692.6 472.8 705 449.8Q717.4 426.9 717.4 395.5Q717.4 322.9 665.3 289.5Q613.3 256 516.6 256H309.5ZM435 464.7V354.6H512Q548.5 354.6 569.9 367.8Q591.4 381 591.4 409.9Q591.4 437.1 569.4 450.9Q547.5 464.7 512 464.7ZM435 556.4 499.1 620.4 584.2 535.3H663.9L499.1 700.1L435 636Z';

export function BrandTile({ size = 32, className = '', animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" className={className} role="img" aria-label="Brix">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset=".62" stopColor="#d946ef" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <rect width="1024" height="1024" rx="232" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="1024" height="1024" fill={`url(#g${id})`} />
        {animated && <rect className="bx-tile-sheen" x="-600" width="420" height="1024" fill="#fff" opacity=".18" transform="skewX(-20)" />}
      </g>
      <path d={B_PATH} fill="#fff" fillRule="evenodd" />
    </svg>
  );
}

/** Tuile + nom « Brix » (Geist SemiBold). tone : encre sur fond clair, blanc sur fond sombre. */
export function BrandLogo({ size = 28, tone = 'ink', className = '' }: { size?: number; tone?: 'ink' | 'white'; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: size * 0.32 }}>
      <BrandTile size={size} />
      <span className="bx-geist font-semibold" style={{ fontSize: size * 0.78, letterSpacing: '-0.035em', lineHeight: 1, color: tone === 'ink' ? '#130f26' : '#fff' }}>
        Brix
      </span>
    </span>
  );
}
