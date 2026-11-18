-- Module signature : codes à usage unique (hachés) et dossiers de preuve. Horodatages en ms (UTC).

CREATE TABLE IF NOT EXISTS signature_codes (
  id TEXT PRIMARY KEY,
  lien_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  devis_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,             -- HMAC-SHA256 du code : jamais le code en clair
  canal TEXT NOT NULL CHECK (canal IN ('email', 'sms')),
  destinataire TEXT NOT NULL,          -- adresse ou numéro auquel le code a été envoyé
  expire_le INTEGER NOT NULL,          -- envoi + 10 minutes
  essais INTEGER NOT NULL DEFAULT 0,   -- 5 au maximum
  utilise_le INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signature_codes_lien ON signature_codes(lien_id, created_at);

CREATE TABLE IF NOT EXISTS signature_preuves (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  devis_id TEXT NOT NULL,
  lien_id TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('en_attente', 'signe', 'abandonne')),
  fournisseur TEXT NOT NULL,           -- 'brix' | 'yousign'
  fournisseur_ref TEXT,                -- id de la demande Yousign
  methode_auth TEXT NOT NULL,          -- 'code_email' | 'code_sms' | 'yousign_otp'
  code_id TEXT,
  signataire_nom TEXT NOT NULL,
  signataire_contact TEXT,
  formule TEXT,
  variante_id TEXT NOT NULL DEFAULT 'base',
  version_document INTEGER NOT NULL,
  mentions TEXT NOT NULL,              -- JSON : consentements cochés et textes affichés
  hors_etablissement INTEGER NOT NULL DEFAULT 0,
  retractation_fin INTEGER,            -- signature + 14 jours si applicable (C. consom. L221-18)
  demarrage_anticipe INTEGER NOT NULL DEFAULT 0, -- demande expresse (C. consom. L221-25)
  empreinte_sha256 TEXT NOT NULL,      -- empreinte du document canonique signé
  document_canonique TEXT NOT NULL,    -- JSON canonique exact qui a été haché
  dossier_sha256 TEXT,                 -- empreinte du dossier de preuve complet
  sceau TEXT,                          -- HMAC serveur de dossier_sha256 (détection de toute altération)
  ip TEXT,
  user_agent TEXT,
  signe_le INTEGER,
  cle_dossier TEXT,                    -- R2 : preuves/<org>/<devis>/<preuve>/dossier.json
  cle_certificat TEXT,                 -- R2 : …/certificat.html
  cle_image TEXT,                      -- R2 : …/signature.png
  cle_pdf_signe TEXT,                  -- R2 : …/signe.pdf (Yousign)
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signature_preuves_devis ON signature_preuves(organization_id, devis_id);
CREATE INDEX IF NOT EXISTS idx_signature_preuves_ref ON signature_preuves(fournisseur_ref);
