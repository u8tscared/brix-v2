#!/usr/bin/env bash
# Applique les schémas D1 de tous les modules (core d'abord), puis les migrations.
# Usage : ./worker/migrate.sh [--remote]   (par défaut : --local)
set -euo pipefail
CIBLE="${1:---local}"
for f in worker/src/modules/core/schema.sql worker/src/modules/fournisseurs/schema.sql worker/src/modules/api-publique/schema.sql worker/src/modules/mcp/schema.sql worker/src/modules/documents/schema.sql worker/src/modules/signature/schema.sql worker/src/modules/paiements/schema.sql worker/src/modules/notifications/schema.sql worker/src/modules/emails/schema.sql worker/src/modules/bob/schema.sql; do
  echo "→ $f"
  npx wrangler d1 execute brix-v2-db "$CIBLE" --file="$f"
done
# Migrations (ALTER TABLE…) : D1 n'a pas « IF NOT EXISTS » pour ADD COLUMN. Une migration déjà
# passée (ou une base neuve qui a déjà la colonne via schema.sql) échoue : on le signale et on continue.
for f in worker/src/modules/*/migrations/*.sql; do
  [ -e "$f" ] || continue
  echo "→ $f"
  if ! sortie=$(npx wrangler d1 execute brix-v2-db "$CIBLE" --file="$f" 2>&1); then
    if echo "$sortie" | grep -qi "duplicate column"; then echo "  déjà appliquée"; else echo "$sortie"; exit 1; fi
  fi
done
