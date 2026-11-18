/* Blocs réutilisés par plusieurs pages : offres, simulateur, comparatif, FAQ, survol lumineux. */
import { gsap, reduce, fine, $, $$, ic, euro, fmt, esc } from './core.js';
import { PLAN_LIST, annualMonthly, simulate } from '../data/plans.js';
import { COMPETITORS, MATRIX } from '../data/competitors.js';
import wordmark from '../../partials/brix-wordmark.svg?raw';

/* ---------- Offres ---------- */
export function renderPlans(root) {
  if (!root) return;
  root.innerHTML = PLAN_LIST.map((p) => `
    <article class="plan-c rv ${p.hi ? 'hi' : ''}" data-plan="${p.id}">
      <h3>Brix ${p.name}${p.tag ? ` <span class="tag">${p.tag}</span>` : ''}</h3>
      <p class="for">${p.for}</p>
      <div class="price">${p.monthly === null ? '<b class="txt">Sur devis</b><span>selon vos agences et effectifs</span>' : `<b data-m="${p.monthly}">${p.monthly === 0 ? '0 €' : euro(p.monthly)}</b><span data-per>${p.monthly === 0 ? 'pour toujours' : 'par mois HT'}</span>`}</div>
      <ul><li class="lead">${p.lead}</li>${p.items.map((i) => `<li>${ic('check')}${i}</li>`).join('')}</ul>
      ${p.note ? `<p class="fine">${p.note}</p>` : ''}
      <a class="btn ${p.hi ? 'dawn' : 'dark'}" href="${p.ctaHref}">${p.cta} ${ic('arrow-right', 'go')}</a>
    </article>`).join('');
}

export function initBilling(toggle, plansRoot) {
  if (!toggle) return;
  const pill = $('[data-pill]', toggle), btns = $$('button', toggle);
  const set = (annual) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', (b.dataset.bill === 'a') === annual));
    const t = btns.find((b) => b.getAttribute('aria-pressed') === 'true');
    pill.style.width = `${t.offsetWidth}px`;
    pill.style.transform = `translateX(${t.offsetLeft}px)`;
    $$('[data-m]', plansRoot).forEach((el) => {
      const m = +el.dataset.m;
      if (!m) return;
      const to = annual ? annualMonthly(m) : m;
      const per = el.parentElement.querySelector('[data-per]');
      per.textContent = annual ? `par mois HT, soit ${euro(m * 10)} HT par an` : 'par mois HT';
      if (reduce) { el.textContent = euro(to); return; }
      const o = { v: parseFloat(el.dataset.v || m) };
      gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: () => { el.textContent = euro(o.v); } });
      el.dataset.v = to;
    });
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.bill === 'a')));
  requestAnimationFrame(() => set(false));
  addEventListener('resize', () => set(btns[1].getAttribute('aria-pressed') === 'true'));
}

export function initSimulator(root) {
  const input = $('[data-sim]', root);
  if (!input) return;
  const out = (n) => {
    const r = simulate(n);
    $('[data-sim-n]', root).textContent = n >= 60 ? '60+' : n;
    $('[data-sim-plan]', root).textContent = r.plan;
    $('[data-sim-total]', root).textContent = r.total === null ? 'Sur devis' : euro(r.total);
    $('[data-sim-per]', root).textContent = r.total === null ? 'interlocuteur dédié' : `soit ${euro(r.total / n)} par personne`;
    input.setAttribute('aria-valuetext', `${n >= 60 ? '60 utilisateurs ou plus' : n > 1 ? `${n} utilisateurs` : '1 utilisateur'}, offre ${r.plan}, ${r.total === null ? 'sur devis' : `${euro(r.total)} par mois`}`);
  };
  const fill = () => input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  input.addEventListener('input', () => { out(+input.value); fill(); });
  fill();
  out(+input.value);
}

/* ---------- Comparatif ---------- */
const cell = (v) => (v === 'y' ? `<span class="y" title="Oui">${ic('check')}<span class="sr">Oui</span></span>`
  : v === 'p' ? `<span class="p" title="Partiel ou en option">${ic('minus')}<span class="sr">Partiel</span></span>`
    : v === 'n' ? `<span class="n" title="Non">${ic('x')}<span class="sr">Non</span></span>`
      : '<small>à vérifier</small>');

export function renderCompare(table, { cols = COMPETITORS.map((_, i) => i), keyOnly = false } = {}) {
  if (!table) return;
  const rows = MATRIX.filter((r) => !keyOnly || r.key);
  table.innerHTML = `
    <caption class="sr">Comparatif des fonctions de Brix et des principaux logiciels pour artisans</caption>
    <thead><tr><th scope="col"><span class="sr">Fonction</span></th><th scope="col" class="brix"><span class="sr">Brix</span>${wordmark}</th>${cols.map((c) => `<th scope="col">${esc(COMPETITORS[c])}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr><th scope="row">${r.f}</th><td class="brix">${cell(r.brix)}${r.note ? `<small>${r.note}</small>` : ''}</td>${cols.map((c) => `<td>${cell(r.v[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  // la colonne Brix s'allume ligne après ligne
  if (!reduce) gsap.from($$('td.brix > span', table), { scale: 0, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.05, scrollTrigger: { trigger: table, start: 'top 75%', once: true } });
}

/* ---------- FAQ ---------- */
export function initFaq(root) {
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

/* ---------- Survol lumineux qui suit le pointeur ---------- */
export function spotlight(sel) {
  if (!fine) return;
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest(sel);
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
    t.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

export { fmt };
