/**
 * Registre des connecteurs fournisseurs (les « extensions » affichées dans Achats › Connecteurs).
 *
 * Chaque connecteur dit honnêtement son état :
 *  - « disponible » : fonctionne aujourd'hui sans rien demander à personne ;
 *  - « sur_accord » : techniquement prêt côté Brix, mais l'accès réel dépend d'un accord ou
 *    d'identifiants fournis par le fournisseur (API privée, EDI, punchout) ;
 *  - « bientot » : prévu, pas encore construit.
 */

export type Capacite = 'demande_prix' | 'commande' | 'suivi' | 'catalogue' | 'prix_nets' | 'factures' | 'disponibilite';
export type EtatConnecteur = 'disponible' | 'sur_accord' | 'bientot';
export type Mode = 'email_portail' | 'api_brix' | 'edi' | 'fichier' | 'api_fournisseur' | 'punchout';

export interface ConnecteurDef {
  cle: string;
  nom: string;
  description: string;
  mode: Mode;
  etat: EtatConnecteur;
  capacites: Capacite[];
  metiers: string[];
  /** Ce que l'artisan doit fournir pour activer (champs du formulaire de connexion). */
  champs: { cle: string; libelle: string; secret?: boolean; aide?: string }[];
  /** Ce qui manque pour passer en réel (affiché tel quel, pour ne rien promettre de faux). */
  condition_reelle?: string;
}

const GENERIQUES: ConnecteurDef[] = [
  {
    cle: 'email',
    nom: 'E-mail + Portail fournisseur Brix',
    description:
      "Marche avec tous les fournisseurs, dès aujourd'hui. Brix envoie la demande ou la commande par e-mail avec un lien sécurisé : le fournisseur répond, confirme ou indique l'expédition depuis son téléphone, sans compte ni installation.",
    mode: 'email_portail',
    etat: 'disponible',
    capacites: ['demande_prix', 'commande', 'suivi'],
    metiers: [],
    champs: [{ cle: 'email', libelle: 'Adresse e-mail du comptoir ou du commercial' }],
  },
  {
    cle: 'api_brix',
    nom: 'API Brix Fournisseurs',
    description:
      "Pour les fournisseurs qui ont un service informatique : ils reçoivent demandes et commandes par webhook et répondent par API (prix, confirmation, expédition, tarifs). Documentation OpenAPI publique.",
    mode: 'api_brix',
    etat: 'disponible',
    capacites: ['demande_prix', 'commande', 'suivi', 'catalogue', 'prix_nets', 'factures'],
    metiers: [],
    champs: [],
  },
  {
    cle: 'fichier_tarif',
    nom: 'Import de tarifs (CSV, FAB-DIS)',
    description:
      'Importez le fichier de prix nets envoyé par votre commercial (Excel enregistré en CSV). Brix reconnaît les colonnes tout seul, garde l\'historique et vous alerte quand un prix augmente.',
    mode: 'fichier',
    etat: 'disponible',
    capacites: ['catalogue', 'prix_nets'],
    metiers: [],
    champs: [],
  },
  {
    cle: 'edi',
    nom: 'EDI (EDIFACT ORDERS)',
    description:
      'Brix génère vos bons de commande au format EDI standard du négoce (EANCOM ORDERS). Joint aux e-mails dès maintenant ; transmission automatique une fois le canal EDI ouvert avec le fournisseur.',
    mode: 'edi',
    etat: 'sur_accord',
    capacites: ['commande'],
    metiers: [],
    champs: [
      { cle: 'gln_fournisseur', libelle: 'Code GLN du fournisseur', aide: 'Fourni par le service EDI du fournisseur' },
      { cle: 'gln_client', libelle: 'Votre code GLN (si attribué)' },
    ],
    condition_reelle: 'Accord EDI avec le fournisseur (identifiants GLN, canal AS2/SFTP, recette).',
  },
  {
    cle: 'factures_pdp',
    nom: 'Factures fournisseurs (facture électronique)',
    description:
      "Les factures de vos fournisseurs arrivent dans Brix via la plateforme de facturation électronique et sont rapprochées automatiquement de la commande et du bon de livraison.",
    mode: 'api_fournisseur',
    etat: 'sur_accord',
    capacites: ['factures'],
    metiers: [],
    champs: [],
    condition_reelle: 'Branchement à la plateforme agréée (PA) déjà utilisée par Brix pour la facture électronique.',
  },
];

