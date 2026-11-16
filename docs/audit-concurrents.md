# Audit concurrentiel Brix — premier jet

_16 novembre 2026 · Premier jet, publié vite pour que les chantiers app, fournisseurs/MCP et landing puissent s'en servir. Les prix et le statut « facture électronique » de chaque concurrent sont en cours de vérification par des agents de recherche ; une version sourcée remplacera ce jet dans la même PR._

> Légende : ✅ oui · 🟡 partiel / en option · ❌ non · ❔ à vérifier

## 1. En une phrase

Le marché se coupe en deux : des **outils simples de devis-factures** pour artisans seuls (Obat, Tolteck, Batappli, Henrri, Onaya) et des **ERP lourds** pour PME (EBP Bâtiment, Sage Batigest, Extrabat, Graneet). Personne ne fait les deux. **Brix vise à être le seul logiciel qui s'adapte à la taille de l'entreprise, de 1 à 50 personnes, avec l'IA et les fournisseurs reliés au cœur du produit, pas en option.**

## 2. Les concurrents

| Logiciel | Cible | Force | Faiblesse principale |
|---|---|---|---|
| **Obat** | Artisans seuls à TPE | Devis vocal IA, finance (paiement, affacturage), parrainage agressif | Peu de gestion d'équipe, RH absente, IA limitée au devis |
| **Tolteck** | Artisans seuls | Très simple, mobile, hors-ligne | Fonctions de gestion minimales, pas de planning d'équipe |
| **Batappli** | Artisans à TPE | Devis, planning, suivi chantier | Interface datée, IA quasi absente |
| **Henrri** | Indépendants tous secteurs | Gratuit | Pas du tout BTP (pas de situations, pas de bibliothèque de prix) |
| **Onaya** | Artisans à TPE | Devis-factures BTP en ligne | Peu différencié |
| **Axonaut** | TPE tous secteurs | CRM + facturation + trésorerie | Pas métier BTP |
| **EBP Bâtiment** | TPE-PME | Profondeur fonctionnelle, réseau de revendeurs | Logiciel installé ou cloud vieillissant, formation payante, mobile faible |
| **Sage Batigest** | PME | Situations, rentabilité, écosystème Sage | Cher, complexe, ergonomie ancienne |
| **Extrabat** | TPE-PME (rénovation, CVC) | CRM commercial poussé, terrain | Prix et paramétrage lourds |
| **Graneet** | PME (gros œuvre, second œuvre) | Rentabilité chantier, situations | Pas pour l'artisan seul |
| **« Tertisan »** | Tout-en-un avec paie | ❔ Nom exact en cours d'identification | ❔ |

## 3. Matrice fonctionnelle (premier jet)

| Fonction | Obat | Tolteck | Batappli | EBP Bât. | Batigest | Extrabat | Graneet | Axonaut | **Brix V2** |
|---|---|---|---|---|---|---|---|---|---|
| Devis / factures BTP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Bibliothèque de prix | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ✅ 50 000 prix |
| Situations, acomptes, retenue de garantie | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Facture électronique 2026 (PA) | ❔ | ❔ | ❔ | ❔ | ❔ | ❔ | ❔ | ❔ | ✅ Factur-X + PA |
| Signature électronique | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ❔ | ✅ | ✅ |
| Paiement en ligne | ✅ | 🟡 | ❔ | 🟡 | 🟡 | ❔ | ❔ | ✅ | ✅ Stripe |
| Financement client | ✅ | ❌ | ❌ | ❌ | ❌ | ❔ | ❌ | ❌ | ✅ Alma, Floa, Ploutos |
| Planning d'équipe | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Pointage / heures | ❌ | ❌ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ❌ | ✅ |
| RH / paie | ❌ | ❌ | ❌ | 🟡 EBP Paie | 🟡 Sage Paie | ❌ | ❌ | ❌ | ✅ (pré-paie + export) |
| Rentabilité chantier | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ temps réel |
| Commandes fournisseurs | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ + IA |
| Catalogues négoces (FAB-DIS) | ❔ | ❌ | ❔ | ✅ | ✅ | ❔ | ❔ | ❌ | ✅ |
| Stocks | ❌ | ❌ | ❌ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ |
| Appli mobile complète | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ iOS, Android |
| IA devis (voix, photo) | ✅ voix | ❔ | ❌ | ❔ | ❔ | ❔ | ❔ | ❌ | ✅ voix, photo, texte |
| Assistant IA qui agit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Bob |
| Serveur MCP (Claude, ChatGPT) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❔ | ✅ Brix AI MCP |
| Site vitrine, avis Google, réseaux | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| WhatsApp client | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Onboarding personnalisé par métier | 🟡 | ❌ | ❌ | 🟡 revendeur | 🟡 revendeur | 🟡 | 🟡 | ❌ | ✅ |

