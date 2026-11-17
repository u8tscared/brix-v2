/* Bob de nuit : le ciel passe de la nuit à l'aube pendant que les tâches s'empilent.
   Puis la démo Brix AI MCP : une conversation qui s'écrit toute seule. */
import { gsap, ScrollTrigger, reduce, $, $$, ic } from '../core.js';

const LABELS = [[23, 'Fin de journée'], [1, 'Vous dormez'], [5, 'Bientôt le réveil'], [7, 'Bonjour']];

export function initNight() {
  const sec = $('#bob');
  if (!sec) return;
  const clock = $('[data-clock]', sec), lab = $('[data-clock-l]', sec);
  const items = $$('[data-feed] li', sec), brief = $('[data-brief]', sec);
  const setT = (p) => {
    const m = 23 * 60 + p * 8 * 60, h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
    clock.textContent = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const hh = h < 12 ? h + 24 : h;
    lab.textContent = [...LABELS].reverse().find(([x]) => hh >= (x < 12 ? x + 24 : x))?.[1] || LABELS[0][1];
    sec.style.setProperty('--dawn', Math.max(0, (p - 0.55) / 0.45).toFixed(3));
  };
  if (reduce) { setT(1); return; }

  const desktop = matchMedia('(min-width: 861px)').matches;
  gsap.set(items, { opacity: 0, y: 26 });
  gsap.set(brief, { opacity: 0, y: 40, scale: 0.96 });
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  items.forEach((li, i) => tl.to(li, { opacity: 1, y: 0, duration: 0.5 }, 0.15 + i * 0.32));
  tl.to(brief, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, 1.95);
  tl.to({}, { duration: 0.35 });

  ScrollTrigger.create({
    trigger: sec,
    start: desktop ? 'top top' : 'top 70%',
    end: desktop ? '+=220%' : 'bottom 60%',
    pin: desktop ? $('.night-pin', sec) : false,
    scrub: 0.6,
    animation: tl,
    onUpdate: (s) => setT(s.progress),
  });
  setT(0);
}

const CONVO = [
  {
    q: 'Qui ne m’a pas encore payé ce mois-ci ?',
    tool: 'brix.factures_impayees',
    a: 'Trois factures sont en attente, pour 6 820 € au total :',
    t: [['M. Garnier · F-0312', '2 340 €'], ['Mme Lefèvre · F-0315', '3 500 €'], ['SCI Les Tilleuls · F-0309', '980 €']],
    end: 'Bob a déjà programmé les relances de demain matin.',
  },
  {
    q: 'Quel chantier m’a le moins rapporté cette année ?',
    tool: 'brix.rentabilite_chantiers',
    a: 'La rénovation Roux : 11 % de marge, contre 27 % en moyenne. Les achats ont dépassé le devis de 1 240 €, surtout sur le carrelage.',
  },
  {
    q: 'Prépare-moi un point sur ma trésorerie à 90 jours.',
    tool: 'brix.tresorerie_prevision',
    a: 'Solde prévu fin février : 31 400 €. Point bas le 12 janvier à 8 900 €, juste après l’URSSAF.',
    t: [['Encaissements attendus', '+ 58 200 €'], ['Charges prévues', '− 41 700 €']],
  },
];

export function initChat() {
  const box = $('[data-chat-b]'), input = $('[data-chat-in]');
  if (!box) return;
  const add = (cls, html) => { const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerHTML = html; box.appendChild(d); return d; };
  const answer = (c) => `<span class="tool">${ic('plug')}${c.tool}</span><div>${c.a}</div>${c.t ? `<table>${c.t.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>` : ''}${c.end ? `<div style="margin-top:8px">${c.end}</div>` : ''}`;
  if (reduce) { const c = CONVO[0]; add('u', c.q); add('a', answer(c)); return; }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    // chaque conversation une fois, puis la dernière reste affichée (pas d'animation sans fin)
    for (let k = 0; k < CONVO.length; k++) {
      const c = CONVO[k];
      box.innerHTML = '';
      input.textContent = '';
      for (let i = 0; i <= c.q.length; i++) { input.textContent = c.q.slice(0, i); await wait(28 + Math.random() * 30); }
      await wait(350);
      input.textContent = 'Écrivez votre question…';
      const u = add('u', c.q);
      gsap.from(u, { y: 14, opacity: 0, duration: 0.5, ease: 'expo.out' });
      await wait(400);
      const t = add('a', '<span class="typing"><i></i><i></i><i></i></span>');
      await wait(1300);
      t.innerHTML = answer(c);
      gsap.from(t, { y: 14, opacity: 0, duration: 0.6, ease: 'expo.out' });
      if (c.t) gsap.from($$('tr', t), { x: -10, opacity: 0, duration: 0.4, stagger: 0.12, delay: 0.2 });
      if (k < CONVO.length - 1) await wait(5200);
    }
  }
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.4 }).observe(box);
}
