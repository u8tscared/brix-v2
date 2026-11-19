import { useEffect, useRef, type RefObject } from 'react';

/**
 * Comportement modal commun (feuilles, tiroir de menu) :
 * - Échap ferme (seulement la fenêtre du dessus quand plusieurs sont empilées) ;
 * - Tab reste dans la fenêtre (piège de focus), le focus revient où il était à la fermeture ;
 * - le fond ne défile plus, y compris sur iOS (technique position: fixed, la position est rendue à la fermeture) ;
 * - le fond (#root) devient `inert` : ni clic, ni focus, ni lecteur d'écran.
 * La fenêtre doit être rendue hors de #root (portail dans <body>).
 */
const pile: RefObject<HTMLElement>[] = [];
let verrous = 0;
let scrollY = 0;

function verrouiller() {
  if (verrous++ > 0) return;
  const b = document.body;
  scrollY = window.scrollY;
  const largeurBarre = window.innerWidth - document.documentElement.clientWidth;
  Object.assign(b.style, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden', paddingRight: largeurBarre ? `${largeurBarre}px` : '' });
  document.getElementById('root')?.setAttribute('inert', '');
}

function deverrouiller() {
  if (--verrous > 0) return;
  const b = document.body;
  Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '', overflow: '', paddingRight: '' });
  window.scrollTo(0, scrollY);
  document.getElementById('root')?.removeAttribute('inert');
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function useModal(ref: RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const avant = document.activeElement as HTMLElement | null;
    pile.push(ref);
    verrouiller();
    // Focus dans la fenêtre (sans faire défiler), sauf si un champ s'y est déjà donné le focus.
    const t = setTimeout(() => {
      const el = ref.current;
      if (el && !el.contains(document.activeElement)) (el.querySelector<HTMLElement>('[autofocus]') ?? el).focus({ preventScroll: true });
    }, 30);
    const key = (e: KeyboardEvent) => {
      if (pile[pile.length - 1] !== ref) return;
      const el = ref.current;
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', key);
      const i = pile.lastIndexOf(ref);
      if (i >= 0) pile.splice(i, 1);
      deverrouiller();
      if (avant && document.contains(avant)) avant.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
