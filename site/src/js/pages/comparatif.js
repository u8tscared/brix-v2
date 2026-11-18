/* Comparatif : échelle du marché, matrice complète (colonne Brix qui s'allume au fil de la lecture),
   ce que Brix fait mieux, ce qu'il est seul à faire. */
import { boot, gsap, ScrollTrigger, reduce, $, $$, ic, esc } from '../core.js';
import { COMPETITORS, MATRIX } from '../../data/competitors.js';
import wordmark from '../../../partials/brix-wordmark.svg?raw';
import { pageHero } from '../subpage.js';

// pastilles colorées par domaine : chaque carte a la sienne
const TONES = ['v', 'm', 'p', 'g', 'b', 's'];

const BETTER = [
  { icon: 'audio-lines', t: 'Le devis par la voix, la photo, la vidéo ou le plan', d: "Ailleurs, l’IA s’arrête souvent à la dictée. Avec Brix, vous filmez la pièce, photographiez un croquis ou importez le plan de l’architecte, et le devis sort avec vos prix.", href: 'fonctionnalites.html#vendre' },
  { icon: 'file-check', t: 'La facture électronique incluse, même en gratuit', d: 'Factur-X, transmission par plateforme agréée et archivage 10 ans. Tout est natif et compris dans Start, sans module à acheter en plus.', href: 'fonctionnalites.html#facturer' },
  { icon: 'users', t: 'Une seule app, de 1 à 200 personnes', d: "Les modules s’allument selon votre métier et votre taille. Vous embauchez, le planning et le pointage apparaissent. Pas de migration, pas de nouveau logiciel.", href: 'fonctionnalites.html#equipe' },
  { icon: 'wallet', t: 'Être payé plus vite', d: 'Paiement en ligne et en plusieurs fois, Tap to Pay sur votre téléphone, relances automatiques. Le chantier fini devient un compte crédité.', href: 'fonctionnalites.html#facturer' },
  { icon: 'wifi-off', t: 'Pensé pour le téléphone, même sans réseau', d: 'Devis, cotes et photos se font sur place, dans la cave comme sur le toit. Tout se synchronise dès que le réseau revient.', href: 'fonctionnalites.html#chantiers' },
  { icon: 'receipt-euro', t: 'Un prix lisible, sans formation payante', d: 'Quatre offres affichées en clair. Pas de revendeur, pas de journée de formation facturée, pas de frais d’installation. L’import est offert.', href: 'tarifs.html' },
];
const ONLY = [
  { icon: 'plug-zap', t: 'Brix AI MCP', d: 'Parlez à votre entreprise depuis Claude, ChatGPT ou Le Chat. L’assistant lit vos chiffres Brix pour répondre. Lecture seule, coupure en un geste.', href: 'ia.html#mcp' },
  { icon: 'moon-star', t: 'Bob qui agit, et travaille la nuit', d: 'Bob ne fait pas que répondre : il prépare les relances et les devis pendant la nuit. Au réveil, vous validez en un geste.', href: 'ia.html' },
  { icon: 'sliders-horizontal', t: 'Le logiciel réglé sur votre métier', d: "Dites si vous êtes électricien, couvreur ou plaquiste, seul ou à vingt. Brix se configure tout seul et n’affiche que ce qui vous sert.", href: 'demarrer.html' },
  { icon: 'messages-square', t: 'Demandes de prix à plusieurs fournisseurs', d: 'Une demande part chez plusieurs négoces, les réponses arrivent ligne par ligne, vous gardez le meilleur prix et le meilleur délai. Vos fournisseurs répondent depuis leur portail.', href: 'fournisseurs.html' },
  { icon: 'globe', t: 'Site vitrine, avis et réseaux dans le même outil', d: 'Votre site, vos avis Google et vos publications avant/après se gèrent depuis Brix. Les demandes du site arrivent directement dans vos devis.', href: 'fonctionnalites.html#visibilite' },
];

/* ---------- Matrice ---------- */
const mark = (v) => (v === 'y' ? `<span class="y" title="Oui">${ic('check')}<span class="sr">Oui</span></span>`
  : v === 'p' ? `<span class="p" title="Partiel ou en option">${ic('minus')}<span class="sr">Partiel</span></span>`
    : v === 'n' ? `<span class="n" title="Non">${ic('x')}<span class="sr">Non</span></span>`
      : '<small class="q">à vérifier</small>');

