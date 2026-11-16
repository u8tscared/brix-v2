// Référentiel produit de Brix V2 : départements, modules, métiers, tailles et offres.
// C'est la source unique utilisée par l'onboarding, le menu, la bibliothèque
// d'outils et la page tarifs (le site dans site/ s'aligne dessus).

import type { CompanySize, TradeKey } from './types';

export type DepartmentKey = 'vendre' | 'facturer' | 'chantiers' | 'equipe' | 'achats' | 'bob' | 'metier' | 'visibilite' | 'gestion';

export interface Department {
  key: DepartmentKey;
  name: string;
  tagline: string;
  icon: string; // nom d'icône Lucide
}

export const DEPARTMENTS: Department[] = [
  { key: 'vendre', name: 'Vendre', tagline: 'Des demandes aux devis signés', icon: 'Handshake' },
  { key: 'facturer', name: 'Facturer et encaisser', tagline: 'Être payé vite, sans relancer', icon: 'Wallet' },
  { key: 'chantiers', name: 'Chantiers', tagline: 'Planifier, suivre, livrer', icon: 'HardHat' },
  { key: 'equipe', name: 'Équipe', tagline: 'Heures, congés, paie', icon: 'Users' },
  { key: 'achats', name: 'Achats', tagline: 'Fournisseurs, stock, matériel', icon: 'Truck' },
  { key: 'bob', name: 'Bob', tagline: "L'assistant qui travaille pour vous", icon: 'AudioLines' },
  { key: 'metier', name: 'Outils métier', tagline: 'Les calculs de votre métier', icon: 'Ruler' },
  { key: 'visibilite', name: 'Visibilité', tagline: 'Être trouvé et recommandé', icon: 'Sparkles' },
  { key: 'gestion', name: 'Gestion', tagline: 'Compta, documents, réglages', icon: 'Landmark' },
];

export type ModuleKey =
  | 'leads' | 'devis' | 'clients' | 'rdv' | 'avis'
  | 'factures' | 'efacture' | 'paiements' | 'relances' | 'tresorerie' | 'frais'
  | 'chantiers' | 'planning' | 'cotes' | 'photos' | 'pv' | 'sav'
  | 'equipe' | 'pointage' | 'conges' | 'habilitations' | 'paie'
  | 'fournisseurs' | 'stocks' | 'vehicules' | 'soustraitants'
  | 'bob' | 'brief' | 'agent_nuit' | 'secretaire' | 'mcp'
  | 'outils_metier'
  | 'site' | 'reseaux' | 'portail'
  | 'compta' | 'documents';

export type Plan = 'start' | 'pro' | 'equipe' | 'entreprise';

export interface ModuleDef {
  key: ModuleKey;
  dept: DepartmentKey;
  name: string;
  short: string; // une phrase très simple, pour un artisan
  icon: string;
  path: string; // route dans /app
  plan: Plan; // offre minimale
  core?: boolean; // toujours actif
  minSize?: CompanySize; // utile à partir de cette taille
  trades?: TradeKey[]; // recommandé surtout pour ces métiers
  priorities?: PriorityKey[];
  isNew?: boolean;
}

