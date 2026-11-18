/* Fournisseurs, réforme, comparatif, semaine type, démarrage, tarifs, FAQ.
   Les anneaux, barres et compteurs se remplissent quand ils arrivent à l'écran. */
import { gsap, ScrollTrigger, reduce, $, $$, euro } from '../core.js';
import { renderPlans, initSimulator, renderCompare, initFaq, spotlight } from '../shared.js';
import { annualMonthly } from '../../data/plans.js';
import { HOME_COLS, MATRIX, COMPETITORS } from '../../data/competitors.js';

export function daysUntil(date) {
  return Math.max(0, Math.ceil((new Date(date) - new Date()) / 864e5));
}

/* Ajoute .in à l'élément quand il entre à l'écran (tout de suite si le mouvement est réduit). */
function onView(el, start = 'top 80%') {
  if (!el) return;
  if (reduce) { el.classList.add('in'); return; }
  ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => el.classList.add('in') });
}

/* ---------- Prix qui roulent : chaque chiffre est une petite colonne 0 à 9 ---------- */
const DIG = '0123456789'.split('').map((n) => `<i>${n}</i>`).join('');
function rollTo(el, str) {
  const prev = el._chars || [];
  const chars = [...str];
  el.innerHTML = `<span class="roll" aria-hidden="true">${chars.map((c, i) => (/\d/.test(c)
    ? `<span class="rd" style="--k:${chars.length - i}"><span class="rd-s">${DIG}</span></span>`
    : `<span class="rc">${c === ' ' ? '&nbsp;' : c}</span>`)).join('')}</span><span class="sr">${str}</span>`;
  const cols = $$('.rd-s', el);
  const digits = chars.filter((c) => /\d/.test(c));
  const old = prev.filter((c) => /\d/.test(c));
  cols.forEach((s, i) => {
    const from = old[old.length - digits.length + i];
    s.style.transform = `translateY(${-(from === undefined ? 0 : +from)}em)`;
  });
  el._chars = chars;
  const go = () => cols.forEach((s, i) => { s.style.transform = `translateY(${-digits[i]}em)`; });
  if (reduce || !prev.length) go();
  else { void el.offsetWidth; requestAnimationFrame(go); }
}

function initHomeBilling(toggle, plansRoot) {
  if (!toggle) return;
  const pill = $('[data-pill]', toggle), btns = $$('button', toggle);
  const prices = $$('[data-m]', plansRoot).filter((el) => +el.dataset.m > 0);
  const place = () => {
    const t = btns.find((b) => b.getAttribute('aria-pressed') === 'true');
    pill.style.width = `${t.offsetWidth}px`;
    pill.style.transform = `translateX(${t.offsetLeft}px)`;
  };
  const set = (annual) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', (b.dataset.bill === 'a') === annual));
    toggle.classList.toggle('annual', annual);
    place();
    prices.forEach((el) => {
      const m = +el.dataset.m;
      rollTo(el, euro(annual ? annualMonthly(m) : m));
      const per = el.parentElement.querySelector('[data-per]');
      if (per) per.textContent = annual ? `par mois HT, soit ${euro(m * 10)} HT par an` : 'par mois HT';
    });
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.bill === 'a')));
  set(false);
  requestAnimationFrame(place);
  if (document.fonts) document.fonts.ready.then(place);
  addEventListener('resize', place);
}

/* ---------- Comparatif : une ligne de score sous le tableau ---------- */
function compareScore(table) {
  if (!table) return;
  const rows = MATRIX.filter((r) => r.key);
  const n = rows.length;
  const score = (get) => rows.filter((r) => get(r) === 'y').length;
  const cell = (y, brix) => `<td class="${brix ? 'brix' : ''}"><span class="sc" style="--p:${(y / n).toFixed(3)}"><b class="mono">${y}/${n}</b><i></i></span></td>`;
  const foot = document.createElement('tfoot');
  foot.innerHTML = `<tr><th scope="row">Fonctions clés couvertes</th>${cell(score((r) => r.brix), true)}${HOME_COLS.map((c) => cell(score((r) => r.v[c]))).join('')}</tr>`;
  foot.querySelector('th').setAttribute('aria-label', `Fonctions clés couvertes sur ${n}, Brix puis ${HOME_COLS.map((c) => COMPETITORS[c]).join(', ')}`);
  table.appendChild(foot);
  onView(table, 'top 70%');
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
        trigger: flow, start: 'top 78%', end: 'bottom 45%', scrub: 0.5,
        onUpdate: (s) => {
          p.style.strokeDashoffset = 1000 - s.progress * 1000;
          nodes.forEach((n, i) => n.classList.toggle('lit', s.progress >= i / (nodes.length - 1) - 0.02));
        },
      });
    }
  }
  onView($('[data-rfq]'));

  // compte à rebours facture électronique, anneau « prêt »
  const days = $('[data-days]');
  if (days) { const n = daysUntil('2027-09-01T00:00:00+02:00'); days.dataset.count = n; days.textContent = n; }
  if (!reduce && $('#rail')) gsap.from('#rail', { scaleX: 0, ease: 'none', scrollTrigger: { trigger: '.track', start: 'top 85%', end: 'top 45%', scrub: true } });
  onView($('[data-ready]'));

  // comparatif
  const cmp = $('[data-cmp]');
  renderCompare(cmp, { cols: HOME_COLS, keyOnly: true });
  compareScore(cmp);

  // semaine type
  onView($('[data-wk-tot]'));
  onView($('[data-week]'), 'top 75%');

  // démarrage
  onView($('[data-steps]'), 'top 80%');
  onView($('[data-imp]'), 'top 80%');

  // tarifs
  const plans = $('[data-plans]');
  renderPlans(plans);
  initHomeBilling($('#tarifs .toggle'), plans);
  initSimulator($('#tarifs .sim'));

  initFaq($('[data-faq]'));
  spotlight('.ft');

  // carte finale : le halo tourne doucement avec le défilement
  const fin = $('.home-final');
  if (fin && !reduce) {
    gsap.fromTo($$('.fin-halo i', fin), { rotate: -25 }, { rotate: 35, ease: 'none', scrollTrigger: { trigger: fin, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    gsap.from($('.fin-tile', fin), { y: 30, scale: 0.8, rotate: -10, opacity: 0, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: fin, start: 'top 80%', once: true } });
  }
}
