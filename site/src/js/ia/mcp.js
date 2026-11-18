/* Brix AI MCP : on choisit une question, elle se tape, l'assistant appelle l'outil Brix
   (lecture), le résultat revient, puis la réponse s'écrit avec les vrais chiffres. */
import { gsap, reduce, $, $$, ic } from '../core.js';
import { wait, onView } from '../subpage.js';

const QUESTIONS = [
  {
    q: 'Qui ne m’a pas encore payé ce mois-ci ?',
    tool: 'brix · impayes', res: '3 factures',
    a: 'Trois factures sont en attente, pour 6 820 € au total :',
    t: [['M. Garnier · F-0312', '2 340 €'], ['Mme Lefèvre · F-0315', '3 500 €'], ['SCI Les Tilleuls · F-0309', '980 €']],
    end: 'La plus ancienne date de 41 jours. Vous voulez que Bob prépare une relance ?',
  },
  {
    q: 'Quel chantier m’a le moins rapporté cette année ?',
    tool: 'brix · chantiers', res: '38 chantiers',
    a: 'La rénovation Roux : 11 % de marge, contre 27 % en moyenne sur vos chantiers. Les achats ont dépassé le devis de 1 240 €, surtout sur le carrelage.',
  },
  {
    q: 'Où acheter mes tubes PER de 16 le moins cher ?',
    tool: 'brix · prix_materiaux', res: '3 fournisseurs',
    a: 'Le meilleur prix dans vos catalogues fournisseurs :',
    t: [['Comptoir Rhône Élec', '0,62 € / m'], ['Négoce Gerland', '0,68 € / m'], ['Dépôt Lyon Sud', '0,71 € / m']],
    end: 'Le prix chez Négoce Gerland a augmenté de 6 % ce mois-ci.',
  },
  {
    q: 'Combien de devis signés ce trimestre, et pour quel montant ?',
    tool: 'brix · chiffre_affaires', res: '23 devis',
    a: '14 devis signés depuis le 1er octobre, pour 48 300 € HT. Votre taux de signature est de 61 %, sur 23 devis envoyés.',
  },
];

const words = (s) => s.split(' ').map((w) => `<span class="wd">${w}</span>`).join(' ');

export function initMcp() {
  const box = $('[data-chat-b]'), input = $('[data-chat-in]'), list = $('[data-asks]');
  if (!box || !list) return;
  const send = $('.mc-send'), inBox = input.parentElement;
  list.innerHTML = QUESTIONS.map((c, i) => `<button class="qchip" aria-pressed="${i === 0}" data-q="${i}">${c.q}${ic('arrow-right')}</button>`).join('');
  const btns = $$('.qchip', list);
  const add = (cls, html) => { const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerHTML = html; box.appendChild(d); return d; };
  const tool = (c, done) => `<div class="tool ${done ? 'ok' : 'run'}"><span class="tl">${ic('plug')}</span><span class="mono">${c.tool}</span><span class="tool-st">${done ? `${ic('check')}${c.res} lus` : `${ic('loader-circle')}Lecture dans Brix…`}</span></div>`;
  const body = (c, anim) => `<div>${anim ? words(c.a) : c.a}</div>${c.t ? `<table>${c.t.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>` : ''}${c.end ? `<div>${anim ? words(c.end) : c.end}</div>` : ''}`;
  let run = 0;

  async function ask(i) {
    const id = ++run, c = QUESTIONS[i];
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
    box.innerHTML = '';
    if (reduce) { add('u', c.q); add('a', tool(c, true) + body(c)); return; }
    inBox.classList.add('typing');
    input.textContent = '';
    for (let k = 0; k <= c.q.length; k += 2) { if (id !== run) return; input.textContent = c.q.slice(0, k); await wait(24); }
    input.textContent = c.q;
    await wait(220);
    if (id !== run) return;
    send.classList.add('press');
    setTimeout(() => send.classList.remove('press'), 160);
    inBox.classList.remove('typing');
    input.textContent = 'Écrivez votre question…';
    gsap.from(add('u', c.q), { y: 14, opacity: 0, duration: 0.5, ease: 'expo.out' });
    await wait(450);
    if (id !== run) return;
    const a = add('a', tool(c, false));
    gsap.from(a, { y: 10, opacity: 0, duration: 0.5, ease: 'expo.out' });
    await wait(1250);
    if (id !== run) return;
    a.innerHTML = tool(c, true) + body(c, true);
    gsap.from($('.tool-st', a), { x: 6, opacity: 0, duration: 0.4 });
    const ws = $$('.wd', a);
    for (let k = 0; k < ws.length; k++) {
      if (id !== run) return;
      ws[k].classList.add('on');
      if (k % 2) await wait(28);
    }
    if (c.t) gsap.from($$('tr', a), { y: 6, opacity: 0, duration: 0.45, stagger: 0.1, ease: 'expo.out' });
  }

  list.addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(+b.dataset.q); });
  if (reduce) ask(0); else onView(box, () => ask(0), 0.4);
}
