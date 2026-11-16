/* Fournisseurs, réforme, comparatif, tarifs, FAQ. */
import { gsap, ScrollTrigger, reduce, $, $$ } from '../core.js';
import { renderPlans, initBilling, initSimulator, renderCompare, initFaq, spotlight } from '../shared.js';
import { HOME_COLS } from '../../data/competitors.js';

export function daysUntil(date) {
  return Math.max(0, Math.ceil((new Date(date) - new Date()) / 864e5));
}

export function initSections() {
  // flux fournisseurs : la ligne se dessine, les étapes s'allument une à une
  const flow = $('[data-flow]');
  if (flow) {
    const nodes = $$('.fnode', flow), p = $('.fl-p', flow);
    if (reduce) nodes.forEach((n) => n.classList.add('lit'));
    else {
      gsap.set(p, { strokeDasharray: 1000, strokeDashoffset: 1000 });
      ScrollTrigger.create({
        trigger: flow, start: 'top 75%', end: 'bottom 45%', scrub: 0.5,
        onUpdate: (s) => {
          p.style.strokeDashoffset = 1000 - s.progress * 1000;
          nodes.forEach((n, i) => n.classList.toggle('lit', s.progress >= i / (nodes.length - 1) - 0.02));
        },
      });
    }
  }

  // compte à rebours facture électronique
  const days = $('[data-days]');
  if (days) { const n = daysUntil('2027-09-01T00:00:00+02:00'); days.dataset.count = n; days.textContent = n; }
  if (!reduce && $('#rail')) gsap.from('#rail', { scaleX: 0, ease: 'none', scrollTrigger: { trigger: '.track', start: 'top 85%', end: 'top 40%', scrub: true } });

  renderCompare($('[data-cmp]'), { cols: HOME_COLS, keyOnly: true });
  const plans = $('[data-plans]');
  renderPlans(plans);
  initBilling($('.pricing .toggle'), plans);
  initSimulator($('.sim'));
  initFaq($('[data-faq]'));
  spotlight('.ft');
}
