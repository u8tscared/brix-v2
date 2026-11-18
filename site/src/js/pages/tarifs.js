/* Tarifs : offres (prix qui roulent au passage mensuel / annuel), simulateur qui allume l'offre conseillée,
   tableau complet fonction par fonction replié par département, FAQ facturation. */
import { boot, gsap, reduce, $, $$, ic as icon, euro } from '../core.js';
import { pageHero } from '../subpage.js';
import { renderPlans, initSimulator, initFaq } from '../shared.js';
import { DEPARTMENTS } from '../../data/departments.js';
import { PLAN_LIST, MCP_ADDON, annualMonthly, simulate } from '../../data/plans.js';

const ORDER = PLAN_LIST.map((p) => p.id); // start < pro < equipe < entreprise
const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
// une seule exception tarifaire : Brix AI MCP est en option sur Pro (voir plans.js)
const OPTION = { 'Brix AI MCP': { pro: `${euro(MCP_ADDON)}` } };
const OPEN = ['base', 'vendre']; // groupes dépliés à l'arrivée
const GROUP_ICON = { base: { icon: 'layers' }, entreprise: { icon: 'building-2' } };
// pas d'étincelles « IA » : Bob prend une main tendue
const SWAP = { sparkles: { icon: 'hand-helping' } };
const ic = (name, cls) => icon(SWAP[name]?.icon || name, cls);
// pastille de groupe : couleur du département en version pâle
const tint = (c) => (c ? ` style="--gc-bg:color-mix(in srgb, ${c} 13%, #fff);--gc:color-mix(in srgb, ${c} 74%, #1b1035)"` : '');

/* ---------- Prix qui roulent : chaque chiffre est une petite colonne 0 → 9 ---------- */
const COL = `<span class="od-c">${[...'0123456789'].map((n) => `<span>${n}</span>`).join('')}</span>`;
function roll(el, str, animate) {
  const prev = el._d || [];
  el.innerHTML = `<span class="sr">${str}</span><span class="od-w" aria-hidden="true">${[...str].map((ch) => (/\d/.test(ch) ? `<span class="od">${COL}</span>` : `<span class="od-s">${ch === ' ' ? '&nbsp;' : ch}</span>`)).join('')}</span>`;
  const digits = [...str].filter((c) => /\d/.test(c)).map(Number);
  const cols = $$('.od-c', el);
  cols.forEach((c, i) => {
    c.style.transition = 'none';
    c.style.transform = `translateY(${-(animate ? (prev[i] ?? 0) : digits[i]) * 10}%)`;
  });
  el._d = digits;
  if (!animate) return;
  void el.offsetWidth; // on fige la position de départ avant de lancer le roulement
  cols.forEach((c, i) => {
    c.style.transition = '';
    c.style.transitionDelay = `${(cols.length - 1 - i) * 55}ms`;
    c.style.transform = `translateY(${-digits[i] * 10}%)`;
  });
}

function initBilling(toggle, plansRoot) {
  const pill = $('[data-pill]', toggle), btns = $$('button', toggle);
  const prices = $$('[data-m]', plansRoot).filter((el) => +el.dataset.m > 0);
  prices.forEach((el) => roll(el, euro(+el.dataset.m), false));
  let annual = false;
  const place = () => {
    const t = btns.find((b) => b.getAttribute('aria-pressed') === 'true');
    pill.style.width = `${t.offsetWidth}px`;
    pill.style.transform = `translateX(${t.offsetLeft}px)`;
  };
  const set = (a, first) => {
    annual = a;
    btns.forEach((b) => b.setAttribute('aria-pressed', (b.dataset.bill === 'a') === a));
    place();
    prices.forEach((el) => {
      const m = +el.dataset.m;
      const per = el.parentElement.querySelector('[data-per]');
      per.innerHTML = a ? `par mois HT<br><s>${euro(m)}</s> · ${euro(m * 10)} par an` : 'par mois HT';
      roll(el, euro(a ? annualMonthly(m) : m), !first && !reduce);
    });
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.bill === 'a')));
  requestAnimationFrame(() => set(false, true));
  addEventListener('resize', place);
  if (document.fonts) document.fonts.ready.then(place);
}

