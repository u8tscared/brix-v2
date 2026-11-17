import { useEffect } from 'react';
import { useBrix } from '@/lib/store';
import { useAchats } from './store';

/** Charge la démo Achats la première fois, en s'appuyant sur les devis de démo de l'app. */
export function useAchatsPrets() {
  const init = useAchats((s) => s.init);
  const initDemo = useAchats((s) => s.initDemo);
  const vider = useAchats((s) => s.vider);
  const isDemo = useBrix((s) => s.isDemo);
  const devis = useBrix((s) => s.devis);
  useEffect(() => {
    if (init) return;
    if (isDemo) initDemo(devis);
    else vider();
  }, [init, isDemo, devis, initDemo, vider]);
  return init;
}
