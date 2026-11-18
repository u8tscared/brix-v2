// Vignette illustrée d'une photo de chantier (démo sans vraies images).
// Quand la photo vient de l'appareil (src), on affiche l'image réelle.

import type { ArtKind, Phase } from '../../store';
import { hash } from '../../lib/weather';
import { cn } from '@/components/ui';

const BG: Record<Phase, [string, string]> = {
  avant: ['#e9e2d6', '#d8cfc0'],
  pendant: ['#dcdde3', '#c4c6cf'],
  apres: ['#f6f5fb', '#e6e4f0'],
};

function Art({ art, phase, r }: { art: ArtKind; phase: Phase; r: number }) {
  const neat = phase === 'apres';
  const raw = phase === 'pendant';
  switch (art) {
    case 'tableau':
      return (
        <g>
          <rect x="44" y="18" width="72" height="86" rx="4" fill={phase === 'avant' ? '#bfb6a6' : '#fafafa'} stroke="#8c8a96" strokeWidth="1.2" />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="50" y={28 + row * 24} width="60" height="16" rx="1.5" fill={phase === 'avant' ? '#a39a8a' : '#eceef3'} />
              {Array.from({ length: phase === 'avant' ? 4 : 8 }, (_, i) =>
                phase === 'avant' ? (
                  <circle key={i} cx={57 + i * 15} cy={36 + row * 24} r="4" fill="#efe7d4" stroke="#7d7466" />
                ) : (
                  <rect key={i} x={51.5 + i * 7.3} y={29 + row * 24} width="5.6" height="14" rx="1" fill={i === 0 && row === 0 ? '#3b82f6' : '#ffffff'} stroke="#9a9aa8" strokeWidth=".6" />
                ),
              )}
              {neat && <rect x="50" y={45 + row * 24} width="60" height="3" fill="#fde68a" />}
            </g>
          ))}
          {raw && [0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${56 + i * 11} 104 C ${56 + i * 11} 112, ${50 + i * 12} 116, ${48 + i * 13} 120`} stroke={['#2563eb', '#a16207', '#16a34a', '#dc2626', '#111827'][i]} strokeWidth="2" fill="none" />)}
        </g>
      );
    case 'prise':
      return (
        <g>
          <rect x="0" y="96" width="160" height="24" fill="#cfc8bb" opacity=".5" />
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${52 + i * 34 + r * 6} 56)`}>
              <rect width="26" height="26" rx="4" fill={phase === 'avant' ? '#efe6d2' : '#ffffff'} stroke="#9a96a0" />
              <circle cx="13" cy="13" r="8" fill="none" stroke="#9a96a0" />
              <circle cx="9.5" cy="13" r="1.4" fill="#5f5f70" />
              <circle cx="16.5" cy="13" r="1.4" fill="#5f5f70" />
              {phase !== 'avant' && <rect x="12" y="5.5" width="2" height="3" fill="#5f5f70" />}
            </g>
          ))}
          {raw && <path d="M65 56 V 0 M99 56 V 0" stroke="#9ca3af" strokeWidth="5" opacity=".6" />}
        </g>
      );
    case 'spots':
      return (
        <g>
          <rect x="0" y="0" width="160" height="40" fill="#ffffff" opacity=".55" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              {neat || raw ? <circle cx={36 + i * 44} cy="22" r="7" fill="#fffbe6" stroke="#c9c4b5" /> : <rect x={30 + i * 44} y="14" width="14" height="10" rx="2" fill="#e5dccb" />}
              {(neat || raw) && <path d={`M${36 + i * 44} 29 L ${22 + i * 44} 110 L ${50 + i * 44} 110 Z`} fill="#fff7cc" opacity=".45" />}
            </g>
          ))}
        </g>
      );
    case 'saignee':
      return (
        <g>
          <rect x="0" y="0" width="160" height="120" fill="#d6d3cc" opacity=".35" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${34 + i * 40 + r * 8} 0 V ${70 + i * 8} H ${54 + i * 40}`} stroke="#a8a29e" strokeWidth="8" fill="none" strokeLinejoin="round" />
          ))}
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${34 + i * 40 + r * 8} 0 V ${70 + i * 8} H ${54 + i * 40}`} stroke={i === 1 ? '#f97316' : '#6b7280'} strokeWidth="2.6" fill="none" strokeLinejoin="round" />
          ))}
        </g>
      );
    case 'baie':
      return (
        <g>
          <rect x="50" y="10" width="60" height="100" rx="3" fill="#2a2a35" />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i}>
              <rect x="55" y={16 + i * 11} width="50" height="8" rx="1" fill="#3b3b48" />
              {i % 2 === 0 && Array.from({ length: 8 }, (_, k) => <rect key={k} x={58 + k * 5.6} y={18 + i * 11} width="3.4" height="4" fill={k % 3 ? '#9ca3af' : '#22c55e'} />)}
            </g>
          ))}
        </g>
      );
    case 'hublot':
      return (
        <g>
          <path d="M0 110 L 40 110 L 40 92 L 70 92 L 70 74 L 100 74 L 100 56 L 160 56 L 160 120 L 0 120 Z" fill="#c9c4bb" opacity=".6" />
          <circle cx={84 + r * 10} cy="30" r="15" fill={neat ? '#fffbe6' : '#ece7da'} stroke="#a3a0aa" strokeWidth="2" />
          {neat && <circle cx={84 + r * 10} cy="30" r="24" fill="#fff7cc" opacity=".35" />}
        </g>
      );
    case 'borne':
      return (
        <g>
          <rect x="0" y="92" width="160" height="28" fill="#b9b3a6" opacity=".55" />
          <rect x="66" y="30" width="30" height="44" rx="6" fill={neat ? '#ffffff' : '#ebe7df'} stroke="#8f8b97" strokeDasharray={phase === 'avant' ? '3 3' : undefined} />
          {phase !== 'avant' && <circle cx="81" cy="44" r="5" fill="#22c55e" />}
          {phase !== 'avant' && <path d="M81 74 C 81 96, 110 96, 118 110" stroke="#1f2937" strokeWidth="3" fill="none" />}
        </g>
      );
    case 'four':
      return (
        <g>
          <rect x="30" y="20" width="100" height="84" rx="4" fill="#9ca3af" />
          <rect x="40" y="34" width="80" height="44" rx="3" fill="#1f2937" />
          <rect x="40" y="34" width="80" height="44" rx="3" fill={neat ? '#f97316' : '#374151'} opacity=".5" />
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={52 + i * 18} cy="92" r="4" fill="#e5e7eb" />)}
        </g>
      );
    case 'clim':
      return (
        <g>
          <rect x="30" y="34" width="100" height="30" rx="8" fill="#ffffff" stroke="#a3a0aa" />
          <path d="M40 56 H120" stroke="#c4c2cc" strokeWidth="2" />
          <path d="M60 70 q 6 10 0 20 M80 70 q 6 10 0 20 M100 70 q 6 10 0 20" stroke="#93c5fd" strokeWidth="2" fill="none" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="0" y="96" width="160" height="24" fill="#bdb6a8" opacity=".5" />
          <rect x="98" y="24" width="40" height="52" rx="2" fill="#dbeafe" stroke="#a3a0aa" />
          <path d="M118 24 V76 M98 50 H138" stroke="#a3a0aa" />
          <rect x="0" y="92" width="160" height="4" fill="#ffffff" opacity=".7" />
        </g>
      );
  }
}

export function PhotoArt({ art, phase, seed, src, className, alt }: { art: ArtKind; phase: Phase; seed: string; src?: string; className?: string; alt?: string }) {
  if (src) return <img src={src} alt={alt ?? ''} className={cn('h-full w-full object-cover', className)} loading="lazy" />;
  const r = hash(seed) - 0.5;
  const [a, b] = BG[phase];
  const id = `g${seed.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} role="img" aria-label={alt}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={0.4 + r * 0.4} y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${id})`} />
      <Art art={art} phase={phase} r={r} />
      <rect width="160" height="120" fill="#000" opacity={phase === 'avant' ? 0.06 : 0} />
    </svg>
  );
}

/** Réduit une photo prise par l'appareil (pour rester léger dans le navigateur). */
export function compressImage(file: File, max = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
