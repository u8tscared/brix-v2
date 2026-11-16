# Audit concurrentiel Brix

_Relevé du 16 novembre 2026 · 20 logiciels étudiés · Sources vérifiées par quatre agents de recherche (pages officielles, pages tarifs, comparatifs datés 2025-2026). Chaque prix et chaque statut « facture électronique » renvoie à une source en fin de document._

> Légende : ✅ oui · 🟡 partiel, en option ou limité · ❌ non · ❔ non trouvé dans les sources (n'est pas une preuve d'absence)
>
> « Brix V2 » désigne la cible de la refonte (ce que les chantiers app, fournisseurs/MCP et landing construisent), pas l'état de la V1 en ligne.

---

## 1. Ce qu'il faut retenir

1. **Le marché est coupé en deux.** D'un côté, des outils simples pour artisans seuls (Obat, Tolteck, Batappli, Costructor, Henrri, Renalto) ; de l'autre, des ERP pour PME (EBP Bâtiment, Sage Batigest, Extrabat, Onaya, Graneet, Codial). **Aucun ne sert bien à la fois l'auto-entrepreneur et l'entreprise de 50 salariés dans une interface moderne.** Graneet refuse les entreprises sous 1 M€ de CA ; EBP, Sage, Extrabat et Onaya sont jugés complexes ; Tolteck, Henrri et Costructor plafonnent vite.
2. **Personne ne fait la paie BTP.** Ni Obat, ni Costructor, ni Graneet, ni EBP Bâtiment, ni Batigest : la paie est toujours un produit à part (EBP Paie, Sage Paie, Silae) ou un export. C'est le plus gros trou du marché.
3. **Le devis à la voix est devenu banal.** Obat (29 €/mois en option), Batappli (8 à 16 devis/mois), Costructor (crédits), Renalto, Boby, Henrri, ProGBat le font. Ce n'est plus un argument seul ; ce qui compte, c'est **l'IA qui agit sur tout le reste** (achats, planning, relances, compta).
4. **Le MCP existe déjà chez quelques acteurs, mais presque toujours en lecture seule ou en option.** Costructor (API + MCP, 10 €/mois ou Premium), Graneet (lecture seule, PME), Axonaut (bêta), Pennylane (lecture), Qonto (lecture et écriture avec validation). **Brix ne peut pas dire « on a inventé le MCP »** ; il peut dire « le seul MCP métier BTP qui lit et agit, inclus ».
5. **La facture électronique n'est plus un différenciant, c'est un ticket d'entrée.** Réception obligatoire pour tous depuis le 1er septembre 2026, émission obligatoire pour les TPE au 1er septembre 2027. Presque tout le monde passe par une plateforme agréée (PA) partenaire, souvent incluse gratuitement (Costructor la donne même en offre gratuite). Ce qui distingue encore : **les cas BTP** (situations, retenue de garantie, autoliquidation dans les données structurées) et **l'exploitation des factures fournisseurs reçues** ligne par ligne.
6. **Les fournisseurs sont un terrain presque vide.** Le mieux existant : Tolteck affiche les prix négociés Point.P et Cedeo via le compte client ; EBP se connecte à Sonepar (prix, stock, commandes) ; Extrabat a 40 catalogues en EDI ; Batappli importe 300 tarifs Excel. **Personne ne fait de demande de prix multi-fournisseurs automatique, de comparateur, ni de portail ou d'API pour les négoces.**
7. **Personne ne configure le logiciel selon le métier et les besoins à l'inscription.** Au mieux, on demande le métier puis un humain forme. Growth Gusto (même fondateur, restauration) le fait déjà : c'est le modèle à reprendre.
8. **« Tertisan » n'a pas été identifié.** Aucun logiciel de ce nom n'apparaît. Il faut que Marceau donne le lien : c'est sans doute un nom mal transcrit à la dictée.

---

## 2. Fiches concurrents

### Outils pour artisans seuls et TPE

