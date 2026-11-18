// Saisie du code à 6 chiffres : cases séparées, avance automatique, collage, remplissage auto iOS/Android.
import { useEffect, useRef } from 'react';
import { cn } from '@/components/ui';

export function CodeOtp({ valeur, onChange, erreur, desactive }: { valeur: string; onChange: (v: string) => void; erreur?: boolean; desactive?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (erreur) refs.current[Math.min(5, valeur.length)]?.focus();
  }, [erreur, valeur.length]);

  const poser = (i: number, v: string) => {
    const chiffres = v.replace(/\D/g, '');
    if (!chiffres) return;
    const next = (valeur.slice(0, i) + chiffres).slice(0, 6);
    onChange(next);
    refs.current[Math.min(5, next.length)]?.focus();
  };

  return (
    <div className={cn('flex justify-center gap-2 sm:gap-2.5', erreur && 'animate-[bx-shake_.4s_ease]')}>
      {Array.from({ length: 6 }).map((_, i) => {
        const c = valeur[i] ?? '';
        const actif = i === valeur.length;
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={c}
            disabled={desactive}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Chiffre ${i + 1}`}
            maxLength={6}
            onChange={(e) => poser(i, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              poser(0, e.clipboardData.getData('text'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault();
                const k = c ? i : Math.max(0, i - 1);
                onChange(valeur.slice(0, k));
                refs.current[k]?.focus();
              }
              if (e.key === 'ArrowLeft') refs.current[Math.max(0, i - 1)]?.focus();
              if (e.key === 'ArrowRight') refs.current[Math.min(5, i + 1)]?.focus();
            }}
            className={cn(
              'bx-mono h-[58px] w-[46px] rounded-field bg-white text-center text-[24px] font-medium text-ink outline-none transition-all duration-300 ease-spring sm:h-16 sm:w-[52px]',
              erreur ? 'bg-[#fff6f7] shadow-[0_0_0_1.5px_#f6b8c4]' : c ? 'bg-dawn-pale shadow-[0_0_0_1.5px_#e9b8f5]' : 'shadow-[0_0_0_1px_#e6e1f1]',
              actif && !erreur && '-translate-y-0.5 shadow-[0_0_0_1.5px_#c4b5fd,0_0_0_5px_rgba(167,139,250,.2)]',
              i === 2 && 'mr-1.5 sm:mr-2.5',
            )}
          />
        );
      })}
    </div>
  );
}
