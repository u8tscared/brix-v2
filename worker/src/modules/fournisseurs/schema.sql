-- ============================================================================
-- Module Fournisseurs (Achats) — Brix V2
-- Toutes les tables sont préfixées « fournisseurs_ » et cloisonnées par organization_id.
-- Montants en centimes HT (INTEGER) pour éviter les erreurs d'arrondi.
-- Dates en millisecondes epoch (INTEGER).
-- ============================================================================

-- Annuaire des fournisseurs de l'entreprise (Point.P de Lyon 7, Cedeo Villeurbanne…)
CREATE TABLE IF NOT EXISTS fournisseurs_annuaire (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  enseigne TEXT,                     -- clé d'enseigne connue (point_p, cedeo, rexel…) ou NULL
  agence TEXT,                       -- « Lyon 7 – Gerland »
  contact_nom TEXT,
  email TEXT,                        -- adresse qui reçoit les demandes de prix
  telephone TEXT,
  siret TEXT,
  numero_compte_client TEXT,         -- n° de compte de l'artisan chez ce fournisseur
  metiers TEXT NOT NULL DEFAULT '[]',-- JSON : ["plomberie","chauffage"]
  remise_pct REAL,                   -- remise négociée générale (info)
  franco_cents INTEGER,              -- montant franco de port
  delai_jours INTEGER,               -- délai habituel
  connecteur TEXT NOT NULL DEFAULT 'email', -- email | api_brix | edi | catalogue | <enseigne>
  favori INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  archive INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_annuaire_org ON fournisseurs_annuaire(organization_id, archive);

-- Catalogue de prix (tarifs importés, réponses aux demandes, saisies manuelles)
CREATE TABLE IF NOT EXISTS fournisseurs_catalogue (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  fournisseur_id TEXT NOT NULL,
  reference TEXT NOT NULL,           -- référence fournisseur
  ean TEXT,
  ref_fabricant TEXT,
  marque TEXT,
  designation TEXT NOT NULL,
  designation_norm TEXT NOT NULL,    -- minuscules sans accents, pour la recherche
  famille TEXT,
  unite TEXT NOT NULL DEFAULT 'u',
  conditionnement REAL,
  prix_public_cents INTEGER,
  prix_net_cents INTEGER,            -- prix net artisan HT
  eco_part_cents INTEGER,
  source TEXT NOT NULL DEFAULT 'manuel', -- manuel | import_csv | fabdis | reponse_demande | api
  maj_le INTEGER NOT NULL,
  UNIQUE (organization_id, fournisseur_id, reference)
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_catalogue_org ON fournisseurs_catalogue(organization_id, designation_norm);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_catalogue_ean ON fournisseurs_catalogue(organization_id, ean);

-- Historique des prix (alimenté à chaque changement de prix net)
CREATE TABLE IF NOT EXISTS fournisseurs_prix_historique (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  catalogue_id TEXT NOT NULL,
  prix_net_cents INTEGER NOT NULL,
  releve_le INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_prix_hist ON fournisseurs_prix_historique(catalogue_id, releve_le);

-- Demandes de prix (consultations envoyées à un ou plusieurs fournisseurs)
CREATE TABLE IF NOT EXISTS fournisseurs_demandes (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  numero TEXT NOT NULL,              -- DP-2026-0001
  titre TEXT NOT NULL,
  devis_id TEXT,
  chantier_id TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | envoyee | reponses_partielles | complete | commandee | annulee
  date_limite INTEGER,               -- réponse attendue avant
  livraison_souhaitee INTEGER,
  adresse_livraison TEXT,
  message TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (organization_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_demandes_org ON fournisseurs_demandes(organization_id, statut);

CREATE TABLE IF NOT EXISTS fournisseurs_demandes_lignes (
  id TEXT PRIMARY KEY NOT NULL,
  demande_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  designation TEXT NOT NULL,
  reference TEXT,
  quantite REAL NOT NULL,
  unite TEXT NOT NULL DEFAULT 'u',
  devis_ligne_id TEXT,
  prix_cible_cents INTEGER           -- coût prévu dans le devis (unit_cost_ht)
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_dl_demande ON fournisseurs_demandes_lignes(demande_id);

-- Un destinataire = un fournisseur consulté pour une demande (avec son lien portail)
CREATE TABLE IF NOT EXISTS fournisseurs_demandes_destinataires (
  id TEXT PRIMARY KEY NOT NULL,
  demande_id TEXT NOT NULL,
  fournisseur_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,   -- SHA-256 du jeton du lien portail
  canal TEXT NOT NULL DEFAULT 'email',
  statut TEXT NOT NULL DEFAULT 'a_envoyer', -- a_envoyer | envoyee | vue | repondue | declinee | expiree
  envoye_le INTEGER,
  vu_le INTEGER,
  repondu_le INTEGER,
  delai_livraison_jours INTEGER,
  frais_port_cents INTEGER,
  validite_jours INTEGER,
  commentaire TEXT,
  expire_le INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_dd_demande ON fournisseurs_demandes_destinataires(demande_id);

-- Liens envoyés lors des e-mails précédents (relances) : restent valables jusqu'à l'expiration du destinataire
CREATE TABLE IF NOT EXISTS fournisseurs_jetons_anciens (
  token_hash TEXT PRIMARY KEY NOT NULL,
  destinataire_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fournisseurs_reponses_lignes (
  id TEXT PRIMARY KEY NOT NULL,
  destinataire_id TEXT NOT NULL,
  ligne_id TEXT NOT NULL,
  prix_unitaire_cents INTEGER,       -- NULL = non disponible
  disponible INTEGER NOT NULL DEFAULT 1,
  reference_proposee TEXT,
  designation_proposee TEXT,         -- équivalence proposée par le fournisseur
  commentaire TEXT,
  UNIQUE (destinataire_id, ligne_id)
);

-- Commandes fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs_commandes (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  numero TEXT NOT NULL,              -- BC-2026-0001
  fournisseur_id TEXT NOT NULL,
  demande_id TEXT,
  devis_id TEXT,
  chantier_id TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | envoyee | confirmee | expediee | livree_partiel | livree | facturee | annulee
  canal TEXT NOT NULL DEFAULT 'email',
  token_hash TEXT UNIQUE,            -- lien portail fournisseur pour confirmer / expédier
  total_ht_cents INTEGER NOT NULL DEFAULT 0,
  frais_port_cents INTEGER NOT NULL DEFAULT 0,
  livraison_prevue INTEGER,
  adresse_livraison TEXT,
  mode_livraison TEXT NOT NULL DEFAULT 'livraison_chantier', -- livraison_chantier | retrait_agence | livraison_depot
  reference_fournisseur TEXT,        -- n° de commande côté fournisseur (ARC)
  suivi_transporteur TEXT,
  facture_fournisseur_id TEXT,
  message TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (organization_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_commandes_org ON fournisseurs_commandes(organization_id, statut);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_commandes_chantier ON fournisseurs_commandes(organization_id, chantier_id);

CREATE TABLE IF NOT EXISTS fournisseurs_commandes_lignes (
  id TEXT PRIMARY KEY NOT NULL,
  commande_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  designation TEXT NOT NULL,
  reference TEXT,
  ean TEXT,
  quantite REAL NOT NULL,
  quantite_livree REAL NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'u',
  prix_unitaire_cents INTEGER NOT NULL DEFAULT 0,
  devis_ligne_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_cl_commande ON fournisseurs_commandes_lignes(commande_id);

-- Journal (fil d'activité d'une demande ou d'une commande)
CREATE TABLE IF NOT EXISTS fournisseurs_evenements (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  objet TEXT NOT NULL,               -- demande | commande | connexion
  objet_id TEXT NOT NULL,
  type TEXT NOT NULL,                -- creee, envoyee, vue, reponse, confirmee, expediee, livraison, …
  acteur TEXT NOT NULL,              -- artisan | fournisseur | systeme | api
  detail TEXT,                       -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_evenements_objet ON fournisseurs_evenements(objet, objet_id, created_at);

-- Connexions aux connecteurs (extensions) : identifiants chiffrés, état
CREATE TABLE IF NOT EXISTS fournisseurs_connexions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  connecteur TEXT NOT NULL,
  fournisseur_id TEXT,
  statut TEXT NOT NULL DEFAULT 'actif', -- actif | en_attente_accord | erreur | desactive
  config_chiffree TEXT,              -- AES-GCM (clé dérivée de JWT_SECRET) ; jamais renvoyée au front
  derniere_synchro INTEGER,
  derniere_erreur TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (organization_id, connecteur, fournisseur_id)
);
