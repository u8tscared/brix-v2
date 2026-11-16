-- ============================================================================
-- API publique Brix Fournisseurs (v1)
-- Un « partenaire » est une entreprise fournisseur (négoce, fabricant, loueur) qui se connecte à Brix
-- par API. Il est relié aux artisans qui l'ont ajouté (liaisons), jamais à toute la base.
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_partenaires (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,         -- code partenaire à donner aux artisans : BRX-7KQ2-M9
  email_technique TEXT,
  siret TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Clés API : seul le hash SHA-256 est stocké. Préfixe visible pour les reconnaître.
CREATE TABLE IF NOT EXISTS api_cles (
  id TEXT PRIMARY KEY NOT NULL,
  partenaire_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  prefixe TEXT NOT NULL,             -- brx_live_AbC1… (12 premiers caractères)
  hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,              -- JSON : ["demandes:read","demandes:write","commandes:read","commandes:write","catalogue:write"]
  mode TEXT NOT NULL DEFAULT 'live', -- live | test
  derniere_utilisation INTEGER,
  revoquee_le INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_cles_partenaire ON api_cles(partenaire_id);

-- Liaison artisan ↔ partenaire (l'artisan a saisi le code partenaire sur sa fiche fournisseur)
CREATE TABLE IF NOT EXISTS api_liaisons (
  id TEXT PRIMARY KEY NOT NULL,
  partenaire_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  fournisseur_id TEXT NOT NULL,      -- fiche fournisseurs_annuaire côté artisan
  numero_compte_client TEXT,
  statut TEXT NOT NULL DEFAULT 'active', -- active | suspendue
  created_at INTEGER NOT NULL,
  UNIQUE (partenaire_id, organization_id, fournisseur_id)
);
CREATE INDEX IF NOT EXISTS idx_api_liaisons_org ON api_liaisons(organization_id, fournisseur_id);

CREATE TABLE IF NOT EXISTS api_webhooks (
  id TEXT PRIMARY KEY NOT NULL,
  partenaire_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,              -- secret de signature HMAC (montré une seule fois à la création)
  evenements TEXT NOT NULL,          -- JSON : ["demande.creee","commande.creee","commande.annulee"]
  actif INTEGER NOT NULL DEFAULT 1,
  echecs_consecutifs INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_webhooks_envois (
  id TEXT PRIMARY KEY NOT NULL,
  webhook_id TEXT NOT NULL,
  evenement TEXT NOT NULL,
  payload TEXT NOT NULL,
  statut_http INTEGER,
  tentatives INTEGER NOT NULL DEFAULT 0,
  prochain_essai INTEGER,
  livre_le INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_envois_attente ON api_webhooks_envois(livre_le, prochain_essai);

-- Idempotence des écritures (en-tête Idempotency-Key)
CREATE TABLE IF NOT EXISTS api_idempotence (
  cle TEXT PRIMARY KEY NOT NULL,     -- partenaire_id + ':' + Idempotency-Key
  statut INTEGER NOT NULL,
  reponse TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