export const MODULES: ModuleDef[] = [
  // Vendre
  { key: 'leads', dept: 'vendre', name: 'Demandes', short: 'Toutes les demandes de clients au même endroit, triées par Bob.', icon: 'Inbox', path: 'demandes', plan: 'start', priorities: ['clients'] },
  { key: 'devis', dept: 'vendre', name: 'Devis', short: 'Un devis pro en 2 minutes, à la voix ou au clavier.', icon: 'FileText', path: 'devis', plan: 'start', core: true },
  { key: 'clients', dept: 'vendre', name: 'Clients', short: 'Le carnet de vos clients avec tout leur historique.', icon: 'Contact', path: 'clients', plan: 'start', core: true },
  { key: 'rdv', dept: 'vendre', name: 'Rendez-vous en ligne', short: 'Vos clients réservent une visite tout seuls.', icon: 'CalendarCheck', path: 'rendez-vous', plan: 'pro', priorities: ['clients'], isNew: true },
  { key: 'avis', dept: 'vendre', name: 'Avis clients', short: 'Demander un avis Google à la fin du chantier.', icon: 'Star', path: 'avis', plan: 'pro', priorities: ['clients'], isNew: true },
  // Facturer
  { key: 'factures', dept: 'facturer', name: 'Factures', short: 'Factures, acomptes et situations en un geste.', icon: 'Receipt', path: 'factures', plan: 'start', core: true },
  { key: 'efacture', dept: 'facturer', name: 'Facture électronique', short: "Prêt pour l'obligation 2026-2027, sans rien faire.", icon: 'ShieldCheck', path: 'facture-electronique', plan: 'start', core: true, isNew: true },
  { key: 'paiements', dept: 'facturer', name: 'Paiements', short: 'Lien de paiement, carte sur le téléphone, 3 fois sans frais.', icon: 'CreditCard', path: 'paiements', plan: 'pro', priorities: ['argent'] },
  { key: 'relances', dept: 'facturer', name: 'Relances', short: 'Bob relance les retards à votre place, poliment.', icon: 'BellRing', path: 'relances', plan: 'pro', priorities: ['argent'] },
  { key: 'tresorerie', dept: 'facturer', name: 'Trésorerie', short: 'Votre banque reliée et votre argent à 90 jours.', icon: 'Landmark', path: 'tresorerie', plan: 'pro', priorities: ['argent', 'admin'] },
  { key: 'frais', dept: 'facturer', name: 'Notes de frais', short: 'Une photo du ticket, Bob fait le reste.', icon: 'ScanLine', path: 'notes-de-frais', plan: 'pro', minSize: 'petite', priorities: ['admin'] },
  // Chantiers
  { key: 'chantiers', dept: 'chantiers', name: 'Chantiers', short: 'Avancement, marge et photos de chaque chantier.', icon: 'HardHat', path: 'chantiers', plan: 'start', core: true },
  { key: 'planning', dept: 'chantiers', name: 'Planning', short: 'Qui fait quoi, où et quand. Avec la météo.', icon: 'CalendarRange', path: 'planning', plan: 'pro', minSize: 'petite', priorities: ['organisation'] },
  { key: 'cotes', dept: 'chantiers', name: 'Prise de cotes', short: 'Mesurer pièce par pièce, ça remplit le devis.', icon: 'Ruler', path: 'prise-de-cotes', plan: 'pro', priorities: ['devis_rapides'] },
  { key: 'photos', dept: 'chantiers', name: 'Photos et rapports', short: 'Photos rangées seules, rapport envoyé au client.', icon: 'Camera', path: 'photos', plan: 'start', priorities: ['organisation'] },
  { key: 'pv', dept: 'chantiers', name: 'PV de réception', short: 'Signé sur place, sur le téléphone.', icon: 'ClipboardCheck', path: 'pv-reception', plan: 'pro' },
  { key: 'sav', dept: 'chantiers', name: 'SAV et entretien', short: 'Contrats d\'entretien et rappels annuels.', icon: 'Wrench', path: 'sav', plan: 'pro', trades: ['plombier', 'climaticien', 'electricien', 'serrurier'] },
  // Équipe
  { key: 'equipe', dept: 'equipe', name: 'Équipe', short: 'Inviter, donner un rôle, voir qui est où.', icon: 'Users', path: 'equipe', plan: 'equipe', minSize: 'petite', priorities: ['equipe'] },
  { key: 'pointage', dept: 'equipe', name: 'Pointage', short: 'Arrivée et départ en un appui, géolocalisés.', icon: 'Timer', path: 'pointage', plan: 'equipe', minSize: 'petite', priorities: ['equipe'] },
  { key: 'conges', dept: 'equipe', name: 'Congés et absences', short: 'Demandes et validations sans papier.', icon: 'Palmtree', path: 'conges', plan: 'equipe', minSize: 'petite', priorities: ['equipe'] },
  { key: 'habilitations', dept: 'equipe', name: 'Habilitations', short: 'CACES, électriques : alerte avant expiration.', icon: 'BadgeCheck', path: 'habilitations', plan: 'equipe', minSize: 'petite', isNew: true },
  { key: 'paie', dept: 'equipe', name: 'Paie', short: 'Bulletins de paie BTP préparés depuis les heures.', icon: 'FileSpreadsheet', path: 'paie', plan: 'equipe', minSize: 'petite', priorities: ['equipe', 'admin'], isNew: true },
  // Achats
  { key: 'fournisseurs', dept: 'achats', name: 'Fournisseurs', short: 'Demandes de prix et commandes depuis le devis.', icon: 'Truck', path: 'fournisseurs', plan: 'pro', priorities: ['achats'], isNew: true },
  { key: 'stocks', dept: 'achats', name: 'Stock', short: 'Ce qu\'il reste au dépôt et dans les camions.', icon: 'Boxes', path: 'stock', plan: 'pro', minSize: 'petite', priorities: ['achats'] },
  { key: 'vehicules', dept: 'achats', name: 'Véhicules et outillage', short: 'Entretiens, contrôles, prêts d\'outils.', icon: 'Car', path: 'vehicules', plan: 'equipe', minSize: 'petite' },
  { key: 'soustraitants', dept: 'achats', name: 'Sous-traitants', short: 'Contrats, attestations URSSAF, autoliquidation.', icon: 'Building2', path: 'sous-traitants', plan: 'equipe', minSize: 'petite' },
  // Bob
  { key: 'bob', dept: 'bob', name: 'Bob', short: 'Parlez-lui, il fait. Devis, relances, planning.', icon: 'AudioLines', path: 'bob', plan: 'start', core: true },
  { key: 'brief', dept: 'bob', name: 'Brief du matin', short: "Ce qui compte aujourd'hui, en 1 minute.", icon: 'Sunrise', path: 'bob/brief', plan: 'pro' },
  { key: 'agent_nuit', dept: 'bob', name: 'Agent de nuit', short: 'Bob relance et prépare pendant que vous dormez.', icon: 'MoonStar', path: 'bob/nuit', plan: 'equipe', isNew: true },
  { key: 'secretaire', dept: 'bob', name: 'Secrétaire téléphonique', short: 'Bob répond aux appels manqués pendant le chantier.', icon: 'PhoneCall', path: 'bob/secretaire', plan: 'equipe', priorities: ['clients'], isNew: true },
  { key: 'mcp', dept: 'bob', name: 'Brix AI MCP', short: 'Pilotez Brix depuis Claude ou ChatGPT.', icon: 'Plug', path: 'bob/mcp', plan: 'equipe', isNew: true },
  // Métier
  { key: 'outils_metier', dept: 'metier', name: 'Outils métier', short: 'Les calculs et contrôles de votre métier.', icon: 'Calculator', path: 'outils', plan: 'start', core: true },
  // Visibilité
  { key: 'site', dept: 'visibilite', name: 'Site vitrine', short: 'Votre site créé en 1 minute, relié à Brix.', icon: 'Globe', path: 'site', plan: 'pro', priorities: ['clients'] },
  { key: 'reseaux', dept: 'visibilite', name: 'Réseaux sociaux', short: 'Vos avant/après publiés tout seuls.', icon: 'Share2', path: 'reseaux', plan: 'pro' },
  { key: 'portail', dept: 'visibilite', name: 'Portail client', short: 'Votre client suit son chantier et paie en ligne.', icon: 'MonitorSmartphone', path: 'portail', plan: 'pro', isNew: true },
  // Gestion
  { key: 'compta', dept: 'gestion', name: 'Comptabilité', short: 'Export pour le comptable, ou synchro Pennylane.', icon: 'Calculator', path: 'compta', plan: 'pro', priorities: ['admin'] },
  { key: 'documents', dept: 'gestion', name: 'Documents', short: 'Décennale, Kbis, attestations, toujours à jour.', icon: 'FolderLock', path: 'documents', plan: 'start' },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<ModuleKey, ModuleDef>;

export interface TradeTool {
  key: string;
  name: string;
  short: string;
  icon: string;
}

export interface TradeDef {
  key: TradeKey;
  name: string;
  plural: string;
  icon: string;
  tools: TradeTool[];
  vatHint: string;
}

export const TRADES: TradeDef[] = [
  { key: 'electricien', name: 'Électricien', plural: 'Électriciens', icon: 'Zap', vatHint: '10 % en rénovation', tools: [
    { key: 'section-cable', name: 'Section de câble', short: 'Section et chute de tension', icon: 'Cable' },
    { key: 'nfc15100', name: 'NF C 15-100', short: 'Prises et circuits pièce par pièce', icon: 'ShieldCheck' },
    { key: 'tableau', name: 'Tableau électrique', short: 'Schéma depuis le devis', icon: 'LayoutGrid' },
    { key: 'irve', name: 'Borne IRVE', short: 'Puissance et protection', icon: 'PlugZap' },
  ] },
  { key: 'plombier', name: 'Plombier-chauffagiste', plural: 'Plombiers', icon: 'Droplets', vatHint: '10 % ou 5,5 % (PAC)', tools: [
    { key: 'evacuation', name: 'Évacuations', short: 'Diamètres et pentes', icon: 'Waves' },
    { key: 'bilan-thermique', name: 'Bilan thermique', short: 'Puissance chaudière ou PAC', icon: 'Flame' },
    { key: 'ballon', name: 'Ballon d\'eau chaude', short: 'Volume selon le foyer', icon: 'Container' },
  ] },
  { key: 'peintre', name: 'Peintre', plural: 'Peintres', icon: 'PaintRoller', vatHint: '10 % en rénovation', tools: [
    { key: 'peinture', name: 'Surfaces et litres', short: 'Murs, plafonds, couches', icon: 'PaintBucket' },
  ] },
  { key: 'carreleur', name: 'Carreleur', plural: 'Carreleurs', icon: 'Grid3x3', vatHint: '10 % en rénovation', tools: [
    { key: 'calepinage', name: 'Calepinage', short: 'Carreaux, chutes, colle, joints', icon: 'Grid3x3' },
  ] },
  { key: 'plaquiste', name: 'Plaquiste', plural: 'Plaquistes', icon: 'PanelsTopLeft', vatHint: '10 % en rénovation', tools: [
    { key: 'cloison', name: 'Cloisons', short: 'Plaques, rails, montants, vis', icon: 'PanelsTopLeft' },
  ] },
  { key: 'menuisier', name: 'Menuisier', plural: 'Menuisiers', icon: 'DoorOpen', vatHint: '5,5 % si performance énergétique', tools: [
    { key: 'menuiserie', name: 'Fenêtres et portes', short: 'Cotes tableau et Uw', icon: 'DoorOpen' },
  ] },
  { key: 'couvreur', name: 'Couvreur', plural: 'Couvreurs', icon: 'House', vatHint: '10 % en rénovation', tools: [
    { key: 'toiture', name: 'Surface de toiture', short: 'Pente, tuiles, liteaux', icon: 'Triangle' },
  ] },
  { key: 'macon', name: 'Maçon', plural: 'Maçons', icon: 'BrickWall', vatHint: '10 % ou 20 % (neuf)', tools: [
    { key: 'beton', name: 'Béton', short: 'Volume, sacs, ferraillage', icon: 'Cylinder' },
  ] },
  { key: 'paysagiste', name: 'Paysagiste', plural: 'Paysagistes', icon: 'Trees', vatHint: '20 % (10 % entretien)', tools: [
    { key: 'gazon', name: 'Gazon et terre', short: 'Surfaces, volumes, sacs', icon: 'Sprout' },
  ] },
  { key: 'climaticien', name: 'Climaticien', plural: 'Climaticiens', icon: 'AirVent', vatHint: '10 % ou 5,5 % (PAC)', tools: [
    { key: 'clim', name: 'Puissance clim', short: 'kW par pièce', icon: 'AirVent' },
    { key: 'bilan-thermique', name: 'Bilan thermique', short: 'Puissance PAC', icon: 'Flame' },
  ] },
  { key: 'serrurier', name: 'Serrurier', plural: 'Serruriers', icon: 'KeyRound', vatHint: '10 % en rénovation', tools: [
    { key: 'express', name: 'Devis express', short: 'Devis et facture sur place', icon: 'Zap' },
  ] },
  { key: 'cuisiniste', name: 'Cuisiniste, salle de bain', plural: 'Cuisinistes', icon: 'CookingPot', vatHint: '10 % en rénovation', tools: [
    { key: 'calepinage', name: 'Calepinage', short: 'Faïence et sol', icon: 'Grid3x3' },
    { key: 'peinture', name: 'Surfaces', short: 'Murs et plafonds', icon: 'PaintBucket' },
  ] },
  { key: 'renovation', name: 'Rénovation tous corps d\'état', plural: 'Entreprises générales', icon: 'Hammer', vatHint: '10 % ou 5,5 %', tools: [
    { key: 'peinture', name: 'Surfaces et litres', short: 'Murs, plafonds', icon: 'PaintBucket' },
    { key: 'cloison', name: 'Cloisons', short: 'Plaques et rails', icon: 'PanelsTopLeft' },
    { key: 'beton', name: 'Béton', short: 'Volumes', icon: 'Cylinder' },
    { key: 'calepinage', name: 'Calepinage', short: 'Carrelage', icon: 'Grid3x3' },
  ] },
  { key: 'autre', name: 'Autre métier', plural: 'Artisans', icon: 'Wrench', vatHint: 'Selon les travaux', tools: [
    { key: 'peinture', name: 'Surfaces', short: 'Murs et plafonds', icon: 'PaintBucket' },
  ] },
];

export const TRADE_BY_KEY = Object.fromEntries(TRADES.map((t) => [t.key, t])) as Record<TradeKey, TradeDef>;

export interface SizeDef {
  key: CompanySize;
  name: string;
  range: string;
  mode: 'Solo' | 'Équipe' | 'Entreprise';
  hint: string;
}

export const SIZES: SizeDef[] = [
  { key: 'solo', name: 'Je travaille seul', range: '1 personne', mode: 'Solo', hint: 'Auto-entrepreneur ou artisan seul. Brix reste léger : pas de planning d\'équipe ni de validations.' },
  { key: 'petite', name: 'Petite équipe', range: '2 à 9 personnes', mode: 'Équipe', hint: 'Planning, pointage et congés pour vos compagnons et apprentis.' },
  { key: 'pme', name: 'PME', range: '10 à 49 personnes', mode: 'Équipe', hint: 'Conducteurs de travaux, chefs d\'équipe, paie et sous-traitants.' },
  { key: 'grande', name: 'Grande entreprise', range: '50 personnes et plus', mode: 'Entreprise', hint: 'Agences, validations, droits fins, SSO et API.' },
];

export type PriorityKey = 'devis_rapides' | 'argent' | 'organisation' | 'equipe' | 'clients' | 'admin' | 'achats';

export const PRIORITIES: { key: PriorityKey; label: string; icon: string }[] = [
  { key: 'devis_rapides', label: 'Faire mes devis plus vite', icon: 'Zap' },
  { key: 'argent', label: 'Être payé plus vite', icon: 'Wallet' },
  { key: 'organisation', label: 'Mieux organiser mes chantiers', icon: 'CalendarRange' },
  { key: 'equipe', label: 'Gérer mon équipe', icon: 'Users' },
  { key: 'clients', label: 'Trouver plus de clients', icon: 'Megaphone' },
  { key: 'admin', label: 'Moins de paperasse', icon: 'FolderCheck' },
  { key: 'achats', label: 'Mieux acheter mon matériel', icon: 'Truck' },
];

const SIZE_ORDER: CompanySize[] = ['solo', 'petite', 'pme', 'grande'];
export const sizeAtLeast = (size: CompanySize, min?: CompanySize) => !min || SIZE_ORDER.indexOf(size) >= SIZE_ORDER.indexOf(min);

/** Pack de départ proposé à l'onboarding : modules cochés d'office. */
export function recommendModules(trade: TradeKey, size: CompanySize, priorities: PriorityKey[]): ModuleKey[] {
  const keys = new Set<ModuleKey>();
  for (const m of MODULES) {
    if (m.core) keys.add(m.key);
    else if (!sizeAtLeast(size, m.minSize)) continue;
    else if (m.priorities?.some((p) => priorities.includes(p))) keys.add(m.key);
    else if (m.trades?.includes(trade)) keys.add(m.key);
  }
  // Toujours utiles dès qu'on n'est plus seul
  if (size !== 'solo') ['planning', 'equipe', 'pointage'].forEach((k) => keys.add(k as ModuleKey));
  if (size === 'pme' || size === 'grande') ['conges', 'paie', 'habilitations', 'soustraitants'].forEach((k) => keys.add(k as ModuleKey));
  keys.add('photos');
  keys.add('relances');
  keys.add('brief');
  return [...keys];
}

export interface Offer {
  key: Plan;
  name: string;
  price: number | null; // HT / mois
  unit: string;
  pitch: string;
  includes: string[];
  highlight?: boolean;
}

export const OFFERS: Offer[] = [
  { key: 'start', name: 'Start', price: 0, unit: 'pour toujours', pitch: 'Pour démarrer seul', includes: ['5 devis et 5 factures par mois', 'Facture électronique incluse', 'Outils métier', 'Bob : 20 demandes par mois'] },
  { key: 'pro', name: 'Pro', price: 29.99, unit: 'HT / mois', pitch: 'Pour l\'artisan qui tourne', includes: ['Devis et factures illimités', 'Paiements, relances, trésorerie', 'Prise de cotes, SAV, portail client', 'Bob : 500 demandes par mois'], highlight: true },
  { key: 'equipe', name: 'Équipe', price: 69, unit: 'HT / mois, 5 utilisateurs', pitch: 'Pour l\'entreprise qui grandit', includes: ['Tout Pro, plus planning et pointage', 'Congés, habilitations et paie', 'Bob illimité et agent de nuit', 'Brix AI MCP inclus', '9 € par utilisateur en plus'] },
  { key: 'entreprise', name: 'Entreprise', price: null, unit: 'sur devis', pitch: 'À partir de 50 personnes', includes: ['Agences et tableaux de bord', 'Validations et droits fins', 'SSO Google et Microsoft', 'API et accompagnement dédié'] },
];

export const PLAN_ORDER: Plan[] = ['start', 'pro', 'equipe', 'entreprise'];
export const planIncludes = (current: Plan, required: Plan) => PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);

export const ROLE_LABEL: Record<string, string> = {
  patron: 'Gérant',
  conducteur: 'Conducteur de travaux',
  chef_equipe: "Chef d'équipe",
  ouvrier: 'Compagnon',
  secretaire: 'Secrétaire',
  comptable: 'Comptable',
  apprenti: 'Apprenti',
};
