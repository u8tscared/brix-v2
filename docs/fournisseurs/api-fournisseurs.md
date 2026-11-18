# API Brix Fournisseurs v1 et serveur MCP Brix AI

## 1. API Brix Fournisseurs (pour les négoces, fabricants, loueurs)

Recevez les demandes de prix et les commandes des artisans qui utilisent Brix directement dans votre ERP, répondez-y, publiez vos prix nets négociés. Spécification complète : `GET /api/public/v1/openapi.json`.

### Démarrer en 4 appels

```bash
# 1. Créer le compte partenaire : renvoie le code partenaire et une clé (affichée une seule fois)
curl -X POST https://app.brix-app.fr/api/public/v1/partenaires \
  -H 'content-type: application/json' \
  -d '{"nom":"Négoce Rhône Matériaux","email_technique":"it@negoce.fr"}'
# → { "partenaire": { "code": "BRX-7KQ2-M9XA" }, "cle": { "cle": "brx_live_…" } }

# 2. Recevoir les événements
curl -X POST https://app.brix-app.fr/api/public/v1/webhooks \
  -H 'authorization: Bearer brx_live_…' -H 'content-type: application/json' \
  -d '{"url":"https://erp.negoce.fr/brix"}'
# → { "secret": "whsec_…" }  (à garder pour vérifier les signatures)

# 3. Donner le code BRX-7KQ2-M9XA à vos clients artisans.
#    Ils le saisissent sur votre fiche (Achats › Mes fournisseurs › Relier par API).

# 4. Répondre à une demande de prix reçue
curl -X POST https://app.brix-app.fr/api/public/v1/demandes/dpd_…/reponse \
  -H 'authorization: Bearer brx_live_…' -H 'idempotency-key: rep-dpd_…' -H 'content-type: application/json' \
  -d '{"lignes":[{"ligne_id":"dpl_…","prix_unitaire_cents":685}],"frais_port_cents":0,"delai_livraison_jours":1}'
```

### Règles

- Authentification : `Authorization: Bearer brx_live_…`. Droits par clé : `demandes:read`, `demandes:write`, `commandes:read`, `commandes:write`, `catalogue:write`, `webhooks:write`.
- Montants en centimes d'euro HT (entiers). Dates en millisecondes depuis 1970.
- `Idempotency-Key` sur toute écriture : le même appel rejoué sous 24 h renvoie la même réponse (en-tête `idempotent-replay: true`).
- Vous ne voyez que les artisans qui vous ont relié. Une commande ne peut être que confirmée, expédiée ou livrée par vous ; l'annulation appartient à l'artisan.
- Tarifs : `PUT /clients/{client_id}/tarif` avec jusqu'à 5 000 articles par appel ; les prix existants sont mis à jour et l'historique est conservé (l'artisan voit les hausses).

### Événements webhook

`demande.creee`, `demande.annulee`, `commande.creee`, `commande.annulee`, `liaison.creee`. Corps :

```json
{ "id": "whd_…", "type": "commande.creee", "cree_le": "2026-11-17T08:12:00.000Z", "data": { "commande_id": "bc_…", "numero": "BC-2026-0042" } }
```

Vérification de la signature (`Brix-Signature: t=1763367120,v1=…`) :

```js
import crypto from 'node:crypto';
function verifier(secret, entete, corpsBrut) {
  const { t, v1 } = Object.fromEntries(entete.split(',').map((p) => p.split('=')));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // 5 minutes
  const attendu = crypto.createHmac('sha256', secret).update(`${t}.${corpsBrut}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(attendu), Buffer.from(v1));
}
```

Répondez 2xx en moins de 10 secondes. En cas d'échec, Brix réessaie après 1 min, 5 min, 30 min, 2 h et 12 h ; un webhook est désactivé après 20 échecs consécutifs.

### Flux type côté ERP

1. `commande.creee` → `GET /commandes/{id}` → création de la commande client dans l'ERP (le n° de compte client Brix est fourni).
2. `POST /commandes/{id}/statut` `{ "statut": "confirmee", "reference_fournisseur": "ARC-558120" }`.
3. Au départ du camion : `{ "statut": "expediee", "livraison_prevue": 1763452800000, "suivi_transporteur": "Créneau 7 h 30 – 9 h" }`.
4. Bon de livraison : `POST /commandes/{id}/livraison` avec les quantités livrées par ligne (livraison partielle gérée).

Les distributeurs qui n'ont pas d'équipe informatique n'ont besoin de rien : les mêmes actions se font depuis le lien reçu par e-mail.

## 2. Brix AI MCP (pour Claude, ChatGPT et les assistants compatibles)

Le serveur MCP permet à l'artisan de poser des questions sur ses propres chiffres à l'assistant de son choix. Lecture seule, en français.

- URL : `https://app.brix-app.fr/api/mcp` avec `Authorization: Bearer brx_mcp_…`, ou `https://app.brix-app.fr/api/mcp/k/brx_mcp_…` pour les applications qui ne demandent qu'une URL.
- Transport : Streamable HTTP (JSON-RPC 2.0, réponses JSON). Versions de protocole acceptées : 2025-06-18, 2025-03-26, 2024-11-05.
- L'artisan crée et révoque ses accès dans Brix › Bob › Connecter une IA (`/api/mcp/jetons`).

| Outil | Ce qu'il lit |
|---|---|
| `entreprise` | Point de départ : nom, métier, taille, modules, compteurs du jour |
| `devis` | Devis par statut et période, ou détail et lignes d'un devis |
| `factures` | Factures, montants payés, échéances, statut de facture électronique |
| `impayes` | Factures échues non soldées, jours de retard, coordonnées du client |
| `chiffre_affaires` | Facturé et encaissé par mois, devis signés, taux de transformation |
| `chantiers` | Chantiers ; détail avec devis, achats engagés et marge estimée |
| `clients` | Recherche de clients, facturé, devis en attente |
| `achats` | Commandes en cours, livraisons à venir et en retard, dépenses 30 jours |
| `demandes_prix` | Demandes envoyées et comparatif des réponses |
| `prix_materiaux` | Prix nets comparés entre fournisseurs pour un matériau |
| `hausses_prix` | Articles dont le prix fournisseur a augmenté |
| `fournisseurs` | Annuaire, franco, délais, volume d'achat 12 mois |

Chaque réponse contient `donnees_du` (moment de la lecture) et `vide: true` avec une explication quand il n'y a rien, pour que l'assistant dise ce qui manque au lieu d'inventer. Le texte d'`instructions` envoyé à l'initialisation suit la même logique que le connecteur Growth Gusto.

### Relier Claude

Claude › Réglages › Connecteurs › Ajouter un connecteur personnalisé → coller l'URL avec jeton (`…/api/mcp/k/brx_mcp_…`). Pour l'annuaire officiel des connecteurs Claude, il faudra ajouter l'authentification OAuth 2.1 (prévu, voir [reel-vs-accords.md](reel-vs-accords.md)).
