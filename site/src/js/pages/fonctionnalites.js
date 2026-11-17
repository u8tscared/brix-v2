/* Toutes les fonctionnalités : une section par département, recherche en direct,
   filtres par étiquette et par offre, index des départements collant avec indicateur de lecture. */
import { boot, gsap, ScrollTrigger, reduce, $, $$, ic, esc, scrollToEl } from '../core.js';
import { DEPARTMENTS, PLANS, FEATURE_COUNT } from '../../data/departments.js';

const ORDER = ['start', 'pro', 'equipe', 'entreprise'];
const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'new', label: 'Nouveau', icon: 'sparkles' },
  { id: 'only', label: 'Exclusif Brix', icon: 'badge-check' },
  { id: 'start', label: 'Inclus dans Start' },
  { id: 'pro', label: 'Inclus dans Pro' },
  { id: 'equipe', label: 'Inclus dans Équipe' },
];
// recherche insensible aux accents et à la casse
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’ʼ]/g, "'").toLowerCase();
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const pad = (n) => String(n).padStart(2, '0');

function mark(text, q) {
  if (!q) return esc(text);
  const n = norm(text), i = n.indexOf(q);
  if (i < 0) return esc(text);
  // la normalisation garde la longueur des lettres de base françaises, les index restent valables
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
}

/* petite jauge des offres : les segments allumés sont les offres qui incluent la fonction */
const meter = (plan) => `<span class="fc-meter" aria-hidden="true">${ORDER.map((id, i) => `<i class="${i >= ORDER.indexOf(plan) ? 'on' : ''}"></i>`).join('')}</span>`;

const minPlan = (d) => PLANS[ORDER[Math.min(...d.features.map((f) => ORDER.indexOf(f.plan)))]];

function sectionHTML(d, i) {
  const only = d.features.filter((f) => f.tag === 'only').length;
  return `
  <section class="fx-sec" id="${d.id}" aria-labelledby="h-${d.id}">
    <header class="fx-sh">
      <div class="fx-k"><span class="fx-ic">${ic(d.icon)}</span><span class="mono">${pad(i + 1)}</span><span>${d.name}</span></div>
      <h2 id="h-${d.id}">${d.title} <span class="grad">${d.accent}</span></h2>
      <p>${d.pitch}</p>
      <div class="fx-mt"><span class="badge v" data-cnt>${d.features.length} fonctions</span><span class="badge ok">Dès Brix ${minPlan(d)}</span>${only ? `<span class="badge only">${only} exclusivité${only > 1 ? 's' : ''} Brix</span>` : ''}</div>
    </header>
    <div class="fx-grid">${d.features.map((f) => `
      <article class="fc">
        <div class="fc-top"><span class="fc-ic">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
        <h3>${esc(f.name)}</h3><p>${esc(f.desc)}</p>
        <div class="fc-plan">${meter(f.plan)}<span class="mono">Dès ${PLANS[f.plan]}</span></div>
      </article>`).join('')}
    </div>
  </section>`;
}

function render(list) {
  list.innerHTML = DEPARTMENTS.map(sectionHTML).join('');
  const items = [];
  DEPARTMENTS.forEach((d) => {
    const sec = $(`#${d.id}`, list), cards = $$('.fc', sec);
    d.features.forEach((f, i) => items.push({ f, d, el: cards[i], h: $('h3', cards[i]), p: $('p', cards[i]), key: norm(`${f.name} ${f.desc} ${d.name}`) }));
    sec._count = $('[data-cnt]', sec);
  });
  return items;
}

