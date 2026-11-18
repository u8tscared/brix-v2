// Mouvements propres à l'éditeur de devis : la ligne qui arrive avec un ressort,
// l'aperçu A4 qui flotte. Les images-clés sont posées une fois par l'éditeur (<EditorKeyframes />).

import { useEffect, useRef, useState } from 'react';

export function EditorKeyframes() {
  return (
    <style>{`
@keyframes devis-line-in { 0% { opacity: 0; transform: translateY(14px) scale(.96); } 55% { opacity: 1; transform: translateY(-3px) scale(1.012); } 100% { transform: none; } }
@keyframes devis-chip-in { 0% { opacity: 0; transform: scale(.5) translateY(4px); } 60% { opacity: 1; transform: scale(1.1); } 100% { transform: none; } }
@keyframes devis-float { 0%, 100% { transform: rotate(.6deg) translateY(0); } 50% { transform: rotate(.6deg) translateY(-6px); } }
@keyframes devis-glow { 0% { box-shadow: 0 0 0 1.5px #e9b8f5, 0 10px 30px -12px rgba(217,70,239,.45); } 100% { box-shadow: 0 0 0 1px #f0edf7, 0 1px 2px rgba(60,30,120,.04); } }
.devis-fresh { animation: devis-line-in .6s cubic-bezier(.34,1.56,.64,1) both, devis-glow 2.6s 1.4s ease-out both; box-shadow: 0 0 0 1.5px #e9b8f5, 0 10px 30px -12px rgba(217,70,239,.45); }
.devis-chip-in { animation: devis-chip-in .5s .25s cubic-bezier(.34,1.56,.64,1) both; }
.devis-float { animation: devis-float 6s ease-in-out infinite; transform: rotate(.6deg); }
@media (prefers-reduced-motion: reduce) { .devis-fresh, .devis-chip-in, .devis-float { animation: none !important; } .devis-float { transform: none; } }
`}</style>
  );
}

/**
 * Identifiants apparus depuis le premier rendu, gardés « frais » 3 s :
 * la ligne arrive avec un ressort, un filet magenta et la pastille « Ajouté ».
 */
export function useFresh(ids: string[]) {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const key = ids.join('|');
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !seen.current!.has(id));
    ids.forEach((id) => seen.current!.add(id));
    if (!added.length) return;
    setFresh((f) => new Set([...f, ...added]));
    setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !added.includes(x)))), 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return fresh;
}
