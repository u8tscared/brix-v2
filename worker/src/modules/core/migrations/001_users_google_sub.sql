-- Bases créées avant le 18/11/2026 : colonne google_sub (déjà dans schema.sql pour une base neuve).
-- D1 n'a pas « ADD COLUMN IF NOT EXISTS » : migrate.sh ignore l'erreur « duplicate column ».
ALTER TABLE users ADD COLUMN google_sub TEXT;
