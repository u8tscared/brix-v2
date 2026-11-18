import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/components/motion';

/**
 * Halo Aube fixé derrière toutes les pages (comme le site) : taches radiales violet / magenta / pêche
 * et un conic flou qui tournent doucement avec le défilement du contenu, et suivent un peu la souris.
 * Rotation lissée (rattrapage 8 % par image), boucle arrêtée dès que tout est au repos.
 * `prefers-reduced-motion` : le halo reste fixe. Le parent doit créer un contexte d'empilement (`isolate`).
 */
export function HaloBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const st = el.style;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    let target = 0, cur = 0, ax = 0, ay = 0, tx = 0, ty = 0, raf = 0;
    const tick = () => {
      cur += (target - cur) * 0.08;
      ax += (tx - ax) * 0.05;
      ay += (ty - ay) * 0.05;
      st.setProperty('--rot', cur.toFixed(2));
      st.setProperty('--ax', ax.toFixed(1));
      st.setProperty('--ay', ay.toFixed(1));
      raf = Math.abs(target - cur) > 0.05 || Math.abs(tx - ax) > 0.2 || Math.abs(ty - ay) > 0.2 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      target = window.scrollY * 0.045;
      kick();
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 50;
      ty = (e.clientY / window.innerHeight - 0.5) * 34;
      kick();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden className={`aura${className ? ` ${className}` : ''}`}>
      <i />
      <i />
      <i />
    </div>
  );
}
