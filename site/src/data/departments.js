/*
 * Référentiel des fonctionnalités affichées sur le site.
 * Aligné sur les départements de l'app (onboarding + menu) : Vendre, Facturer et encaisser,
 * Chantiers, Équipe, Achats, Bob, Outils métier, Visibilité.
 *
 * plan : offre minimale qui inclut la fonction ('start' | 'pro' | 'equipe' | 'entreprise')
 * tag  : 'new' (nouveau dans Brix V2) | 'only' (introuvable chez les concurrents audités) | 'soon' (en préparation)
 */

export const PLANS = {
  start: 'Start',
  pro: 'Pro',
  equipe: 'Équipe',
  entreprise: 'Entreprise',
};

export const DEPARTMENTS = [
  {
    id: 'vendre',
    name: 'Vendre',
    icon: 'handshake',
    color: '#6d28d9',
    title: 'Le devis dicté,',
    accent: 'signé avant de repartir.',
    pitch: 'De la première demande au bon pour accord. Brix capte vos demandes, écrit vos devis à la voix et les fait signer sur place.',
    features: [
      { name: 'Devis dicté', icon: 'mic', plan: 'start', tag: 'new', desc: 'Décrivez les travaux à voix haute, Bob écrit les lignes avec vos prix.' },
      { name: 'Devis depuis une photo ou une vidéo', icon: 'video', plan: 'pro', tag: 'only', desc: 'Filmez la pièce 30 secondes, Bob repère les postes et propose le devis.' },
      { name: 'Bibliothèque de 50 000 ouvrages', icon: 'library', plan: 'start', desc: 'Des prix à jour par corps de métier, que vous ajustez à vos tarifs.' },
      { name: 'Signature électronique', icon: 'pen-line', plan: 'start', desc: 'Le client signe sur votre téléphone ou reçoit un lien par e-mail et SMS.' },
      { name: 'Aides à la rénovation dans le devis', icon: 'badge-euro', plan: 'pro', tag: 'only', desc: "MaPrimeRénov’ et CEE calculées : le client voit tout de suite son reste à charge." },
      { name: 'Demandes entrantes', icon: 'inbox', plan: 'start', desc: 'Formulaire du site, appels, e-mails et plateformes arrivent dans une seule boîte.' },
      { name: 'Clients et historique', icon: 'contact', plan: 'start', desc: 'Fiche client avec chantiers, devis, factures, photos et échanges.' },
      { name: 'Rendez-vous en ligne', icon: 'calendar-check', plan: 'pro', desc: 'Vos clients réservent une visite dans vos créneaux libres.' },
      { name: 'Probabilité de signature', icon: 'gauge', plan: 'pro', tag: 'new', desc: 'Chaque devis reçoit un score, Brix vous dit lesquels relancer en premier.' },
      { name: 'Avis clients', icon: 'star', plan: 'pro', desc: 'Demande d’avis Google envoyée au bon moment, après la réception du chantier.' },
    ],
  },
  {
    id: 'facturer',
    name: 'Facturer et encaisser',
    icon: 'receipt-euro',
    color: '#d946ef',
    title: 'La facture part,',
    accent: "l’argent arrive.",
    pitch: 'Acomptes, situations, factures électroniques, relances et paiements. Tout ce qui sépare un chantier fini d’un compte crédité.',
    features: [
      { name: 'Factures, acomptes et situations', icon: 'file-text', plan: 'start', desc: 'Le devis signé devient facture d’acompte, de situation ou de solde en un geste.' },
      { name: 'Facture électronique conforme', icon: 'shield-check', plan: 'start', desc: 'Factur-X, transmission par plateforme agréée et archivage 10 ans. Même en gratuit.' },
      { name: 'Retenue de garantie et autoliquidation', icon: 'scale', plan: 'pro', desc: 'Les règles du BTP sont appliquées toutes seules, sans calcul à la main.' },
      { name: 'Paiement en ligne et en plusieurs fois', icon: 'credit-card', plan: 'pro', desc: 'Carte, virement instantané ou 3 et 4 fois pour vos clients.' },
      { name: 'Tap to Pay sur le téléphone', icon: 'smartphone-nfc', plan: 'pro', tag: 'new', desc: 'Encaissez une carte sans contact sur le chantier, sans terminal.' },
      { name: 'Relances et impayés', icon: 'bell-ring', plan: 'pro', desc: 'Relances polies à J+7 et J+15, puis mise en demeure prête à envoyer.' },
      { name: 'Trésorerie et banque', icon: 'landmark', plan: 'pro', desc: 'Comptes synchronisés, paiements rapprochés, trésorerie prévue à 90 jours.' },
      { name: 'Notes de frais', icon: 'receipt', plan: 'pro', desc: 'Photographiez le ticket, il est lu, classé et rattaché au bon chantier.' },
      { name: 'Export comptable', icon: 'file-spreadsheet', plan: 'start', desc: 'Pennylane, Sage, Cegid, EBP, Quadra : votre comptable reçoit tout.' },
    ],
  },
  {
    id: 'chantiers',
    name: 'Chantiers',
    icon: 'hard-hat',
    color: '#fb923c',
    title: 'Chaque chantier,',
    accent: 'sa vraie marge.',
    pitch: 'Photos, cotes, planning, rapports et PV de réception. Le chantier se suit depuis le téléphone, le bureau voit tout en direct.',
    features: [
      { name: 'Suivi de chantier', icon: 'clipboard-list', plan: 'start', desc: 'Étapes, documents, notes et photos, rangés par chantier.' },
      { name: 'Rentabilité en direct', icon: 'trending-up', plan: 'pro', desc: 'Heures, achats et sous-traitance mis à jour : la marge réelle, pas une estimation.' },
      { name: 'Prise de cotes', icon: 'ruler', plan: 'start', desc: 'Dessinez la pièce sur place, surfaces et linéaires passent dans le devis.' },
      { name: 'Métré par scan LiDAR', icon: 'scan-line', plan: 'pro', tag: 'only', desc: "Faites le tour de la pièce avec l’iPhone, le plan coté sort tout seul." },
      { name: 'Métré depuis un plan PDF', icon: 'map', plan: 'pro', tag: 'new', desc: "Importez le plan de l’architecte, Bob mesure surfaces et linéaires." },
      { name: 'Planning des chantiers', icon: 'calendar-range', plan: 'equipe', desc: 'Glissez les chantiers sur les équipes, chacun voit sa semaine sur son téléphone.' },
      { name: 'Photos et rapports', icon: 'camera', plan: 'start', desc: 'Photos datées et géolocalisées, rapport de fin de journée envoyé au client.' },
      { name: 'PV de réception', icon: 'clipboard-check', plan: 'pro', desc: 'Réserves photographiées, signature du client, levée de réserves suivie.' },
      { name: 'SAV et entretien', icon: 'wrench', plan: 'pro', desc: 'Contrats d’entretien, interventions récurrentes et rappels automatiques.' },
    ],
  },
  {
    id: 'equipe',
    name: 'Équipe',
    icon: 'users',
    color: '#818cf8',
    title: 'Le planning fait,',
    accent: 'les heures comptées.',
    pitch: 'Du premier apprenti à 200 compagnons. Rôles, pointage, congés, habilitations et variables de paie au même endroit.',
    features: [
      { name: 'Équipe et rôles', icon: 'user-cog', plan: 'pro', desc: 'Chacun voit ses chantiers, rien de plus. Vous gardez la main sur les prix.' },
      { name: 'Pointage sur le chantier', icon: 'timer', plan: 'equipe', desc: 'Arrivée et départ en un tap, heures imputées au bon chantier.' },
      { name: 'Congés et absences', icon: 'plane', plan: 'equipe', desc: 'Demande depuis le téléphone, validation en un geste, planning mis à jour.' },
      { name: 'Habilitations et cartes BTP', icon: 'id-card', plan: 'equipe', desc: 'Dates d’expiration suivies, alerte avant qu’une habilitation tombe.' },
      { name: 'Variables de paie', icon: 'wallet', plan: 'equipe', desc: 'Heures, paniers, trajets et primes envoyés à votre cabinet chaque mois.' },
      { name: 'Fiches de paie et DSN', icon: 'file-badge', plan: 'equipe', tag: 'soon', desc: 'Bulletins conformes à la convention du BTP, sans logiciel de paie à part.' },
      { name: 'Sous-traitants', icon: 'briefcase', plan: 'equipe', desc: 'Contrats, attestations URSSAF et factures de vos sous-traitants suivis.' },
    ],
  },
  {
    id: 'achats',
    name: 'Achats',
    icon: 'package',
    color: '#16a34a',
    title: 'Le devis signé,',
    accent: 'le matériel commandé.',
    pitch: 'Compatible avec tous vos fournisseurs. Demandez des prix à plusieurs négoces en un clic, comparez, commandez, suivez la livraison.',
    features: [
      { name: 'Demandes de prix', icon: 'messages-square', plan: 'pro', tag: 'only', desc: 'Une demande envoyée à plusieurs fournisseurs, comparatif ligne par ligne, meilleur prix et délai.' },
      { name: 'Commandes depuis le devis', icon: 'shopping-cart', plan: 'pro', tag: 'new', desc: 'La liste de matériel du devis signé devient un bon de commande.' },
      { name: 'Suivi des livraisons', icon: 'truck', plan: 'pro', desc: 'Confirmée, expédiée, livrée. Livraisons partielles comprises.' },
      { name: 'Catalogue et prix fournisseurs', icon: 'tags', plan: 'pro', desc: 'Import de vos tarifs CSV et FAB-DIS, historique et alerte de hausse.' },
      { name: 'Rapprochement des factures fournisseurs', icon: 'git-compare', plan: 'pro', desc: 'La facture reçue est comparée à la commande. Les écarts sautent aux yeux.' },
      { name: 'Stocks', icon: 'warehouse', plan: 'equipe', desc: 'Dépôt et camionnettes, sorties imputées au chantier, réassort proposé.' },
      { name: 'Véhicules et outillage', icon: 'car', plan: 'equipe', desc: 'Qui a quoi, entretiens, contrôles techniques et assurances.' },
      { name: 'Connexions directes aux grands négoces', icon: 'plug', plan: 'pro', tag: 'soon', desc: 'Prix nets et commande en direct chez vos fournisseurs habituels. En cours.' },
    ],
  },
  {
    id: 'bob',
    name: 'Bob',
    icon: 'headset',
    color: '#c026d3',
    title: 'Posez la question,',
    accent: 'Bob lit vos chiffres.',
    pitch: 'Bob est votre bras droit. Il écrit, relance, répond au téléphone, prépare la journée, et travaille même la nuit.',
    features: [
      { name: 'Assistant Bob', icon: 'message-circle', plan: 'pro', desc: '« Combien me doit Mme Leroy ? » Bob répond avec vos vrais chiffres.' },
      { name: 'Brief du matin', icon: 'sunrise', plan: 'pro', tag: 'new', desc: 'Chaque matin : chantiers du jour, devis à relancer, paiements reçus.' },
      { name: 'Agent de nuit', icon: 'moon-star', plan: 'equipe', tag: 'only', desc: 'Bob prépare les relances et les devis la nuit. Vous validez en un geste au réveil.' },
      { name: 'Secrétaire téléphonique', icon: 'phone-incoming', plan: 'equipe', tag: 'new', desc: "Bob répond aux appels manqués, qualifie la demande et prend rendez-vous." },
      { name: 'Dictée dans votre langue', icon: 'languages', plan: 'pro', desc: 'Dictez en portugais, en arabe ou en turc. Le devis sort en français.' },
      { name: 'Brix AI MCP', icon: 'plug-zap', plan: 'equipe', tag: 'only', desc: 'Parlez à votre entreprise depuis Claude ou ChatGPT. Lecture seule, coupure en un geste.' },
    ],
  },
  {
    id: 'metier',
    name: 'Outils métier',
    icon: 'drafting-compass',
    color: '#0ea5e9',
    title: 'Votre métier,',
    accent: 'ses propres outils.',
    pitch: 'Brix sait que vous êtes électricien, plombier ou couvreur. Calculs, contrôles et documents propres à chaque corps d’état.',
    features: [
      { name: 'Électricien', icon: 'zap', plan: 'pro', desc: 'Sections de câbles, schéma unifilaire, attestation Consuel préparée.' },
      { name: 'Plombier-chauffagiste', icon: 'flame', plan: 'pro', desc: 'Bilan thermique simplifié, dimensionnement PAC, attestation d’entretien.' },
      { name: 'Peintre et plaquiste', icon: 'paint-roller', plan: 'pro', desc: 'Surfaces déduites des ouvertures, rendements et nombre de pots.' },
      { name: 'Carreleur', icon: 'grid-3x3', plan: 'pro', desc: 'Calepinage, chutes et nombre de cartons au bon format.' },
      { name: 'Couvreur', icon: 'house', plan: 'pro', desc: 'Pentes, surfaces de toiture et liteaux calculés depuis les cotes.' },
      { name: 'Menuisier et cuisiniste', icon: 'door-open', plan: 'pro', desc: 'Fiches de débit, plans de pose et options présentées au client.' },
      { name: 'Maçon et paysagiste', icon: 'brick-wall', plan: 'pro', desc: 'Volumes de béton, terrassement, métrés de clôtures et dallages.' },
      { name: 'Climaticien et serrurier', icon: 'fan', plan: 'pro', desc: 'Fluides frigorigènes tracés, interventions d’urgence tarifées.' },
    ],
  },
  {
    id: 'visibilite',
    name: 'Visibilité',
    icon: 'globe',
    color: '#f43f5e',
    title: 'Des clients',
    accent: 'qui vous trouvent.',
    pitch: 'Un site vitrine prêt en dix minutes, vos réalisations sur les réseaux et un espace client qui rassure.',
    features: [
      { name: 'Site vitrine', icon: 'monitor-smartphone', plan: 'pro', desc: 'Votre site avec vos photos de chantiers, formulaire de demande branché sur Brix.' },
      { name: 'Réseaux sociaux', icon: 'share-2', plan: 'pro', desc: 'Un avant/après devient une publication Instagram et Facebook en un geste.' },
      { name: 'Portail client', icon: 'layout-dashboard', plan: 'pro', desc: 'Le client suit son chantier, ses documents et ses paiements en ligne.' },
      { name: 'Fiche Google', icon: 'map-pin', plan: 'pro', desc: 'Avis, horaires et photos tenus à jour depuis Brix.' },
    ],
  },
];

