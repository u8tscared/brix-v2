# Brix V2

La nouvelle application Brix pour les artisans du bâtiment : devis à la voix, factures et facture électronique, chantiers, planning, équipe et paie, achats et fournisseurs, et Bob, l'assistant qui agit. Une seule app pour l'auto-entrepreneur comme pour l'entreprise de 200 personnes : à l'inscription, l'artisan dit son métier, sa taille et ses priorités, et Brix n'active que ce qui lui sert.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173
```

Entrées utiles (l'app utilise un routeur à dièse) :

| Adresse | Ce qu'on voit |
|---|---|
| `#/bienvenue` | Écran d'accueil (créer son Brix ou voir la démo) |
| `#/inscription` | Inscription en 5 étapes (`?metier=peintre` pour présélectionner) |
| `#/demo` | Démo complète : Benali Électricité, Karim Benali, électricien à Villeurbanne, 4 personnes |
| `#/p/demo` | Portail du client final (suivi du chantier, paiement) |
| `#/portail-fournisseur/demo` | Portail où un fournisseur répond à une demande de prix, sans compte |

Aucune clé ni aucun serveur n'est nécessaire : en démo, toutes les données vivent dans le navigateur (`src/lib/store.ts`, persisté en localStorage). Réglages › Compte permet de recharger la démo ou de recommencer l'inscription.

```bash
npm run typecheck  # TypeScript (app)
npm test           # tests (Factur-X, UBL, paie BTP, fournisseurs…)
npm run build      # build de production dans dist/
```

## Ce qu'il y a dedans

9 départements, 37 modules activables, 14 métiers (référentiel unique : `src/lib/catalog.ts`).

- **Vendre** : demandes qualifiées par Bob, devis (éditeur 3 colonnes, dictée vocale, bibliothèque de 178 prix, suggestions par métier, marge, variantes, signature et acompte), clients, rendez-vous en ligne, avis Google.
- **Facturer et encaisser** : factures, acomptes, situations avec retenue de garantie, soldes, avoirs ; facture électronique (XML Factur-X CII EN 16931 et UBL 2.1 validés contre les schémas officiels, cycle de vie complet, réception des factures fournisseurs, e-reporting) ; paiements (lien, Tap to Pay, 3 ou 4 fois) ; relances automatiques ; trésorerie à 90 jours ; notes de frais.
- **Chantiers** : liste et carte, fiche chantier avec résumé de Bob, météo, photos et contrôle qualité, planning d'équipe en glisser-déposer, prise de cotes guidée qui crée le devis, PV de réception signé sur place, SAV et contrats d'entretien.
- **Équipe** : rôles et droits, invitation par QR code, app ouvrier, pointage géolocalisé, congés (caisse CIBTP), habilitations avec alertes, **paie BTP** (bulletins préparés depuis les heures, paniers, zones de trajet).
- **Achats** : demandes de prix multi-fournisseurs, comparatif, commandes, portail fournisseur, API publique pour les négoces, stock, véhicules et outillage, sous-traitants (vigilance URSSAF, autoliquidation).
- **Bob** : panneau voix et texte qui agit sur les données, brief du matin lu à voix haute, agent de nuit, secrétaire téléphonique, **Brix AI MCP** pour piloter Brix depuis Claude ou ChatGPT.
- **Outils métier** : 16 calculatrices (section de câble, NF C 15-100, tableau, IRVE, évacuations, bilan thermique, peinture, calepinage, cloisons, toiture, béton…), chacune avec « Ajouter au devis ».
- **Visibilité et gestion** : site vitrine généré, réseaux sociaux, portail client, compta (export FEC, connecteurs), coffre de documents.

## Architecture

```
src/
  lib/            catalog (référentiel), store (données), types, format, status, demo
  components/ui   kit maison (Aube)          components/layout  coquille responsive
  pages/          accueil, inscription, cockpit, portail client
  modules/<x>/    un dossier par département ; registry.tsx relie routes et modules
worker/src/       Cloudflare Worker : core (auth, inscription), fournisseurs, api-publique, mcp
site/             site vitrine (dossier séparé)
```

Chaque module a un fichier `service.ts` (ou `api.ts`) avec des fonctions asynchrones : en démo elles simulent, en production elles appellent le worker. Les brancher ne change pas les écrans.

## À fournir pour la mise en production

Rien n'est déployé. Il faudra : le compte Cloudflare (D1 `brix-v2-db`, R2 `brix-v2-files`, puis `./worker/migrate.sh --remote`), et les secrets `JWT_SECRET`, `ANTHROPIC_API_KEY` (Bob), `OPENAI_API_KEY` (dictée Whisper si besoin), `STRIPE_SECRET_KEY`, `PDP_API_KEY` et `PDP_BASE_URL` (plateforme agréée : SuperPDP ou Invopop), `BRIDGE_CLIENT_ID`/`SECRET` (banque), `BREVO_API_KEY` (e-mails et SMS), `GOOGLE_CLIENT_ID`/`SECRET`. Les calculs de paie sont des ordres de grandeur 2026 à faire valider par un expert-comptable avant usage réel.
