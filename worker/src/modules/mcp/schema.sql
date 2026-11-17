-- ============================================================================
-- Brix AI MCP : jetons d'accès personnels pour relier Claude, ChatGPT, etc. aux données de l'artisan.
-- Seul le hash SHA-256 du jeton est stocké. Accès en lecture seule.
-- ============================================================================
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
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mcp_jetons_org ON mcp_jetons(organization_id);
