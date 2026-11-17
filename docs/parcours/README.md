# Parcours externes : devis, signature, paiement, notifications

Ce document décrit ce que voit le client de l'artisan (lien reçu par e-mail, page publique, signature, paiement) et ce que reçoit l'artisan en retour (e-mails, notifications). Il dit ce qui fonctionne déjà, ce qui est simulé, et surtout ce qu'il reste à fournir pour passer en réel.

Code : `worker/src/modules/documents`, `signature`, `paiements`, `notifications`. Tests : `worker/src/modules/documents/tests`, `worker/src/modules/notifications/tests` (`npm test`).

## 1. Les flux

```
 ARTISAN (app Brix)                         WORKER (api)                                  CLIENT (téléphone)
 ───────────────────                        ────────────                                  ──────────────────
 Devis prêt ──► POST /api/documents/liens ─► jeton signé HMAC, opaque, expirant
               (+ compléments : CGV,          documents_liens
                variantes, hors établ.)
 E-mail « devis_envoye » (module e-mails) ──────────────────────────────────────────────► lien https://…/#/d/<jeton>
                                            GET /api/p/devis/:jeton ◄──────────────────── ouvre la page
                                            ├ journal d'ouverture (IP tronquée, appareil)
 Notification « devis ouvert » ◄────────────┤ (1 fois par 30 min au plus)
                                            └ statut du devis : envoyé → vu
                                            POST /api/p/devis/:jeton/code ◄─────────────── « Signer »
                                            ├ code 6 chiffres haché, 10 min, 5 essais
                                            └ e-mail « code_signature » (ou SMS) ─────────► reçoit le code
                                            POST /api/p/devis/:jeton/signer ◄───────────── code + nom + cases + signature dessinée
                                            ├ empreinte SHA-256 du document canonique
                                            ├ dossier de preuve scellé → R2 (JSON + certificat HTML + PNG)
                                            ├ devis → « signé »
 E-mail « devis_signe_artisan » ◄───────────┤ e-mail « devis_signe_client » ─────────────► copie + empreinte
 Notification « devis signé » ◄─────────────┘
                                            POST /api/p/devis/:jeton/acompte ◄──────────── « Verser l'acompte »
                                            ├ hors établissement : bloqué 7 jours (L221-10)
                                            ├ facture d'acompte créée (FA-AAAA-NNNN)
                                            └ session Stripe Checkout (Connect) ──────────► paie (carte, Apple Pay, Google Pay, virement)
                       Stripe ─► POST /api/paiements/webhook/stripe (signature vérifiée, anti-rejeu)
                                            ├ écriture de paiement (unique par payment_intent)
                                            ├ facture → payée / partielle
 E-mail « paiement_recu_artisan » ◄─────────┤ e-mail « paiement_recu_client » ────────────► reçu
 Notification + push « Vous êtes payé » ◄───┘

 Facture envoyée ──► lien /#/f/<jeton> ──── GET /api/p/facture/:jeton (+ moyens disponibles) ◄── ouvre
                                            POST /api/p/facture/:jeton/payer { moyen } ◄──── carte / virement / 3 fois
 Chantier ──► lien /#/p/<jeton> ─────────── GET /api/p/chantier/:jeton (avancement, étapes)

 FOURNISSEURS (module fournisseurs, déjà en place) : demande de prix ou commande ─► e-mail ─► portail
 /#/portail-fournisseur/<jeton> ─► réponse ─► comparatif côté artisan. Mêmes principes : jeton haché, pas de compte.
```

## 2. Réel ou simulé