## 4. Brix fait mieux / Brix a inventé

### Brix fait mieux

1. **Devis IA multimodal** : voix, photo du chantier, texte libre ou plan, là où Obat ne fait que la voix.
2. **Facture électronique native** : Factur-X, plateforme agréée, réception des factures fournisseurs, e-reporting, sans module à part.
3. **Une seule app pour 1 à 50 personnes** : les modules s'allument selon le métier et la taille, au lieu de choisir entre un outil simple et un ERP.
4. **Encaisser plus vite** : paiement en ligne sur chaque facture, relances automatiques, financement client (Alma, Floa, Ploutos).
5. **Mobile d'abord** : tout se fait au téléphone, y compris sur chantier, pas une version allégée.
6. **Prix lisible** : une offre gratuite réelle, puis un prix par mois sans formation payante ni revendeur.

### Brix a inventé (aucun concurrent ne le fait)

1. **Brix AI MCP** : l'artisan branche Claude ou ChatGPT sur son entreprise (« fais le devis de Mme Lefèvre », « qui ne m'a pas payé ? »).
2. **Bob, l'assistant qui agit** : il crée le devis, relance le client, commande le matériel, remplit le planning, pas seulement il répond.
3. **Onboarding sur mesure** : l'artisan dit son métier, sa taille et ce qu'il veut ; le logiciel se configure seul (modules, bibliothèque, modèles de devis, mentions légales).
4. **Portail fournisseurs** : demandes de prix envoyées à plusieurs négoces, comparaison, commande, lecture IA des factures fournisseurs et rapprochement avec le chantier.
5. **Croissance intégrée** : site vitrine, fiche Google, avis, réseaux sociaux et prospection dans le même outil.
6. **WhatsApp comme canal client** : devis envoyé, signé et payé depuis WhatsApp.

## 5. Ce que Brix doit avoir pour être sans conteste le meilleur

Priorité 1, avant le lancement :
- Onboarding par métier et par taille, en moins de 5 minutes, avec import depuis Obat, Tolteck, Batappli ou Excel.
- Devis IA voix + photo + texte, bibliothèque de prix, situations, acomptes, retenue de garantie, autoliquidation.
- Facture électronique complète (émission, réception, e-reporting) avant le 1er septembre 2027.
- Paiement en ligne, relances automatiques, signature électronique.
- Appli mobile complète, utilisable hors réseau sur chantier.

Priorité 2 :
- Planning d'équipe, pointage, pré-paie et export vers la paie (Silae, PayFit).
- Rentabilité chantier en temps réel (heures, achats, sous-traitance).
- Fournisseurs : catalogues FAB-DIS, demandes de prix, commandes, factures fournisseurs lues par IA.
- Brix AI MCP et API publique.

Priorité 3 :
- Stocks, véhicules, SAV et contrats d'entretien.
- Site vitrine, avis Google, réseaux sociaux.
- Financement client et aides (MaPrimeRénov', CEE).

## 6. À vérifier (en cours)

- Prix exacts et offres de chaque concurrent au 16/11/2026.
- Statut facture électronique de chacun (plateforme agréée ou partenaire).
- Identité de « Tertisan ».
- Fonctions IA réelles de chacun, et qui propose déjà un MCP.
- Connexions existantes entre logiciels artisans et négoces (Point.P, Cedeo, Rexel…).
