/* Page IA : entrée du hero, la journée de Bob (demande → validation → envoi), sommaire collant,
   grille des fonctions, nuit qui s'éclaire, interrupteur, bouton copier. */
import { gsap, ScrollTrigger, reduce, $, $$, ic } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
// fonction → section de la page où on la voit en action
const DEMO = { 'Devis dicté': '#dictee', 'Dictée dans votre langue': '#dictee', 'Agent de nuit': '#nuit', 'Brief du matin': '#nuit', 'Secrétaire téléphonique': '#telephone', 'Brix AI MCP': '#mcp', 'Assistant Bob': '#mcp' };

/* Entrée commune des heros produit : lignes du titre, puis texte, puis illustration. */
export function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.08 });
  if (reduce) return tl;
  tl.from('.xh h1 .ln > span', { yPercent: 112, duration: 1.2, stagger: 0.08 })
    .from('.xh .hx', { y: 18, opacity: 0, duration: 0.9, stagger: 0.06 }, '-=0.95')
    .from('.xh .hx-art', { y: 40, opacity: 0, duration: 1.3 }, '-=0.9');
  return tl;
}

/* Hero : la liste du jour se remplit, Bob demande, le curseur valide, la relance part. En boucle. */
export function heroBob(intro) {
  const bd = $('.bd');
  if (!bd) return;
  const ask = $('[data-ask]', bd), ok = $('[data-ok]', bd), toast = $('[data-toast]', bd), state = $('[data-rstate]', bd);
  const row = $('[data-relance]', bd), cursor = $('[data-cursor]', bd), items = $$('.bd-list li', bd);
  const sent = (on) => { state.className = `badge ${on ? 'ok' : 'warn'}`; state.textContent = on ? 'Envoyée' : 'À valider'; };
  if (reduce) { sent(true); gsap.set(ask, { opacity: 0 }); gsap.set(toast, { opacity: 1 }); return; }

  const at = (el, dx = 0.5, dy = 0.5) => { const a = bd.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left + r.width * dx, y: r.top - a.top + r.height * dy }; };
  const loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.4 });
  loop.call(() => { sent(false); row.classList.remove('hi'); ok.classList.remove('press'); gsap.set(toast, { opacity: 0, y: 10 }); gsap.set(cursor, { opacity: 0 }); })
    .fromTo(items, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08, ease: 'expo.out' })
    .fromTo(ask, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' }, '+=0.2')
    .call(() => row.classList.add('hi'), null, '<')
    .call(() => { const s = at(ask, 0.85, 1.25), p = at(ok, 0.6, 0.6); gsap.set(cursor, { x: s.x, y: s.y }); gsap.to(cursor, { opacity: 1, duration: 0.25 }); gsap.to(cursor, { x: p.x, y: p.y, duration: 1, ease: 'power3.inOut' }); }, null, '+=0.9')
    .call(() => { ok.classList.add('press'); gsap.to(cursor, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1 }); }, null, '+=1.1')
    .to(ask, { opacity: 0, y: 14, scale: 0.97, duration: 0.45, ease: 'power2.in' }, '+=0.3')
    .to(cursor, { opacity: 0, duration: 0.3 }, '<')
    .call(() => { sent(true); gsap.fromTo(state, { scale: 0.5 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }); })
    .to(toast, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, '+=0.15')
    .call(() => row.classList.remove('hi'), null, '+=0.8')
    .to(toast, { opacity: 0, y: 6, duration: 0.5 }, '+=2.2')
    .to(items, { opacity: 0, duration: 0.4 }, '+=0.3');

  let started = false, visible = false;
  const go = () => { if (started && visible) loop.play(); else loop.pause(); };
  intro.eventCallback('onComplete', () => { started = true; go(); });
  gsap.set([ask, ...items], { opacity: 0 });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; go(); }, { threshold: 0.2 }).observe(bd);
}

