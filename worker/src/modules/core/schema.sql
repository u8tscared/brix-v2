-- Schéma de base Brix V2 (Cloudflare D1). Les modules ajoutent leurs tables dans leur propre schema.sql.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  siret TEXT,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  trade TEXT NOT NULL DEFAULT 'autre',
  size TEXT NOT NULL DEFAULT 'solo',
  plan TEXT NOT NULL DEFAULT 'start',
  enabled_modules TEXT NOT NULL DEFAULT '[]', -- JSON ModuleKey[]
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'patron',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL DEFAULT 'particulier', -- 'particulier' | 'pro'
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  siret TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);

CREATE TABLE IF NOT EXISTS chantiers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  client_id TEXT REFERENCES clients(id),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'a_planifier',
  start_date TEXT,
  end_date TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  budget_ht REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chantiers_org ON chantiers(organization_id);

CREATE TABLE IF NOT EXISTS devis (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  client_id TEXT REFERENCES clients(id),
  chantier_id TEXT REFERENCES chantiers(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'brouillon',
  title TEXT,
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  deposit_percent REAL NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  signed_at TEXT,
  UNIQUE (organization_id, number)
);

CREATE TABLE IF NOT EXISTS devis_lignes (
  id TEXT PRIMARY KEY,
  devis_id TEXT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL, -- 'section' | 'ouvrage' | 'fourniture' | 'main_oeuvre' | 'texte'
  designation TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  unit_price_ht REAL NOT NULL DEFAULT 0,
  unit_cost_ht REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 20,
  supplier_ref TEXT,
  supplier TEXT
);
CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON devis_lignes(devis_id);

CREATE TABLE IF NOT EXISTS factures (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  client_id TEXT REFERENCES clients(id),
  chantier_id TEXT REFERENCES chantiers(id),
  devis_id TEXT REFERENCES devis(id),
  number TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'facture',
  status TEXT NOT NULL DEFAULT 'brouillon',
  issue_date TEXT,
  due_date TEXT,
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  einvoice_status TEXT NOT NULL DEFAULT 'non_transmise',
  einvoice_platform_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, number)
);

CREATE TABLE IF NOT EXISTS facture_lignes (
  id TEXT PRIMARY KEY,
  facture_id TEXT NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  designation TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  unit_price_ht REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS einvoice_events (
  id TEXT PRIMARY KEY,
  facture_id TEXT NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
