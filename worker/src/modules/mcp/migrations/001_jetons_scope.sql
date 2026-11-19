-- Jetons personnels : portée choisie à la création (lecture par défaut).
ALTER TABLE mcp_jetons ADD COLUMN scope TEXT NOT NULL DEFAULT 'brix.lecture';
