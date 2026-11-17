/* Comparatif : échelle du marché, matrice complète, ce que Brix fait mieux, ce qu'il est seul à faire. */
import { boot, gsap, reduce, $, $$, ic } from '../core.js';
import { renderCompare, spotlight } from '../shared.js';

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
  { icon: 'moon-star', t: 'Bob qui agit, et travaille la nuit', d: 'Bob ne fait pas que répondre : il prépare les relances et les devis pendant la nuit. Au réveil, vous validez en un geste.', href: 'ia.html' },
  { icon: 'sliders-horizontal', t: 'Le logiciel réglé sur votre métier', d: "Dites si vous êtes électricien, couvreur ou plaquiste, seul ou à vingt. Brix se configure tout seul et n’affiche que ce qui vous sert.", href: 'demarrer.html' },
  { icon: 'messages-square', t: 'Demandes de prix à plusieurs fournisseurs', d: 'Une demande part chez plusieurs négoces, les réponses arrivent ligne par ligne, vous gardez le meilleur prix et le meilleur délai. Vos fournisseurs répondent depuis leur portail.', href: 'fournisseurs.html' },
  { icon: 'globe', t: 'Site vitrine, avis et réseaux dans le même outil', d: 'Votre site, vos avis Google et vos publications avant/après se gèrent depuis Brix. Les demandes du site arrivent directement dans vos devis.', href: 'fonctionnalites.html#visibilite' },
];

const card = (c, i, only) => `
  <a class="cp-card ${only ? 'dark' : ''}" href="${c.href}">
    <div class="cp-card-top"><span class="cp-ic">${ic(c.icon)}</span><span class="cp-n mono">${String(i + 1).padStart(2, '0')}</span></div>
    <h3>${c.t}</h3><p>${c.d}</p>
    <span class="link">En savoir plus ${ic('arrow-right')}</span>
  </a>`;

boot(() => {
  renderCompare($('[data-cmp]'));
  $('[data-better]').innerHTML = BETTER.map((c, i) => card(c, i)).join('');
  $('[data-only]').innerHTML = ONLY.map((c, i) => card(c, i, true)).join('');

  // indice de défilement : visible seulement si le tableau déborde
  const wrap = $('.cp-wrap'), hint = $('.cp-hint');
  const fit = () => hint.classList.toggle('on', wrap.scrollWidth > wrap.clientWidth + 4);
  fit(); addEventListener('resize', fit);

  if (!reduce) {
    // les barres de l'échelle se tracent
    gsap.from($$('.cp-bar i'), { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.18, delay: 0.3 });
    $$('.cp-grid').forEach((g) => {
      gsap.set(g.children, { opacity: 0, y: 34 });
      gsap.to(g.children, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, clearProps: 'transform', scrollTrigger: { trigger: g, start: 'top 82%', once: true } });
    });
  }
  spotlight('.cp-card');
});