function renderMatrix(t) {
  t.innerHTML = `
    <caption class="sr">Comparatif des fonctions de Brix et des principaux logiciels pour artisans</caption>
    <thead><tr><th scope="col" class="cp-fc"><span class="sr">Fonction</span></th><th scope="col" class="brix"><span class="sr">Brix</span><span class="logo" aria-hidden="true">${wordmark}</span></th>${COMPETITORS.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${MATRIX.map((r) => `<tr><th scope="row">${r.f}</th><td class="brix">${mark(r.brix)}${r.note ? `<small>${r.note}</small>` : ''}</td>${COMPETITORS.map((_, i) => `<td>${mark(r.v[i])}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

/* La colonne Brix s'allume ligne après ligne, au rythme de la lecture ; la ligne lue est soulignée. */
function initLane(t) {
  const rows = $$('tbody tr', t);
  if (reduce) { rows.forEach((r) => r.classList.add('lit')); return; }
  // les autres logiciels apparaissent en cascade à l'arrivée du tableau
  gsap.set($$('tbody td:not(.brix) > *', t), { opacity: 0, scale: 0.6 });
  ScrollTrigger.create({
    trigger: t, start: 'top 78%', once: true,
    onEnter: () => gsap.to($$('tbody td:not(.brix) > *', t), { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', stagger: { each: 0.008, grid: [rows.length, COMPETITORS.length], from: 'start', axis: 'y' } }),
  });
  let cur = -1;
  ScrollTrigger.create({
    trigger: $('tbody', t), start: 'top 72%', end: 'bottom 52%',
    onUpdate: (st) => {
      const n = Math.round(st.progress * rows.length);
      if (n === cur) return;
      cur = n;
      // une coche allumée le reste ; seule la ligne en cours de lecture suit le défilement
      rows.forEach((r, i) => { if (i < n) r.classList.add('lit'); r.classList.toggle('cur', i === n - 1 && n < rows.length); });
    },
    onLeave: () => rows.forEach((r) => { r.classList.add('lit'); r.classList.remove('cur'); }),
  });
}

const card = (c, i) => `
  <a class="cp-card" href="${c.href}">
    <div class="cp-card-top"><span class="cp-ic ic tone-${TONES[i % TONES.length]}">${ic(c.icon)}</span><span class="cp-n mono">${String(i + 1).padStart(2, '0')}</span></div>
    <h3>${c.t}</h3><p>${c.d}</p>
    <span class="cp-more">En savoir plus ${ic('arrow-right')}</span>
  </a>`;

const only = (c, i) => `
  <li><a class="cp-o" href="${c.href}">
    <span class="cp-n mono">${String(i + 1).padStart(2, '0')}</span>
    <span class="cp-ic ic tone-${['v', 'm', 'i', 'p', 's'][i % 5]}">${ic(c.icon)}</span>
    <span class="cp-o-t"><b>${c.t}</b><span>${c.d}</span></span>
    <span class="cp-o-go">${ic('arrow-up-right')}</span>
  </a></li>`;

/* En-têtes collants en verre : le tableau défile en largeur (overflow), position: sticky ne peut donc
   pas suivre la page en hauteur. On fait glisser la ligne d'en-tête sous la navigation. */
function stickyHead(wrap, t) {
  const head = $('thead', t), navbar = $('.navbar');
  let raf = 0;
  const upd = () => {
    raf = 0;
    const nb = navbar ? navbar.getBoundingClientRect().bottom : 0;
    const top = Math.max(10, nb + 10);
    const r = wrap.getBoundingClientRect();
    const d = Math.min(Math.max(top - r.top, 0), Math.max(0, r.height - head.offsetHeight - 70));
    t.style.setProperty('--hy', `${Math.round(d)}px`);
    t.classList.toggle('stuck', d > 0);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(upd); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  // la navigation se cache ou revient sans défilement : on suit sa transition
  if (navbar) { navbar.addEventListener('transitionrun', (e) => { if (e.propertyName !== 'transform') return; const end = performance.now() + 600; const follow = () => { upd(); if (performance.now() < end) requestAnimationFrame(follow); }; follow(); }); }
  upd();
}

boot(() => {
  pageHero();
  const t = $('[data-cmp]');
  renderMatrix(t);
  $('[data-better]').innerHTML = BETTER.map(card).join('');
  $('[data-only]').innerHTML = ONLY.map(only).join('');

  // indice de défilement : visible seulement si le tableau déborde ; ombre quand on a glissé
  const wrap = $('.cp-wrap'), hint = $('.cp-hint');
  const fit = () => { hint.classList.toggle('on', wrap.scrollWidth > wrap.clientWidth + 4); wrap.classList.toggle('scrolled', wrap.scrollLeft > 4); };
  fit(); addEventListener('resize', fit); wrap.addEventListener('scroll', fit, { passive: true });
  stickyHead(wrap, t);

  initLane(t);
  if (!reduce) {
    // les barres de l'échelle se tracent, Brix en dernier
    gsap.from($$('.cp-bar i'), { scaleX: 0, duration: 1.3, ease: 'expo.out', stagger: 0.2, delay: 0.45 });
    gsap.from('.cp-dot', { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(3)', delay: 1.5 });
    $$('[data-better], [data-only]').forEach((g) => {
      gsap.set(g.children, { opacity: 0, y: 20 });
      gsap.to(g.children, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, clearProps: 'transform', scrollTrigger: { trigger: g, start: 'top 84%', once: true } });
    });
  }
});