| Logiciel | Cible | Prix HT/mois | Facture électronique | Force | Faiblesse |
|---|---|---|---|---|---|
| **Obat** | Micro à PME, 21 000 clients | Micro 25 à 95 € ; artisan/TPE 39 à 129 € (annuel / mensuel), +20 €/utilisateur, devis vocal IA +29 € | PA **Iopole**, incluse | Le plus complet du segment : situations, retenue de garantie, planning Gantt, pointage, rentabilité, OCR achats, paiement, avances sur factures, site « Studio », avis « Visibilité » | Cher, pas de paie, pas de stock, hors ligne partiel, pas d'API ouverte, planning jugé peu ergonomique |
| **Tolteck** (Saint-Gobain) | Artisans seuls, 33 000 utilisateurs | 19 € (annuel) ou 25 €, une seule offre | PA intégrée (nom non publié) + réception via Pennylane | Très simple, **vrai hors ligne**, **prix négociés Point.P et Cedeo** dans le devis | Pas de signature, pas de planning, pas de chantier, pas de banque, aucune IA |
| **Batappli** | Auto-entrepreneur à PME, depuis 1988 | Devis 39 €, Artisan 79 €, +19 €/utilisateur | PA **Cecurity eFacture**, incluse | Batichiffrage inclus, import de 300 tarifs fournisseurs, stocks, contrats d'entretien, IA de devis | IA plafonnée (8 ou 16 devis/mois), pas de banque, interface ancienne |
| **Costructor** | Indépendants à moins de 50, 140 000+ utilisateurs revendiqués | Gratuit, Pro 12,50 à 15 €, Business+ 25 à 30 €, Premium 50 à 60 €, +10 €/utilisateur | PA offerte même en gratuit (Pennylane, SuperPDP) | Freemium agressif, crédits IA, OCR fournisseurs, demandes de prix, **API + MCP** (10 € ou Premium), partenaire CAPEB | Pas de hors ligne, chantier encore jeune, signature simple, pas de paie |
| **Henrri** (Rivalis) | Auto-entrepreneurs, généraliste | Gratuit, puis 17 à 49 € | PA partenaire floue | Gratuit, devis par note vocale, « Coach Devis » IA | Pas métier BTP (ni bibliothèque, ni chantier, ni planning) |
| **Renalto** (« Rita ») | Artisans seuls, 15 000+ utilisateurs | 25 / 30 / 49 € | ❔ | Devis en moins d'une minute par voix, texte, photo de notes, **dans WhatsApp** | Devis seulement ; plans techniques « trop complexes » |
| **Mediabat** | Auto-entrepreneur à PME | 27 à 67 € | « En préparation » | Métré Scanplan inclus, Gantt, achats | Support payant (sauf VIP), interface austère |
| **Hemea Pro** | Artisans rénovation < 1 M€ | 54 / 82 / 166 € | ❔ | Mise en relation clients, centrale d'achat, remises matériaux | Planning, relances, API, catalogues fournisseurs encore « à venir » |

### ERP pour PME

| Logiciel | Cible | Prix HT/mois | Facture électronique | Force | Faiblesse |
|---|---|---|---|---|---|
| **EBP Bâtiment** (Cegid) | TPE à PME | Hubbix 32,80 €, ACTIV 53 €, PRO 82 €, ELITE sur devis | PA **Cegid**, incluse | Profondeur fonctionnelle, **connexion Sonepar** (prix, stock, commandes), Tarifeo, achats et stocks | Interface datée, formations payantes, API limitée, paie dans EBP Paie à part |
| **Sage Batigest Connect** | Artisans à PME, jusqu'à 50 utilisateurs | 34,67 à 117,58 €, +10 €/utilisateur | **Sage est PA** (depuis le 22/12/2025), gère situations et retenue de garantie | Sage e-tarifs (6 M de références), situations, stocks | Courbe d'apprentissage, mobile faible ou tiers, pas d'API ouverte, aucune IA, paie à part |
| **Extrabat** | TPE à PME spécialisées (piscine, CVC, paysage) | 39 € (artisan), 65 à 99 € (TPE/PME) | ❔ rien de publié | CRM fort, 40 catalogues en EDI, automatisations à la signature, tournées, portail client | Très dense, interface vieillissante, support critiqué, aucune IA |
| **Graneet** | PME 1 à 50 M€ de CA, 1 500 clients | Sur devis, indexé sur le CA | Via **Pennylane** | Situations avancées, autoliquidation, OCR achats rattachés au chantier, **MCP en lecture seule**, agents métiers annoncés, levée de 7 M€ (sept. 2026) | Exclut les artisans (< 1 M€), pas d'appli mobile, planning faible, 3 intégrations |
| **Onaya** (Orisha) | 2 à 500 salariés | Sur devis, pas d'essai | Chorus Pro seulement mentionné | Études de prix (Batiprix, Tarifeo), planning prévu/réalisé, pointage | Opaque, support payant, lourd pour un artisan |
| **Codial** | Indépendants à PME, par intégrateurs | CodialWeb 25 à 39 €/utilisateur ; Codial Bâtiment sur devis | Connecteur vers la PA au choix | **Connexions Rexel, Sonepar, Pum**, stocks multi-dépôts, SAV | Tarifs complexes, applis mobiles payantes, inscription via distributeur |

