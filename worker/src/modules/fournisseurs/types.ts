/** Types du module Fournisseurs (Achats). Montants en centimes HT. */

export type StatutDemande = 'brouillon' | 'envoyee' | 'reponses_partielles' | 'complete' | 'commandee' | 'annulee';

export type StatutDestinataire = 'a_envoyer' | 'envoyee' | 'vue' | 'repondue' | 'declinee' | 'expiree';

export type StatutCommande =
  | 'brouillon'
  | 'envoyee'
  | 'confirmee'
  | 'expediee'
  | 'livree_partiel'
  | 'livree'
  | 'facturee'
  | 'annulee';

export type ModeLivraison = 'livraison_chantier' | 'retrait_agence' | 'livraison_depot';

export type Acteur = 'artisan' | 'fournisseur' | 'systeme' | 'api';

export interface Fournisseur {
  id: string;
  organization_id: string;
  nom: string;
  enseigne: string | null;
  agence: string | null;
  contact_nom: string | null;
  email: string | null;
  telephone: string | null;
  siret: string | null;
  numero_compte_client: string | null;
  metiers: string; // JSON
  remise_pct: number | null;
  franco_cents: number | null;
  delai_jours: number | null;
  connecteur: string;
  favori: number;
  note: string | null;
  archive: number;
  created_at: number;
  updated_at: number;
}

export interface ArticleCatalogue {
  id: string;
  organization_id: string;
  fournisseur_id: string;
  reference: string;
  ean: string | null;
  ref_fabricant: string | null;
  marque: string | null;
  designation: string;
  designation_norm: string;
  famille: string | null;
  unite: string;
  conditionnement: number | null;
  prix_public_cents: number | null;
  prix_net_cents: number | null;
  eco_part_cents: number | null;
  source: string;
  maj_le: number;
}

export interface Demande {
  id: string;
  organization_id: string;
  numero: string;
  titre: string;
  devis_id: string | null;
  chantier_id: string | null;
  statut: StatutDemande;
  date_limite: number | null;
  livraison_souhaitee: number | null;
  adresse_livraison: string | null;
  message: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface LigneDemande {
  id: string;
  demande_id: string;
  position: number;
  designation: string;
  reference: string | null;
  quantite: number;
  unite: string;
  devis_ligne_id: string | null;
  prix_cible_cents: number | null;
}

export interface Destinataire {
  id: string;
  demande_id: string;
  fournisseur_id: string;
  token_hash: string;
  canal: string;
  statut: StatutDestinataire;
  envoye_le: number | null;
  vu_le: number | null;
  repondu_le: number | null;
  delai_livraison_jours: number | null;
  frais_port_cents: number | null;
  validite_jours: number | null;
  commentaire: string | null;
  expire_le: number;
}

export interface ReponseLigne {
  id: string;
  destinataire_id: string;
  ligne_id: string;
  prix_unitaire_cents: number | null;
  disponible: number;
  reference_proposee: string | null;
  designation_proposee: string | null;
  commentaire: string | null;
}

export interface Commande {
  id: string;
  organization_id: string;
  numero: string;
  fournisseur_id: string;
  demande_id: string | null;
  devis_id: string | null;
  chantier_id: string | null;
  statut: StatutCommande;
  canal: string;
  token_hash: string | null;
  total_ht_cents: number;
  frais_port_cents: number;
  livraison_prevue: number | null;
  adresse_livraison: string | null;
  mode_livraison: ModeLivraison;
  reference_fournisseur: string | null;
  suivi_transporteur: string | null;
  facture_fournisseur_id: string | null;
  message: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface LigneCommande {
  id: string;
  commande_id: string;
  position: number;
  designation: string;
  reference: string | null;
  ean: string | null;
  quantite: number;
  quantite_livree: number;
  unite: string;
  prix_unitaire_cents: number;
  devis_ligne_id: string | null;
}

export interface Evenement {
  id: string;
  organization_id: string;
  objet: 'demande' | 'commande' | 'connexion';
  objet_id: string;
  type: string;
  acteur: Acteur;
  detail: string | null;
  created_at: number;
}

/** Ligne de devis telle que fournie par le module devis (thread app). */
export interface DevisLigneSource {
  id: string;
  devis_id: string;
  position: number;
  kind: 'ouvrage' | 'fourniture' | 'main_oeuvre' | 'section';
  designation: string;
  quantity: number;
  unit: string | null;
  unit_price_ht: number | null; // euros
  unit_cost_ht: number | null; // euros
  vat_rate: number | null;
  supplier_ref: string | null;
}
