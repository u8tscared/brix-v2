/* Petits blocs communs aux pages secondaires : entrée du hero, FAQ, attente. */
import { gsap, reduce, $, $$ } from './core.js';

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

/* En-tête Halo des pages produit : satellites qui arrivent puis flottent, halo et satellites
   en légère parallaxe au défilement, anneaux qui se ferment. Sans animation : état final. */
export function pageHero(root = $('.ph')) {
  if (!root) return;
  const sats = $$('.psat', root), rings = $$('.psat .pring .fg', root);
  rings.forEach((c) => {
    const len = c.getTotalLength ? c.getTotalLength() : 100;
    c.style.strokeDasharray = len;
    c.style.strokeDashoffset = len * (1 - (+c.dataset.p || 0));
  });
  if (reduce) return;
  gsap.from(sats, { opacity: 0, scale: 0.9, yPercent: 40, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.45 });
  rings.forEach((c) => gsap.from(c, { strokeDashoffset: parseFloat(c.style.strokeDasharray), duration: 1.6, ease: 'power3.out', delay: 0.9 }));
  const st = { trigger: root, start: 'top top', end: 'bottom top', scrub: true };
  sats.forEach((s, i) => gsap.to(s, { y: -(14 + i * 14) * (+s.parentElement.dataset.depth || 1), ease: 'none', scrollTrigger: st }));
  $$('.ph-halo i', root).forEach((h, i) => gsap.to(h, { y: 60 + i * 30, x: (i % 2 ? -1 : 1) * 40, ease: 'none', scrollTrigger: st }));
}

/* FAQ accessible : un bouton par question, aria-expanded tenu à jour. */
export function faq(root) {
  // réponse fermée : retirée du parcours clavier et des lecteurs d'écran (inert)
  $$('.qa', root).forEach((qa) => { const a = $('.ans', qa); if (a) a.inert = !qa.classList.contains('open'); });
  $$('.qa button', root).forEach((b) => b.addEventListener('click', () => {
    const qa = b.closest('.qa'), open = !qa.classList.contains('open');
    qa.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open);
    const a = $('.ans', qa);
    if (a) a.inert = !open;
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
