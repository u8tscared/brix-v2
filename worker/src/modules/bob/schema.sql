-- Brix AI (assistant) : compteurs de messages pour limiter les abus.
-- cle : « org:<organisation> » (compte connecté) ou « ip:<adresse> » (démo ouverte).
-- fenetre : jour (AAAA-MM-JJ) ou heure (AAAA-MM-JJTHH) selon la limite.
CREATE TABLE IF NOT EXISTS bob_quota (
  cle TEXT NOT NULL,
  fenetre TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  expire INTEGER NOT NULL,
  PRIMARY KEY (cle, fenetre)
);
CREATE INDEX IF NOT EXISTS idx_bob_quota_expire ON bob_quota (expire);