/* Sommaire collant : la pastille suit la section lue. */
export function toc() {
  const nav = $('[data-toc]');
  if (!nav) return;
  const pill = $('[data-toc-pill]', nav), links = $$('a', nav), list = $('.toc-l', nav);
  const secs = links.map((a) => $(a.getAttribute('href')));
  let cur = -1;
  const set = (i) => {
    if (i === cur) return;
    cur = i;
    links.forEach((a, k) => { a.classList.toggle('on', k === i); if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (i < 0) { pill.style.opacity = 0; return; }
    const a = links[i];
    pill.style.opacity = 1;
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
    // sur mobile, le lien actif reste visible dans la bande qui défile
    const l = a.offsetLeft - list.scrollLeft;
    if (l < 0 || l + a.offsetWidth > list.clientWidth) list.scrollTo({ left: a.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' });
  };
  const update = () => {
    const y = innerHeight * 0.35;
    let i = -1;
    secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top < y) i = k; });
    const last = secs[secs.length - 1];
    const past = last && last.getBoundingClientRect().bottom < y;
    if (past) i = -1;
    nav.classList.toggle('gone', !!past);
    set(i);
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => { const i = cur; cur = -2; set(i); });
  update();
}

export function bobGrid() {
  const root = $('[data-bobgrid]');
  if (!root) return;
  const bob = DEPARTMENTS.find((d) => d.id === 'bob'), vendre = DEPARTMENTS.find((d) => d.id === 'vendre');
  const extra = vendre.features.filter((f) => /^Devis (dicté|depuis)/.test(f.name));
  // une pastille de couleur par fonction : les cartes ne se ressemblent pas toutes
  const TONES = ['v', 'p', 'b', 'm', 'i', 'g', 's', 'r'];
  root.innerHTML = [...extra, ...bob.features].map((f, i) => `
    <article class="fx">
      <div class="fx-top"><span class="tl tone-${TONES[i % TONES.length]}">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
      <h3>${f.name}</h3><p>${f.desc}</p>
      <div class="fx-foot"><span class="plan-t">Dès ${PLANS[f.plan]}</span>${DEMO[f.name] ? `<a class="link" href="${DEMO[f.name]}">Voir ${ic('arrow-right')}</a>` : ''}</div>
    </article>`).join('');
  if (!reduce) gsap.from($$('.fx', root), { opacity: 0, y: 16, duration: 0.8, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: root, start: 'top 85%', once: true } });
}

/* La nuit : l'horloge tourne de 22 h 30 à 7 h au fil du défilement, les tâches s'allument, l'aube se lève. */
export function nightRun() {
  const p = $('[data-night]');
  if (!p) return;
  const clock = $('[data-clock]', p), lab = $('[data-clock-l]', p), steps = $$('[data-at]', p);
  const FROM = 22.5, TO = 31;
  const LABELS = [[22.5, 'Vous rangez le camion'], [23.5, 'Vous dormez'], [29.5, 'Le jour se lève'], [31, 'Votre brief est prêt']];
  const render = (h) => {
    const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    lab.textContent = LABELS.filter(([t]) => h >= t).pop()[1];
    steps.forEach((s) => s.classList.toggle('on', h >= +s.dataset.at));
    p.style.setProperty('--k', Math.max(0, Math.min(1, (h - 27.5) / 3.5)).toFixed(3));
  };
  if (reduce) { render(TO); return; }
  render(FROM);
  ScrollTrigger.create({ trigger: p, start: 'top 72%', end: 'bottom 62%', scrub: 0.6, onUpdate: (s) => render(FROM + (TO - FROM) * s.progress) });
}

export function bobSwitch() {
  const sw = $('[data-sw]'), hist = $('[data-hist]'), lab = $('[data-sw-l]');
  if (!sw) return;
  sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', on);
    hist.classList.toggle('off', !on);
    lab.textContent = on ? 'Bob activé' : 'Bob en pause';
  });
  if (!reduce) gsap.from($$('.hist-l li', hist), { x: 16, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: hist, start: 'top 78%', once: true } });
}

/* Étape 2 du MCP : le bouton « Copier » répond (démonstration, rien n'est copié). */
export function copyDemo(root = document) {
  const b = $('[data-copy]', root);
  if (!b) return;
  let tm;
  b.addEventListener('click', () => {
    clearTimeout(tm);
    if (b.dataset.copy && navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).catch(() => {});
    b.classList.add('done');
    b.innerHTML = `${ic('check')}<span>Copié</span>`;
    if (!reduce) gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    tm = setTimeout(() => { b.classList.remove('done'); b.innerHTML = `${ic('copy')}<span>Copier</span>`; }, 1800);
  });
}