| Brique | Sans clé (aujourd'hui) | Avec clé |
|---|---|---|
| Liens publics | Réels. Secret dérivé de `JWT_SECRET` si `PUBLIC_LINK_SECRET` manque | `PUBLIC_LINK_SECRET` (à mettre avant la mise en ligne) |
| Page devis, facture, chantier | Réelles | idem |
| Code de signature par e-mail | Le code est généré, haché et « envoyé » par `envoyerEmail` (simulé tant que le module e-mails n'a pas de clé). Avec `PARCOURS_DEMO=1`, la réponse contient `codeDemo` | Brevo ou Resend (module e-mails) |
| Code par SMS | Indisponible : le code part par e-mail | `SMS_PROVIDER` = `brevo` ou `twilio` |
| Signature simple + dossier de preuve | Réels (D1 + R2) | idem |
| Signature avancée / qualifiée | Inactive | `SIGNATURE_PROVIDER=yousign` + `YOUSIGN_API_KEY` + PDF du devis déposé par l'app |
| Paiement carte | Page de démo `/#/paiement-demo/<session>` ; le bouton appelle `POST /api/p/paiement-demo/:session/confirmer` et la facture passe payée | Stripe Checkout + Connect |
| Virement | Instructions avec le RIB de l'artisan (IBAN du document ou des réglages) | Stripe : IBAN virtuel dédié (rapprochement automatique) |
| Paiement en 3 fois | Masqué | Alma (`ALMA_API_KEY`) |
| Notifications dans l'app | Réelles | idem |
| Push navigateur (PWA) | Rien ne part (`simule`) | VAPID |
| Push iPhone / Android (Capacitor) | Rien ne part | APNs et/ou FCM |

## 3. Ce qui attend Marceau

Dans l'ordre. Chaque secret se pose depuis la racine du dépôt avec `npx wrangler secret put NOM` (la commande demande la valeur, qui ne s'affiche pas et n'est jamais écrite dans le dépôt). Les prix sont indicatifs : « à vérifier » quand je ne suis pas certain du tarif actuel.

### 3.1 Cloudflare (obligatoire)

1. **Compte Cloudflare** : https://dash.cloudflare.com/sign-up. Passer à l'offre **Workers Paid** (5 $ par mois, à vérifier sur https://developers.cloudflare.com/workers/platform/pricing/) : elle lève les limites de requêtes et de temps de calcul du plan gratuit.
2. **Se connecter** : `npx wrangler login`.
3. **Base D1** : `npx wrangler d1 create brix-v2-db`, puis recopier le `database_id` affiché dans `wrangler.toml`.
4. **Schémas** (cœur d'abord, puis les modules) :
   ```
   ./worker/migrate.sh --remote
   npx wrangler d1 execute brix-v2-db --remote --file=worker/src/modules/documents/schema.sql
   npx wrangler d1 execute brix-v2-db --remote --file=worker/src/modules/signature/schema.sql
   npx wrangler d1 execute brix-v2-db --remote --file=worker/src/modules/paiements/schema.sql
   npx wrangler d1 execute brix-v2-db --remote --file=worker/src/modules/notifications/schema.sql
   ```
   (ou ajouter ces 4 fichiers à `worker/migrate.sh`).
5. **Stockage R2** (dossiers de preuve, certificats, PDF) : activer R2 dans le tableau de bord, puis `npx wrangler r2 bucket create brix-v2-files`. 10 Go gratuits par mois puis environ 0,015 $ par Go et par mois (à vérifier). Le bucket doit rester **privé** : les preuves ne sont servies que par le worker.
6. **Domaine** : acheter `brix-app.fr` (ou autre) chez un registraire, ou chez Cloudflare Registrar (prix coûtant, une dizaine d'euros par an pour un .fr, à vérifier). Le rattacher au worker : tableau de bord > Workers > brix-v2 > Paramètres > Domaines et routes (`app.brix-app.fr` pour l'app, `brix-app.fr` pour les liens clients si vous voulez des liens courts).
7. **Secrets de base** :
   - `npx wrangler secret put JWT_SECRET` : 64 caractères aléatoires (`openssl rand -base64 48`).
   - `npx wrangler secret put PUBLIC_LINK_SECRET` : 64 caractères aléatoires, **différent** de JWT_SECRET. Le changer invalide tous les liens déjà envoyés et les sceaux des dossiers de preuve existants deviennent invérifiables : à générer une fois et à conserver dans un coffre (1Password, Bitwarden).
8. **Variables** (`wrangler.toml`, section `[vars]`) : `PUBLIC_BASE_URL` (ex. `https://brix-app.fr`), `SIGNATURE_PROVIDER = "brix"`, `STRIPE_PLATFORM_FEE_BPS = "0"` (commission Brix, 100 = 1 %).

### 3.2 E-mails transactionnels (obligatoire, branché par le module e-mails)

Brevo (français, déjà prévu par l'espace fournisseurs) ou Resend.
1. Compte : https://www.brevo.com (offre gratuite : 300 e-mails par jour, à vérifier) ou https://resend.com (gratuit jusqu'à 3 000 e-mails par mois, à vérifier).
2. **Domaine d'envoi** (ex. `mail.brix-app.fr`) : le fournisseur donne les enregistrements DNS à créer chez Cloudflare :
   - **SPF** : `TXT` `v=spf1 include:<fournisseur> ~all` (valeur exacte donnée par Brevo/Resend) ;
   - **DKIM** : un ou deux enregistrements `TXT`/`CNAME` donnés par le fournisseur ;
   - **DMARC** : `TXT` sur `_dmarc.brix-app.fr` : `v=DMARC1; p=none; rua=mailto:dmarc@brix-app.fr` au départ, puis `p=quarantine` après quelques semaines sans erreur.
   Sans ces trois enregistrements, les codes de signature finiront en courrier indésirable.
3. Clé : `npx wrangler secret put BREVO_API_KEY` (Brevo > SMTP et API > Clés API) ou la clé Resend selon ce que retient le module e-mails.

### 3.3 Stripe (paiement en ligne)

1. Compte : https://dashboard.stripe.com/register, activer le compte (Kbis, IBAN de Brix, pièce d'identité).
2. **Connect** : Paramètres > Connect > activer, type de comptes **Express**. Chaque artisan crée son compte depuis l'app (`POST /api/paiements/connect`) : l'argent va directement sur son compte, Brix ne le détient jamais. Frais Connect Express : environ 2 $ par compte actif et par mois + frais par virement sortant, quand la plateforme gère la tarification (à vérifier sur https://stripe.com/fr/connect/pricing).
3. Frais de paiement par carte européenne : environ 1,5 % + 0,25 € (à vérifier sur https://stripe.com/fr/pricing). Apple Pay et Google Pay : activer dans Paramètres > Moyens de paiement, et **valider le domaine** Apple Pay (Paramètres > Apple Pay > ajouter `brix-app.fr`).
4. **Virement** (customer_balance) : activer « Virements bancaires » dans les moyens de paiement. À vérifier : compatibilité exacte avec les paiements à destination d'un compte connecté.
5. **Clé secrète** : Développeurs > Clés API. `npx wrangler secret put STRIPE_SECRET_KEY` (commencer par `sk_test_…`, passer à `sk_live_…` au lancement).
6. **Webhooks** : Développeurs > Webhooks > Ajouter un point de terminaison :
   - URL `https://app.brix-app.fr/api/paiements/webhook/stripe`, événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` → `npx wrangler secret put STRIPE_WEBHOOK_SECRET` (`whsec_…`) ;
   - même URL, « Écouter les événements des comptes connectés », événement `account.updated` → `npx wrangler secret put STRIPE_CONNECT_WEBHOOK_SECRET`.
7. Test de bout en bout : `stripe listen --forward-to localhost:8787/api/paiements/webhook/stripe` (CLI Stripe) pendant `npm run worker:dev`.

### 3.4 Paiement en 3 fois (optionnel) : Alma

https://getalma.eu. Point d'attention : la clé Alma est celle d'un compte marchand. Si Brix utilise sa propre clé, c'est Brix qui encaisse pour l'artisan, ce qui suppose un statut réglementé (agent de prestataire de services de paiement). La bonne voie : un compte Alma par artisan et une clé par entreprise (à stocker chiffrée, non fait). En attendant, laisser `ALMA_API_KEY` vide : l'option est masquée. Commission par transaction : à vérifier avec Alma. `npx wrangler secret put ALMA_API_KEY`, et en test `ALMA_BASE_URL = "https://api.sandbox.getalma.eu"` dans `[vars]`.

### 3.5 Signature avancée ou qualifiée (optionnel) : Yousign

La signature simple de Brix suffit pour un devis (voir `dossier-de-preuve.md`). Yousign sert si un client professionnel ou un gros marché l'exige.
1. Compte API : https://yousign.com/fr-fr/api (offres et prix : à vérifier, plutôt pour un volume de plusieurs centaines de signatures par mois).
2. `npx wrangler secret put YOUSIGN_API_KEY` ; `[vars]` : `SIGNATURE_PROVIDER = "yousign"`, `YOUSIGN_BASE_URL = "https://api-sandbox.yousign.app/v3"` en test, `YOUSIGN_SIGNATURE_LEVEL = "advanced_electronic_signature"` si besoin.
3. Webhook Yousign vers `https://app.brix-app.fr/api/signature/webhook/yousign`, événement `signature_request.done` → `npx wrangler secret put YOUSIGN_WEBHOOK_SECRET`.
4. Côté app : déposer le PDF du devis (`PUT /api/documents/pdf/devis/:id`) contenant l'ancre `{{s1|signature|180|60}}` à l'emplacement de la signature.

### 3.6 SMS (optionnel, code de signature par SMS)

- **Brevo** (même compte que les e-mails) : acheter des crédits SMS (prix par SMS vers la France : à vérifier), puis `[vars]` `SMS_PROVIDER = "brevo"`, `SMS_SENDER = "Brix"` (11 caractères maximum).
- **Twilio** : https://www.twilio.com, `SMS_PROVIDER = "twilio"`, `npx wrangler secret put TWILIO_ACCOUNT_SID`, `npx wrangler secret put TWILIO_AUTH_TOKEN`, `npx wrangler secret put TWILIO_FROM` (numéro ou identifiant d'expéditeur ; règles françaises sur les expéditeurs alphanumériques : à vérifier).

### 3.7 Notifications push

- **Navigateur / PWA (VAPID, gratuit)** : `npx web-push generate-vapid-keys --json`, puis `npx wrangler secret put VAPID_PUBLIC_KEY`, `npx wrangler secret put VAPID_PRIVATE_KEY`, et `[vars]` `VAPID_SUBJECT = "mailto:contact@brix-app.fr"`. Ne jamais changer ces clés ensuite (tous les abonnements tomberaient).
- **iPhone (APNs)** : compte Apple Developer (99 $ par an). Certificates, Identifiers & Profiles > Keys > « + » > Apple Push Notifications service : télécharger le fichier `.p8` (une seule fois). `npx wrangler secret put APNS_PRIVATE_KEY` (coller le contenu du `.p8`), `npx wrangler secret put APNS_KEY_ID`, `npx wrangler secret put APNS_TEAM_ID` ; `[vars]` `APNS_BUNDLE_ID = "fr.brix.app"` (l'identifiant de l'app Capacitor), `APNS_SANDBOX = "1"` en développement.
- **Android (FCM, gratuit)** : console Firebase > projet > Paramètres > Comptes de service > « Générer une nouvelle clé privée ». `npx wrangler secret put FCM_SERVICE_ACCOUNT_JSON` (coller le JSON entier). Ajouter `google-services.json` au projet Android.

### 3.8 Récapitulatif des secrets

| Secret | Obligatoire | Où le trouver |
|---|---|---|
| `JWT_SECRET` | oui | à générer |
| `PUBLIC_LINK_SECRET` | oui | à générer |
| `BREVO_API_KEY` (ou Resend) | oui | Brevo > SMTP et API |
| `STRIPE_SECRET_KEY` | pour encaisser | Stripe > Développeurs > Clés API |
| `STRIPE_WEBHOOK_SECRET` | avec Stripe | Stripe > Webhooks |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | avec Stripe | Stripe > Webhooks (comptes connectés) |
| `ALMA_API_KEY` | non | Alma > Tableau de bord > API |
| `YOUSIGN_API_KEY`, `YOUSIGN_WEBHOOK_SECRET` | non | Yousign > Développeurs |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | non | Twilio > Console |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | pour le push web | à générer |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` | pour le push iPhone | Apple Developer > Keys |
| `FCM_SERVICE_ACCOUNT_JSON` | pour le push Android | Firebase > Comptes de service |

## 4. Sécurité, en bref

- **Jetons** : 16 octets aléatoires + HMAC-SHA256 tronqué à 16 octets, liés au type de document. Non stockés (recalculés), révocables, expirants (devis 90 j, facture 400 j, chantier 730 j par défaut). Forme canonique exigée.
- **Codes** : 6 chiffres tirés sans biais, HMAC en base, 10 min, 5 essais comptés avant comparaison, un nouveau code annule l'ancien, consommation atomique.
- **Limitation de débit** : table D1 `parcours_limites` (fenêtre fixe). D1 plutôt que KV car KV est à cohérence éventuelle (jusqu'à 60 s), ce qui laisserait passer des rafales. Clés d'IP hachées. Seuils : 120 ouvertures par minute et par IP, 3 codes par quart d'heure et par lien, 10 codes par heure et par IP, 30 tentatives de signature par heure et par IP, 5 questions par heure, 10 demandes de paiement par 10 min. Si le trafic grossit : binding Rate Limiting de Cloudflare ou Durable Object.
- **Webhooks** : Stripe (HMAC de « t.corps », tolérance 5 min, temps constant, plusieurs v1 acceptées), anti-rejeu par id d'événement, idempotence par `payment_intent`. Alma : jamais de confiance dans l'appel entrant, le paiement est relu chez Alma. Yousign : HMAC du corps.
- **Erreurs** : codes stables (`lien_invalide`, `code_incorrect`…) et messages lisibles ; jamais de détail interne (500 = « Une erreur est survenue »).
- **Vues publiques** : jamais de prix d'achat ni de marge ; `cache-control: no-store`, `referrer-policy: no-referrer` (le jeton ne fuit pas vers les sites tiers), `x-robots-tag: noindex`.
- **CORS** : géré par `index.ts`. Si les pages clients sont servies sur `brix-app.fr` et l'API sur `app.brix-app.fr`, ajouter `PUBLIC_BASE_URL` à la liste des origines autorisées (voir le rapport d'intégration) ; si tout est sur le même domaine, rien à faire.

## 5. Ce qu'il reste à faire

1. Brancher les 4 modules dans `worker/src/index.ts`, `env.ts`, `wrangler.toml` (lignes exactes dans le rapport de l'intégration) et le cron `cronParcours`.
2. Front : brancher `DevisPublic`, `FacturePublique`, `ClientPortal` et une page `/paiement-demo/:session` sur ces routes (aujourd'hui elles lisent le store local de la démo).
3. Numérotation des factures d'acompte : aligner `FA-AAAA-NNNN` avec le module Factures (une série par entreprise, sans trou).
4. Alma : clé par entreprise (voir 3.4).
5. PDF du devis côté app, pour Yousign et pour la pièce jointe de l'e-mail « devis signé ».
6. Durée de conservation : purge planifiée des journaux d'ouverture (13 mois proposés) ; les dossiers de preuve se conservent 5 ans après la fin du contrat au minimum (prescription de droit commun, article 2224 du Code civil), 10 ans recommandés pour les travaux couverts par la garantie décennale.
7. Premier essai réel de chaque prestataire en mode test (Stripe, Yousign, Alma, APNs) : plusieurs détails sont marqués « à vérifier » dans le code.
