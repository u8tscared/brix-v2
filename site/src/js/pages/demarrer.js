/* Composer mon Brix : métier → taille → priorités → départements → offre, puis inscription dans l'app.
   Chaque étape passe en fondu, l'aperçu de l'app se recompose en direct. */
import { boot, gsap, reduce, $, $$, ic, euro } from '../core.js';
import { DEPARTMENTS, TRADES, SIZES, signupUrl } from '../../data/departments.js';
import { PLAN_LIST } from '../../data/plans.js';

const PRIOS = [
  { id: 'devis', name: 'Faire mes devis plus vite', icon: 'mic', dept: 'vendre' },
  { id: 'paye', name: 'Être payé plus vite', icon: 'wallet', dept: 'facturer' },
  { id: 'chantiers', name: 'Suivre mes chantiers et ma marge', icon: 'hard-hat', dept: 'chantiers' },
  { id: 'equipe', name: 'Organiser mon équipe', icon: 'users', dept: 'equipe', team: true },
  { id: 'achats', name: 'Commander mon matériel moins cher', icon: 'package', dept: 'achats' },
  { id: 'bob', name: 'Déléguer l’administratif à Bob', icon: 'sparkles', dept: 'bob' },
  { id: 'clients', name: 'Trouver plus de clients', icon: 'globe', dept: 'visibilite' },
  { id: 'conforme', name: 'Être prêt pour la facture électronique', icon: 'shield-check', dept: 'facturer' },
];
// un widget du tableau de bord par priorité
const WIDGETS = {
  devis: { icon: 'mic', t: 'Devis dicté', v: '2 480 € HT', s: 'Prêt à envoyer' },
  paye: { icon: 'wallet', t: 'À encaisser', v: '6 240 €', s: '3 factures en attente', bars: [40, 55, 35, 70, 60, 90] },
  chantiers: { icon: 'hard-hat', t: 'Marge chantiers', v: '31 %', s: '4 chantiers en cours', bar: 62 },
  equipe: { icon: 'users', t: 'Équipe demain', v: '4 compagnons', s: '2 chantiers, 7 h 30' },
  achats: { icon: 'package', t: 'Demandes de prix', v: '3 réponses', s: '107 € économisés' },
  bob: { icon: 'sparkles', t: 'Bob', v: '5 actions', s: 'À valider en un clic' },
  clients: { icon: 'globe', t: 'Demandes entrantes', v: '2 nouvelles', s: 'Depuis votre site Brix' },
  conforme: { icon: 'shield-check', t: 'Facture électronique', v: 'Prête', s: 'Format conforme', bar: 100 },
};
const SIZE_HINT = { solo: 'Auto-entrepreneur ou artisan seul', '2-9': 'Une petite équipe sur le terrain', '10-49': 'Plusieurs équipes, un bureau', '50+': 'Agences, conducteurs de travaux' };
const PLAN_FOR = { solo: 'pro', '2-9': 'equipe', '10-49': 'equipe', '50+': 'entreprise' };
const STEPS = 5, MAX_WG = 4;
const sizeLabel = (s) => (s.id === 'solo' ? 'Seul' : s.id === '50+' ? '50 personnes et plus' : `${s.name} personnes`);

