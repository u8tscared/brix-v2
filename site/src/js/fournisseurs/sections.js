/* Page fournisseurs : hero (demande envoyée → réponses → classement), parcours, commande, catalogue,
   portail fournisseur joué comme une vraie session, onglets de code, « et aussi ». */
import { gsap, ScrollTrigger, reduce, $, $$, ic, fmt } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';
import { wait, onView } from '../subpage.js';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
const NS = 'http://www.w3.org/2000/svg';
const eur = (v) => `${fmt(v, Number.isInteger(v) ? 0 : 2)} €`;

/* Joue cycle() en boucle, seulement quand el est à l'écran. */
function loopWhileVisible(el, cycle) {
  let visible = false, running = false;
  const next = async () => {
    if (running || !visible) return;
    running = true;
    await cycle();
    running = false;
    next();
  };
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; next(); }, { threshold: 0.25 }).observe(el);
}

export function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.08 });
  if (reduce) return tl;
  tl.from('.xh h1 .ln > span', { yPercent: 112, duration: 1.2, stagger: 0.08 })
    .from('.xh .hx', { y: 18, opacity: 0, duration: 0.9, stagger: 0.06 }, '-=0.95')
    .from('.xh .hx-art', { y: 40, opacity: 0, duration: 1.3 }, '-=0.9');
  return tl;
}

/* Hero : la demande part vers 3 fournisseurs, ils la lisent, les prix reviennent,
   la meilleure offre remonte en tête. */
