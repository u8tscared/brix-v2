/* Hero : entrée du titre, capture produit qui se redresse au défilement,
   et petite scène en boucle : devis dicté → envoyé → signé → acompte reçu. */
import { gsap, reduce, fine, $, $$, fmt } from '../core.js';
import { FEATURE_COUNT } from '../../data/departments.js';

const SAID = 'Salle de bain des Petit : on dépose la baignoire, receveur extra-plat 90 par 140, paroi fixe de 120, et six heures de plomberie.';
const LINES = [280, 640, 520, 330];

export function initHero() {
  const cnt = $('.idx-h [data-count]');
  if (cnt) { cnt.dataset.count = FEATURE_COUNT; cnt.textContent = FEATURE_COUNT; }
  const shot = $('#shot');
  if (!shot) return;

  // forme d'onde
  const wave = $('[data-wave]', shot);
  if (wave) for (let i = 0; i < 16; i++) { const s = document.createElement('i'); s.style.animationDelay = `${(-Math.random()).toFixed(2)}s`; s.style.animationDuration = `${(0.55 + Math.random() * 0.6).toFixed(2)}s`; wave.appendChild(s); }

  const el = {
    said: $('[data-said]', shot), dict: $('[data-dict]', shot), lines: $$('[data-line]', shot),
    ht: $('[data-ht]', shot), tva: $('[data-tva]', shot), ttc: $('[data-ttc]', shot),
    status: $('[data-status]', shot), statusT: $('[data-status-t]', shot), aide: $('[data-aide]', shot),
    sig: $('[data-sig]', shot), sigWho: $('[data-sig-who]', shot), send: $('[data-send]', shot), sendT: $('[data-send] span', shot),
    cursor: $('[data-cursor]', shot), n1: $('[data-n1]'), n2: $('[data-n2]'),
  };
  const money = (v) => `${fmt(v, 2)} €`;
  const setTotals = (ht) => { el.ht.textContent = money(ht); el.tva.textContent = money(ht * 0.1); el.ttc.textContent = money(ht * 1.1); };
  const setStatus = (cls, t) => { el.status.className = `a-status ${cls}`; el.statusT.textContent = t; };
  const L = el.sig.getTotalLength();

  function finalState() {
    el.said.textContent = SAID;
    el.lines.forEach((l) => l.classList.add('on'));
    setTotals(1770);
    setStatus('signed', 'Signé');
    el.aide.classList.add('on');
    gsap.set(el.sig, { strokeDasharray: L, strokeDashoffset: 0 });
    el.sigWho.textContent = 'Signé par Mme Petit · 18/11 à 9:41';
    el.sigWho.parentElement.classList.add('done');
    el.send.classList.add('done'); el.sendT.textContent = 'Acompte demandé';
    gsap.set([el.n1, el.n2], { opacity: 1, y: 0, scale: 1 });
  }

  if (reduce) { finalState(); return; }

  // entrée
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.05 });
  intro.from('.hero h1 .ln > span', { yPercent: 110, duration: 1.2, stagger: 0.08 })
    .from('.hx', { y: 16, opacity: 0, duration: 0.9, stagger: 0.06 }, '-=0.95')
    .from(shot, { y: 60, opacity: 0, duration: 1.4 }, '-=0.8');

  // la capture se redresse en défilant
  gsap.fromTo(shot, { rotateX: 16, scale: 0.94 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.shot-wrap', start: 'top 92%', end: 'top 18%', scrub: 0.6 } });
  gsap.to('.h-bg', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // curseur : position relative à .app
  const app = $('.app', shot);
  const at = (target, dx = 0.5, dy = 0.55) => {
    const a = app.getBoundingClientRect(), r = target.getBoundingClientRect();
    const s = a.width / app.offsetWidth || 1;
    return { x: (r.left - a.left + r.width * dx) / s, y: (r.top - a.top + r.height * dy) / s };
  };

  let typer;
  function reset() {
    clearInterval(typer);
    el.said.textContent = '';
    el.dict.classList.remove('live');
    el.lines.forEach((l) => l.classList.remove('on', 'flash'));
    setTotals(0);
    setStatus('', 'Brouillon');
    el.aide.classList.remove('on');
    gsap.set(el.sig, { strokeDasharray: L, strokeDashoffset: L });
    el.sigWho.textContent = 'En attente…';
    el.sigWho.parentElement.classList.remove('done');
    el.send.classList.remove('done', 'press'); el.sendT.textContent = 'Envoyer pour signature';
    gsap.set([el.n1, el.n2], { opacity: 0, y: -14, scale: 0.96 });
    gsap.set(el.cursor, { opacity: 0 });
  }

  function type(dur) {
    let i = 0;
    const step = (dur * 1000) / SAID.length;
    clearInterval(typer);
    typer = setInterval(() => { el.said.textContent = SAID.slice(0, ++i); if (i >= SAID.length) clearInterval(typer); }, step);
  }

  let ht = { v: 0 };
  const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true, onRepeat: reset });
  loop.call(reset)
    .call(() => el.dict.classList.add('live'), null, 0.4)
    .call(() => type(3.4), null, 0.5);
  LINES.forEach((p, i) => {
    const t = 1.2 + i * 0.75;
    loop.call(() => { el.lines[i].classList.add('on', 'flash'); setTimeout(() => el.lines[i].classList.remove('flash'), 500); }, null, t)
      .to(ht, { v: LINES.slice(0, i + 1).reduce((a, b) => a + b, 0), duration: 0.6, ease: 'power2.out', onUpdate: () => setTotals(ht.v) }, t);
  });
  loop.call(() => el.dict.classList.remove('live'), null, 4.2)
    .call(() => el.aide.classList.add('on'), null, 4.3)
    // le curseur va cliquer sur « Envoyer »
    .call(() => { const p = at(el.send, 0.62, 0.6), s = at(el.lines[1], 0.4, 0.6); gsap.set(el.cursor, { x: s.x, y: s.y }); gsap.to(el.cursor, { opacity: 1, duration: 0.25 }); gsap.to(el.cursor, { x: p.x, y: p.y, duration: 1.1, ease: 'power3.inOut' }); }, null, 4.6)
    .call(() => { el.send.classList.add('press'); gsap.to(el.cursor, { scale: 0.85, duration: 0.12, yoyo: true, repeat: 1 }); }, null, 5.8)
    .call(() => { el.send.classList.remove('press'); setStatus('sent', 'Envoyé'); el.sendT.textContent = 'Envoyé par e-mail et SMS'; gsap.to(el.cursor, { opacity: 0, duration: 0.4, delay: 0.3 }); }, null, 6.0)
    // le client signe
    .to(el.sig, { strokeDashoffset: 0, duration: 1.6, ease: 'power1.inOut' }, 6.9)
    .call(() => { setStatus('signed', 'Signé'); el.sigWho.textContent = 'Signé par Mme Petit · 18/11 à 9:41'; el.sigWho.parentElement.classList.add('done'); }, null, 8.6)
    .to(el.n1, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 8.8)
    .call(() => { el.send.classList.add('done'); el.sendT.textContent = 'Acompte de 30 % demandé'; }, null, 9.4)
    .to(el.n2, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 10.4)
    .to({}, { duration: 3.2 });

  // ne joue que lorsqu'il est visible
  new IntersectionObserver((e) => { if (e[0].isIntersecting) loop.play(); else loop.pause(); }, { threshold: 0.15 }).observe(shot);

  // léger suivi de la souris
  if (fine) {
    const rx = gsap.quickTo(shot, 'rotationY', { duration: 1.2, ease: 'power3' });
    $('.hero').addEventListener('pointermove', (e) => rx((e.clientX / innerWidth - 0.5) * 3));
  }
}
