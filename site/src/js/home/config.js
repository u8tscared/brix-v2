/* « Votre Brix, taillé pour votre métier » : l'aperçu de l'app se recompose selon le métier et la taille. */
import { gsap, reduce, $, $$, ic, esc } from '../core.js';
import { DEPARTMENTS, TRADES, SIZES } from '../../data/departments.js';

const TOOLS = {
  electricien: ['Sections de câbles', [['Cuisine Lefèvre · 32 A', '6 mm²'], ['Attestation Consuel', 'Prête']]],
  plombier: ['Dimensionnement PAC', [['Maison Garnier · 110 m²', '8 kW'], ['Attestations d’entretien', '4 à envoyer']]],
  peintre: ['Surfaces et pots', [['Séjour Petit · murs', '46,8 m²'], ['Peinture acrylique', '7 pots']]],
  plaquiste: ['Métré de cloisons', [['Plateau bureaux · BA13', '182 m²'], ['Rails et montants', '96 ml']]],
  carreleur: ['Calepinage', [['Salle de bain · 60×60', '14 m²'], ['Cartons, chutes comprises', '11']]],
  menuisier: ['Fiches de débit', [['Bibliothèque chêne', '23 pièces'], ['Panneaux 19 mm', '4']]],
  couvreur: ['Pentes et liteaux', [['Toiture Martin · 35 %', '128 m²'], ['Liteaux 27×40', '640 ml']]],
  macon: ['Volumes de béton', [['Dalle garage 6×4 m', '3,6 m³'], ['Treillis soudé', '28 m²']]],
  paysagiste: ['Métré de dallages', [['Terrasse Roux', '38 m²'], ['Bordures', '26 ml']]],
  climaticien: ['Registre des fluides', [['R32 · M. Blanc', '1,2 kg'], ['Contrôles d’étanchéité', '3 ce mois']]],
  serrurier: ['Urgences tarifées', [['Ouverture de porte · nuit', '189,00 €'], ['Interventions du jour', '5']]],
  cuisiniste: ['Plans de pose', [['Cuisine Durand · 3,40 m', 'Validé'], ['Options présentées', '3']]],
  renovation: ['Outils tous corps', [['Rénovation T3 Lefèvre', '6 lots'], ['Sous-traitants à relancer', '2']]],
};
const NAMES = { electricien: 'Karim', plombier: 'Julien', peintre: 'Sofia', plaquiste: 'Mehdi', carreleur: 'Thomas', menuisier: 'Claire', couvreur: 'Antoine', macon: 'Paulo', paysagiste: 'Inès', climaticien: 'David', serrurier: 'Kevin', cuisiniste: 'Laura', renovation: 'Nadia' };
const PRICE = { solo: ['Pro', '29,99 € HT par mois'], '2-9': ['Équipe', '69 € HT par mois, 5 personnes incluses'], '10-49': ['Équipe', '69 € HT puis 9 € par personne en plus'], '50+': ['Entreprise', 'Sur devis, interlocuteur dédié'] };

