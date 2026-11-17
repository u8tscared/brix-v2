// Types côté app de l'espace Achats. Montants en euros HT (comme le reste de l'app).
// Ils reprennent les tables du worker (worker/src/modules/fournisseurs/schema.sql) ; le worker stocke des centimes.

export type StatutDemande = 'brouillon' | 'envoyee' | 'reponses_partielles' | 'complete' | 'commandee' | 'annulee';
export type StatutDestinataire = 'a_envoyer' | 'envoyee' | 'vue' | 'repondue' | 'declinee';
export type StatutCommande = 'brouillon' | 'envoyee' | 'confirmee' | 'expediee' | 'livree_partiel' | 'livree' | 'facturee' | 'annulee';
export type ModeLivraison = 'livraison_chantier' | 'retrait_agence' | 'livraison_depot';

export interface Fournisseur {
  id: string;
  nom: string;
  enseigne?: string; // clé du registre de connecteurs (rexel, cedeo…)
  agence?: string;
  contact?: string;
  email?: string;
  telephone?: string;
  numeroCompte?: string;
  metiers: string[];
  franco?: number;
  delaiJours?: number;
  connecteur: string; // email | api_brix | <enseigne>
  partenaire?: string; // nom du partenaire API relié
  favori?: boolean;
}

export interface LigneDemande {
  id: string;
  designation: string;
  reference?: string;
  quantite: number;
  unite: string;
  prixCible?: number; // coût prévu au devis
  devisLigneId?: string;
}

/** Disponibilité annoncée par le fournisseur pour une ligne. */
export type Dispo = 'stock' | 'delai' | 'equivalent';

export interface PrixReponse {
  ligneId: string;
  prix: number | null; // null = indisponible ; prix net, remise déduite
  referenceProposee?: string;
  designationProposee?: string;
  dispo?: Dispo;
  dispoJours?: number; // si dispo = 'delai'
}

/** Pièce jointe déposée par le fournisseur (en démo : nom et taille seulement). */
export interface PieceJointe {
  nom: string;
  taille: number; // octets
}

export interface Destinataire {
  id: string;
  fournisseurId: string;
  token: string; // en démo seulement : le serveur ne garde que le hash
  statut: StatutDestinataire;
  envoyeLe?: string;
  vuLe?: string;
  reponduLe?: string;
  delaiJours?: number;
  port?: number;
  commentaire?: string;
  remise?: number; // remise globale annoncée (%), déjà déduite des prix
  conditions?: string; // conditions de paiement
  validiteJours?: number; // validité de l'offre
  pieceJointe?: PieceJointe;
  prix: PrixReponse[];
}

export interface Evenement {
  at: string; // ISO
  texte: string;
  acteur: 'artisan' | 'fournisseur' | 'systeme' | 'api';
}

export interface Demande {
  id: string;
  numero: string;
  titre: string;
  devisId?: string;
  chantierId?: string;
  statut: StatutDemande;
  dateLimite?: string;
  livraisonSouhaitee?: string;
  adresse?: string;
  message?: string;
  createdAt: string;
  lignes: LigneDemande[];
  destinataires: Destinataire[];
  journal: Evenement[];
}

export interface LigneCommande {
  id: string;
  designation: string;
  reference?: string;
  quantite: number;
  quantiteLivree: number;
  unite: string;
  prix: number;
}

export interface Commande {
  id: string;
  numero: string;
  fournisseurId: string;
  demandeId?: string;
  devisId?: string;
  chantierId?: string;
  statut: StatutCommande;
  token?: string;
  port: number;
  livraisonPrevue?: string;
  adresse?: string;
  mode: ModeLivraison;
  referenceFournisseur?: string;
  suivi?: string;
  factureId?: string;
  ecartFacture?: number;
  message?: string;
  prepareeLe?: string; // le fournisseur a indiqué que la commande est prête
  proposition?: { texte: string; at: string; livraison?: string }; // modification proposée par le fournisseur
  createdAt: string;
  lignes: LigneCommande[];
  journal: Evenement[];
}

export interface Article {
  id: string;
  fournisseurId: string;
  reference: string;
  ean?: string;
  marque?: string;
  designation: string;
  famille?: string;
  unite: string;
  prixPublic?: number;
  prixNet: number;
  source: 'import' | 'reponse' | 'api' | 'manuel';
  majLe: string;
  historique: { le: string; prix: number }[];
}

export interface JetonIA {
  id: string;
  nom: string;
  prefixe: string;
  createdAt: string;
  derniereUtilisation?: string;
  appels: number;
}