export const FEATURE_COUNT = DEPARTMENTS.reduce((n, d) => n + d.features.length, 0);

export const TRADES = [
  { id: 'electricien', name: 'Électricien', icon: 'zap' },
  { id: 'plombier', name: 'Plombier-chauffagiste', icon: 'flame' },
  { id: 'peintre', name: 'Peintre', icon: 'paint-roller' },
  { id: 'plaquiste', name: 'Plaquiste', icon: 'layers' },
  { id: 'carreleur', name: 'Carreleur', icon: 'grid-3x3' },
  { id: 'menuisier', name: 'Menuisier', icon: 'door-open' },
  { id: 'couvreur', name: 'Couvreur', icon: 'house' },
  { id: 'macon', name: 'Maçon', icon: 'brick-wall' },
  { id: 'paysagiste', name: 'Paysagiste', icon: 'trees' },
  { id: 'climaticien', name: 'Climaticien', icon: 'fan' },
  { id: 'serrurier', name: 'Serrurier', icon: 'key-round' },
  { id: 'cuisiniste', name: 'Cuisiniste', icon: 'cooking-pot' },
  { id: 'renovation', name: 'Rénovation tous corps', icon: 'hammer' },
];

export const SIZES = [
  { id: 'solo', name: 'Seul', hint: 'Auto-entrepreneur ou artisan seul', plan: 'pro' },
  { id: '2-9', name: '2 à 9', hint: 'Une petite équipe', plan: 'equipe' },
  { id: '10-49', name: '10 à 49', hint: 'Plusieurs équipes sur le terrain', plan: 'equipe' },
  { id: '50+', name: '50 et plus', hint: 'Agences, conducteurs de travaux', plan: 'entreprise' },
];

/* URL de l'app (HashRouter). Remplacer par l'URL de prod au déploiement. */
export const APP_URL = (import.meta.env && import.meta.env.VITE_APP_URL) || '/app';
export const signupUrl = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return `${APP_URL}/#/inscription${q ? `?${q}` : ''}`;
};
export const demoUrl = () => `${APP_URL}/#/demo`;
