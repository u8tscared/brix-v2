-- Module notifications : fil de l'artisan, préférences par type et canal, heures calmes,
-- abonnements push (Web Push, APNs, FCM) et file des envois différés. Horodatages en ms.

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  texte TEXT NOT NULL,
  vers TEXT,                      -- chemin dans l'app (ex. devis/dv_123)
  montant_cents INTEGER,
  document_type TEXT,
  document_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_doc ON notifications(organization_id, type, document_id, created_at);

-- Lecture par utilisateur (une entreprise peut avoir plusieurs comptes).
CREATE TABLE IF NOT EXISTS notifications_lectures (
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  lu_le INTEGER NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);

-- Absence de ligne = valeur par défaut (voir notifications/types.ts).
CREATE TABLE IF NOT EXISTS notifications_preferences (
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('app', 'push')),
  actif INTEGER NOT NULL,
  PRIMARY KEY (user_id, type, canal)
);

CREATE TABLE IF NOT EXISTS notifications_reglages (
  user_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  calme_debut TEXT,               -- « 21:00 » (heure de Paris par défaut)
  calme_fin TEXT,                 -- « 07:00 »
  fuseau TEXT NOT NULL DEFAULT 'Europe/Paris'
);

CREATE TABLE IF NOT EXISTS notifications_abonnements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  plateforme TEXT NOT NULL CHECK (plateforme IN ('web', 'apns', 'fcm')),
  cible TEXT NOT NULL UNIQUE,     -- endpoint Web Push ou jeton d'appareil
  p256dh TEXT,
  auth TEXT,
  appareil TEXT,
  created_at INTEGER NOT NULL,
  dernier_succes INTEGER,
  echecs INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notifications_abonnements_user ON notifications_abonnements(user_id);

-- Envois push différés (heures calmes) ou en échec, repris par le cron.
CREATE TABLE IF NOT EXISTS notifications_envois (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  abonnement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  statut TEXT NOT NULL,           -- 'differe' | 'envoye' | 'echec' | 'simule' | 'expire'
  essais INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  traite_le INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notifications_envois_statut ON notifications_envois(statut, created_at);
