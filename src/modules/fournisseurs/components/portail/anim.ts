// Petits outils de motion du portail : nombre qui glisse vers sa nouvelle valeur, compte à rebours doux.
import { useEffect, useRef, useState } from 'react';

const reduit = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Valeur affichée qui rejoint `cible` en douceur (sortie ease-out, ~450 ms). */
export function useTween(cible: number, duree = 450): number {
  const [v, setV] = useState(cible);
  const depuis = useRef(cible);
  const courant = useRef(cible);
  useEffect(() => {
    if (reduit()) {
      courant.current = cible;
      setV(cible);
      return;
    }
    depuis.current = courant.current;
    const t0 = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(1 - k, 4);
      const x = depuis.current + (cible - depuis.current) * e;
      courant.current = x;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);
  return v;
}

/** Échéance d'une réponse : fin de journée (18 h) de la date donnée. */
export function echeance(date?: string): { texte: string; urgent: boolean; depasse: boolean } | null {
  if (!date) return null;
  const fin = new Date(date.length === 10 ? `${date}T18:00:00` : date).getTime();
  const reste = fin - Date.now();
  if (reste <= 0) return { texte: 'délai passé, vous pouvez encore répondre', urgent: true, depasse: true };
  const h = Math.floor(reste / 3600000);
  if (h < 1) return { texte: `encore ${Math.max(1, Math.round(reste / 60000))} min`, urgent: true, depasse: false };
  if (h < 48) return { texte: `encore ${h} h`, urgent: h < 24, depasse: false };
  return { texte: `encore ${Math.floor(h / 24)} jours`, urgent: false, depasse: false };
}

/** Re-rend le composant toutes les `ms` (compte à rebours, « enregistré il y a… »). */
export function useHorloge(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`);
