-- Module documents : liens publics (devis /d/, facture /f/, chantier /p/), compléments d'affichage,
-- journal des ouvertures et des actions du client. Horodatages en millisecondes (UTC).

-- Un lien = un jeton opaque. Le jeton n'est PAS stocké : il se recalcule à partir de l'id (HMAC).
CREATE TABLE IF NOT EXISTS documents_liens (
  id TEXT PRIMARY KEY,                 -- identifiant aléatoire (128 bits, base64url) inclus dans le jeton
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('devis', 'facture', 'chantier')),
  document_id TEXT NOT NULL,
  expire_le INTEGER NOT NULL,
  revoque_le INTEGER,
  cree_par TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_liens_doc ON documents_liens(organization_id, type, document_id);

-- Données d'affichage que le cœur ne porte pas (variantes, conditions, IBAN, hors établissement…).
CREATE TABLE IF NOT EXISTS documents_complements (
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  donnees TEXT NOT NULL DEFAULT '{}',  -- JSON, voir documents/vues.ts (Complements)
  version INTEGER NOT NULL DEFAULT 1,  -- incrémentée à chaque modification (figée dans le dossier de preuve)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (organization_id, type, document_id)
);

CREATE TABLE IF NOT EXISTS documents_ouvertures (
  id TEXT PRIMARY KEY,
  lien_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  ip_tronquee TEXT,
  user_agent TEXT,
  ouvert_le INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_ouvertures_doc ON documents_ouvertures(organization_id, type, document_id, ouvert_le);

-- Refus, questions du client, demandes de paiement… (fil d'activité côté artisan).
CREATE TABLE IF NOT EXISTS documents_evenements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  evenement TEXT NOT NULL,             -- 'refus' | 'question' | 'code_envoye' | 'signature' | 'paiement' …
  donnees TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_evenements_doc ON documents_evenements(organization_id, type, document_id, created_at);

-- Compteurs de limitation de débit (fenêtre fixe). Clés contenant une IP : hachées.
CREATE TABLE IF NOT EXISTS parcours_limites (
  cle TEXT PRIMARY KEY,
  compteur INTEGER NOT NULL,
  fenetre_debut INTEGER NOT NULL
);