boot(() => {
  const q = new URLSearchParams(location.search);
  const S = {
    step: 0,
    max: 0,
    trade: TRADES.some((t) => t.id === q.get('metier')) ? q.get('metier') : null,
    size: SIZES.some((s) => s.id === q.get('taille')) ? q.get('taille') : null,
    prios: new Set(),
    mods: new Set(),
    modsTouched: false,
    plan: PLAN_LIST.some((p) => p.id === q.get('offre')) ? q.get('offre') : null,
  };

  const form = $('[data-wiz]'), hint = $('[data-hint]');
  const optBtn = (role, attr, id, icon, label, sub, on) => `<button type="button" class="opt-b" role="${role}" ${role === 'radio' ? `aria-checked="${on}" tabindex="-1"` : `aria-checked="${on}"`} ${attr}="${id}">${icon ? `<span class="oi">${ic(icon)}</span>` : ''}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="tick">${ic('check')}</span></button>`;

  $('[data-trades]').innerHTML = TRADES.map((t) => optBtn('radio', 'data-t', t.id, t.icon, t.name, '', t.id === S.trade)).join('');
  $('[data-sizes]').innerHTML = SIZES.map((s) => optBtn('radio', 'data-s', s.id, null, `<b>${sizeLabel(s)}</b>`, SIZE_HINT[s.id], s.id === S.size)).join('');
  // un seul arrêt de tabulation par groupe : l'option cochée, sinon la première
  const rove = (g) => { const items = $$('[role="radio"]', g); const on = items.find((x) => x.getAttribute('aria-checked') === 'true') || items[0]; items.forEach((x) => { x.tabIndex = x === on ? 0 : -1; }); };
  rove($('[data-trades]')); rove($('[data-sizes]'));

  const team = () => S.size && S.size !== 'solo';
  const prioDepts = () => new Set([...S.prios].map((id) => PRIOS.find((p) => p.id === id).dept));
  function renderPrios() {
    $('[data-prios]').innerHTML = PRIOS.filter((p) => !p.team || team()).map((p) => optBtn('checkbox', 'data-p', p.id, p.icon, p.name, '', S.prios.has(p.id))).join('');
  }
  const allMods = () => new Set(DEPARTMENTS.map((d) => d.id).filter((id) => id !== 'equipe' || team()));
  function defaultMods() { S.mods = allMods(); }
  function modDesc(d) {
    if (d.id === 'metier' && S.trade) {
      const key = TRADES.find((t) => t.id === S.trade).name.split(/[ -]/)[0].toLowerCase();
      const f = d.features.find((x) => x.name.toLowerCase().includes(key));
      if (f) return f.desc;
    }
    return d.features.slice(0, 3).map((f) => f.name).join(', ');
  }
  function renderMods() {
    const pd = prioDepts();
    const order = [...DEPARTMENTS].sort((a, b) => pd.has(b.id) - pd.has(a.id));
    $('[data-mods]').innerHTML = order.map((d) => `<button type="button" class="mod" aria-pressed="${S.mods.has(d.id)}" data-m="${d.id}"><span class="mi-t">${ic(d.icon)}</span><span><b>${d.name}${pd.has(d.id) ? '<span class="badge v prio">Priorité</span>' : ''}</b><span class="s">${modDesc(d)}</span></span><span class="sw" aria-hidden="true"></span></button>`).join('');
  }
  function renderPick() {
    if (!S.plan) S.plan = PLAN_FOR[S.size || 'solo'];
    const rec = PLAN_FOR[S.size || 'solo'];
    $('[data-pick]').innerHTML = PLAN_LIST.map((p) => `<button type="button" class="pp" role="radio" aria-checked="${p.id === S.plan}" tabindex="${p.id === S.plan ? 0 : -1}" data-pl="${p.id}">${p.id === rec ? '<span class="badge only">Conseillé</span>' : ''}<b>Brix ${p.name}</b><span class="pr">${p.monthly === null ? 'Sur devis' : p.monthly === 0 ? '0 €, pour toujours' : `${euro(p.monthly)} HT par mois`}</span><small>${p.for}</small></button>`).join('');
  }

  /* ---------- aperçu : liste à clés, les éléments entrent et sortent ---------- */
  const pv = (k) => $(`[data-pv-${k}]`);
  const pvBox = $('[data-pv]');
  // réconcilie un conteneur avec une liste [{k, html}] : garde, ajoute, retire en douceur
  function keyed(box, items, { enter = { opacity: 0, y: 6, scale: 0.97 }, collapse = false } = {}) {
    const cur = new Map($$(':scope > [data-k]', box).filter((el) => !el.dataset.out).map((el) => [el.dataset.k, el]));
    const keep = new Set(items.map((x) => x.k));
    cur.forEach((el, k) => {
      if (keep.has(k)) return;
      el.dataset.out = '1';
      if (reduce) { el.remove(); return; }
      gsap.to(el, { opacity: 0, scale: 0.96, duration: 0.22, ease: 'power2.in', onComplete: () => el.remove() });
      if (collapse) gsap.to(el, { height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, duration: 0.3, ease: 'power2.inOut' });
    });
    const added = [];
    items.forEach(({ k, html }) => {
      let el = cur.get(k);
      if (!el) {
        const t = document.createElement('div');
        t.innerHTML = html.trim();
        el = t.firstElementChild;
        el.dataset.k = k;
        added.push(el);
      } else if (el.dataset.html !== html) {
        const t = document.createElement('div');
        t.innerHTML = html.trim();
        el.innerHTML = t.firstElementChild.innerHTML;
      }
      el.dataset.html = html;
      box.appendChild(el); // l'ordre suit la liste ; les sortants restent à la fin le temps de partir
    });
    $$(':scope > [data-out]', box).forEach((el) => box.appendChild(el));
    if (!reduce && added.length && pvReady) gsap.from(added, { ...enter, duration: 0.45, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' });
  }
  let pvReady = false;

  function widgetsList() {
    const ids = PRIOS.filter((p) => S.prios.has(p.id) && (!p.team || team())).map((p) => p.id);
    if (!ids.length) {
      return [
        { k: 'g1', html: '<div class="wg ghost"><i></i><i></i><i></i></div>' },
        { k: 'g2', html: '<div class="wg ghost"><i></i><i></i><i></i></div>' },
        { k: 'empty', html: `<div class="wg empty">${ic('layout-dashboard')}<span>${S.step < 2 ? 'Vos priorités s’afficheront ici, à l’étape 3.' : 'Cochez une priorité, Brix la met en avant ici.'}</span></div>` },
      ];
    }
    const shown = ids.slice(0, ids.length > MAX_WG ? MAX_WG - 1 : MAX_WG);
    const out = shown.map((id) => {
      const w = WIDGETS[id];
      const extra = w.bar != null ? `<span class="wg-bar"><i style="--w:${w.bar}%"></i></span>` : w.bars ? `<span class="wg-sp">${w.bars.map((h) => `<i style="--h:${h}%"></i>`).join('')}</span>` : `<span class="wg-s">${w.s}</span>`;
      return { k: id, html: `<div class="wg"><span class="wg-h">${ic(w.icon)}${w.t}</span><b class="wg-v">${w.v}</b>${w.bar != null || w.bars ? `<span class="wg-s">${w.s}</span>` : ''}${extra}</div>` };
    });
    if (ids.length > shown.length) out.push({ k: 'more', html: `<div class="wg more">+ ${ids.length - shown.length} autre${ids.length - shown.length > 1 ? 's' : ''}</div>` });
    return out;
  }

  let lastTrade = null;
  function preview() {
    const t = TRADES.find((x) => x.id === S.trade), s = SIZES.find((x) => x.id === S.size);
    pv('trade').textContent = t ? t.name : 'Votre métier';
    if (lastTrade !== S.trade) {
      pv('icon').innerHTML = ic(t ? t.icon : 'hammer');
      if (!reduce && pvReady) gsap.fromTo(pv('icon'), { scale: 0.6, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.4)' });
      lastTrade = S.trade;
    }
    pv('size').textContent = s ? (s.id === 'solo' ? 'Seul aux commandes' : sizeLabel(s)) : 'Taille à préciser';
    const mods = S.step >= 3 || S.modsTouched ? S.mods : allMods();
    const pd = prioDepts();
    const depts = DEPARTMENTS.filter((d) => mods.has(d.id));
    // départements prioritaires en tête de la barre latérale
    const order = [...depts].sort((a, b) => pd.has(b.id) - pd.has(a.id));
    keyed(pv('mods'), order.map((d) => ({ k: d.id, html: `<li title="${d.name}"><span class="d">${ic(d.icon)}</span><span class="nm">${d.name}</span>${pd.has(d.id) ? '<i class="prio-dot" role="img" aria-label="Priorité"></i>' : ''}</li>` })), { enter: { opacity: 0, x: -8 }, collapse: true });
    keyed(pv('widgets'), widgetsList());
    const count = depts.reduce((n, d) => n + d.features.length, 0);
    animNum(pv('count'), count, (v) => Math.round(v));
    const plan = PLAN_LIST.find((p) => p.id === (S.plan || PLAN_FOR[S.size || 'solo']));
    if (pv('plan').textContent !== `Brix ${plan.name}`) {
      pv('plan').textContent = `Brix ${plan.name}`;
      if (!reduce && pvReady) gsap.fromTo(pv('plan'), { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'expo.out' });
    }
    if (plan.monthly === null || reduce) pv('price').textContent = plan.monthly === null ? 'Sur devis' : euro(plan.monthly);
    else animNum(pv('price'), plan.monthly, (v) => euro(Math.round(v * 100) / 100), 'p');
    pv('per').textContent = plan.monthly === null ? 'interlocuteur dédié' : plan.monthly === 0 ? 'pour toujours' : 'HT par mois';
    pvBox.classList.toggle('ready', S.step === STEPS - 1);
  }
  function animNum(el, to, f, key = 'v') {
    const from = el.dataset[key] != null ? +el.dataset[key] : to;
    el.dataset[key] = to;
    if (reduce || from === to || !pvReady) { el.textContent = f(to); return; }
    gsap.killTweensOf(el);
    const o = { v: from };
    gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: () => { el.textContent = f(o.v); }, id: el });
  }

  /* ---------- navigation entre étapes ---------- */
  const steps = $$('.st', form), back = $('[data-back]'), next = $('[data-next]'), go = $('[data-go]');
  const stp = $$('[data-stp] li');
  function valid() {
    if (S.step === 0 && !S.trade) return 'Choisissez votre métier pour continuer.';
    if (S.step === 1 && !S.size) return 'Dites-nous combien vous êtes pour continuer.';
    if (S.step === 3 && !S.mods.size) return 'Gardez au moins un département.';
    return '';
  }
  function paintSteps() {
    stp.forEach((li, i) => {
      li.classList.toggle('on', i === S.step);
      li.classList.toggle('done', i < S.max ? i !== S.step : false);
      const b = li.querySelector('button');
      b.disabled = i > S.max;
      if (i === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  let tl = null;
  function show(n, focus = true) {
    const prev = S.step;
    S.step = n;
    S.max = Math.max(S.max, n);
    if (n === 2) renderPrios();
    if (n === 3) { if (!S.modsTouched) defaultMods(); renderMods(); }
    if (n === 4) renderPick();
    $('[data-stepn]').textContent = `Étape ${n + 1} sur ${STEPS}`;
    $('[data-prog]').style.width = `${((n + 1) / STEPS) * 100}%`;
    $('.prog').setAttribute('aria-valuenow', n + 1);
    $('.prog').setAttribute('aria-valuetext', `Étape ${n + 1} sur ${STEPS}`);
    back.hidden = n === 0;
    next.hidden = n === STEPS - 1;
    go.hidden = n !== STEPS - 1;
    $('.wiz-kbd').hidden = n === STEPS - 1;
    hint.textContent = '';
    paintSteps();
    updateGo();
    preview();

    const out = steps[prev], inn = steps[n];
    const doFocus = () => { if (focus) { const t = inn.querySelector('.st-h span'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } };
    if (tl) { tl.progress(1); tl = null; }
    if (reduce || prev === n) {
      steps.forEach((s, i) => s.classList.toggle('on', i === n));
      doFocus();
    } else {
      const dir = n > prev ? 1 : -1;
      const parts = (s) => [s.querySelector('.st-h'), ...[...s.children].filter((c) => c.tagName !== 'LEGEND')];
      tl = gsap.timeline({ onComplete: () => { tl = null; } })
        .to(parts(out), { opacity: 0, y: -6 * dir, duration: 0.16, ease: 'power2.in', stagger: 0.02 })
        .add(() => {
          gsap.set(parts(out), { clearProps: 'opacity,transform' });
          steps.forEach((s, i) => s.classList.toggle('on', i === n));
          doFocus();
        })
        .from(parts(inn), { opacity: 0, y: 12 * dir, duration: 0.5, ease: 'expo.out', stagger: 0.05, clearProps: 'opacity,transform' })
        .from($$('.opt-b, .mod, .pp, .next-l li', inn), { opacity: 0, y: 8, duration: 0.45, ease: 'expo.out', stagger: { each: 0.025, from: 'start' }, clearProps: 'opacity,transform' }, '<0.06');
    }
    if (prev !== n && scrollY > 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  function updateGo() {
    if (/^https?:/.test(signupUrl()) && !go.target) { go.target = '_blank'; go.rel = 'noopener'; }
    go.href = signupUrl({ metier: S.trade || '', taille: S.size || '', offre: S.plan || '', modules: [...S.mods].join(','), priorites: [...S.prios].join(',') });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = valid();
    if (err) { hint.textContent = err; if (!reduce) gsap.fromTo(next, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' }); return; }
    if (S.step === STEPS - 1) return;
    show(Math.min(STEPS - 1, S.step + 1));
  });
  back.addEventListener('click', () => show(Math.max(0, S.step - 1)));
  $('[data-stp]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go-step]');
    if (!b || b.disabled) return;
    const n = +b.dataset.goStep;
    if (n !== S.step) show(n);
  });

  /* ---------- choix ---------- */
  let autoT = 0;
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const auto = e.detail > 0;
    clearTimeout(autoT);
    if (b.dataset.t) { S.trade = b.dataset.t; radio(b, '[data-t]'); if (auto) autoT = setTimeout(() => form.requestSubmit(), reduce ? 0 : 320); }
    else if (b.dataset.s) {
      const changed = S.size !== b.dataset.s;
      S.size = b.dataset.s; radio(b, '[data-s]');
      if (changed) { S.modsTouched = false; S.plan = null; if (!team()) S.prios.delete('equipe'); S.max = Math.min(S.max, 2); paintSteps(); }
      if (auto) autoT = setTimeout(() => form.requestSubmit(), reduce ? 0 : 320);
    } else if (b.dataset.p) { const on = !S.prios.has(b.dataset.p); S.prios[on ? 'add' : 'delete'](b.dataset.p); b.setAttribute('aria-checked', on); pop(b.querySelector('.oi')); }
    else if (b.dataset.m) { const on = !S.mods.has(b.dataset.m); S.mods[on ? 'add' : 'delete'](b.dataset.m); S.modsTouched = true; b.setAttribute('aria-pressed', on); }
    else if (b.dataset.pl) { S.plan = b.dataset.pl; radio(b, '[data-pl]'); }
    else return;
    if (b.dataset.t || b.dataset.s || b.dataset.pl) pop(b.querySelector('.oi, .tick, b'));
    hint.textContent = '';
    updateGo();
    preview();
  });
  function pop(el) { if (el && !reduce) gsap.fromTo(el, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' }); }
  function radio(b, sel) { $$(sel, form).forEach((x) => { x.setAttribute('aria-checked', x === b); x.tabIndex = x === b ? 0 : -1; }); }
  form.addEventListener('keydown', (e) => {
    // Entrée : sur une option à choix unique, on la coche et on continue
    if (e.key === 'Enter' && !e.isComposing) {
      const b = e.target.closest('button');
      if (b && b.getAttribute('role') === 'radio') { e.preventDefault(); if (b.getAttribute('aria-checked') !== 'true') b.click(); form.requestSubmit(); return; }
      return; // Continuer, Retour, cases à cocher et interrupteurs : Entrée garde son effet
    }
    const g = e.target.closest('[role="radiogroup"]');
    if (!g || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('button', g), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = items[(i + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1) + items.length) % items.length];
    n.focus();
    n.click(); // les flèches cochent l'option, sans changer d'étape (clic clavier : detail = 0)
  });
  // Entrée hors du formulaire (focus sur le titre de l'étape ou la page) : continuer
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
    const t = e.target;
    if (t.closest('a, button, input, textarea, select, [contenteditable]') || !t.closest('.wiz, body')) return;
    if (t !== document.body && !t.closest('.wiz')) return;
    e.preventDefault();
    form.requestSubmit();
  });

  // arrivée depuis l'accueil avec métier et taille déjà choisis : on saute aux priorités
  const start = S.trade && S.size ? 2 : S.trade ? 1 : 0;
  S.max = start;
  show(start, false);
  pvReady = true;
  if (!reduce) gsap.from(['.wiz-top', '.st.on > *', '.wiz-nav', '.reas'], { opacity: 0, y: 10, duration: 0.6, stagger: 0.06, ease: 'expo.out', clearProps: 'opacity,transform' });
  if (!reduce) gsap.from('.prev', { opacity: 0, y: 16, duration: 0.8, delay: 0.15, ease: 'expo.out', clearProps: 'opacity,transform' });
});
