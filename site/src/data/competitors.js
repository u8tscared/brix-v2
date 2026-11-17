/*
 * Comparatif : repris de docs/audit-concurrents.md (premier jet du 16/11/2026, fil « Auditer les concurrents »).
 * y = oui, p = partiel ou en option, n = non, null = non vérifié (affiché « à vérifier »).
 * À mettre à jour avec la version sourcée de l'audit avant mise en ligne.
 */
export const COMPETITORS = ['Obat', 'Tolteck', 'Batappli', 'EBP Bâtiment', 'Sage Batigest', 'Extrabat', 'Graneet', 'Axonaut'];

export const MATRIX = [
  { f: 'Devis et factures BTP', v: ['y', 'y', 'y', 'y', 'y', 'y', 'y', 'p'], brix: 'y' },
  { f: 'Bibliothèque de prix', v: ['y', 'p', 'y', 'y', 'y', 'y', 'p', 'n'], brix: 'y', note: '50 000 ouvrages' },
  { f: 'Situations, acomptes, retenue de garantie', v: ['p', 'p', 'y', 'y', 'y', 'y', 'y', 'n'], brix: 'y' },
  { f: 'Signature électronique', v: ['y', 'y', 'p', 'p', 'p', 'y', null, 'y'], brix: 'y' },
  { f: 'Paiement en ligne', v: ['y', 'p', null, 'p', 'p', null, null, 'y'], brix: 'y' },
  { f: 'Planning d’équipe', v: ['p', 'n', 'y', 'y', 'y', 'y', 'y', 'n'], brix: 'y', key: true },
  { f: 'Pointage et heures', v: ['n', 'n', 'p', 'p', 'y', 'y', 'y', 'n'], brix: 'y' },
  { f: 'RH et variables de paie', v: ['n', 'n', 'n', 'p', 'p', 'n', 'n', 'n'], brix: 'y', key: true },
  { f: 'Rentabilité chantier', v: ['p', 'n', 'p', 'y', 'y', 'y', 'y', 'n'], brix: 'y', note: 'en temps réel' },
  { f: 'Commandes fournisseurs', v: ['p', 'n', 'p', 'y', 'y', 'y', 'y', 'p'], brix: 'y', key: true },
  { f: 'Stocks', v: ['n', 'n', 'n', 'y', 'y', 'p', 'n', 'n'], brix: 'y' },
  { f: 'Appli mobile complète', v: ['y', 'y', 'p', 'p', 'p', 'y', 'p', 'p'], brix: 'y', key: true },
  { f: 'Devis IA (voix, photo)', v: ['y', null, 'n', null, null, null, null, 'n'], brix: 'y', note: 'voix, photo, vidéo', key: true },
  { f: 'Assistant IA qui agit', v: ['n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'], brix: 'y', note: 'Bob', key: true },
  { f: 'Connecteur Claude et ChatGPT (MCP)', v: ['n', 'n', 'n', 'n', 'n', 'n', 'n', null], brix: 'y', note: 'Brix AI MCP', key: true },
  { f: 'Site vitrine, avis et réseaux', v: ['n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'], brix: 'y', key: true },
  { f: 'Réglage automatique par métier et taille', v: ['p', 'n', 'n', 'p', 'p', 'p', 'p', 'n'], brix: 'y', key: true },
];

/* Version courte pour l'accueil : les 4 concurrents les plus cités, lignes « clés » */
export const HOME_COLS = [0, 1, 2, 3];
