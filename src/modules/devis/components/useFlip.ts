// Animation FLIP : quand des lignes changent de place, elles glissent jusqu'à leur nouvelle position.
// Les lignes nouvelles apparaissent en glissant depuis le haut.

import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/components/motion';

export function useFlip<T extends HTMLElement>(keys: string) {
  const ref = useRef<T>(null);
  const prev = useRef<Map<string, number> | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-flip]'));
    const next = new Map(items.map((el) => [el.dataset.flip!, el.getBoundingClientRect().top]));
    const before = prev.current;
    prev.current = next;
    if (!before || prefersReducedMotion()) return;
    for (const el of items) {
      const k = el.dataset.flip!;
      const was = before.get(k);
      if (was === undefined) {
        el.animate([{ opacity: 0, transform: 'translateY(-6px)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
        el.animate([{ backgroundColor: 'rgba(124,58,237,.07)' }, { backgroundColor: 'rgba(124,58,237,0)' }], { duration: 1400, delay: 200, easing: 'ease-out' });
      } else {
        const dy = was - next.get(k)!;
        if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
  }, [keys]);
  return ref;
}
