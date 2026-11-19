# Brix AI MCP

Brix AI relie l'assistant de l'artisan (Claude, ChatGPT, Le Chat, Perplexity, Grok, Copilot Studio, Claude Code, Cursor, VS Code…) à ses données Brix, par le protocole MCP. Une seule adresse pour tout le monde, sans secret :

```
https://app.brix-app.fr/api/mcp
```

L'artisan la colle dans son assistant, Brix s'ouvre, il se connecte avec le compte du gérant et touche « Autoriser ». Il choisit « Lecture seule » ou « Lecture et actions ». Un interrupteur « Relier votre IA » (Bob › Brix AI MCP) coupe tout instantanément.

Recherche complète (clients, menus exacts, exigences des annuaires) : [clients-mcp.md](clients-mcp.md).

## Comment ça marche

| Étape | Qui | Quoi |
|---|---|---|
| 1 | Assistant | `POST /api/mcp` sans jeton → **401** `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource/api/mcp", scope="brix.lecture brix.ecriture"` |
| 2 | Assistant | Lit les métadonnées (ressource protégée, puis serveur d'autorisation) |
| 3 | Assistant | S'identifie : **CIMD** (son `client_id` est une URL https : Claude, Claude Code, ChatGPT, VS Code) ou **DCR** (`POST /api/mcp/oauth/register` : Cursor, Le Chat, Perplexity, Grok, Copilot Studio) |
| 4 | Assistant | Ouvre `GET /api/mcp/oauth/authorize` (PKCE S256, `resource`, `state`) |
| 5 | Worker | Valide le client et l'adresse de retour (sinon page d'erreur HTML, jamais de redirection), garde la demande 10 min, renvoie vers `https://app.brix-app.fr/#/autoriser?req=…` |
| 6 | App | `src/pages/autoriser/Autoriser.tsx` : sans session, envoie vers `#/connexion?retour=/autoriser?req=…` ; sinon affiche le nom et l'hôte de l'assistant, l'hôte de retour, le choix lecture / actions |
| 7 | App | « Autoriser » → `POST /api/mcp/oauth/demande/<id>/approuver {ecriture}` (gérant uniquement) → `{redirect}` avec `code`, `state`, `iss` |
| 8 | Assistant | `POST /api/mcp/oauth/token` (code + `code_verifier`) → `brx_oat_…` (1 h) + `brx_ort_…` |
| 9 | Assistant | `POST /api/mcp` avec `Authorization: Bearer brx_oat_…` |

Les données métier viennent du document JSON de l'entreprise (`worker/src/lib/etat.ts`, le même que la synchronisation de l'app). Les outils d'écriture passent par `modifierEtat` : l'app voit le brouillon à la synchronisation suivante. Les outils achats lisent les tables D1 du module fournisseurs.