/* Index collant : le repère glisse d'un département à l'autre et se remplit à la lecture. */
function initNav(nav, sections, list) {
  nav.insertAdjacentHTML('beforeend', DEPARTMENTS.map((d, i) => `<a class="fx-l" href="#${d.id}" data-id="${d.id}"><span class="fx-l-ic">${ic(d.icon)}</span><span class="fx-l-n">${d.name}</span><span class="fx-l-c mono" data-c>${d.features.length}</span></a>`).join(''));
  const links = $$('.fx-l', nav), ind = $('[data-ind]', nav), fill = $('i', ind), prog = $('[data-prog]', nav);
  const vertical = () => getComputedStyle(nav).flexDirection === 'column';
  let cur = null;
  const place = () => {
    const l = links.find((x) => x.dataset.id === cur);
    if (!l || l.hidden || !vertical()) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1;
    ind.style.height = `${l.offsetHeight}px`;
    ind.style.transform = `translateY(${l.offsetTop}px)`;
  };
  const set = (id) => {
    if (id === cur) return;
    cur = id;
    fill.style.transform = 'scaleY(0)';
    links.forEach((l) => (l.dataset.id === id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    place();
    // barre horizontale (mobile) : l'onglet actif reste visible
    const l = links.find((x) => x.dataset.id === id);
    if (l && !vertical()) nav.scrollTo({ left: l.offsetLeft - nav.clientWidth / 2 + l.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  };
  sections.forEach((s, i) => ScrollTrigger.create({
    trigger: s, start: 'top 42%', end: 'bottom 42%',
    // en remontant au-dessus du premier département, l'index revient sur lui
    onToggle: (st) => { if (st.isActive) set(s.id); else if (i === 0 && st.direction < 0) { set(s.id); fill.style.transform = 'scaleY(0)'; } },
    onUpdate: (st) => { if (s.id === cur) fill.style.transform = `scaleY(${st.progress.toFixed(3)})`; },
  }));
  ScrollTrigger.create({ trigger: list, start: 'top 42%', end: 'bottom 42%', onUpdate: (st) => { prog.style.transform = `scaleX(${st.progress.toFixed(3)})`; } });
  addEventListener('resize', place);
  if (document.fonts) document.fonts.ready.then(place);
  set(sections[0].id);
  return { links, place };
}

boot(() => {
  const list = $('[data-list]'), input = $('[data-q]'), chipsRoot = $('[data-chips]'), status = $('[data-status]');
  const empty = $('[data-empty]'), clear = $('[data-clear]'), kbd = $('[data-kbd]');
  const items = render(list);
  const sections = $$('.fx-sec', list);

  // chiffres réels tirés du référentiel (les compteurs défilent à l'arrivée)
  const only = items.filter((x) => x.f.tag === 'only').length, fresh = items.filter((x) => x.f.tag === 'new').length;
  $('[data-meta]').innerHTML = [[FEATURE_COUNT, 'fonctions'], [DEPARTMENTS.length, 'départements'], [fresh, 'nouveautés'], [only, 'exclusivités Brix']]
    .map(([n, t]) => `<span><b data-count="${n}">${n}</b>${t}</span>`).join('');

  chipsRoot.innerHTML = FILTERS.map((c, i) => `<button type="button" class="chip" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-f="${c.id}">${c.icon ? ic(c.icon) : ''}${c.label}</button>`).join('');
  const chips = $$('.chip', chipsRoot);
  const nav = initNav($('[data-fxnav]'), sections, list);

  let q = '', filter = 'all';
  function apply() {
    let shown = 0;
    const visible = new Set();
    items.forEach((x) => {
      const okQ = !q || x.key.includes(q);
      const okF = filter === 'all' || (filter === 'new' || filter === 'only' ? x.f.tag === filter : ORDER.indexOf(x.f.plan) <= ORDER.indexOf(filter));
      const ok = okQ && okF;
      x.el.hidden = !ok;
      x.h.innerHTML = mark(x.f.name, q);
      x.p.innerHTML = mark(x.f.desc, q);
      if (ok) { shown++; visible.add(x.d.id); }
    });
    sections.forEach((s) => {
      const d = DEPARTMENTS.find((x) => x.id === s.id);
      const n = items.filter((x) => x.d === d && !x.el.hidden).length;
      s.hidden = n === 0;
      s._count.textContent = n === d.features.length ? `${n} fonctions` : `${n} sur ${d.features.length} fonctions`;
      const l = nav.links.find((x) => x.dataset.id === d.id);
      l.hidden = n === 0;
      $('[data-c]', l).textContent = n;
    });
    empty.hidden = shown > 0;
    clear.hidden = !q;
    kbd.hidden = !!input.value;
    const filtered = q || filter !== 'all';
    status.textContent = !filtered ? '' : shown ? `${plural(shown, 'fonction trouvée', 'fonctions trouvées')} dans ${plural(visible.size, 'département', 'départements')}` : 'Aucun résultat';
    // les fonctions qui restent glissent doucement en place
    if (!reduce && filtered) gsap.fromTo($$('.fc:not([hidden])', list).slice(0, 24), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.015, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
    nav.place();
    ScrollTrigger.refresh();
  }

  let tmr;
  input.addEventListener('input', () => { kbd.hidden = !!input.value; clearTimeout(tmr); tmr = setTimeout(() => { q = norm(input.value.trim()); apply(); }, 110); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; q = ''; apply(); } });
  clear.addEventListener('click', () => { input.value = ''; q = ''; apply(); input.focus(); });
  // « / » place le curseur dans la recherche, comme dans les outils pro
  addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    e.preventDefault(); input.focus();
  });

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

  // liens du méga-menu ou de l'index vers cette même page : défilement doux au lieu d'un saut
  const go = (a, e) => {
    const t = document.getElementById(a.hash.slice(1));
    if (!t) return;
    e.preventDefault();
    if (t.hidden) { input.value = ''; q = ''; pick(chips[0]); }
    const dd = a.closest('.dd');
    if (dd) { dd.classList.remove('on'); $('button', dd).setAttribute('aria-expanded', 'false'); }
    history.replaceState(null, '', a.hash);
    setTimeout(() => scrollToEl(t), 30);
  };
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="fonctionnalites.html#"]'); if (a) go(a, e); });
  $('[data-fxnav]').addEventListener('click', (e) => { const a = e.target.closest('a.fx-l'); if (a) { e.stopPropagation(); go(a, e); } });

  // en-têtes et fonctions qui entrent en cascade, sans figer la transformation au survol
  if (!reduce) {
    $$('.fx-sh', list).forEach((h) => gsap.from(h.children, { y: 18, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 86%', once: true } }));
    gsap.set($$('.fc', list), { opacity: 0, y: 16 });
    ScrollTrigger.batch($$('.fc', list), { start: 'top 94%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.7, stagger: 0.04, ease: 'expo.out', clearProps: 'transform' }) });
    gsap.from('.fx-l', { x: -8, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'expo.out', delay: 0.35 });
  }
});
