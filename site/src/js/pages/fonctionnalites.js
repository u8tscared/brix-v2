/* Toutes les fonctionnalités : une section par département, recherche en direct,
   filtres par étiquette et par offre, barre des départements qui suit la lecture. */
import { boot, gsap, ScrollTrigger, reduce, $, $$, ic, esc, scrollToEl } from '../core.js';
import { panelHTML } from '../home/depts.js';
import { spotlight } from '../shared.js';
import { DEPARTMENTS, PLANS, FEATURE_COUNT } from '../../data/departments.js';

const ORDER = ['start', 'pro', 'equipe', 'entreprise'];
const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'new', label: 'Nouveau', icon: 'sparkles' },
  { id: 'only', label: 'Exclusif Brix', icon: 'badge-check' },
  { id: 'start', label: 'Inclus dans Start' },
  { id: 'pro', label: 'Inclus dans Pro' },
  { id: 'equipe', label: 'Inclus dans Équipe' },
];
// recherche insensible aux accents et à la casse
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function mark(text, q) {
  if (!q) return esc(text);
  const n = norm(text), i = n.indexOf(q);
  if (i < 0) return esc(text);
  // la normalisation garde la longueur des lettres de base françaises, les index restent valables
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
}

function render(list) {
  list.innerHTML = DEPARTMENTS.map((d) => {
    // titres remis dans l'ordre du document (h1 > h2 > h3)
    const html = panelHTML(d, { link: false })
      .replace(/<h3>([\s\S]*?)<\/h3>/, `<h2 id="h-${d.id}">$1</h2>`)
      .replace(/<h4>([\s\S]*?)<\/h4>/g, '<h3>$1</h3>');
    return `<section class="fx-sec" id="${d.id}" aria-labelledby="h-${d.id}" style="--c:${d.color}"><div class="dpanel">${html}</div></section>`;
  }).join('');
  // chaque carte garde sa fonction pour le filtre
  const items = [];
  DEPARTMENTS.forEach((d) => {
    const sec = $(`#${d.id}`, list), cards = $$('.ft', sec);
    d.features.forEach((f, i) => items.push({ f, d, el: cards[i], h: $('h3', cards[i]), p: $('p', cards[i]), key: norm(`${f.name} ${f.desc} ${d.name}`) }));
    sec._count = $('.dp-meta .badge.v', sec);
  });
  return items;
}

