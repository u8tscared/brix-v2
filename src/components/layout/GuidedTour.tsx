import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, FileText, LayoutGrid, Search, Sparkles } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';

const STEPS = [
  { icon: Sparkles, title: 'Bienvenue dans votre Brix', text: "Tout ce que vous avez choisi est prêt. Cette visite dure 30 secondes, et vous pouvez la relancer à tout moment dans Réglages." },
  { icon: AudioLines, title: 'Parlez à Bob', text: "Le gros bouton micro, c'est Bob. Dites « fais un devis pour Mme Martin, 3 prises et un radiateur » : il le prépare, vous validez." },
  { icon: FileText, title: 'Un devis en 2 minutes', text: 'Chaque devis se remplit à la voix, depuis la bibliothèque de prix, ou depuis la prise de cotes. Bob vérifie les oublis et la marge avant l\'envoi.' },
  { icon: LayoutGrid, title: 'Vos outils, rangés par département', text: 'Vendre, Facturer, Chantiers, Équipe, Achats… Vous ne voyez que ce que vous utilisez. Ajoutez un outil quand vous en avez besoin.' },
  { icon: Search, title: 'Tout trouver en 2 touches', text: 'Sur ordinateur, ⌘K (ou Ctrl K) cherche un client, un devis ou un outil. Sur téléphone, la loupe en haut fait pareil.' },
];

/** Visite guidée courte, montrée une seule fois après l'inscription. */
export function GuidedTour() {
  const done = useBrix((s) => s.prefs.tourDone);
  const onboarded = useBrix((s) => s.onboarded);
  const setPrefs = useBrix((s) => s.setPrefs);
  const [i, setI] = useState(0);
  if (done || !onboarded) return null;
  const S = STEPS[i];
  const last = i === STEPS.length - 1;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center">
      <div className="absolute inset-0 bg-[#17171f]/35 backdrop-blur-[3px]" />
      <div key={i} className="relative w-full max-w-[420px] animate-scale-in overflow-hidden rounded-[22px] bg-white shadow-pop">
        <div className="relative h-36 overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,#ebe2fe_0%,#fde7f7_45%,#ffedd5_100%)]">
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white text-vi-700 shadow-pop">
              <S.icon className="h-7 w-7" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-3 flex gap-1.5">
            {STEPS.map((_, k) => <i key={k} className={cn('h-1 rounded-full transition-all', k === i ? 'w-6 bg-ink' : 'w-2 bg-line2')} />)}
          </div>
          <h3 className="text-[19px] font-semibold">{S.title}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{S.text}</p>
          <div className="mt-6 flex items-center justify-between">
            <button className="text-[13px] font-medium text-ink-3 hover:text-ink" onClick={() => setPrefs({ tourDone: true })}>Passer</button>
            <div className="flex gap-2">
              {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Retour</Button>}
              <Button variant={last ? 'dawn' : 'primary'} onClick={() => (last ? setPrefs({ tourDone: true }) : setI(i + 1))}>{last ? "C'est parti" : 'Suivant'}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
