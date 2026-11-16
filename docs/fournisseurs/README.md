# Achats › Fournisseurs, API Fournisseurs et Brix AI MCP

Ce dossier documente la partie « fournisseurs » de Brix V2 : ce que fait l'artisan, ce que voit le fournisseur, comment les logiciels tiers et les assistants IA s'y branchent.

- [reel-vs-accords.md](reel-vs-accords.md) : ce qui marche dès aujourd'hui, ce qui dépend d'un accord avec chaque enseigne, et le plan pour les obtenir.
- [api-fournisseurs.md](api-fournisseurs.md) : guide développeur de l'API Brix Fournisseurs (pour l'ERP d'un négoce) et du serveur MCP Brix AI (pour Claude, ChatGPT…).

## Le parcours en une phrase

Devis signé → Brix sort la liste du matériel → demande de prix envoyée à 3 fournisseurs en un clic → chacun répond depuis un lien (ou par API) → comparatif automatique ligne par ligne, port et franco compris → « Commander chez Cédéo » → le fournisseur confirme et indique l'expédition → l'artisan pointe la livraison sur le chantier → la facture fournisseur est rapprochée de la commande, écart signalé.

## Ce qui est construit

| Brique | Où | État |
|---|---|---|
| Annuaire fournisseurs (agence, comptoir, n° de compte, franco, délai, métiers) | `worker/src/modules/fournisseurs/annuaire.ts` | Testé |
| Demandes de prix multi-fournisseurs depuis un devis, un chantier ou une liste libre | `fournisseurs/demandes.ts`, `besoins.ts` | Testé |
| Portail fournisseur sans compte (lien sécurisé à usage unique par demande) | `fournisseurs/portail.ts`, `src/modules/fournisseurs/PortailFournisseurPage.tsx` | Testé |
| Comparatif : fournisseur unique ou panier réparti, franco, port, délai, économie vs devis | `fournisseurs/comparateur.ts` (le même code tourne dans l'app et sur le serveur) | Testé |
| Commandes : depuis la demande retenue ou directement depuis le devis signé (prix du catalogue) | `fournisseurs/commandes.ts` | Testé |
| Suivi : envoyée → confirmée → expédiée → livrée (partielle ou totale) → facturée | `fournisseurs/cycle-commande.ts` | Testé |
| Bon de commande EDI au format EDIFACT ORDERS D.96A (EANCOM), joint à chaque e-mail | `fournisseurs/connecteurs/edifact.ts` | Généré, transmission EDI sur accord |
| Catalogue de prix : import CSV / FAB-DIS, historique, regroupement par EAN, alertes de hausse | `fournisseurs/catalogue.ts`, `catalogue-import.ts` | Testé |
| Chaque réponse de fournisseur enrichit automatiquement le catalogue de prix de l'artisan | `demandes.ts › enregistrerReponse` | Testé |
| Rapprochement facture fournisseur ↔ commande (alerte au-delà de 1 % ou 1 €) | `commandes.ts › lierFacture` | Testé |
| API publique Brix Fournisseurs v1 (clés, droits, idempotence, OpenAPI 3.1) | `worker/src/modules/api-publique/` | Testé |
| Webhooks signés HMAC-SHA256 avec nouvelles tentatives | `api-publique/webhooks.ts` | Testé |
| Serveur MCP Brix AI, 12 outils en lecture seule, en français | `worker/src/modules/mcp/` | Testé |
| Écrans Achats (téléphone, tablette, ordinateur) avec démo Benali Électricité | `src/modules/fournisseurs/` | Démo locale (pas de backend en preview) |

## Routes du worker

À brancher dans `worker/src/index.ts` (fait par le fil « app » à la fusion) :

```ts
import { handleFournisseursRoutes } from './modules/fournisseurs/routes';
import { handleApiPubliqueRoutes } from './modules/api-publique/routes';
import { handleMcpRoutes } from './modules/mcp/routes';
import { relancerWebhooks } from './modules/api-publique/webhooks';
// fetch : ajouter les trois handlers à la liste
// scheduled (cron toutes les minutes) : await relancerWebhooks(env);
```

Artisan connecté (`requireAuth`) :

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/fournisseurs/tableau-de-bord` | À faire, livraisons, demandes ouvertes, dépenses, hausses |
| GET/POST | `/api/fournisseurs/annuaire` | Lister, créer |
| PATCH/DELETE | `/api/fournisseurs/annuaire/:id` | Modifier, archiver |
| POST | `/api/fournisseurs/annuaire/:id/tarif` | Importer un tarif (`csv` ou `lignes`, `simulation: true` pour l'aperçu) |
| POST | `/api/fournisseurs/annuaire/:id/relier` | Relier à un partenaire API (`code`) |
| GET/POST | `/api/fournisseurs/demandes` | Lister, créer (`devis_id` ou `lignes`, `fournisseur_ids`, `envoyer: true`) |
| GET | `/api/fournisseurs/demandes/:id` | Détail + comparatif + journal |
| POST | `/api/fournisseurs/demandes/:id/envoyer` · `/relancer` · `/annuler` | |
| POST | `/api/fournisseurs/demandes/:id/commander` | Commandes selon la recommandation, ou `destinataire_id`, ou `repartition: 'optimise'|'unique'` |
| POST | `/api/fournisseurs/destinataires/:id/reponse` | Saisie par l'artisan d'un prix reçu par téléphone |
| GET/POST | `/api/fournisseurs/commandes` | Lister, créer (lignes libres, ou `devis_id` + `fournisseur_id`) |
| GET | `/api/fournisseurs/commandes/:id` | Détail + journal |
| POST | `/api/fournisseurs/commandes/:id/envoyer` · `/statut` · `/livraison` · `/facture` | |
| GET | `/api/fournisseurs/catalogue?q=` · `/catalogue/hausses` | Recherche comparée, hausses |
| GET | `/api/fournisseurs/connecteurs` | Registre des connecteurs et leur état réel |
| POST | `/api/fournisseurs/demo` | Charge la démo (fournisseurs en @exemple.fr) |
| GET/POST/DELETE | `/api/mcp/jetons[/:id]` | Accès Brix AI pour les assistants |

Fournisseur sans compte (jeton du lien) : `GET /api/fournisseurs/portail/:jeton`, `POST …/reponse`, `…/decliner`, `…/statut`.

Partenaire API : voir [api-fournisseurs.md](api-fournisseurs.md). Assistant IA : `POST /api/mcp` (Bearer) ou `POST /api/mcp/k/:jeton`.

## Secrets et variables

| Nom | Sert à | Sans lui |
|---|---|---|
| `BREVO_API_KEY` | Envoyer les e-mails de demande et de commande | E-mails simulés : rien ne part, le lien portail est renvoyé à l'app |
| `APP_ORIGIN` | Construire les liens portail (`APP_ORIGIN/#/portail-fournisseur/<jeton>`) | Repli sur `https://app.brix-app.fr` |
| `JWT_SECRET` | Sessions de l'app (déjà requis) | — |

Le domaine expéditeur `achats@brix-app.fr` doit être authentifié chez Brevo (SPF, DKIM) avant la mise en ligne.

## Sécurité

- Tout est cloisonné par `organization_id`. Les tests vérifient qu'un autre artisan reçoit 404.
- Jetons de lien, clés API et jetons MCP : 180 à 256 bits aléatoires, seul le SHA-256 est stocké, comparaison par hash.
- Un lien portail donne accès à une seule demande ou une seule commande ; il expire (30 jours pour une demande, 180 pour une commande) et un renvoi le remplace.
- Un fournisseur (portail ou API) ne peut que confirmer, expédier, livrer : jamais annuler ni modifier les prix d'une commande.
- Un partenaire API ne voit que les artisans qui l'ont relié avec son code. Les identifiants internes (organisation, jetons) ne sortent jamais.
- Webhooks HTTPS uniquement, adresses privées refusées, signature HMAC horodatée.
- MCP en lecture seule : aucun outil ne peut écrire, envoyer ou supprimer.

## Tests

`npm test` lance les tests d'intégration du module sur une vraie base SQLite en mémoire (mêmes `schema.sql` que D1) :

- `fournisseurs/tests/parcours.test.ts` : devis → demande → réponses via le portail → comparatif → commande → confirmation → livraison partielle puis totale → facture avec écart ; cloisonnement entre artisans ; démo.
- `fournisseurs/tests/api-publique.test.ts` : inscription partenaire, liaison par code, webhooks signés vérifiés, réponse par API avec idempotence, commande confirmée et livrée par API, tarif poussé, droits et révocation.
- `fournisseurs/tests/mcp.test.ts` : jetons, protocole MCP (initialize, tools/list, notifications), chaque outil sur des données réelles, absence de fuite entre entreprises, révocation.
