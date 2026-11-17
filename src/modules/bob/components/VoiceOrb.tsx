import { Mic, Square } from 'lucide-react';
import { cn } from '@/components/ui';

/** Gros bouton micro au dégradé d'aube, avec ondes animées quand Bob écoute. */
export function VoiceOrb({ listening, busy, onClick, size = 112 }: { listening: boolean; busy?: boolean; onClick: () => void; size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size + 64, height: size + 64 }}>
      {listening && (
        <>
          <span className="absolute rounded-full bg-mag/20 animate-ping" style={{ width: size + 20, height: size + 20, animationDuration: '1.6s' }} />
          <span className="absolute rounded-full bg-vi/10 animate-ping" style={{ width: size + 56, height: size + 56, animationDuration: '2.2s' }} />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={listening ? 'Arrêter' : 'Parler à Bob'}
        className={cn('relative grid place-items-center rounded-full bg-dawn text-white shadow-dawn transition active:scale-95', busy && 'opacity-80')}
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-[5px] rounded-full ring-2 ring-white/40" />
        {listening ? (
          <span className="flex h-8 items-center gap-[3px]" aria-hidden>
            {[0.1, 0.3, 0, 0.45, 0.2, 0.35, 0.05].map((d, i) => (
              <i key={i} className="block w-[3.5px] origin-center animate-wave rounded-full bg-white" style={{ height: 10 + ((i * 7) % 20), animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : busy ? (
          <Square className="h-7 w-7" />
        ) : (
          <Mic className="h-9 w-9" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

/** Petit avatar de Bob (pastille encre avec ondes). */
export function BobMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-ink text-white', className)} style={{ width: size, height: size }}>
      <span className="flex items-center gap-[2px]" aria-hidden>
        {[0.45, 0.8, 1, 0.65, 0.4].map((h, i) => (
          <i key={i} className="block w-[2px] rounded-full bg-white" style={{ height: Math.round(size * 0.42 * h) }} />
        ))}
      </span>
    </span>
  );
}
