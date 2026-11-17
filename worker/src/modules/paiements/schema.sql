-- Module paiements : sessions de paiement (Stripe Checkout, Alma, simulation), écritures encaissées,
-- événements webhook déjà traités (anti-rejeu), comptes Stripe Connect des artisans. Montants en centimes.

CREATE TABLE IF NOT EXISTS paiements_sessions (
  id TEXT PRIMARY KEY,                 -- pay_… (aléatoire 128 bits)
  organization_id TEXT NOT NULL,
  facture_id TEXT NOT NULL,
  devis_id TEXT,                       -- renseigné pour un acompte après signature
  nature TEXT NOT NULL CHECK (nature IN ('facture', 'acompte')),
  moyen TEXT NOT NULL CHECK (moyen IN ('carte', 'virement', '3x')),
  fournisseur TEXT NOT NULL CHECK (fournisseur IN ('stripe', 'alma', 'simulation')),
  montant_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL DEFAULT 0,
  reference_externe TEXT,              -- id de session Stripe (cs_…) ou de paiement Alma
  url TEXT,
  statut TEXT NOT NULL DEFAULT 'ouverte', -- 'ouverte' | 'en_attente' | 'payee' | 'echouee' | 'expiree'
  created_at INTEGER NOT NULL,
  paye_le INTEGER
);
CREATE INDEX IF NOT EXISTS idx_paiements_sessions_facture ON paiements_sessions(organization_id, facture_id);
CREATE INDEX IF NOT EXISTS idx_paiements_sessions_ref ON paiements_sessions(reference_externe);

CREATE TABLE IF NOT EXISTS paiements_ecritures (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  facture_id TEXT NOT NULL,
  session_id TEXT,
  montant_cents INTEGER NOT NULL,
  moyen TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  reference_externe TEXT NOT NULL UNIQUE, -- payment_intent Stripe, id Alma… : un encaissement n'est compté qu'une fois
  paye_le INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_paiements_ecritures_facture ON paiements_ecritures(organization_id, facture_id);

CREATE TABLE IF NOT EXISTS paiements_webhooks (
  id TEXT PRIMARY KEY,                 -- id d'événement Stripe (evt_…) ou Alma
  fournisseur TEXT NOT NULL,
  type TEXT NOT NULL,
  recu_le INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paiements_comptes (
  organization_id TEXT PRIMARY KEY,
  stripe_account_id TEXT UNIQUE,
  charges_actives INTEGER NOT NULL DEFAULT 0,
  virements_actifs INTEGER NOT NULL DEFAULT 0,
  maj_le INTEGER NOT NULL
);
