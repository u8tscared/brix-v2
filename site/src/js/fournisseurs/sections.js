/* Page fournisseurs : hero, parcours, commande, catalogue, portail, onglets de code, « et aussi ». */
import { gsap, ScrollTrigger, reduce, $, $$, ic } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';
import { wait, onView } from '../subpage.js';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };

/* Hero : les trois fournisseurs passent d'« Envoyée » à « Lue » puis répondent. */
export function heroRfq(tl) {
  const rows = $$('[data-rh]');
  const answers = ['1 417 €', '1 524 €', '1 422,60 €'];
  const set = (li, cls, txt) => { const em = $('.st em', li); em.className = cls; em.textContent = txt; return em; };
  if (reduce) { rows.forEach((li, i) => set(li, 'ok', answers[i])); return; }
  tl.from('.rh-card', { y: 80, opacity: 0, rotate: 4, duration: 1.4 }, '-=1.1')
    .from('.rh-chip', { y: 50, x: -30, opacity: 0, rotate: -5, duration: 1.2 }, '-=1')
    .from('[data-rh-best]', { opacity: 0, duration: 0.4 }, '-=1.2');
  gsap.set('[data-rh-best]', { opacity: 0 });
  tl.eventCallback('onComplete', async () => {
    for (const [i, li] of [[1, rows[1]], [0, rows[0]], [2, rows[2]]]) {
      set(li, 'read', 'Lue');
      await wait(500);
      gsap.from(set(li, 'ok', answers[i]), { scale: 0.5, duration: 0.6, ease: 'back.out(3)' });
      await wait(500);
    }
    gsap.to('[data-rh-best]', { opacity: 1, duration: 0.6 });
  });
  gsap.to('.rh', { y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* Parcours : la ligne se dessine, les étapes s'allument une à une. */
export function flow() {
  const f = $('[data-flow]');
  if (!f) return;
  const nodes = $$('.fnode', f), p = $('.fl-p', f);
  if (reduce) { nodes.forEach((n) => n.classList.add('lit')); return; }
  // trait non mis à l'échelle : la longueur des pointillés se compte en pixels d'écran
  const W = () => p.getBoundingClientRect().width + 20;
  let prog = 0;
  const draw = () => { const w = W(); p.style.strokeDasharray = w; p.style.strokeDashoffset = w * (1 - prog); };
  draw();
  addEventListener('resize', draw);
  ScrollTrigger.create({
    trigger: f, start: 'top 75%', end: 'bottom 40%', scrub: 0.5,
    onUpdate: (s) => {
      prog = s.progress;
      draw();
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
    gsap.from($('.ord-inv', o), { y: 20, opacity: 0, duration: 0.8, delay: 1.6, ease: 'expo.out' });
  }, 0.35);
}

/* Catalogue : la courbe de prix se trace, l'alerte tombe. */
export function catalog() {
  const c = $('[data-cat]');
  if (!c || reduce) return;
  const l = $('.sp-l', c), L = l.getTotalLength();
  gsap.set(l, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set(['.sp-a', '.sp-d'], { opacity: 0 });
  onView(c, () => {
    const tl = gsap.timeline();
    tl.from($$('.file, .cat-imp .badge', c), { y: 12, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'expo.out' })
      .to(l, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .to('.sp-a', { opacity: 1, duration: 0.8 }, 1)
      .to('.sp-d', { opacity: 1, duration: 0.3 }, 1.7)
      .from($('.cat-al', c), { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out' }, 1.9);
  }, 0.35);
}

/* Portail : les prix se tapent tout seuls, puis la réponse part. */
export function portal() {
  const p = $('[data-portal]');
  if (!p || reduce) return;
  const inputs = $$('[data-fill]', p), send = $('[data-send]', p);
  inputs.forEach((i) => { i.textContent = ''; });
  onView(p, async () => {
    gsap.from(p.children, { y: 30, opacity: 0, stagger: 0.2, duration: 0.9, ease: 'expo.out' });
    await wait(900);
    for (const i of inputs) {
      i.classList.add('focus');
      for (let k = 1; k <= i.dataset.fill.length; k++) { i.textContent = i.dataset.fill.slice(0, k); await wait(70); }
      i.classList.remove('focus');
      await wait(150);
    }
    await wait(300);
    send.classList.add('sent');
    send.innerHTML = `${ic('check')}Réponse envoyée à Martin Plomberie`;
    gsap.fromTo(send, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }, 0.4);
}

/* Onglets de code accessibles (flèches gauche / droite). */
export function codeTabs() {
  const tabs = $$('[data-ide] [role="tab"]');
  if (!tabs.length) return;
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $(`#${x.getAttribute('aria-controls')}`).hidden = !on;
    });
    if (focus) t.focus();
    if (!reduce) gsap.from(`#${t.getAttribute('aria-controls')} code`, { opacity: 0, y: 8, duration: 0.4, ease: 'power2.out' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });
}

/* « Et aussi » : les autres fonctions du département Achats. */
export function more() {
  const root = $('[data-more]');
  if (!root) return;
  const d = DEPARTMENTS.find((x) => x.id === 'achats');
  const extra = d.features.filter((f) => /^(Stocks|Véhicules|Connexions)/.test(f.name));
  root.innerHTML = extra.map((f) => `
    <article class="ft rv" style="--c:${d.color}">
      <div class="ft-top"><span class="ft-ic">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
      <h3>${f.name}</h3><p>${f.desc}</p><span class="plan-t">Dès ${PLANS[f.plan]}</span>
    </article>`).join('');
}
