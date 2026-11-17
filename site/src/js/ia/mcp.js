/* Brix AI MCP : on choisit une question, l'assistant interroge Brix et répond avec les chiffres. */
import { gsap, reduce, $, $$, ic } from '../core.js';
import { wait, onView } from '../subpage.js';

const QUESTIONS = [
  {
    q: 'Qui ne m’a pas encore payé ce mois-ci ?',
    tool: 'brix.factures_impayees',
    a: 'Trois factures sont en attente, pour 6 820 € au total :',
    t: [['M. Garnier · F-0312', '2 340 €'], ['Mme Lefèvre · F-0315', '3 500 €'], ['SCI Les Tilleuls · F-0309', '980 €']],
    end: 'La plus ancienne date de 41 jours. Vous voulez que Bob prépare une relance ?',
  },
  {
    q: 'Quel chantier m’a le moins rapporté cette année ?',
    tool: 'brix.rentabilite_chantiers',
    a: 'La rénovation Roux : 11 % de marge, contre 27 % en moyenne sur vos chantiers. Les achats ont dépassé le devis de 1 240 €, surtout sur le carrelage.',
  },
  {
    q: 'Qui est sur quel chantier demain ?',
    tool: 'brix.planning_equipe',
    a: 'Voici le planning de demain :',
    t: [['Mehdi et Lucas', 'Leroy · salle de bain'], ['Thomas', 'SCI Les Tilleuls · reprise'], ['Vous', 'Métré chez M. Petit · 9 h']],
  },
  {
    q: 'Combien de devis signés ce trimestre, et pour quel montant ?',
    tool: 'brix.devis_signes',
    a: '14 devis signés depuis le 1er octobre, pour 48 300 € HT. Votre taux de signature est de 61 %, sur 23 devis envoyés.',
  },
];

export function initMcp() {
  const box = $('[data-chat-b]'), input = $('[data-chat-in]'), list = $('[data-asks]');
  if (!box || !list) return;
  list.innerHTML = QUESTIONS.map((c, i) => `<button class="qchip" aria-pressed="${i === 0}" data-q="${i}">${c.q}${ic('arrow-right')}</button>`).join('');
  const btns = $$('.qchip', list);
  const add = (cls, html) => { const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerHTML = html; box.appendChild(d); return d; };
  const answer = (c) => `<span class="tool">${ic('plug')}${c.tool}</span><div>${c.a}</div>${c.t ? `<table>${c.t.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>` : ''}${c.end ? `<div style="margin-top:8px">${c.end}</div>` : ''}`;
  let run = 0;

  async function ask(i) {
    const id = ++run, c = QUESTIONS[i];
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
    box.innerHTML = '';
    if (reduce) { add('u', c.q); add('a', answer(c)); return; }
    input.textContent = '';
    for (let k = 0; k <= c.q.length; k += 2) { if (id !== run) return; input.textContent = c.q.slice(0, k); await wait(26); }
    await wait(250);
    if (id !== run) return;
    input.textContent = 'Écrivez votre question…';
    gsap.from(add('u', c.q), { y: 14, opacity: 0, duration: 0.5, ease: 'expo.out' });
    await wait(380);
    const t = add('a', '<span class="typing"><i></i><i></i><i></i></span>');
    await wait(1100);
    if (id !== run) return;
    t.innerHTML = answer(c);
    gsap.from(t, { y: 14, opacity: 0, duration: 0.6, ease: 'expo.out' });
    if (c.t) gsap.from($$('tr', t), { x: -10, opacity: 0, duration: 0.4, stagger: 0.12, delay: 0.2 });
  }

  list.addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(+b.dataset.q); });
  if (reduce) ask(0); else onView(box, () => ask(0), 0.4);
}
