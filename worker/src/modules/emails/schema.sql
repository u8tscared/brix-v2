-- Module e-mails : journal des envois et événements de suivi (délivré, ouvert, rebond, plainte…).
-- À appliquer : wrangler d1 execute brix-v2-db --remote --file=worker/src/modules/emails/schema.sql

CREATE TABLE IF NOT EXISTS email_envois (
  id TEXT PRIMARY KEY,                -- id interne (env_…)
  message_id TEXT,                    -- id renvoyé par Brevo / Resend (null en simulation)
  fournisseur TEXT NOT NULL,          -- brevo | resend | simulation
  modele TEXT NOT NULL,               -- ModeleEmail (devis_envoye, facture_relance…)
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  reference TEXT,                     -- document lié (D-2026-121, F-2026-198…)
  statut TEXT NOT NULL DEFAULT 'envoye', -- envoye | simule | echec, puis dernier événement reçu
  erreur TEXT,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  maj_le TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_envois_message ON email_envois (message_id);
CREATE INDEX IF NOT EXISTS idx_email_envois_reference ON email_envois (reference);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,                -- id interne (evt_…)
  fournisseur TEXT NOT NULL,          -- brevo | resend | brix (désinscription)
  message_id TEXT,
  type TEXT NOT NULL,                 -- envoye | delivre | ouvert | clic | differe | rebond | plainte | bloque | desinscrit | autre
  type_brut TEXT NOT NULL,            -- libellé d'origine (hard_bounce, email.complained…)
  email TEXT,
  modele TEXT,
  reference TEXT,
  survenu_le TEXT NOT NULL,
  recu_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  cle TEXT NOT NULL UNIQUE,           -- déduplication des webhooks rejoués
  brut TEXT                           -- charge utile JSON (tronquée à 8 Ko)
);
CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events (message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events (email, type);