export function heroRfq(intro) {
  const rq = $('[data-rq]');
  if (!rq) return;
  const list = $('[data-rq-list]', rq), send = $('[data-rq-send]', rq), sendT = $('span', send), svg = $('[data-wires]', rq), g = $('[data-wg]', rq), foot = $('[data-rq-foot]', rq), src = $('.rq-src', rq);
  const orig = $$('li', list);
  const byPrice = [...orig].sort((a, b) => +a.dataset.total - +b.dataset.total);
  const META = orig.map((li) => $('[data-meta]', li).textContent);
  const st = (li, cls, html) => { const em = $('[data-st] em', li); em.className = cls; em.innerHTML = html; return em; };
  const delay = (d) => (+d === 1 ? 'Livré demain' : `Livré sous ${d} jours`);
  const answered = (li) => { st(li, 'price', eur(+li.dataset.total)); $('[data-meta]', li).textContent = delay(li.dataset.days); };

  if (reduce) { byPrice.forEach((li) => { list.appendChild(li); answered(li); }); byPrice[0].classList.add('best'); gsap.set(foot, { opacity: 1 }); return; }

  let paths = [], dots = [];
  function wires() {
    g.innerHTML = '';
    paths = []; dots = [];
    if (getComputedStyle(svg).display === 'none') return;
    const R = rq.getBoundingClientRect(), s = src.getBoundingClientRect(), b = send.getBoundingClientRect();
    const x0 = s.right - R.left, y0 = b.top + b.height / 2 - R.top;
    orig.forEach((li) => {
      const r = li.getBoundingClientRect(), x1 = r.left - R.left, y1 = r.top + r.height / 2 - R.top, mx = (x0 + x1) / 2;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x0} ${y0} C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`);
      g.appendChild(p);
      paths.push(p);
    });
    orig.forEach(() => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3.5); g.appendChild(c); dots.push(c); });
  }
  const travel = (i, back, d = 0.75, delayS = 0) => {
    const p = paths[i], c = dots[i];
    if (!p) return;
    const L = p.getTotalLength(), o = { t: 0 };
    c.classList.toggle('back', back);
    gsap.to(o, { t: 1, duration: d, delay: delayS, ease: 'power1.inOut', onStart: () => c.style.opacity = 1, onUpdate: () => { const pt = p.getPointAtLength((back ? 1 - o.t : o.t) * L); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); }, onComplete: () => gsap.to(c, { opacity: 0, duration: 0.25 }) });
  };

  async function cycle() {
    orig.forEach((li, i) => { list.appendChild(li); li.classList.remove('best'); gsap.set(li, { y: 0 }); st(li, '', 'En attente'); $('[data-meta]', li).textContent = META[i]; });
    send.classList.remove('done'); sendT.textContent = 'Envoyer à 3 fournisseurs';
    gsap.set(foot, { opacity: 0, y: 8 });
    gsap.set(g, { opacity: 1 });
    wires();
    paths.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
    await wait(900);
    send.classList.add('press'); await wait(170); send.classList.remove('press');
    paths.forEach((p, i) => { gsap.to(p, { strokeDashoffset: 0, duration: 0.7, delay: i * 0.1, ease: 'power2.inOut' }); travel(i, false, 0.8, 0.25 + i * 0.1); });
    await wait(1100);
    send.classList.add('done'); sendT.textContent = 'Envoyée';
    orig.forEach((li, i) => setTimeout(() => gsap.fromTo(st(li, 'sent', `${ic('check')}Envoyée`), { scale: 0.7 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }), i * 90));
    await wait(1100);
    for (const i of [0, 2, 1]) { st(orig[i], 'read', `${ic('eye')}Lue`); await wait(320); }
    await wait(500);
    // les réponses reviennent : la plus rapide d'abord
    for (const i of [0, 2, 1]) {
      paths[i]?.classList.add('lit');
      travel(i, true, 0.7);
      await wait(650);
      const li = orig[i], o = { v: 0 }, em = st(li, 'price', eur(0));
      $('[data-meta]', li).textContent = delay(li.dataset.days);
      gsap.to(o, { v: +li.dataset.total, duration: 0.7, ease: 'power3.out', onUpdate: () => { em.textContent = eur(Math.round(o.v * 100) / 100); } });
      await wait(520);
    }
    await wait(600);
    gsap.to(g, { opacity: 0, duration: 0.4 });
    paths.forEach((p) => p.classList.remove('lit'));
    // la meilleure offre remonte (FLIP)
    const before = new Map(orig.map((r) => [r, r.getBoundingClientRect().top]));
    byPrice.forEach((r) => list.appendChild(r));
    byPrice.forEach((r) => { const dy = before.get(r) - r.getBoundingClientRect().top; if (dy) gsap.fromTo(r, { y: dy }, { y: 0, duration: 0.95, ease: 'expo.inOut' }); });
    await wait(750);
    byPrice[0].classList.add('best');
    gsap.to(foot, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    await wait(4600);
    gsap.to(foot, { opacity: 0, duration: 0.4 });
    await wait(400);
  }

  let started = false;
  intro.eventCallback('onComplete', () => { started = true; });
  const waitStart = async () => { while (!started) await wait(100); };
  loopWhileVisible(rq, async () => { await waitStart(); await cycle(); });
  addEventListener('resize', () => { if (paths.length) wires(); });
}

/* Parcours : la ligne se remplit au défilement, les étapes s'allument une à une. */
export function flow() {
  const f = $('[data-flow]');
  if (!f) return;
  const nodes = $$('.fnode', f), track = $('.flow-track', f);
  if (reduce) { nodes.forEach((n) => n.classList.add('lit')); track.style.setProperty('--p', 1); return; }
  ScrollTrigger.create({
    trigger: f, start: 'top 78%', end: 'bottom 45%', scrub: 0.5,
    onUpdate: (s) => {
      track.style.setProperty('--p', s.progress.toFixed(3));
      nodes.forEach((n, i) => n.classList.toggle('lit', s.progress >= i / (nodes.length - 1) - 0.02));
    },
  });
}

/* Commande : la frise et les barres de livraison se remplissent à l'arrivée. */
export function order() {
  const o = $('[data-ord]');
  if (!o || reduce) return;
  const st = $('[data-ord-steps]', o);
  o.style.setProperty('--fill', 0);
  st.style.setProperty('--fill', 0);
  onView(o, () => {
    gsap.to(st, { '--fill': 1, duration: 1.4, ease: 'power3.inOut' });
    gsap.from($$('li', st), { scale: 0.6, opacity: 0, duration: 0.6, stagger: 0.35, ease: 'back.out(2.4)' });
    setTimeout(() => o.style.setProperty('--fill', 1), 700);
    gsap.from($('.ord-inv', o), { y: 16, opacity: 0, duration: 0.8, delay: 1.6, ease: 'expo.out' });
  }, 0.35);
}

/* Catalogue : la courbe de prix se trace, le point s'allume, l'alerte tombe. */
export function catalog() {
  const c = $('[data-cat]');
  if (!c || reduce) return;
  const l = $('.sp-l', c), L = l.getTotalLength();
  gsap.set(l, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set([$('.sp-a', c), $('.sp-d', c)], { opacity: 0 });
  onView(c, () => {
    gsap.timeline()
      .from($$('.file, .cat-imp .badge', c), { y: 10, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'expo.out' })
      .to(l, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .to($('.sp-a', c), { opacity: 1, duration: 0.8 }, 1)
      .fromTo($('.sp-d', c), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' }, 1.7)
      .from($('.cat-al', c), { y: 16, opacity: 0, duration: 0.8, ease: 'expo.out' }, 1.9);
  }, 0.35);
}

/* Portail fournisseur : l'e-mail arrive, on l'ouvre, la page se charge, les prix se tapent,
   un équivalent est proposé, le délai est choisi, la réponse part. En boucle. */
export function portal() {
  const p = $('[data-portal]');
  if (!p) return;
  const mail = $('[data-pt-mail]', p), open = $('[data-pt-open]', p), body = $('[data-pt-body]', p), inputs = $$('[data-fill]', p);
  const eq = $('[data-eq]', p), del = $('[data-del]', p), delV = $('[data-del-v]', p), tot = $('[data-pt-tot]', p);
  const send = $('[data-send]', p), sendT = $('span', send), done = $('[data-done]', p), cursor = $('[data-cursor]', p);
  const steps = $$('[data-pt-steps] li', p), side = $$('[data-pm-steps] li');
  const num = (s) => parseFloat(s.replace(',', '.'));
  const money = (v) => `${fmt(v, 2)} €`;
  const step = (i) => steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
  const sideOn = (i) => side.forEach((s, k) => s.classList.toggle('on', k === i));

  if (reduce) {
    inputs.forEach((i) => { i.textContent = i.dataset.fill; });
    eq.classList.add('on'); del.classList.add('on'); delV.textContent = 'jeudi, sur chantier';
    tot.textContent = money(inputs.reduce((a, i) => a + num(i.dataset.fill), 0));
    step(2);
    return;
  }
  const at = (el, dx = 0.5, dy = 0.5) => { const a = p.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left + r.width * dx, y: r.top - a.top + r.height * dy }; };
  const moveTo = (el, d = 0.9, dx, dy) => { const t = at(el, dx, dy); return gsap.to(cursor, { x: t.x, y: t.y, duration: d, ease: 'power3.inOut' }); };
  const click = () => gsap.to(cursor, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1 });

  async function cycle() {
    // état de départ : page vide, e-mail pas encore arrivé
    inputs.forEach((i) => { i.textContent = ''; i.classList.remove('focus'); });
    eq.classList.remove('on'); del.classList.remove('on'); delV.textContent = 'Choisir';
    tot.textContent = money(0); step(0); sideOn(0);
    sendT.textContent = 'Envoyer ma réponse'; send.classList.remove('press');
    done.classList.remove('on');
    body.classList.add('loading');
    gsap.set(mail, { opacity: 0, y: -14, scale: 0.98 });
    gsap.set(cursor, { opacity: 0, scale: 1 });
    await wait(500);
    gsap.to(mail, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' });
    await wait(900);
    // on ouvre le lien
    const s0 = at(p, 0.75, 0.62);
    gsap.set(cursor, { x: s0.x, y: s0.y });
    gsap.to(cursor, { opacity: 1, duration: 0.25 });
    moveTo(open, 0.9, 0.5, 0.6);
    await wait(1000);
    click(); open.classList.add('press');
    await wait(180); open.classList.remove('press');
    gsap.to(mail, { opacity: 0, y: -10, scale: 0.97, duration: 0.45, ease: 'power2.in' });
    await wait(650);
    body.classList.remove('loading');
    sideOn(1);
    await wait(500);
    // les prix se tapent, le total suit
    let sum = 0;
    for (const [k, i] of inputs.entries()) {
      moveTo(i, 0.55, 0.7, 0.6);
      await wait(560);
      click();
      i.classList.add('focus');
      const v = i.dataset.fill;
      for (let n = 1; n <= v.length; n++) { i.textContent = v.slice(0, n); await wait(65); }
      i.classList.remove('focus');
      const o = { v: sum }; sum += num(v);
      gsap.to(o, { v: sum, duration: 0.5, ease: 'power2.out', onUpdate: () => { tot.textContent = money(o.v); } });
      if (k === 2) { await wait(250); eq.classList.add('on'); }
      await wait(200);
    }
    // le délai
    step(1);
    moveTo(del, 0.7, 0.6, 0.6);
    await wait(760);
    click(); del.classList.add('on');
    const d = 'jeudi, sur chantier';
    for (let n = 1; n <= d.length; n++) { delV.textContent = d.slice(0, n); await wait(28); }
    await wait(450);
    // l'envoi
    step(2);
    moveTo(send, 0.8, 0.5, 0.6);
    await wait(880);
    click(); send.classList.add('press');
    sendT.textContent = 'Envoi…';
    await wait(200); send.classList.remove('press');
    await wait(600);
    gsap.to(cursor, { opacity: 0, duration: 0.3 });
    done.classList.add('on'); sideOn(2);
    steps.forEach((s) => { s.classList.remove('on'); s.classList.add('done'); });
    await wait(4200);
    done.classList.remove('on');
    await wait(500);
  }
  loopWhileVisible(p, cycle);
}

/* Onglets de code accessibles (flèches gauche / droite), avec pastille glissante. */
export function codeTabs() {
  const tabs = $$('[data-ide] [role="tab"]');
  if (!tabs.length) return;
  const pill = $('[data-ide-pill]');
  const movePill = () => { const t = tabs.find((x) => x.getAttribute('aria-selected') === 'true'); pill.style.width = `${t.offsetWidth}px`; pill.style.transform = `translateX(${t.offsetLeft}px)`; };
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $(`#${x.getAttribute('aria-controls')}`).hidden = !on;
    });
    movePill();
    if (focus) t.focus();
    if (!reduce) gsap.from(`#${t.getAttribute('aria-controls')} code`, { opacity: 0, y: 6, duration: 0.4, ease: 'power2.out' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });
  requestAnimationFrame(movePill);
  if (document.fonts) document.fonts.ready.then(movePill);
  addEventListener('resize', movePill);
}

/* « Et aussi » : les autres fonctions du département Achats. */
export function more() {
  const root = $('[data-more]');
  if (!root) return;
  const d = DEPARTMENTS.find((x) => x.id === 'achats');
  const extra = d.features.filter((f) => /^(Stocks|Véhicules|Connexions)/.test(f.name));
  root.innerHTML = extra.map((f) => `
    <article class="mx">
      <div class="mx-top"><span class="tl">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
      <h3>${f.name}</h3><p>${f.desc}</p><span class="plan-t">Dès ${PLANS[f.plan]}</span>
    </article>`).join('');
}