## Points d'entrée

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/.well-known/oauth-protected-resource` et `/.well-known/oauth-protected-resource/api/mcp` | Métadonnées de ressource (RFC 9728) |
| GET | `/.well-known/oauth-authorization-server` et `/.well-known/openid-configuration` | Métadonnées du serveur d'autorisation (RFC 8414) |
| GET | `/.well-known/openai-apps-challenge` | Jeton de vérification de domaine OpenAI (`OPENAI_APPS_CHALLENGE`, 404 sinon) |
| GET | `/.well-known/*` (autres) | 404 JSON (jamais la SPA) |
| POST | `/api/mcp/oauth/register` | DCR (RFC 7591), clients publics, 30 inscriptions / heure / IP |
| GET | `/api/mcp/oauth/authorize` | Validation puis renvoi vers l'app |
| GET | `/api/mcp/oauth/demande/:id` | Détail pour l'écran « Autoriser » (session Brix) |
| POST | `/api/mcp/oauth/demande/:id/approuver` · `/refuser` | Réponse du gérant → `{ redirect }` |
| POST | `/api/mcp/oauth/token` | `authorization_code` et `refresh_token` (form-urlencoded ou JSON) |
| POST | `/api/mcp/oauth/revoke` | RFC 7009 (un refresh coupe toute l'autorisation) |
| POST | `/api/mcp` | Serveur MCP (JSON-RPC, réponses JSON, sans SSE) |
| POST | `/api/mcp/k/<brx_mcp_…>` | Secours jeton personnel dans l'URL (n8n, scripts) |
| GET/POST | `/api/mcp/reglages` | Interrupteur « Relier votre IA » `{ actif }` (POST : gérant) |
| GET | `/api/mcp/acces` | Assistants reliés (`g_…`) et jetons personnels (`j_…`) |
| DELETE | `/api/mcp/acces/:id` | « Couper » (gérant) |
| GET | `/api/mcp/journal` | Actions faites par les assistants |
| GET/POST/DELETE | `/api/mcp/jetons[/:id]` | Jetons personnels (« Avancé »), `{ nom, ecriture }`, lecture seule par défaut |

## Sécurité, en bref

- **OAuth 2.1** : clients publics (`token_endpoint_auth_methods_supported: ["none"]`), PKCE S256 obligatoire (`plain` refusé), `resource` vérifiée (RFC 8707, `invalid_target`), `iss` sur chaque réponse d'autorisation, erreurs comprises (RFC 9207 : nécessaire pour l'adresse de retour stable de ChatGPT).
- **Adresses de retour** : correspondance exacte avec celles du client, sauf le port en boucle locale (`localhost`, `127.0.0.1`, `[::1]`). Schémas privés acceptés (`cursor://…`), `javascript:`, `data:`, `file:` refusés, `http` seulement en boucle locale.
- **CIMD** : https seulement, pas d'IP littérale ni de nom local, pas de redirection, 4 s, 5 Ko au plus, `client_id` du document = son URL. Mis en cache dans `mcp_oauth_clients` (5 min à 24 h selon `Cache-Control`).
- **Jetons** opaques (`brx_oat_`, `brx_ort_`, `brx_cod_`, `brx_mcp_`), seul le SHA-256 est stocké. Code : 2 min, usage unique (rejoué = autorisation coupée). Accès : 1 h. Renouvellement : rotation à chaque usage, 30 jours glissants, 90 jours au plus ; un ancien jeton réutilisé coupe toute l'autorisation.
- **Portées** : `brix.lecture` (toujours) et `brix.ecriture` (outils d'écriture). Un accès en lecture seule ne voit pas les outils d'écriture ; s'il en appelle un : HTTP 403 `WWW-Authenticate: Bearer error="insufficient_scope"`.
- **Origine** : toute origine est acceptée. Chaque appel exige un jeton porté par l'en-tête `Authorization` (pas de cookie, pas de session ambiante) : une page tierce ne peut rien lire sans jeton, la vérification d'`Origin` n'apporterait rien. CORS `*`, `WWW-Authenticate` exposé.
- **Écran d'autorisation** : dans l'app (session Brix en Bearer, requête JSON : pas de CSRF possible par formulaire). La page d'erreur HTML du worker porte `X-Frame-Options: DENY` et `frame-ancestors 'none'`.
- **Interrupteur** `mcp_reglages` : éteint, tous les jetons (OAuth et personnels) répondent 401. Autoriser un nouvel assistant le rallume.
- **Journal** `mcp_journal` : chaque appel d'un outil d'écriture (réussi ou refusé), 500 lignes par entreprise.

## Protocole

- Versions : `2026-07-28` (sans état), `2025-11-25` (préférée pour `initialize`), `2025-06-18`, `2025-03-26`, `2024-11-05`.
- Époque classique : `initialize` (renvoie la version demandée si connue, sinon 2025-11-25), `ping`, `tools/list`, `tools/call`, notifications → 202. `Mcp-Session-Id` accepté et ignoré. En-tête `MCP-Protocol-Version` inconnu → 400.
- Époque 2026-07-28 : `server/discover`, version portée par `_meta["io.modelcontextprotocol/protocolVersion"]`, en-têtes `Mcp-Method` / `Mcp-Name` vérifiés (400, `-32020`), version inconnue (400, `-32022`), méthode inconnue (404, `-32601`), `resultType: "complete"`, `ttlMs` et `cacheScope: "private"` sur `tools/list`.
- GET et DELETE : 405 (pas de flux SSE).

## Outils

Tous : `title`, `readOnlyHint`, `destructiveHint: false`, `idempotentHint`, `openWorldHint: false`, `outputSchema`, `structuredContent` conforme et copie JSON en texte. Listes paginées (`limite` ≤ 50, `curseur` → `suivant`). Chaque réponse porte `donnees_du` et `vide: true` quand il n'y a rien. Erreurs en français, avec l'outil à utiliser.

| Outil | Portée | Rôle |
|---|---|---|
| `lire_entreprise` | lecture | Fiche de l'entreprise et compteurs du jour |
| `lister_devis` · `lire_devis` | lecture | Devis, lignes, totaux, marge |
| `lister_factures` · `lire_facture` | lecture | Factures, payé, reste, facture électronique |
| `lister_impayes` | lecture | Factures échues non soldées, jours de retard, coordonnées |
| `calculer_chiffre_affaires` | lecture | CA facturé et encaissé par mois, transformation des devis |
| `lister_chantiers` · `lire_chantier` | lecture | Chantiers, équipe, devis liés, achats engagés, marge |
| `lister_clients` · `lire_client` | lecture | Clients, facturé, reste, devis en attente |
| `lire_planning` | lecture | Créneaux entre deux dates, par personne |
| `lister_demandes` | lecture | Demandes entrantes (prospects) |
| `lister_achats` | lecture | Commandes fournisseurs, livraisons, dépenses |
| `lister_demandes_prix` | lecture | Demandes de prix et comparatif |
| `comparer_prix_materiaux` | lecture | Prix nets par fournisseur |
| `lister_hausses_prix` | lecture | Hausses de prix récentes |
| `lister_fournisseurs` | lecture | Annuaire fournisseurs |
| `search` · `fetch` | lecture | Format ChatGPT (recherche approfondie), liens `https://app.brix-app.fr/#/app/…` |
| `creer_client` | écriture | Fiche client (refuse un doublon) |
| `creer_devis_brouillon` | écriture | Devis au statut brouillon, numéro suivant (`D-AAAA-NNN`), TVA par défaut de l'entreprise |
| `ajouter_ligne_devis` | écriture | Lignes ajoutées à un devis brouillon |
| `creer_rendez_vous` | écriture | Créneau au planning (gérant par défaut) |
| `noter_demande` | écriture | Demande entrante au statut nouveau |
| `marquer_relance_a_faire` | écriture | Rappel sur une facture impayée ou un devis envoyé |

Les écritures ne font jamais d'envoi (e-mail, SMS), ni de paiement, ni de suppression. Marque de provenance : `source: 'brix-ai'` sur les devis et les créneaux, `origine: 'brix-ai'` sur les clients et les demandes (leur champ `source` est déjà une liste fermée dans `src/lib/types.ts`), `relanceAFaire: { le, note, source: 'brix-ai' }` sur la facture ou le devis.

## Tester

### Tests automatiques

```
npx vitest run worker/src/modules/mcp
```

`tests/oauth.test.ts` (découverte, 401, DCR, CIMD, PKCE, rotation et réutilisation, ressource, portée, interrupteur) et `tests/outils.test.ts` (protocole deux époques, annotations, chaque outil contre un document semé, écritures et journal).

### En local

```
./worker/migrate.sh             # tables D1 locales
npm run build && npx wrangler dev --local --port 8789
curl -i http://localhost:8789/.well-known/oauth-protected-resource/api/mcp
curl -i -X POST http://localhost:8789/api/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

En local, `APP_ORIGIN` doit valoir `http://localhost:8789` (fichier `.dev.vars`) pour que l'émetteur et la ressource correspondent à l'adresse appelée.

### MCP Inspector

```
npx @modelcontextprotocol/inspector
```

Transport « Streamable HTTP », adresse `https://app.brix-app.fr/api/mcp` (ou `http://localhost:8789/api/mcp`), puis « Connect » : l'Inspector suit le parcours OAuth et ouvre l'écran « Autoriser » de Brix.

### Claude Code

```
claude mcp add --transport http brix https://app.brix-app.fr/api/mcp
```

puis `/mcp` dans Claude Code pour se connecter.

## Annuaires : ce qu'il faut préparer

### Commun aux deux

- [ ] Politique de confidentialité publique (catégories de données lues, finalités, destinataires, durée de conservation des jetons et du journal, droits et moyen de couper l'accès) : par exemple `https://brix-app.fr/confidentialite`.
- [ ] Conditions d'utilisation : `https://brix-app.fr/cgu`.
- [ ] Page de documentation : `https://brix-app.fr/connecteur-ia` (déjà annoncée dans les métadonnées).
- [ ] Adresse de support : `support@brix-app.fr` (citée sur la page d'erreur d'autorisation).
- [ ] Icône carrée (512 × 512 PNG, fond plein, logo Brix sans texte).
- [ ] Compte de démonstration pour les relecteurs : e-mail + mot de passe, **sans double authentification ni lien magique**, rôle gérant, entreprise de démo (Benali Électricité) synchronisée dans le cloud.
- [ ] Vidéo de démonstration (2 à 3 min, ordinateur et téléphone) : coller l'adresse, « Autoriser », trois questions, un devis brouillon visible dans Brix, « Couper ».

### Anthropic (annuaire des connecteurs Claude)

- [ ] Soumettre sur `https://claude.ai/directory/manage` › Submit new › MCP connector (n'importe quelle offre payante).
- [ ] Nom (100 caractères) : « Brix ». Phrase d'accroche (200) : « Interrogez vos devis, factures, chantiers et planning Brix, et préparez des brouillons, depuis Claude. » Description (2 000), 1 à 5 catégories, URL de doc, de confidentialité, contact, icône, slug définitif (`brix`).
- [ ] Authentification : CIMD et DCR (déjà en place). Adresses de retour de Claude : `https://claude.ai/api/mcp/auth_callback` et `https://claude.com/api/mcp/auth_callback` (acceptées automatiquement via CIMD / DCR).
- [ ] Cocher les 7 attestations de conformité ; décrire les données traitées.
- [ ] Vérifié par nos soins : chaque outil a `title` et `readOnlyHint` / `destructiveHint`, noms ≤ 64 caractères, lecture et écriture séparées, pas d'instruction qui oriente le modèle, erreurs utiles, réponses paginées, pas de mouvement d'argent.
- [ ] Prévoir un compte de test si la fiche passe en « Verified » (demande par e-mail).

### OpenAI (annuaire des applications ChatGPT)

- [ ] Compte OpenAI vérifié (individu ou entreprise), rôle propriétaire ou « Apps Management Write ».
- [ ] Vérification du domaine : mettre le jeton fourni par OpenAI dans le secret `OPENAI_APPS_CHALLENGE` (`wrangler secret put OPENAI_APPS_CHALLENGE`), servi sur `https://app.brix-app.fr/.well-known/openai-apps-challenge`.
- [ ] Paquet : `displayName` « Brix » (≤ 30), `shortDescription` « Devis, factures et chantiers » (≤ 30), `longDescription` (≤ 4 000), catégorie, logo, 3 invites par défaut (≤ 128) :
  - « Qui me doit de l'argent en ce moment ? »
  - « Prépare un devis brouillon pour Michel Roux : borne de recharge 7 kW posée. »
  - « Qu'est-ce que j'ai au planning cette semaine ? »
- [ ] URLs site, support, confidentialité et CGU du même éditeur.
- [ ] Déclaration commerce : aucune vente dans ChatGPT.
- [ ] 5 cas positifs et 3 cas négatifs (ci-dessous), vidéo, compte de test.

#### Cas de test positifs

1. **Impayés** : « Qui me doit de l'argent ? » → `lister_impayes` ; la réponse cite les numéros de facture, les clients, les montants restants et les jours de retard du compte de démo.
2. **Chiffre d'affaires** : « Combien j'ai facturé ces 3 derniers mois, et combien de devis ai-je signés ? » → `calculer_chiffre_affaires {mois: 3}` ; montants HT par mois et taux de transformation.
3. **Recherche et lecture** : « Montre-moi le devis de Claire Lefèvre » → `search` puis `fetch` (ou `lister_devis` puis `lire_devis`) ; lignes et totaux, lien vers Brix cliquable.
4. **Planning** : « Qu'est-ce que l'équipe a au planning demain ? » → `lire_planning {du, au}` ; créneaux par personne avec le chantier.
5. **Brouillon** (accès « Lecture et actions ») : « Prépare un devis brouillon pour Michel Roux : borne 7 kW à 1 200 € HT et 4 h de pose à 55 € » → ChatGPT demande confirmation, `creer_devis_brouillon` ; numéro `D-2026-…`, statut brouillon, total 1 420 € HT ; le devis apparaît dans Brix, rien n'est envoyé au client.

#### Cas de test négatifs

1. **Lecture seule** : accès autorisé en « Lecture seule », demander « Crée un client Paul Arnaud » → l'outil n'est pas proposé ; s'il est appelé, refus HTTP 403 `insufficient_scope`, aucune donnée modifiée.
2. **Hors périmètre** : « Envoie la facture F-2026-201 au client par e-mail » ou « Paie mon fournisseur » → aucun outil ne le permet ; l'assistant explique qu'il faut le faire dans Brix (au plus `marquer_relance_a_faire`, qui n'envoie rien).
3. **Élément inexistant** : « Ouvre le devis D-1999-001 » → `lire_devis` renvoie `isError` avec un message en français qui propose `lister_devis` ; pas d'invention de données.

## Reste à faire

- Connecter l'écran `#/connexion` au paramètre `retour` (après connexion, revenir sur `#/autoriser?req=…`).
- Tester de bout en bout avec chaque client réel (Claude, ChatGPT, Le Chat, Perplexity, Grok, Cursor, VS Code, Copilot Studio) une fois déployé sur `app.brix-app.fr`.
- Afficher dans l'app les marques `relanceAFaire` (Relances) et la provenance `brix-ai`.
- Facultatif : `private_key_jwt` pour ChatGPT (vérification des assertions via son `jwks_uri`).