/** Grandes enseignes du négoce : compte pro à relier. Prix nets et commande directe = sur accord. */
const ENSEIGNES: { cle: string; nom: string; metiers: string[]; desc: string }[] = [
  { cle: 'point_p', nom: 'Point.P', metiers: ['gros_oeuvre', 'maconnerie', 'couverture', 'plomberie'], desc: 'Matériaux, gros œuvre, menuiserie, sanitaire.' },
  { cle: 'cedeo', nom: 'Cedeo', metiers: ['plomberie', 'chauffage', 'sanitaire'], desc: 'Sanitaire, chauffage, plomberie.' },
  { cle: 'rexel', nom: 'Rexel', metiers: ['electricite'], desc: 'Matériel électrique.' },
  { cle: 'sonepar', nom: 'Sonepar', metiers: ['electricite'], desc: 'Matériel électrique.' },
  { cle: 'yesss', nom: 'Yesss Électrique', metiers: ['electricite'], desc: 'Matériel électrique.' },
  { cle: 'leroy_merlin_pro', nom: 'Leroy Merlin Pro', metiers: [], desc: 'Grande surface bricolage, comptes pros.' },
  { cle: 'gedimat', nom: 'Gedimat', metiers: ['gros_oeuvre', 'maconnerie', 'menuiserie'], desc: 'Négoce matériaux indépendant.' },
  { cle: 'bigmat', nom: 'BigMat', metiers: ['gros_oeuvre', 'maconnerie'], desc: 'Négoce matériaux.' },
  { cle: 'chausson', nom: 'Chausson Matériaux', metiers: ['gros_oeuvre', 'couverture'], desc: 'Négoce matériaux.' },
  { cle: 'richardson', nom: 'Richardson', metiers: ['plomberie', 'chauffage'], desc: 'Sanitaire, chauffage.' },
  { cle: 'brossette', nom: 'Brossette', metiers: ['plomberie', 'chauffage'], desc: 'Sanitaire, chauffage.' },
  { cle: 'wurth', nom: 'Würth', metiers: [], desc: 'Fixation, outillage, consommables.' },
  { cle: 'prolians', nom: 'Prolians', metiers: [], desc: 'Fournitures industrielles et BTP.' },
  { cle: 'descours_cabaud', nom: 'Descours & Cabaud', metiers: [], desc: 'Quincaillerie, outillage, EPI.' },
];

const PAR_ENSEIGNE: ConnecteurDef[] = ENSEIGNES.map((e) => ({
  cle: e.cle,
  nom: e.nom,
  description: `${e.desc} Dès aujourd'hui : demandes de prix et commandes par e-mail au comptoir de votre agence, import de vos prix nets. Connexion directe au compte pro (prix nets en temps réel, commande en un clic, suivi de livraison) dès l'ouverture de l'accès partenaire.`,
  mode: 'api_fournisseur',
  etat: 'sur_accord',
  capacites: ['demande_prix', 'commande', 'suivi', 'catalogue', 'prix_nets', 'disponibilite'],
  metiers: e.metiers,
  champs: [
    { cle: 'agence', libelle: 'Votre agence' },
    { cle: 'numero_compte_client', libelle: 'Votre numéro de compte client' },
    { cle: 'email', libelle: 'E-mail du comptoir' },
  ],
  condition_reelle: `Accès partenaire à l'API ou au catalogue de ${e.nom} (convention à signer). En attendant, le connecteur utilise l'e-mail et le portail fournisseur.`,
}));

export const CONNECTEURS: ConnecteurDef[] = [...GENERIQUES, ...PAR_ENSEIGNE];

export function connecteur(cle: string): ConnecteurDef | undefined {
  return CONNECTEURS.find((c) => c.cle === cle);
}

/** Canal effectivement utilisé aujourd'hui pour envoyer une demande ou une commande. */
export function canalEffectif(cle: string): 'email' | 'api_brix' {
  return cle === 'api_brix' ? 'api_brix' : 'email';
}
