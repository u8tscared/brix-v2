/* Composer mon Brix : métier → taille → priorités → départements → offre, puis inscription dans l'app. */
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
const SIZE_HINT = { solo: 'Auto-entrepreneur ou artisan seul', '2-9': 'Une petite équipe sur le terrain', '10-49': 'Plusieurs équipes, un bureau', '50+': 'Agences, conducteurs de travaux' };
const PLAN_FOR = { solo: 'pro', '2-9': 'equipe', '10-49': 'equipe', '50+': 'entreprise' };
const STEPS = 5;

boot(() => {
  const q = new URLSearchParams(location.search);
  const S = {
    step: 0,
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
  $('[data-sizes]').innerHTML = SIZES.map((s) => optBtn('radio', 'data-s', s.id, null, `<b>${s.id === 'solo' ? 'Seul' : `${s.name} personnes`}</b>`, SIZE_HINT[s.id], s.id === S.size)).join('');
  // un seul arrêt de tabulation par groupe : l'option cochée, sinon la première
  const rove = (g) => { const items = $$('[role="radio"]', g); const on = items.find((x) => x.getAttribute('aria-checked') === 'true') || items[0]; items.forEach((x) => { x.tabIndex = x === on ? 0 : -1; }); };
  rove($('[data-trades]')); rove($('[data-sizes]'));

  const team = () => S.size && S.size !== 'solo';
  function renderPrios() {
    $('[data-prios]').innerHTML = PRIOS.filter((p) => !p.team || team()).map((p) => optBtn('checkbox', 'data-p', p.id, p.icon, p.name, '', S.prios.has(p.id))).join('');
  }
  function defaultMods() {
    S.mods = new Set(DEPARTMENTS.map((d) => d.id).filter((id) => id !== 'equipe' || team()));
  }
  function modDesc(d) {
    if (d.id === 'metier' && S.trade) {
      const key = TRADES.find((t) => t.id === S.trade).name.split(/[ -]/)[0].toLowerCase();
      const f = d.features.find((x) => x.name.toLowerCase().includes(key));
      if (f) return f.desc;
    }
    return d.features.slice(0, 3).map((f) => f.name).join(', ');
  }
  function renderMods() {
    const prioDepts = new Set([...S.prios].map((id) => PRIOS.find((p) => p.id === id).dept));
    const order = [...DEPARTMENTS].sort((a, b) => prioDepts.has(b.id) - prioDepts.has(a.id));
    $('[data-mods]').innerHTML = order.map((d) => `<button type="button" class="mod" aria-pressed="${S.mods.has(d.id)}" data-m="${d.id}"><span class="mi2" style="background:${d.color}">${ic(d.icon)}</span><span><b>${d.name}${prioDepts.has(d.id) ? ' <span class="badge new prio">Priorité</span>' : ''}</b><span class="s">${modDesc(d)}</span></span><span class="sw" aria-hidden="true"></span></button>`).join('');
  }
  function renderPick() {
    if (!S.plan) S.plan = PLAN_FOR[S.size || 'solo'];
    const rec = PLAN_FOR[S.size || 'solo'];
    $('[data-pick]').innerHTML = PLAN_LIST.map((p) => `<button type="button" class="pp" role="radio" aria-checked="${p.id === S.plan}" tabindex="${p.id === S.plan ? 0 : -1}" data-pl="${p.id}">${p.id === rec ? '<span class="badge only">Conseillé</span>' : ''}<b>Brix ${p.name}</b><span class="pr">${p.monthly === null ? 'Sur devis' : p.monthly === 0 ? '0 €, pour toujours' : `${euro(p.monthly)} HT par mois`}</span><small>${p.for}</small></button>`).join('');
  }

  /* ---------- aperçu ---------- */
  const pv = (k) => $(`[data-pv-${k}]`);
  function preview() {
    const t = TRADES.find((x) => x.id === S.trade), s = SIZES.find((x) => x.id === S.size);
    pv('trade').textContent = t ? t.name : 'Votre métier';
    pv('icon').innerHTML = ic(t ? t.icon : 'hammer');
    pv('size').textContent = s ? (s.id === 'solo' ? 'Seul aux commandes' : `${s.name} personnes`) : 'Taille à préciser';
    const mods = S.step >= 3 || S.modsTouched ? S.mods : new Set(DEPARTMENTS.map((d) => d.id).filter((id) => id !== 'equipe' || team()));
    const prioDepts = new Set([...S.prios].map((id) => PRIOS.find((p) => p.id === id).dept));
    pv('mods').innerHTML = DEPARTMENTS.filter((d) => mods.has(d.id)).map((d) => `<li title="${d.name}"><span class="d" style="background:${d.color}">${ic(d.icon)}</span><span>${d.name}</span>${prioDepts.has(d.id) ? '<i class="prio-dot" role="img" aria-label="Priorité"></i>' : ''}<em>${d.features.length}</em></li>`).join('');
    const count = DEPARTMENTS.filter((d) => mods.has(d.id)).reduce((n, d) => n + d.features.length, 0);
    animNum(pv('count'), count, (v) => Math.round(v));
    const plan = PLAN_LIST.find((p) => p.id === (S.plan || PLAN_FOR[S.size || 'solo']));
    pv('plan').textContent = `Brix ${plan.name}`;
    pv('price').textContent = plan.monthly === null ? 'Sur devis' : euro(plan.monthly);
    pv('per').textContent = plan.monthly === null ? 'interlocuteur dédié' : plan.monthly === 0 ? 'pour toujours' : 'HT par mois';
  }
  function animNum(el, to, f) {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (reduce) { el.textContent = f(to); return; }
    const o = { v: from };
    gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: () => { el.textContent = f(o.v); } });
  }

  /* ---------- navigation entre étapes ---------- */
  const steps = $$('.st', form), back = $('[data-back]'), next = $('[data-next]'), go = $('[data-go]');
  function valid() {
    if (S.step === 0 && !S.trade) return 'Choisissez votre métier pour continuer.';
    if (S.step === 1 && !S.size) return 'Dites-nous combien vous êtes pour continuer.';
    if (S.step === 3 && !S.mods.size) return 'Gardez au moins un département.';
    return '';
  }
  function show(n, focus = true) {
    const prev = S.step;
    S.step = n;
    if (n === 2) renderPrios();
    if (n === 3) { if (!S.modsTouched) defaultMods(); renderMods(); }
    if (n === 4) renderPick();
    steps.forEach((s, i) => s.classList.toggle('on', i === n));
    $('[data-stepn]').textContent = `Étape ${n + 1} sur ${STEPS}`;
    $('[data-prog]').style.width = `${((n + 1) / STEPS) * 100}%`;
    $('.prog').setAttribute('aria-valuenow', n + 1);
    $('.prog').setAttribute('aria-valuetext', `Étape ${n + 1} sur ${STEPS}`);
    back.hidden = n === 0;
    next.hidden = n === STEPS - 1;
    go.hidden = n !== STEPS - 1;
    hint.textContent = '';
    updateGo();
    preview();
    if (!reduce && prev !== n) gsap.from(steps[n].children, { x: n > prev ? 30 : -30, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'expo.out' });
    if (focus) { const t = steps[n].querySelector('.st-h span'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    if (prev !== n) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  function updateGo() {
    if (/^https?:/.test(signupUrl()) && !go.target) { go.target = '_blank'; go.rel = 'noopener'; }
    go.href = signupUrl({ metier: S.trade || '', taille: S.size || '', offre: S.plan || '', modules: [...S.mods].join(','), priorites: [...S.prios].join(',') });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = valid();
    if (err) { hint.textContent = err; if (!reduce) gsap.fromTo(next, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' }); return; }
    show(Math.min(STEPS - 1, S.step + 1));
  });
  back.addEventListener('click', () => show(Math.max(0, S.step - 1)));

  /* ---------- choix ---------- */
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const auto = e.detail > 0;
    if (b.dataset.t) { S.trade = b.dataset.t; radio(b, '[data-t]'); if (auto) setTimeout(() => form.requestSubmit(), reduce ? 0 : 260); }
    else if (b.dataset.s) {
      const changed = S.size !== b.dataset.s;
      S.size = b.dataset.s; radio(b, '[data-s]');
      if (changed) { S.modsTouched = false; S.plan = null; if (!team()) S.prios.delete('equipe'); }
      if (auto) setTimeout(() => form.requestSubmit(), reduce ? 0 : 260);
    } else if (b.dataset.p) { const on = !S.prios.has(b.dataset.p); S.prios[on ? 'add' : 'delete'](b.dataset.p); b.setAttribute('aria-checked', on); }
    else if (b.dataset.m) { const on = !S.mods.has(b.dataset.m); S.mods[on ? 'add' : 'delete'](b.dataset.m); S.modsTouched = true; b.setAttribute('aria-pressed', on); }
    else if (b.dataset.pl) { S.plan = b.dataset.pl; radio(b, '[data-pl]'); }
    else return;
    hint.textContent = '';
    updateGo();
    preview();
  });
  function radio(b, sel) { $$(sel, form).forEach((x) => { x.setAttribute('aria-checked', x === b); x.tabIndex = x === b ? 0 : -1; }); }
  form.addEventListener('keydown', (e) => {
    const g = e.target.closest('[role="radiogroup"]');
    if (!g || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('button', g), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = items[(i + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1) + items.length) % items.length];
    n.focus();
    n.click(); // les flèches cochent l'option, sans changer d'étape (clic clavier : detail = 0)
  });

  // arrivée depuis l'accueil avec métier et taille déjà choisis : on saute aux priorités
  show(S.trade && S.size ? 2 : S.trade ? 1 : 0, false);
});
