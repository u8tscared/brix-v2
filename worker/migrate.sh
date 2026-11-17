#!/usr/bin/env bash
# Applique les schémas D1 de tous les modules (core d'abord). Usage : ./worker/migrate.sh [--remote]
set -euo pipefail
for f in worker/src/modules/core/schema.sql worker/src/modules/fournisseurs/schema.sql worker/src/modules/api-publique/schema.sql worker/src/modules/mcp/schema.sql; do
  echo "→ $f"
  npx wrangler d1 execute brix-v2-db "${1:---local}" --file="$f"
done
