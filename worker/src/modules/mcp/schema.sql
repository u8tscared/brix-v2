-- ============================================================================
-- Brix AI MCP : relier Claude, ChatGPT, Le Chat… aux données de l'artisan.
-- Voir docs/brix-ai/README.md. Seuls des hash SHA-256 de jetons sont stockés.
-- ============================================================================

-- Jetons personnels (brx_mcp_…) : n8n, scripts, assistants sans OAuth. « Avancé » dans l'app.
CREATE TABLE IF NOT EXISTS mcp_jetons (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nom TEXT NOT NULL,                 -- « Claude sur mon ordinateur »
  prefixe TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  derniere_utilisation INTEGER,
  nb_appels INTEGER NOT NULL DEFAULT 0,
  revoque_le INTEGER,
  created_at INTEGER NOT NULL,
  scope TEXT NOT NULL DEFAULT 'brix.lecture'   -- ajouté après coup : migrations/001_jetons_scope.sql
);
CREATE INDEX IF NOT EXISTS idx_mcp_jetons_org ON mcp_jetons(organization_id);

-- Réglages par entreprise : interrupteur « Relier votre IA » (absent = activé).
CREATE TABLE IF NOT EXISTS mcp_reglages (
  organization_id TEXT PRIMARY KEY NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  maj_le INTEGER NOT NULL,
  maj_par TEXT
);

-- Clients OAuth : inscrits par DCR (RFC 7591) ou documents CIMD mis en cache.
CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
  id TEXT PRIMARY KEY NOT NULL,      -- brx_cli_… (DCR) ou URL https (CIMD)
  kind TEXT NOT NULL,                -- dcr | cimd
  metadata_json TEXT NOT NULL,
  ip_hash TEXT,
  created_at INTEGER NOT NULL,
  expire_le INTEGER,                 -- CIMD : fin de validité du cache
  last_used INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mcp_clients_ip ON mcp_oauth_clients(ip_hash, created_at);

-- Demandes d'autorisation en attente (écran « Autoriser » de l'app), 10 minutes.
CREATE TABLE IF NOT EXISTS mcp_oauth_demandes (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  state TEXT,
  challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  exp INTEGER NOT NULL,
  traitee_le INTEGER
);

-- Codes d'autorisation : usage unique, 2 minutes.
CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
  hash TEXT PRIMARY KEY NOT NULL,
  grant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  scope TEXT NOT NULL,
  exp INTEGER NOT NULL,
  utilise_le INTEGER
);

-- Autorisations données par le patron (une par assistant relié).
CREATE TABLE IF NOT EXISTS mcp_oauth_grants (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_label TEXT NOT NULL,
  client_host TEXT,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mcp_grants_org ON mcp_oauth_grants(organization_id);

-- Jetons OAuth : brx_oat_ (accès, 1 h) et brx_ort_ (renouvellement, rotation à chaque usage).
CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
  hash TEXT PRIMARY KEY NOT NULL,
  grant_id TEXT NOT NULL,
  kind TEXT NOT NULL,                -- access | refresh
  scope TEXT NOT NULL,
  exp INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  utilise_le INTEGER,                -- refresh déjà échangé (rotation) : un second usage = vol présumé
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_grant ON mcp_oauth_tokens(grant_id);

-- Journal des actions faites par un assistant (outils d'écriture), affiché dans l'app.
CREATE TABLE IF NOT EXISTS mcp_journal (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  client_label TEXT NOT NULL,
  outil TEXT NOT NULL,
  resume TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 1,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mcp_journal_org ON mcp_journal(organization_id, at);