/* ---------- Simulateur : remplissage de la piste et carte conseillée qui s'allume ---------- */
function initRecommend(sim, plansRoot) {
  const input = $('[data-sim]', sim);
  const cards = $$('.plan-c', plansRoot);
  cards.forEach((c) => c.insertAdjacentHTML('afterbegin', '<span class="pc-rec mono" aria-hidden="true"></span>'));
  let touched = false;
  const out = () => {
    const n = +input.value, r = simulate(n);
    input.style.setProperty('--fill', `${((n - input.min) / (input.max - input.min)) * 100}%`);
    if (!touched) return;
    cards.forEach((c) => {
      const on = PLAN_LIST.find((p) => p.id === c.dataset.plan).name === r.plan;
      c.classList.toggle('rec', on);
      if (on) $('.pc-rec', c).textContent = n >= 60 ? 'Conseillé · 60 personnes et +' : `Conseillé · ${n} ${n > 1 ? 'personnes' : 'personne'}`;
    });
  };
  input.addEventListener('input', () => { touched = true; out(); });
  out();
}

/* ---------- Tableau ---------- */
const yes = `<span class="tf-y">${ic('check')}<span class="sr">Inclus</span></span>`;
const soon = `<span class="tf-s" title="Bientôt">${ic('clock')}<span class="sr">Bientôt inclus</span></span>`;
const no = '<span class="tf-n" aria-hidden="true"></span><span class="sr">Non inclus</span>';
const opt = (t) => `<span class="tf-o">${t}</span><span class="sr"> par mois en option</span>`;
const txt = (t) => `<span class="tf-txt">${t}</span>`;
const hi = (id) => (PLAN_LIST.find((p) => p.id === id).hi ? 'hi' : '');
const included = (minPlan, id) => ORDER.indexOf(id) >= ORDER.indexOf(minPlan);

function cells(minPlan, f = {}) {
  return ORDER.map((id) => {
    const o = OPTION[f.name]?.[id];
    const v = o ? opt(o) : included(minPlan, id) ? (f.tag === 'soon' ? soon : yes) : no;
    return `<td class="${hi(id)}">${v}</td>`;
  }).join('');
}

/* en-tête de groupe : bouton qui replie, et pour chaque offre le nombre de fonctions incluses */
function group(key, title, icon, rows, feats, color) {
  const n = feats.length;
  const sums = ORDER.map((id) => {
    if (!n) return `<td class="${hi(id)}"></td>`;
    const k = feats.filter((f) => included(f.plan, id) && !OPTION[f.name]?.[id]).length;
    const v = k === n ? `<span class="tf-all-y">${ic('check')}</span><span class="sr">Toutes incluses</span>` : k === 0 ? no : `<span class="tf-c mono">${k}/${n}</span><span class="sr"> fonctions incluses</span>`;
    return `<td class="${hi(id)}">${v}</td>`;
  }).join('');
  const open = OPEN.includes(key);
  return `<tbody class="tf-grp ${open ? 'open' : ''}" id="g-${key}">
    <tr class="tf-g"><th scope="row"><button type="button" aria-expanded="${open}"><span class="tf-gi"${tint(color)}>${ic(icon)}</span><span class="tf-gn">${title}${n ? `<small class="mono">${n}</small>` : ''}</span>${ic('chevron-down', 'tf-ch')}</button></th>${sums}</tr>
    ${rows}
  </tbody>`;
}

const row = (name, desc, tds, tag) => `<tr class="tf-r"><th scope="row"><b>${name}${tag ? ` <span class="badge ${TAG[tag][0]}">${TAG[tag][1]}</span>` : ''}</b>${desc ? `<span>${desc}</span>` : ''}</th>${tds}</tr>`;