function initNav(nav, sections) {
  nav.insertAdjacentHTML('beforeend', DEPARTMENTS.map((d) => `<a class="dtab" href="#${d.id}" data-id="${d.id}">${ic(d.icon)}<span>${d.name}</span></a>`).join(''));
  const pill = $('.dtab-pill', nav), tabs = $$('.dtab', nav);
  let cur = null;
  const place = () => {
    const t = tabs.find((x) => x.dataset.id === cur);
    if (!t || t.hidden) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = `${t.offsetWidth}px`;
    pill.style.transform = `translateX(${t.offsetLeft}px)`;
    pill.style.background = DEPARTMENTS.find((d) => d.id === cur).color;
  };
  const set = (id) => {
    if (id === cur) return;
    cur = id;
    tabs.forEach((t) => (t.dataset.id === id ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
    place();
    const t = tabs.find((x) => x.dataset.id === id);
    if (t) nav.scrollTo({ left: t.offsetLeft - nav.clientWidth / 2 + t.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  };
  sections.forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: (st) => st.isActive && set(s.id) }));
  addEventListener('resize', place);
  if (document.fonts) document.fonts.ready.then(place);
  return { tabs, place, set };
}

boot(() => {
  const list = $('[data-list]'), input = $('[data-q]'), chipsRoot = $('[data-chips]'), status = $('[data-status]');
  const empty = $('[data-empty]'), clear = $('[data-clear]');
  const items = render(list);
  const sections = $$('.fx-sec', list);

  // chiffres réels tirés du référentiel
  const only = items.filter((x) => x.f.tag === 'only').length, fresh = items.filter((x) => x.f.tag === 'new').length;
  $('[data-meta]').innerHTML = `<span><b>${FEATURE_COUNT}</b> fonctions</span><span><b>${DEPARTMENTS.length}</b> départements</span><span><b>${fresh}</b> nouveautés</span><span><b>${only}</b> exclusivités Brix</span>`;

  chipsRoot.innerHTML = FILTERS.map((c, i) => `<button type="button" class="chip" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-f="${c.id}">${c.icon ? ic(c.icon) : ''}${c.label}</button>`).join('');
  const chips = $$('.chip', chipsRoot);
  const nav = initNav($('[data-fxnav]'), sections);

  let q = '', filter = 'all';
  function apply() {
    let shown = 0;
    const visibleDepts = new Set();
    items.forEach((x) => {
      const okQ = !q || x.key.includes(q);
      const okF = filter === 'all' || (filter === 'new' || filter === 'only' ? x.f.tag === filter : ORDER.indexOf(x.f.plan) <= ORDER.indexOf(filter));
      const ok = okQ && okF;
      x.el.hidden = !ok;
      x.h.innerHTML = mark(x.f.name, q);
      x.p.innerHTML = mark(x.f.desc, q);
      if (ok) { shown++; visibleDepts.add(x.d.id); }
    });
    sections.forEach((s) => {
      const d = DEPARTMENTS.find((x) => x.id === s.id);
      const n = items.filter((x) => x.d === d && !x.el.hidden).length;
      s.hidden = n === 0;
      s._count.textContent = n === d.features.length ? `${n} fonctions` : `${n} sur ${d.features.length} fonctions`;
    });
    nav.tabs.forEach((t) => { t.hidden = !visibleDepts.has(t.dataset.id); });
    empty.hidden = shown > 0;
    clear.hidden = !q;
    const filtered = q || filter !== 'all';
    status.textContent = !filtered ? '' : shown ? `${plural(shown, 'fonction trouvée', 'fonctions trouvées')} dans ${plural(visibleDepts.size, 'département', 'départements')}` : 'Aucun résultat';
    nav.place();
    ScrollTrigger.refresh();
  }

  let tmr;
  input.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { q = norm(input.value.trim()); apply(); }, 90); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; q = ''; apply(); } });
  clear.addEventListener('click', () => { input.value = ''; q = ''; apply(); input.focus(); });

  const pick = (b) => {
    chips.forEach((c) => { const on = c === b; c.setAttribute('aria-checked', on); c.tabIndex = on ? 0 : -1; });
    filter = b.dataset.f;
    apply();
  };
  chipsRoot.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) pick(b); });
  chipsRoot.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const i = chips.indexOf(document.activeElement), dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const n = chips[(i + dir + chips.length) % chips.length];
    n.focus(); pick(n);
  });
  $('[data-reset]').addEventListener('click', () => { input.value = ''; q = ''; pick(chips[0]); input.focus(); });

  // liens du méga-menu vers cette même page : défilement doux au lieu d'un saut
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="fonctionnalites.html#"]');
    if (!a) return;
    const t = document.getElementById(a.hash.slice(1));
    if (!t) return;
    e.preventDefault();
    if (t.hidden) { input.value = ''; q = ''; pick(chips[0]); }
    const dd = a.closest('.dd');
    if (dd) { dd.classList.remove('on'); $('button', dd).setAttribute('aria-expanded', 'false'); }
    history.replaceState(null, '', a.hash);
    setTimeout(() => scrollToEl(t), 30);
  });

  // cartes qui entrent en cascade, sans figer la transformation au survol
  if (!reduce) {
    $$('.dp-head', list).forEach((h) => gsap.from(h.children, { y: 26, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } }));
    gsap.set($$('.ft', list), { opacity: 0, y: 30 });
    ScrollTrigger.batch($$('.ft', list), { start: 'top 92%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', clearProps: 'transform' }) });
  }
  spotlight('.ft');
});
