// Écran de succès après la signature (maquette Halo « phoneDone ») : anneaux concentriques,
// coche qui se dessine, « Merci Claire ! », puis l'acompte à régler avec Apple Pay, carte ou virement.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Apple, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { MoyenPaiement } from '@/parcours/signature';
import { BoutonAube, BoutonDoux, CocheAnimee } from '../../ui/primitives';

const MOYENS: { k: MoyenPaiement; label: string; I: typeof CreditCard }[] = [
  { k: 'apple', label: 'Apple Pay', I: Apple },
  { k: 'carte', label: 'Carte', I: CreditCard },
  { k: 'virement', label: 'Virement', I: Landmark },
];

interface Props {
  open: boolean;
  prenom: string;
  artisan: string;
  acompte: number;
  onPayer: (m: MoyenPaiement) => void;
  onFermer: () => void;
}

export function Succes({ open, prenom, artisan, acompte, onPayer, onFermer }: Props) {
  const [moyen, setMoyen] = useState<MoyenPaiement>('apple');
  const action = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => action.current?.focus({ preventScroll: true }), 900);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
      window.removeEventListener('keydown', esc);
    };
  }, [open, onFermer]);

  if (!open) return null;
  return createPortal(
    <div className="bx-root bx-fade bx-dawn-sky fixed inset-0 z-[72] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="succes-titre">
      <div className="mx-auto flex min-h-full max-w-[420px] flex-col items-center px-6 pb-[calc(28px+var(--safe-b))] pt-[max(64px,12vh)] text-center">
        <CocheAnimee taille={116} />
        <h2 id="succes-titre" className="bx-rise mt-8 text-[30px] font-semibold leading-tight tracking-[-0.045em]" style={{ animationDelay: '.55s' }}>
          Merci {prenom} !
        </h2>
        <p className="bx-rise mt-2 max-w-[300px] text-[14.5px] leading-relaxed text-ink-2" style={{ animationDelay: '.62s' }}>
          Votre devis est signé. {artisan} est prévenu et vous propose une date de démarrage. Une copie part dans votre boîte e-mail.
        </p>

        {acompte > 0 ? (
          <>
            <div className="bx-rise mt-7 w-full rounded-[20px] bg-white px-[18px] py-4 text-left shadow-halo" style={{ animationDelay: '.7s' }}>
              <div className="flex items-center justify-between gap-3">
                <span className="label-halo">Acompte à régler</span>
                <b className="num-halo text-[20px]">{money(acompte)}</b>
              </div>
              <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Moyen de paiement">
                {MOYENS.map(({ k, label, I }) => {
                  const on = moyen === k;
                  return (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMoyen(k)}
                      className={cn(
                        'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-pill px-2 text-[13px] font-medium transition duration-300 ease-spring',
                        on ? (k === 'apple' ? 'bg-black text-white shadow-ink' : 'bg-ink text-white shadow-ink') : 'bg-[#f3f1f8] text-ink-2 hover:bg-halo-track',
                      )}
                    >
                      <I className={cn('h-3.5 w-3.5', k === 'apple' && on && 'fill-white')} strokeWidth={k === 'apple' && on ? 0 : 1.9} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <BoutonAube ref={action} className="bx-rise mt-4 w-full" style={{ animationDelay: '.78s' }} onClick={() => onPayer(moyen)}>
              Payer l’acompte
            </BoutonAube>
            <button onClick={onFermer} className="bx-rise mt-2 inline-flex min-h-[44px] items-center rounded-full px-4 text-[13.5px] font-medium text-ink-2 transition hover:bg-white/70 hover:text-ink" style={{ animationDelay: '.84s' }}>
              Plus tard, voir mon devis signé
            </button>
          </>
        ) : (
          <BoutonDoux ref={action} className="bx-rise mt-8 w-full" style={{ animationDelay: '.7s' }} onClick={onFermer}>
            Voir mon devis signé
          </BoutonDoux>
        )}
      </div>
    </div>,
    document.body,
  );
}
