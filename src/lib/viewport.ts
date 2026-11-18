/**
 * Clavier virtuel (iOS, Android) : publie sa hauteur dans la variable CSS --kb et pose la classe
 * `kb-open` sur <html>. Les barres d'action collées en bas (formulaires, totaux) remontent au-dessus
 * du clavier avec `bottom: var(--kb)` ou se cachent avec `[.kb-open_&]:hidden`.
 */
export function installViewportVars() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return;
  const root = document.documentElement;
  let raf = 0;
  const maj = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Au-delà de 120 px, c'est un clavier (et pas la barre d'adresse qui se replie).
      const ouvert = kb > 120 && !!document.activeElement?.matches('input, textarea, select, [contenteditable]');
      root.style.setProperty('--kb', ouvert ? `${kb}px` : '0px');
      root.classList.toggle('kb-open', ouvert);
    });
  };
  vv.addEventListener('resize', maj);
  vv.addEventListener('scroll', maj);
  window.addEventListener('focusin', maj);
  window.addEventListener('focusout', () => setTimeout(maj, 50));
}
