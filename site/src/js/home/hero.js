/* Hero : entrée du titre, cartes flottantes en parallaxe, pastilles des départements. */
import { gsap, reduce, fine, $, $$, ic, fmt, scrollToEl } from '../core.js';
import { DEPARTMENTS, FEATURE_COUNT } from '../../data/departments.js';

export function initHero() {
  // index : pastilles cliquables qui ouvrent l'onglet du département
  const pills = $('[data-pills]');
  if (pills) {
    pills.innerHTML = DEPARTMENTS.map((d) => `<a class="pill-d" href="#departements" data-goto="${d.id}"><span class="ic" style="background:${d.color}">${ic(d.icon)}</span>${d.name}<em>${d.features.length}</em></a>`).join('');
    pills.addEventListener('click', (e) => {
      const a = e.target.closest('[data-goto]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('dept:select', { detail: a.dataset.goto }));
      scrollToEl($('#departements'));
      const tab = $(`#tab-${a.dataset.goto}`);
      if (tab) tab.focus({ preventScroll: true });
    });
  }
  const cnt = $('.idx-h [data-count]');
  if (cnt) { cnt.dataset.count = FEATURE_COUNT; cnt.textContent = FEATURE_COUNT; }

  if (reduce) return;
  const hero = $('[data-hero]');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
  tl.from('.hero h1 .ln > span', { yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.09 })
    .from('.hx', { y: 24, opacity: 0, duration: 1, stagger: 0.07 }, '-=1.05')
    .from('.fc-quote', { y: 90, opacity: 0, rotate: 6, duration: 1.4 }, '-=1.1')
    .from('.fc-bob', { y: 70, x: -30, opacity: 0, rotate: -5, duration: 1.4 }, '-=1.25')
    .from('.fc-cash', { y: 100, opacity: 0, rotate: -6, duration: 1.4 }, '-=1.25')
    .from('.fc-note', { x: 60, opacity: 0, duration: 1.2 }, '-=1.1')
    .from('.fc-bob li', { x: -10, opacity: 0, stagger: 0.18, duration: 0.6 }, '-=0.6')
    .from('.bar i', { scaleX: 0, duration: 1.6, ease: 'power3.out' }, '-=1.2');
  const sig = $('#sig1');
  if (sig) { const L = sig.getTotalLength(); gsap.set(sig, { strokeDasharray: L, strokeDashoffset: L }); tl.to(sig, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, '-=1'); }
  const cash = $('#hcash');
  if (cash) { const o = { v: 0 }; tl.to(o, { v: 18420, duration: 1.8, ease: 'power3.out', onUpdate: () => { cash.textContent = fmt(o.v); } }, '<'); }

  const fcs = $$('.fc');
  fcs.forEach((f) => gsap.to(f, { y: -f.dataset.depth * 2.4, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } }));
  gsap.to('.hero h1', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  if (fine) {
    const qx = fcs.map((f) => gsap.quickTo(f, 'x', { duration: 0.9, ease: 'power3' }));
    const qr = fcs.map((f) => gsap.quickTo(f, 'rotationY', { duration: 0.9, ease: 'power3' }));
    const qrx = fcs.map((f) => gsap.quickTo(f, 'rotationX', { duration: 0.9, ease: 'power3' }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      fcs.forEach((f, i) => { qx[i](-nx * f.dataset.depth); qr[i](nx * 8); qrx[i](-ny * 5); });
    });
  }
}
