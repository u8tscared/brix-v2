import { Mic, Square } from 'lucide-react';
import { cn } from '@/components/ui';

const RAYS = 28;

/**
 * Gros bouton micro au dégradé d'aube. Quand Bob écoute, une couronne d'ondes vibre autour
 * (comme un égaliseur) et un halo respire : on voit qu'il entend.
 */
export function VoiceOrb({ listening, busy, onClick, size = 112 }: { listening: boolean; busy?: boolean; onClick: () => void; size?: number }) {
  const box = size + 72;
  const r = size / 2 + 12;
  return (
    <div className="relative grid place-items-center" style={{ width: box, height: box }}>
      {/* Halo */}
      <span
        className={cn('absolute rounded-full bg-dawn-diag blur-2xl transition-all duration-700 ease-out-quint', listening ? 'animate-aurora opacity-45' : 'opacity-20')}
        style={{ width: size * (listening ? 1.25 : 0.9), height: size * (listening ? 1.25 : 0.9), animationDuration: '2.4s' }}
        aria-hidden
      />
      {/* Couronne d'ondes */}
      <span className={cn('pointer-events-none absolute inset-0 transition-opacity duration-500', listening ? 'opacity-100' : 'opacity-0')} aria-hidden>
        {Array.from({ length: RAYS }, (_, i) => {
          const a = (i / RAYS) * 360;
          return (
            <i
              key={i}
              className="absolute left-1/2 top-1/2 block w-[3px] origin-bottom rounded-full"
              style={{
                height: 14,
                background: i % 3 === 0 ? '#fb923c' : i % 3 === 1 ? '#d946ef' : '#8b5cf6',
                transform: `translate(-50%, -100%) rotate(${a}deg) translateY(-${r}px)`,
                transformOrigin: '50% 100%',
              }}
            >
              <i className="block h-full w-full origin-bottom animate-wave rounded-full bg-inherit" style={{ animationDelay: `${((i * 37) % 100) / 100}s`, animationDuration: `${0.7 + ((i * 13) % 6) / 10}s` }} />
            </i>
          );
        })}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={listening ? 'Arrêter' : 'Parler à Bob'}
        className={cn('relative grid place-items-center rounded-full bg-dawn-diag text-white shadow-dawn transition-transform duration-300 ease-spring active:scale-95', listening && 'scale-[1.04]', busy && 'opacity-80')}
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-[5px] rounded-full ring-2 ring-white/35" />
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.35),transparent_55%)]" />
        {listening ? (
          <span className="relative flex h-9 items-center gap-[3px]" aria-hidden>
            {[0.1, 0.3, 0, 0.45, 0.2, 0.35, 0.05].map((d, i) => (
              <i key={i} className="block w-[3.5px] origin-center animate-wave rounded-full bg-white" style={{ height: 12 + ((i * 7) % 22), animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : busy ? (
          <Square className="relative h-7 w-7" />
        ) : (
          <Mic className="relative h-9 w-9" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

/** Avatar de Bob : pastille encre avec ondes. `active` : les ondes bougent (il écoute ou réfléchit). */
export function BobMark({ size = 32, className, active }: { size?: number; className?: string; active?: boolean }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-ink text-white', className)} style={{ width: size, height: size }}>
      <span className="flex items-center gap-[2px]" aria-hidden>
        {[0.45, 0.8, 1, 0.65, 0.4].map((h, i) => (
          <i
            key={i}
            className={cn('block w-[2px] rounded-full bg-white', active && 'animate-wave')}
            style={{ height: Math.round(size * 0.42 * h), animationDelay: active ? `${i * 0.12}s` : undefined, animationDuration: active ? '.9s' : undefined }}
          />
        ))}
      </span>
    </span>
  );
}