function renderTable(t) {
  const head = `<thead><tr><th scope="col" class="tf-fc"><span class="sr">Fonction</span></th>${PLAN_LIST.map((p) => `
    <th scope="col" class="${p.hi ? 'hi' : ''}"><b>${p.id === 'entreprise' ? '<span class="tf-l">Entreprise</span><span class="tf-sh" aria-hidden="true">Entr.</span>' : p.name}</b><span class="tf-pr mono">${p.monthly === null ? 'Sur devis' : p.monthly === 0 ? '0 €' : `${euro(p.monthly)}<small>/mois</small>`}</span></th>`).join('')}</tr></thead>`;

  // l'essentiel : repris des offres
  const base = group('base', 'L’essentiel', GROUP_ICON.base.icon,
    row('Devis et factures', 'Nombre de documents par mois', ORDER.map((id) => `<td class="${hi(id)}">${txt(id === 'start' ? '5 + 5' : 'Illimités')}</td>`).join(''))
    + row('Utilisateurs', 'Personnes qui se connectent à Brix', `<td>${txt('1')}</td><td>${txt('1')}</td><td class="hi">${txt('5 inclus')}<small>puis 9 € par personne</small></td><td>${txt('Sur mesure')}</td>`), []);

  const depts = DEPARTMENTS.map((d) => group(d.id, d.name, d.icon, d.features.map((f) => row(f.name, f.desc, cells(f.plan, f), f.tag)).join(''), d.features, d.color)).join('');

  // ce qui n'existe qu'en Entreprise, repris de l'offre
  const ent = PLAN_LIST.find((p) => p.id === 'entreprise');
  const entFeats = ent.items.map((i) => ({ name: i, plan: 'entreprise' }));
  const entRows = group('entreprise', 'Entreprise', GROUP_ICON.entreprise.icon, ent.items.map((i) => row(i, '', cells('entreprise'))).join(''), entFeats, '#fb923c');

  t.innerHTML = `<caption class="sr">Comparatif des offres Brix ${PLAN_LIST.map((p) => p.name).join(', ')}, fonction par fonction</caption>${head}${base}${depts}${entRows}`;
}

function initGroups(t, allBtn) {
  const groups = $$('.tf-grp', t);
  const toggle = (g, open, anim = true) => {
    if (g.classList.contains('open') === open) return;
    g.classList.toggle('open', open);
    $('.tf-g button', g).setAttribute('aria-expanded', open);
    if (open && anim && !reduce) gsap.fromTo($$('.tf-r', g), { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.025, ease: 'power3.out', clearProps: 'all' });
  };
  const sync = () => {
    const all = groups.every((g) => g.classList.contains('open'));
    allBtn.setAttribute('aria-pressed', all);
    $('span', allBtn).textContent = all ? 'Tout replier' : 'Tout déplier';
  };
  t.addEventListener('click', (e) => {
    const b = e.target.closest('.tf-g button');
    if (!b) return;
    const g = b.closest('.tf-grp');
    toggle(g, !g.classList.contains('open'));
    sync();
  });
  allBtn.addEventListener('click', () => {
    const open = allBtn.getAttribute('aria-pressed') !== 'true';
    groups.forEach((g, i) => toggle(g, open || OPEN.includes(g.id.slice(2)), i < 4));
    sync();
  });
  // un lien vers #g-xxx ouvre le groupe
  if (location.hash.startsWith('#g-')) { const g = $(location.hash); if (g) toggle(g, true, false); }
  sync();
}

boot(() => {
  pageHero();
  const plans = $('[data-plans]');
  renderPlans(plans);
  initBilling($('.toggle'), plans);
  initSimulator($('.sim'));
  initRecommend($('.sim'), plans);
  initFaq($('[data-faq]'));

  const t = $('[data-tf]');
  renderTable(t);
  initGroups(t, $('[data-all]'));
  if (!reduce) {
    // les coches de la première partie ouverte apparaissent en cascade
    $$('.tf-grp.open', t).forEach((g) => gsap.from($$('.tf-y, .tf-c, .tf-all-y, .tf-txt', g), { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.012, scrollTrigger: { trigger: g, start: 'top 85%', once: true } }));
  }
});
