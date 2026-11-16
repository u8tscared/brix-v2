/* Petits blocs communs aux pages secondaires : entrée du hero, FAQ, attente. */
import { gsap, reduce, $$ } from './core.js';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Joue fn la première fois que el entre à l'écran. */
export function onView(el, fn, threshold = 0.35) {
  if (!el) return;
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold }).observe(el);
}

/* Entrée du titre et du texte d'un hero à dégradé, puis la timeline de la page enchaîne. */
export function heroIn() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
  if (reduce) return tl;
  tl.from('.hero h1 .ln > span', { yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.09 })
    .from('.hero .hx', { y: 24, opacity: 0, duration: 1, stagger: 0.07 }, '-=1.05');
  gsap.to('.hero h1', { yPercent: -14, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  return tl;
}

/* FAQ accessible : un bouton par question, aria-expanded tenu à jour. */
export function faq(root) {
  $$('.qa button', root).forEach((b) => b.addEventListener('click', () => {
    const qa = b.closest('.qa'), open = !qa.classList.contains('open');
    qa.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open);
  }));
}

/* Groupe de boutons radio au clavier (flèches), avec rappel à la sélection. */
export function radios(group, onPick) {
  if (!group) return;
  const items = $$('[role="radio"]', group);
  const pick = (b, focus) => {
    items.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
    if (focus) b.focus();
    onPick(b);
  };
  group.addEventListener('click', (e) => { const b = e.target.closest('[role="radio"]'); if (b && b.getAttribute('aria-checked') !== 'true') pick(b); });
  group.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!k) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    pick(items[(i + k + items.length) % items.length], true);
  });
}