### Généralistes TPE et outils voisins

| Logiciel | Ce qu'il apporte | Prix | Ce qui manque pour le BTP |
|---|---|---|---|
| **Axonaut** | CRM, facturation, **PA en propre** (depuis le 08/01/2026), banque, temps et congés, MCP en bêta | 34,99 à 69,99 €, +29,99 €/utilisateur | Pas de situations, retenue de garantie, bibliothèque ni planning chantier |
| **Qonto** | Banque + facturation, **MCP qui lit et écrit** (validation par l'utilisateur) | Selon l'offre | Pas métier |
| **Pennylane** | Compta, PA, **MCP inclus dès l'offre Essentiel** | Selon l'offre | Pas métier |
| **Combo / Skello** | Planning, pointage, paie (Combo Pay 19 €/salarié), API et MCP sur devis chez Combo | 68 à 89 €/établissement | Pensés pour la restauration et le commerce, pas d'affectation par chantier |
| **PayFit / Silae** | Paie | 26 €/salarié (PayFit) ; Silae sur devis | Gestion BTP (CIBTP, intempéries) non confirmée chez PayFit ; Silae est un outil de cabinet |
| **Kizeo, Archipad, Fieldwire, Kraaft** | Formulaires hors ligne, réserves sur plan, reportage photo et voix | 12 à 104 €/utilisateur | Ni devis, ni facture, ni RH |

---

## 3. Matrice fonctionnelle

| Fonction | Obat | Tolteck | Batappli | Costructor | EBP Bât. | Batigest | Extrabat | Graneet | Axonaut | **Brix V2** |
|---|---|---|---|---|---|---|---|---|---|---|
| Devis / factures BTP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Bibliothèque de prix | ✅ 30 000 ouvrages | 🟡 | ✅ Batichiffrage | ✅ Batiprix | 🟡 option | ✅ | ✅ | 🟡 option | ❌ | ✅ 50 000 prix + prix nets perso |
| Situations, acomptes, retenue de garantie | ✅ | 🟡 | ✅ | 🟡 | ✅ | ✅ | ❔ | ✅ | ❌ | ✅ |
| Autoliquidation dans les données structurées | ❔ | ❔ | ❔ | ❔ | ❔ | ✅ | ❔ | ✅ | ❌ | ✅ |
| Facture électronique (PA) | ✅ Iopole | ✅ | ✅ Cecurity | ✅ gratuit | ✅ Cegid | ✅ Sage PA | ❔ | ✅ Pennylane | ✅ PA | ✅ incluse dans toutes les offres |
| Lecture ligne à ligne des factures fournisseurs reçues | ❌ | ❌ | ❌ | 🟡 OCR | 🟡 OCR | ❌ | 🟡 OCR | 🟡 OCR | 🟡 OCR | ✅ sans OCR + affectation chantier |
| Signature électronique | ✅ | ❌ | ❔ | 🟡 simple | ✅ | ❔ | ✅ hors ligne | ❔ | 🟡 1 €/signature | ✅ |
| Paiement en ligne | ✅ | ❌ | ✅ Stripe | ✅ | ❔ | ❔ | ❔ | ❔ | ✅ | ✅ |
| Financement client / avance de trésorerie | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Relances automatiques | ✅ | ❌ | ✅ | ✅ | ✅ | ❔ | ✅ SMS | ❔ | ✅ | ✅ + IA |
| Planning d'équipe | ✅ Gantt | ❌ | 🟡 | 🟡 Business+ | ✅ | 🟡 | ✅ tournées | 🟡 faible | ❌ | ✅ |
| Pointage / heures | ✅ | ❌ | ❔ | 🟡 Premium | ❔ | ❔ | ❔ | ✅ | 🟡 | ✅ géolocalisé |
| **Paie BTP (CIBTP, paniers, trajets)** | ❌ | ❌ | ❌ | ❌ | 🟡 produit à part | 🟡 produit à part | ❌ | 🟡 export | ❌ | ✅ pré-paie + export, puis paie |
| Rentabilité chantier en temps réel | ✅ | ❌ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Commandes fournisseurs | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Prix négociés négoces | ❌ | ✅ Point.P, Cedeo | 🟡 import Excel | 🟡 import | ✅ Sonepar, Tarifeo | ✅ e-tarifs | ✅ EDI | ❔ | ❌ | ✅ FAB-DIS + import + comptes négoces |
| **Demande de prix multi-fournisseurs + comparateur** | ❌ | ❌ | ❌ | 🟡 demande simple | 🟡 manuel | ❌ | ❌ | ❌ | ❌ | ✅ automatique, réponses lues par IA |
| **Portail / API pour les fournisseurs** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Stocks | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Appli mobile complète | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ web | ✅ | ✅ |
| Hors ligne sur chantier | 🟡 | ✅ | ❔ | ❌ | ❔ | ❔ | 🟡 signature | ❌ | ❔ | ✅ |
| Devis IA (voix, texte, photo) | ✅ +29 € | ❌ | ✅ 8-16/mois | ✅ crédits | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ illimité dans l'offre IA |
| Assistant IA qui agit (crée, relance, commande) | ❌ | ❌ | ❌ | 🟡 Premium | ❌ | ❌ | ❌ | 🟡 agents annoncés | ❌ | ✅ Bob, actions validées par l'artisan |
| API publique | ❌ | ❌ | ❌ | ✅ 10 € | 🟡 limitée | ❌ | ❔ | 🟡 annoncée | ✅ | ✅ |
| MCP (Claude, ChatGPT…) | ❌ | ❌ | ❌ | ✅ 10 € | ❌ | ❌ | ❌ | 🟡 lecture | 🟡 bêta | ✅ lecture + écriture validée, inclus |
| Site vitrine, avis Google, réseaux | 🟡 Studio, Visibilité | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 portail client | ❌ | 🟡 campagnes | ✅ site + Google + réseaux + prospection |
| WhatsApp client | ❌ | ❌ | ❌ | 🟡 envoi | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ devis, signature, paiement |
| Aides MaPrimeRénov' / CEE | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ simulateur + mention TVA auto |
| Logiciel configuré selon métier et besoins à l'inscription | 🟡 métier demandé | ❌ | 🟡 sur RDV | 🟡 SIRET | 🟡 revendeur | 🟡 revendeur | 🟡 conseiller | 🟡 conseiller | ❌ | ✅ automatique, modules à la carte |
| Offre gratuite réelle | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Brix fait mieux / Brix a inventé

### Brix fait mieux (d'autres le font, Brix le fait nettement mieux)

| # | Fonction | Le meilleur concurrent aujourd'hui | Ce que Brix fait en plus |
|---|---|---|---|
| 1 | **Devis IA** | Obat (voix, photo, PDF, +29 €/mois), Renalto (WhatsApp) | Voix, photo du chantier, texte, notes manuscrites, WhatsApp ; prix tirés des **vraies factures fournisseurs** de l'artisan ; illimité dans l'offre IA, pas de quota à 8 devis |
| 2 | **Facture électronique BTP** | Sage Batigest (PA en propre, situations, retenue) | Même couverture BTP, mais incluse dès l'offre gratuite, avec mention TVA réduite et assurance décennale générées seules |
| 3 | **Une app pour 1 à 50 personnes** | Obat (jusqu'à la PME, mais grille par taille) | La même interface grandit avec l'entreprise : on allume planning, pointage, paie, stocks quand on en a besoin, sans changer de logiciel |
| 4 | **Prix négociés fournisseurs** | Tolteck (Point.P, Cedeo), EBP (Sonepar) | Tous les négoces : FAB-DIS, Excel, comptes négoces, et surtout la **base de prix nets construite seule** à partir des factures reçues |
| 5 | **MCP** | Costructor (10 €/mois), Graneet (lecture seule, PME) | Inclus dans l'offre IA, lecture **et** action validée, avec le vocabulaire BTP (chantier, situation, lot, retenue) |
| 6 | **Encaisser** | Obat (paiement, relances, avances) | Paiement sur chaque facture et dans WhatsApp, relances écrites par l'IA selon le client, financement client, prévision de trésorerie |
| 7 | **Mobile sur chantier** | Tolteck (hors ligne, mais devis seulement) | Tout le logiciel au téléphone, **y compris hors réseau** : devis, photos, pointage, rapports, signature |
| 8 | **Croissance** | Obat (Studio, Visibilité) | Site vitrine, fiche Google, avis, réseaux sociaux et prospection dans le même outil, alimentés par les chantiers terminés |
| 9 | **Prix lisibles** | Costructor (gratuit puis 12,50 €) | Grille publique, pas de formation payante, pas de revendeur, pas de prix « sur devis » même pour 50 salariés |

### Brix a inventé (aucun des 20 logiciels étudiés ne le fait)

1. **Onboarding qui construit le logiciel.** L'artisan dit son métier, sa taille, ce qu'il veut et ce qu'il ne veut pas ; Brix allume les bons modules, charge la bibliothèque du métier, ses modèles de devis et ses mentions légales (décennale, TVA, déchets, médiateur). Chaque module se coupe sans rien casser. Une leçon courte par fonction, avec démo sans compte par métier.
2. **Paie BTP dans le logiciel de gestion.** Les heures pointées par chantier deviennent la pré-paie avec les règles du BTP (CIBTP, intempéries, paniers, indemnités de trajet par zone, conventions 1596, 1597, 2609), puis l'export vers le cabinet ou Silae, puis la paie en propre.
3. **Réseau fournisseurs.** Une liste de matériaux du devis part en demande de prix chez plusieurs négoces en un geste ; l'IA lit les réponses, compare, commande chez le gagnant et suit la livraison. Un **portail et une API fournisseurs** permettent au négoce local de pousser ses tarifs et ses accusés de réception.
4. **Factures fournisseurs qui se rangent seules.** Les factures électroniques reçues (obligatoires depuis le 1er septembre 2026) sont lues ligne par ligne, sans OCR, affectées au bon chantier, comparées au devis ; Brix signale une hausse de prix ou un dépassement de budget avant qu'il soit trop tard.
5. **Bob, l'assistant qui agit partout.** Il ne se contente pas de répondre : il prépare le devis, remplit le planning, relance le client, commande le matériel, prépare la situation de fin de mois. L'artisan valide d'un geste. Disponible dans l'app, à la voix, et dans Claude ou ChatGPT via le MCP.
6. **Dossier d'aides intégré au devis.** Simulateur MaPrimeRénov' et CEE, mention TVA 5,5 % ou 10 % certifiée par le client sur le devis (les attestations Cerfa sont supprimées depuis le 16/02/2025), contrôle du statut RGE.

---

## 5. Ce que Brix doit avoir pour être sans conteste le meilleur

Classé par département, comme le fait Growth Gusto, pour que la landing et l'app parlent la même langue.

### Devis et chiffrage
- Devis IA voix, photo, texte, notes manuscrites, WhatsApp ; bibliothèque du métier ; prix nets personnels.
- Mentions obligatoires générées seules : assurance décennale, TVA réduite certifiée, déchets, médiateur, validité, frais de déplacement.
- Métré depuis une photo ou un plan simple (piste différenciante, techniquement risquée : personne ne le maîtrise).
- Import en un clic depuis Obat, Tolteck, Batappli, Costructor, Excel.

### Facturation et facture électronique
- Acomptes, situations, retenue de garantie, autoliquidation dans les données structurées, avoirs.
- Émission et réception par une PA partenaire (Brix ne devient pas PA lui-même), e-reporting, annuaire.
- Paiement en ligne, relances IA, financement client.

### Chantiers et planning
- Planning d'équipe glisser-déposer, affectation par chantier, interventions et SAV.
- Rapports photo et voix, réserves, hors ligne.
- Rentabilité en temps réel (heures, achats, sous-traitance).

### Achats et fournisseurs
- Catalogues FAB-DIS et Excel, comptes négoces, base de prix nets.
- Demande de prix multi-fournisseurs, comparateur, commande, suivi.
- Factures fournisseurs électroniques lues ligne à ligne, affectées au chantier.
- Portail et API fournisseurs ; stocks et véhicules.

### Équipe, RH et paie
- Pointage géolocalisé, absences, congés, notes de frais.
- Pré-paie BTP puis paie, DPAE, export Silae et cabinet.

### Clients et croissance
- CRM, portail client, WhatsApp, avis Google, site vitrine, réseaux sociaux, prospection.
- Contrats d'entretien avec relance automatique.

### Finances
- Banque synchronisée, rapprochement, prévision de trésorerie, export comptable (Pennylane, Sage, Cegid, EBP, Quadra).

### Brix AI
- Bob dans chaque écran, à la voix ; actions préparées et validées.
- **Brix AI MCP** inclus : Claude, ChatGPT, Le Chat ; lecture et actions validées ; activé par le gérant, coupé en un geste.
- API publique.

### Prix (recommandation, sur le modèle Growth Gusto)
- Trois packs lisibles, offre gratuite réelle pour l'auto-entrepreneur, utilisateurs illimités ou peu chers.
- Brix AI et le MCP inclus dans les packs du milieu et du haut, en option sur le pack d'entrée ; pas de quota de devis IA ridicule.
- Page comparatif « coût de la pile d'outils » : Obat (69 €) + devis vocal (29 €) + Qonto + Pennylane + PayFit (26 €/salarié) + Kraaft (20 €/utilisateur) face au prix Brix.

---

## 6. Réglementation à respecter (rappel pour les chantiers app)

| Sujet | Règle | Confiance |
|---|---|---|
| Facture électronique | Réception pour toutes les entreprises depuis le 01/09/2026 ; émission PME, TPE, micro au 01/09/2027 ; e-reporting même calendrier | Élevée |
| PA et PPF | Passage obligatoire par une plateforme agréée (137 en juin 2026) ; le PPF ne sert plus qu'à l'annuaire et à la transmission à la DGFiP | Élevée |
| Formats | Factur-X, UBL, CII | Élevée |
| Nouvelles mentions | SIREN client, adresse de livraison si différente, nature des opérations (biens, services, mixte), option TVA sur les débits | Élevée |
| Sanctions | 50 € par facture hors format (plafond 15 000 €/an), 500 € par e-reporting manquant | Moyenne à élevée |
| Autoliquidation sous-traitance | Facture HT, mention « Autoliquidation », information dans les données structurées | Élevée |
| Retenue de garantie | 5 % maximum, déduite du TTC sans réduire la base de TVA | Élevée |
| Assurance décennale | Mentions sur chaque devis et facture (assureur, contrat, activités, zone) ; amende jusqu'à 15 000 € | Élevée |
| TVA 10 % et 5,5 % | Attestations Cerfa 1300-SD et 1301-SD supprimées depuis le 16/02/2025, remplacées par une mention certifiée par le client sur le devis ou la facture | Élevée |
| Paie BTP | CIBTP (congés, intempéries), OPPBTP, PRO BTP, conventions 1596, 1597, 2609, paniers 10,30 à 14,30 €, indemnités de trajet par zone | Moyenne à élevée |

---

## 7. Reste à vérifier

- **« Tertisan »** : non identifié, demander le lien à Marceau.
- Nom de la PA d'émission de Tolteck ; statut facture électronique d'Extrabat, Onaya, Mediabat, Renalto, Hemea.
- Prix exacts Graneet, Onaya, Extrabat (sur devis ou contradictoires).
- Conditions d'accès au standard FAB-DIS ; API de Rexel, Point.P, Yesss, Frans Bonhomme, Gedimat.
- Notes App Store et Google Play des concurrents.

---

## Sources

**Outils artisans**
- Obat : [tarifs](https://www.obat.fr/tarifs/), [devis vocal IA](https://www.obat.fr/devis-factures/devis-vocal-ia/), [facture électronique](https://www.obat.fr/www/devis-factures/facturation-electronique/), [gestion RH](https://www.obat.fr/gestion-rh/), [fiche PA](https://ma-facture-electronique.org/plateforme-agreee/liste-officielle/obat/), [comparateur-efacturation, 11/11/2026](https://comparateur-efacturation.fr/blog/obat-avis-tarifs-test-complet-2026), [tool-advisor, 15/10/2026](https://tool-advisor.fr/logiciel-facturation/comparatif/obat/), [Capterra](https://www.capterra.fr/software/1023562/obat)
- Tolteck : [tarifs](https://www.tolteck.com/tarifs), [facture électronique](https://www.tolteck.com/fr-fr/facturation-electronique/), [aide Point.P / Cedeo](https://intercom.help/tolteck-8413e26e38ee/fr/articles/9979108-connecter-un-compte-point-p-ou-cedeo-a-tolteck-import-et-suggestions-de-materiaux), [independant.io](https://independant.io/avis/tolteck/)
- Batappli : [site](https://www.batappli.fr/), [tarifs](https://www.batappli.fr/tarifs), [independant.io](https://independant.io/avis/batappli/)
- Costructor : [tarifs](https://costructor.co/tarifs), [CAPEB](https://www.capeb.fr/www/capeb/media/national/cp-capeb-costructor-partenariat-facturation-electronique.pdf), [independant.io, 03/11/2026](https://independant.io/avis/costructor/)
- Henrri : [tarifs](https://www.henrri.com/tarifs), [page BTP](https://www.henrri.com/facture-artisan-btp/), [comparepdp](https://comparepdp.com/articles/henrri-avis)
- Hemea : [tarifs pro](https://www.hemea.com/fr/pro/tarifs)
- Mediabat : [independant.io](https://independant.io/avis/mediabat/), [La Fabrique du Net, 28/05/2026](https://www.lafabriquedunet.fr/logiciel/mediabat)
- IA artisans (Renalto, Boby, Artiso, Kraaft, Clotilde) : [Batiweb, 27/04/2026](https://www.batiweb.com/actualites/numerique-bim/ia-specialisee-dans-le-btp-quels-gains-de-temps-pour-les-artisans-48576), [Tensoria, 19/03/2026](https://tensoria.fr/blog/outils-ia-artisans-batiment-comparatif), [Obat, logiciels IA BTP](https://www.obat.fr/blog/logiciel-ia-btp/), [L'Essentiel de l'Éco, 10/11/2026](https://lessentieldeleco.fr/9369-top-10-des-meilleurs-logiciels-pour-le-btp-en-2026/)

**ERP PME**
- EBP Bâtiment : [independant.io, 25/09/2026](https://independant.io/avis/ebp-batiment), [Cegid, 08/01/2026](https://www.cegid.com/fr/presse/ebp-open-line-plus-facturation-electronique/), [fiche 24.1 Sonepar](https://infos.ebp.com/hubfs/pdf/Fiches-Nouveautes/EBP_Fiche_nouveautes_Batiment_24.1.pdf), [Tarifeo](https://www.ebp.com/wp-content/uploads/2024/09/ebp-logiciel-tarifeo-2025.pdf)
- Sage Batigest : [independant.io, 25/09/2026](https://independant.io/avis/batigest/), [Sage PA](https://ma-facture-electronique.org/plateforme-agreee/liste-officielle/sage/), [blog Sage bâtiment](https://www.sage.com/fr-fr/blog/facture-electronique-dans-le-batiment-comment-y-voir-clair/)
- Extrabat : [plaquette 2025](https://extrabat.com/pdf/EXTRABAT-plaquette-batiment_web_2025.pdf), [BDM](https://www.blogdumoderateur.com/tools/extrabat/), [independant.io, 03/11/2026](https://independant.io/alternative-extrabat/)
- Graneet : [site](https://www.graneet.com/fr), [FrenchWeb, 28/09/2026](https://www.frenchweb.fr/graneet-leve-7-millions-deuros-pour-faire-de-la-facture-electronique-le-point-dentree-de-lerp-de-chantier/463674), [independant.io, 25/09/2026](https://independant.io/avis/graneet/)
- Onaya : [independant.io](https://independant.io/avis/onaya/), [Orisha](https://www.orisha.com/fr/construction/besoin/btp-etude-prix-chiffrage)
- Codial : [independant.io](https://independant.io/avis/codial-batiment/), [Batiweb](https://www.batiweb.com/actualites/publi-redactionnels/codial-batiment-logiciel-facturation-electronique-47386)

**Généralistes, RH, MCP**
- Axonaut : [independant.io, 25/09/2026](https://independant.io/avis/axonaut/), [PA](https://ma-facture-electronique.org/plateforme-agreee/liste-officielle/axonaut/), [MCP](https://www.solutions-numeriques.com/?p=242394)
- MCP : [Pennylane](https://www.pennylane.com/fr/mcp), [Qonto](https://docs.qonto.com/mcp/overview), [Evoliz](https://evoliz.io/mcp/docs)
- Combo : [offres](https://combohr.com/fr/nos-offres) ; Skello : [blog](https://www.skello.io/blog/avis-combo-alternatives) ; PayFit : [bulletinspaie.com](https://bulletinspaie.com/prix-dun-logiciel-paie-tarifs-couts-caches/) ; paie BTP : [Obat, 17/08/2026](https://www.obat.fr/blog/paie-btp/)
- Fournisseurs : [FAB-DIS 3.0 (JDN)](https://www.journaldunet.com/retail/1527039-s-informer-sur-la-norme-fab-dis-3-0/), [Samse, réforme](https://www.groupe-samse.fr/sites/default/files/2026-05/2026-02-Information-clients-reforme-facturation-dematerialisee.pdf), [CAPEB / Cedeo / Point.P](https://www.capeb.fr/www/capeb/media/partenariat-capeb-cedeo-point.p-janvier-2026.pdf)
- Growth Gusto : [growthgusto.fr](https://growthgusto.fr) (structure par département, tarifs, connecteur IA, inscription en 4 étapes)

**Réglementation**
- [service-public.gouv.fr, facture électronique](https://entreprendre.service-public.gouv.fr/actualites/A17450), [economie.gouv.fr, liste des PA](https://www.economie.gouv.fr/actualites/facturation-electronique-la-liste-des-101-premieres-plateformes-agreees-est-disponible), [Legifiscal, 15/06/2026](https://www.legifiscal.fr/actualites-fiscales/4536-facturation-electronique-137-plateformes-agreees.html), [MoneyVox, sanctions](https://www.moneyvox.fr/banque-pro/actualites/107838/facturation-electronique-obligatoire-50-euros-amende-par-facture-en-cas-de-manquement-des-2026), [Swim.legal, BTP](https://www.swim.legal/blog/facture-btp-mentions-autoliquidation-retenue-garantie), [FFB, mention TVA](https://www.ffbatiment.fr/actualites-batiment/actualite/les-modeles-de-mention-tva-sont-parus), [France Épargne, décennale](https://www.france-epargne.fr/academy/assurance-decennale/mention-decennale-devis-factures), [ecologie.gouv.fr, MaPrimeRénov'](https://www.ecologie.gouv.fr/presse/maprimerenov-reouverture-du-guichet-promulgation-loi-finances), [Hellio, CEE 2026](https://www.hellio.com/actualites/reglementation/changements-cee-2026)
