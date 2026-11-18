# Ce qui est réel, ce qui dépend d'accords

Règle : le site et l'app ne promettent que ce qui marche. « Compatible avec tous vos fournisseurs » est vrai dès aujourd'hui. « Connecté à Point.P » ne l'est pas tant qu'aucune convention n'est signée.

## Réel dès la mise en ligne (il suffit des clés Brevo et du déploiement)

| Fonction | Comment |
|---|---|
| Demande de prix à n'importe quel fournisseur | E-mail au comptoir + lien sécurisé ; le fournisseur répond depuis son téléphone, sans compte |
| Comparatif automatique | Prix ligne par ligne, port, franco, délai, économie par rapport au devis |
| Commande en un clic | Depuis la demande retenue ou le devis signé ; e-mail + lien de confirmation + bon EDI joint |
| Suivi de livraison | Le fournisseur confirme / expédie / livre depuis le lien ; l'artisan pointe la réception (partielle gérée) |
| Prix nets | Import des fichiers de tarif CSV, onglet FAB-DIS exporté en CSV ; chaque réponse enrichit la base |
| Alertes de hausse | Historique de chaque prix, alerte dès 3 % (5 % sur le tableau de bord) |
| Rapprochement facture | Montant de la facture fournisseur comparé à la commande |
| API Brix Fournisseurs | Pour tout négoce qui veut se brancher : aucun accord à signer, le fournisseur s'inscrit lui-même |
| Brix AI MCP | Claude et les assistants compatibles, par URL personnelle (lecture seule) |

## Prêt côté Brix, réel après accord

| Fonction | Ce qui manque | Avec qui |
|---|---|---|
| Transmission EDI automatique des commandes | Canal EDI (AS2/SFTP ou plateforme EDI de l'enseigne), codes GLN, recette | Service EDI de chaque enseigne |
| Prix nets en temps réel du compte pro, disponibilité en agence, commande directe | Accès partenaire à l'API ou au catalogue de l'enseigne | Point.P et Cedeo (Saint-Gobain Distribution Bâtiment France), Rexel, Sonepar, Yesss, Leroy Merlin Pro, Gedimat, BigMat, Würth… |
| Factures fournisseurs reçues automatiquement | Branchement à la plateforme agréée (PA) de facture électronique déjà utilisée par Brix | Plateforme agréée retenue |
| Import Excel direct (.xlsx) | Lecture du fichier dans le navigateur (bibliothèque à ajouter) | Aucun, développement |
| Annuaire officiel des connecteurs Claude | Authentification OAuth 2.1 sur le serveur MCP | Aucun accord, développement + soumission |

## Ce que fait déjà la concurrence (pour se situer)

Tolteck propose de « connecter un compte Point.P ou Cedeo » : dans le devis, l'artisan se connecte à son compte fournisseur dans une fenêtre, voit ses prix négociés et insère l'article ; la disponibilité se vérifie en cliquant vers le site du fournisseur. Leur aide ne mentionne ni commande directe, ni suivi de livraison, ni comparatif entre fournisseurs ([source](https://help.tolteck.com/fr/articles/9979108-comment-connecter-un-compte-point-p-ou-cedeo-a-tolteck)). Cela montre que Saint-Gobain Distribution ouvre ce type d'accès à des éditeurs : c'est la première porte à frapper.

Ce que Brix fait en plus, dès maintenant et sans accord : la consultation de plusieurs fournisseurs en parallèle, le comparatif avec port et franco, la commande et son suivi, le rapprochement de facture, une API ouverte à tous les négoces, et la lecture des achats par l'IA.

## Plan pour obtenir les accès

1. **Saint-Gobain Distribution Bâtiment France (Point.P, Cedeo)** : demander l'accès partenaire éditeur (même dispositif que Tolteck). Demander : prix nets du compte, disponibilité agence, création de panier ou de commande, statut de commande.
2. **Rexel et Sonepar** (électricité) : ils ont des services EDI et e-procurement établis pour les grands comptes. Demander un accès EDI ORDERS/ORDRSP/DESADV/INVOIC ou un catalogue client, et la possibilité pour un éditeur d'agir au nom de l'artisan avec son accord.
3. **Négoces indépendants (Gedimat, BigMat, groupements régionaux)** : leur proposer l'API Brix Fournisseurs, sans frais, en argument commercial (« vos clients artisans vous commandent depuis leur devis »).
4. **Leroy Merlin Pro, Würth** : interroger sur leurs programmes partenaires et catalogues pro.

À chaque accord obtenu : remplir le connecteur de l'enseigne (`worker/src/modules/fournisseurs/connecteurs/`), passer son état de `sur_accord` à `disponible` dans `registre.ts`. L'écran « Connexions » et le site suivent automatiquement.

## Phrases validées pour le site et l'app

- « Compatible avec tous vos fournisseurs, dès aujourd'hui. »
- « Vos fournisseurs répondent depuis un simple lien, sans compte ni logiciel. »
- « Connexions directes avec les grandes enseignes en cours. »
- « Fournisseurs : branchez votre logiciel à Brix avec notre API ouverte. »
- À ne pas écrire tant qu'aucun accord n'est signé : « Connecté à Point.P / Rexel / … », « Prix en temps réel de votre compte pro », logos d'enseignes présentés comme partenaires.
