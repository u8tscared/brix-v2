// Synchronisation entre onglets de la démo : le client signe dans un onglet, l'artisan le voit
// aussitôt dans l'autre. On recharge les stores persistés quand localStorage change ailleurs.
// Réel : remplacé par un flux temps réel (Durable Object / SSE) depuis le worker.

import { useEffect } from 'react';

type Rehydratable = { persist: { rehydrate: () => Promise<void> | void; getOptions: () => { name?: string } } };

export function useSyncOnglets(stores: Rehydratable[], onChange?: (cle: string) => void) {
  useEffect(() => {
    const names = new Map(stores.map((s) => [s.persist.getOptions().name, s] as const));
    const handler = (e: StorageEvent) => {
      if (!e.key) return;
      const s = names.get(e.key);
      if (!s) return;
      void s.persist.rehydrate();
      onChange?.(e.key);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

