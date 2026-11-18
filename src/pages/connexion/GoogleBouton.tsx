// Bouton officiel « Continuer avec Google » (Google Identity Services). Rien n'est affiché si le worker
// n'annonce pas de client Google : on ne simule jamais une connexion.
import { useEffect, useRef, useState } from 'react';
import { configAuth } from '@/lib/api';
import { boutonGoogle } from '@/lib/google-gis';

export function GoogleBouton({ onJeton, texte = 'continue_with', onDispo }: { onJeton: (credential: string) => void; texte?: 'continue_with' | 'signup_with'; onDispo?: (ok: boolean) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const rappel = useRef(onJeton);
  rappel.current = onJeton;
  const [etat, setEtat] = useState<'attente' | 'pret' | 'absent'>('attente');

  useEffect(() => {
    let fini = false;
    void configAuth().then(async (c) => {
      if (fini) return;
      if (!c.google || !el.current) {
        setEtat('absent');
        onDispo?.(false);
        return;
      }
      try {
        await boutonGoogle(el.current, c.google.clientId, (cr) => rappel.current(cr), texte);
        if (!fini) {
          setEtat('pret');
          onDispo?.(true);
        }
      } catch {
        if (!fini) {
          setEtat('absent');
          onDispo?.(false);
        }
      }
    });
    return () => {
      fini = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (etat === 'absent') return null;
  return <div ref={el} className="flex min-h-[44px] justify-center [color-scheme:light]" aria-busy={etat === 'attente'} />;
}