const w = (h, icon, body, cls = '') => `<div class="wg ${cls}"><h3>${ic(icon)}${h}</h3>${body}</div>`;
const rows = (r) => r.map(([a, b]) => `<div class="row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('');

function widgets(trade, size) {
  const [toolName, toolRows] = TOOLS[trade];
  const team = size !== 'solo';
  const out = [
    w('À encaisser', 'wallet', `<div class="big num">${team ? '48 260' : '6 820'} €</div>${rows([['dont en retard', team ? '4 150 €' : '980 €']])}`, 'ink'),
    w('Devis à relancer', 'bell-ring', rows(team ? [['SCI Les Tilleuls', '18 400 €'], ['Mme Lefèvre', '4 260 €']] : [['Mme Lefèvre', '4 260 €'], ['M. Garnier', '1 905 €']])),
    w(`Outil métier · ${toolName}`, TRADES.find((t) => t.id === trade).icon, rows(toolRows), 'wide'),
  ];
  if (!team) out.push(w('Chantiers de la semaine', 'hard-hat', rows([['Lun. · Cuisine Lefèvre', 'Jour 3/5'], ['Jeu. · Dépannage Roux', '2 h']]), 'wide'));
  if (team) {
    const av = ['#c4b5fd', '#fde68a', '#fbcfe8', '#bbf7d0', '#bae6fd'].map((c, i) => `<span style="background:${c}">${['KB', 'MO', 'LS', 'JT', 'AR'][i]}</span>`).join('');
    out.push(w('Planning de l’équipe', 'calendar-range', `<div class="team">${av}</div><div class="bars">${[60, 85, 70, 95, 40].map((h) => `<i style="height:${h}%"></i>`).join('')}</div>`));
    out.push(w(size === '2-9' ? 'Achats en cours' : 'Pointage du jour', size === '2-9' ? 'truck' : 'timer', rows(size === '2-9' ? [['Commande matériel', 'Livrée'], ['Demande de prix', '3 réponses']] : [['Présents', '18 / 21'], ['Heures imputées', '142 h']])));
  }
  if (size === '50+') out.push(w('Agences', 'building-2', rows([['Lyon · 42 personnes', '312 k€'], ['Grenoble · 19 personnes', '148 k€'], ['Validations en attente', '6']]), 'wide'));
  return out.join('');
}

export function initConfig() {
  const root = $('#sur-mesure');
  if (!root) return;
  const state = { trade: 'electricien', size: 'solo' };
  const tradesEl = $('[data-trades]', root), sizesEl = $('[data-sizes]', root);
  tradesEl.innerHTML = TRADES.map((t) => `<button type="button" class="chip" role="radio" aria-checked="${t.id === state.trade}" tabindex="${t.id === state.trade ? 0 : -1}" data-t="${t.id}">${ic(t.icon)}${t.name}</button>`).join('');
  sizesEl.innerHTML = SIZES.map((s) => `<button type="button" role="radio" aria-checked="${s.id === state.size}" tabindex="${s.id === state.size ? 0 : -1}" data-s="${s.id}">${s.name}<small>${s.id === 'solo' ? '1 personne' : 'personnes'}</small></button>`).join('');

  const side = $('[data-cfg-side]', root), grid = $('[data-cfg-widgets]', root);
  side.innerHTML = DEPARTMENTS.map((d, i) => `<li data-d="${d.id}" class="${i === 0 ? 'cur' : ''}"><span class="d" style="background:${d.color}">${ic(d.icon)}</span><span>${d.name}</span><em></em></li>`).join('');

  const date = new Date(Date.now() + 864e5).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('[data-cfg-date]', root).textContent = date.charAt(0).toUpperCase() + date.slice(1);

  function render(first) {
    const team = state.size !== 'solo';
    $$('li', side).forEach((li) => {
      const off = li.dataset.d === 'equipe' && !team;
      li.classList.toggle('off', off);
      li.querySelector('em').textContent = off ? 'masqué' : '';
    });
    const trade = TRADES.find((t) => t.id === state.trade), size = SIZES.find((s) => s.id === state.size);
    $('[data-cfg-hello]', root).textContent = `Bonjour ${NAMES[state.trade]}`;
    $('[data-cfg-trade]', root).textContent = `${trade.name} · ${size.name === 'Seul' ? 'Seul' : `${size.name} personnes`}`;
    const [plan, price] = PRICE[state.size];
    $('[data-cfg-plan]', root).textContent = `Brix ${plan}`;
    $('[data-cfg-price]', root).textContent = price;
    $('[data-cfg-cta]', root).href = `demarrer.html?metier=${state.trade}&taille=${state.size}`;
    const html = widgets(state.trade, state.size);
    if (first || reduce) { grid.innerHTML = html; return; }
    gsap.to(grid.children, {
      opacity: 0, y: -8, duration: 0.18, stagger: 0.02, ease: 'power2.in',
      onComplete: () => { grid.innerHTML = html; gsap.from(grid.children, { opacity: 0, y: 16, scale: 0.98, duration: 0.6, stagger: 0.06, ease: 'expo.out' }); },
    });
  }
  const pick = (el, attr, key) => el.addEventListener('click', (e) => {
    const b = e.target.closest(`[${attr}]`);
    if (!b) return;
    state[key] = b.getAttribute(attr);
    $$(`[${attr}]`, el).forEach((x) => { x.setAttribute('aria-checked', x === b); x.tabIndex = x === b ? 0 : -1; });
    render();
  });
  pick(tradesEl, 'data-t', 'trade');
  pick(sizesEl, 'data-s', 'size');
  // flèches du clavier dans les groupes radio
  [tradesEl, sizesEl].forEach((g) => g.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('button', g), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    n.focus(); n.click();
  }));
  render(true);
}
