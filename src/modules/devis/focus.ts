// Demande de mise en avant d'un champ de l'éditeur (depuis la vérification avant envoi).
// L'éditeur écoute ce signal : il fait défiler jusqu'au champ, le fait briller et l'ouvre si besoin.

import { create } from 'zustand';
import type { FixTarget } from './checks';

export const useEditorFocus = create<{ target: FixTarget | null; nonce: number; request: (t: FixTarget) => void; clear: () => void }>((set) => ({
  target: null,
  nonce: 0,
  request: (target) => set((s) => ({ target, nonce: s.nonce + 1 })),
  clear: () => set({ target: null }),
}));

/** Fait défiler jusqu'à un élément [data-field] et le fait briller un instant. */
export function flashField(name: string) {
  const el = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.animate(
    [
      { boxShadow: '0 0 0 0 rgba(124,58,237,0)' },
      { boxShadow: '0 0 0 4px rgba(124,58,237,.28)' },
      { boxShadow: '0 0 0 0 rgba(124,58,237,0)' },
    ],
    { duration: 1400, delay: 250, easing: 'cubic-bezier(.22,1,.36,1)' },
  );
  const input = el.matches('input,select,textarea') ? el : el.querySelector<HTMLElement>('input,select,textarea');
  setTimeout(() => input?.focus({ preventScroll: true }), 500);
  return true;
}
