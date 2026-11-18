-- « Déconnecter tous les appareils » : jetons émis avant cette date (secondes Unix) refusés.
ALTER TABLE users ADD COLUMN sessions_revoquees_avant INTEGER;
