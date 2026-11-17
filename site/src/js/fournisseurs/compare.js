/* Comparatif des réponses fournisseurs : tri par prix ou par délai, cartes qui glissent, totaux qui comptent. */
import { gsap, reduce, $, $$, ic, fmt } from '../core.js';
import { radios, onView } from '../subpage.js';

// Exemple fictif : 5 lignes de la salle de bain Leroy, prix unitaires HT proposés par 3 fournisseurs
const LINES = [
  { n: 'Receveur extra-plat 90×120', q: 1, u: 'u' },
  { n: 'Paroi de douche fixe 90 cm', q: 1, u: 'u' },
  { n: 'Mitigeur thermostatique', q: 1, u: 'u' },
  { n: 'Carrelage grès 60×60', q: 14, u: 'm²' },
  { n: 'Colle carrelage C2 25 kg', q: 6, u: 'sacs' },
];
const SUPPLIERS = [
  { id: 'd', name: 'Matériaux Durand', short: 'Durand', days: 3, p: [289, 342, 168, 34.5, 22.5] },
  { id: 's', name: 'Sanitaire Pro Rhône', short: 'Sanitaire Pro', days: 1, p: [274, 365, 149, 41.9, 24.9] },
  { id: 'c', name: 'Comptoir du Bâti', short: 'Comptoir', days: 2, p: [305, 329, 172, 33.8, 23.9] },
].map((s) => ({ ...s, total: Math.round(s.p.reduce((a, v, i) => a + v * LINES[i].q, 0) * 100) / 100 }));

const eur = (v) => `${fmt(v, Number.isInteger(v) ? 0 : 2)} €`;
const delay = (d) => (d === 1 ? 'Livré demain' : `Livré sous ${d} jours`);

export function initCompare() {
  const root = $('[data-cmpd]');
  if (!root) return;
  const list = $('[data-cd-list]', root), table = $('[data-cd-t]', root), seg = $('[data-sort]', root), pill = $('.seg2-p', seg);
  const max = Math.max(...SUPPLIERS.map((s) => s.total)), min = Math.min(...SUPPLIERS.map((s) => s.total));
  const mix = LINES.reduce((a, l, i) => a + Math.min(...SUPPLIERS.map((s) => s.p[i])) * l.q, 0);

  list.innerHTML = SUPPLIERS.map((s) => `
    <li class="cd-r" data-id="${s.id}">
      <span class="cd-rk" data-rk>1</span>
      <div class="cd-nm"><b>${s.name}</b><span><em>${ic('truck')}${delay(s.days)}</em><em>${ic('check')}5 / 5 lignes</em></span><span class="cd-bar"><i style="transform:scaleX(${(s.total / max).toFixed(3)})"></i></span></div>
      <div class="cd-tot"><b data-tot="${s.total}">${eur(s.total)}</b><span class="badge ok" data-best hidden></span></div>
    </li>`).join('');
  table.insertAdjacentHTML('beforeend', `
    <thead><tr><th scope="col">Ligne</th>${SUPPLIERS.map((s) => `<th scope="col">${s.short}</th>`).join('')}</tr></thead>
    <tbody>${LINES.map((l, i) => { const lo = Math.min(...SUPPLIERS.map((s) => s.p[i])); return `<tr><th scope="row">${l.n} · ${l.q} ${l.u}</th>${SUPPLIERS.map((s) => `<td class="${s.p[i] === lo ? 'lo' : ''}">${eur(Math.round(s.p[i] * l.q * 100) / 100)}</td>`).join('')}</tr>`; }).join('')}</tbody>`);
  const mixEl = $('[data-mix]', root);
  mixEl.textContent = eur(Math.round(mix * 100) / 100);

  const count = (el, to) => {
    if (reduce) { el.textContent = eur(to); return; }
    const o = { v: +el.dataset.from || 0 };
    el.dataset.from = to;
    gsap.to(o, { v: to, duration: 1.1, ease: 'power3.out', onUpdate: () => { el.textContent = eur(Math.round(o.v * 100) / 100); } });
  };
  const movePill = () => {
    const b = $('[aria-checked="true"]', seg);
    pill.style.width = `${b.offsetWidth}px`;
    pill.style.transform = `translateX(${b.offsetLeft - 4}px)`;
  };

  function sort(key, animate = true) {
    const order = [...SUPPLIERS].sort((a, b) => (key === 'price' ? a.total - b.total : a.days - b.days));
    const rows = order.map((s) => $(`[data-id="${s.id}"]`, list));
    const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    rows.forEach((r, i) => {
      list.appendChild(r);
      $('[data-rk]', r).textContent = i + 1;
      r.classList.toggle('best', i === 0);
      const badge = $('[data-best]', r), s = order[i];
      badge.hidden = i !== 0;
      if (i === 0) badge.textContent = key === 'price' ? `${eur(max - s.total)} de moins` : 'Le plus rapide';
    });
    if (animate && !reduce) rows.forEach((r) => {
      const dy = before.get(r) - r.getBoundingClientRect().top;
      if (dy) gsap.fromTo(r, { y: dy }, { y: 0, duration: 0.7, ease: 'expo.out' });
    });
    // les totaux recomptent depuis le plus bas : on voit l'écart se creuser
    if (animate) $$('[data-tot]', list).forEach((el) => { el.dataset.from = min * 0.8; count(el, +el.dataset.tot); });
    movePill();
  }

  radios(seg, (b) => sort(b.dataset.k));
  sort('price', false);
  addEventListener('resize', movePill);
  if (document.fonts) document.fonts.ready.then(movePill);
  if (!reduce) {
    $$('[data-tot]', list).forEach((el) => { el.textContent = eur(0); });
    mixEl.textContent = eur(0);
    list.classList.toggle('z', true);
    onView(root, () => {
      $$('[data-tot]', list).forEach((el) => count(el, +el.dataset.tot));
      count(mixEl, Math.round(mix * 100) / 100);
      list.classList.toggle('z', false);
    }, 0.3);
  }
}
