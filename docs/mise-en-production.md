# Mise en production de l'app Brix : ce que Marceau doit créer

Rien n'est déployé. Ce document liste les comptes et les clés à créer, dans l'ordre. Le détail technique de chaque parcours est dans `docs/parcours/README.md` (Cloudflare, Brevo, Stripe, Yousign, VAPID), celui de Brix AI dans `docs/brix-ai/README.md`.

## 1. Indispensable pour ouvrir l'app (comptes, cloud, Bob)

| Quoi | Où | Ce qu'il faut faire | Ce que ça débloque |
|---|---|---|---|
| **Cloudflare** (offre Workers Paid, 5 $/mois) | dash.cloudflare.com | Créer le compte, ajouter le domaine `brix-app.fr`, puis me laisser lancer `npx wrangler login` sur le Mac. Je crée ensuite la base D1 `brix-v2-db` et le stockage R2 `brix-v2-files`, j'applique les schémas (`./worker/migrate.sh --remote`) et je relie `app.brix-app.fr`. | Les comptes, la synchronisation entre appareils, les liens clients, le MCP. |
| **Secrets de base** | (je les génère) | `JWT_SECRET` et `PUBLIC_LINK_SECRET` (48 caractères aléatoires, à ne jamais changer ensuite), `ENVIRONMENT=production`. | Sessions et liens publics sûrs. |
| **Google Cloud (connexion Google)** | console.cloud.google.com | 1. Créer un projet « Brix ». 2. Écran de consentement OAuth : Externe, nom Brix, e-mail d'assistance, domaine autorisé `brix-app.fr`, champs d'application `openid`, `email`, `profile`, liens accueil / confidentialité / conditions. 3. Identifiants › Créer un ID client OAuth › **Application Web**. Origines JavaScript autorisées : `https://app.brix-app.fr` et `http://localhost:5173`. Aucune URI de redirection n'est nécessaire. 4. **Publier** l'écran de consentement (sinon seuls les testeurs peuvent se connecter). 5. M'envoyer l'**ID client** (il n'est pas secret ; le code secret n'est pas utile). | « Continuer avec Google » à l'inscription et à la connexion. |
| **Anthropic (Bob)** | platform.claude.com | Créer une organisation, ajouter un moyen de paiement, créer une clé API, la saisir avec `npx wrangler secret put ANTHROPIC_API_KEY` (ou me la donner pour que je la saisisse, jamais dans un fichier). Coût estimé : 1 à 3 centimes par question, plafond de 300 questions par jour et par entreprise. | Bob répond vraiment (sinon il reste sur le mode hors ligne). |
| **E-mails (Brevo)** | app.brevo.com | Créer le compte, authentifier le domaine d'envoi (`brix-app.fr` ou `mail.brix-app.fr`) en ajoutant chez l'hébergeur DNS les enregistrements SPF, DKIM et `_dmarc` donnés par Brevo, créer une clé API (`BREVO_API_KEY`), choisir l'expéditeur (`EMAIL_FROM`, par exemple `devis@brix-app.fr`). Webhook : `https://app.brix-app.fr/api/emails/webhook/brevo` avec un secret partagé (`EMAIL_WEBHOOK_SECRET`). | Mot de passe oublié, envoi des devis et factures, relances. |

## 2. Recommandé avant les premiers clients

| Quoi | Où | Ce qu'il faut faire |
|---|---|---|
| **Stripe** (paiement des factures en ligne) | dashboard.stripe.com | Activer le compte (Kbis, IBAN, pièce d'identité), activer Connect (comptes Express), Apple Pay / Google Pay et vérifier le domaine `brix-app.fr`. Clés `STRIPE_SECRET_KEY`. Deux webhooks vers `https://app.brix-app.fr/api/paiements/webhook/stripe` : un pour `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` (`STRIPE_WEBHOOK_SECRET`), un « comptes connectés » pour `account.updated` (`STRIPE_CONNECT_WEBHOOK_SECRET`). Commencer en mode test. **Important** : sans clé Stripe, la route de paiement de démonstration reste ouverte ; ne pas lancer en production sans Stripe. |
| **SMS (Brevo)** | Brevo › SMS | Acheter des crédits, déclarer l'expéditeur « Brix ». Je règle `SMS_PROVIDER=brevo`. Sert aux codes de signature des devis. |
| **Notifications push** | (je les génère) | Clés VAPID (`npx web-push generate-vapid-keys`), jamais changées ensuite. |
| **Pages légales** | site brix-app.fr | Politique de confidentialité, conditions d'utilisation, adresse de support (`support@brix-app.fr` est déjà cité dans l'app). Obligatoire pour Google, Apple, Anthropic et OpenAI. |
| **GitHub** | sur le Mac | Le Mac n'a aucun accès GitHub : il faudra une fois `gh auth login` (code à saisir sur github.com/login/device) pour que je pousse les branches. |

## 3. Brix AI dans les annuaires Claude et ChatGPT (après le déploiement)

- **Anthropic** (claude.ai/directory/manage) : nom, description courte et longue, icône, pages confidentialité et support, compte de démonstration sans double authentification. Les cas de test sont rédigés dans `docs/brix-ai/README.md`.
- **OpenAI** (plateforme développeurs) : vérification de l'entreprise, jeton de domaine (`npx wrangler secret put OPENAI_APPS_CHALLENGE`), compte de démonstration, vidéo de démonstration, 5 cas positifs et 3 négatifs (déjà rédigés).

## 4. Plus tard

- **Facture électronique** (obligatoire en réception depuis septembre 2026) : contrat avec une plateforme agréée (SuperPDP, Invopop…). Le XML Factur-X / UBL est prêt, l'envoi par la plateforme reste à brancher.
- **Banque (Bridge)**, **Alma** (paiement en 3 fois, il faut un compte marchand par artisan), **Yousign** (signature avancée, optionnelle) : non branchés.
- **Apple** : compte Apple Developer (99 $/an) pour « Se connecter avec Apple » et la publication sur l'App Store.
- **Paie** : faire valider les calculs par un expert-comptable avant usage réel.
