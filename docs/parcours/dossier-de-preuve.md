# Le dossier de preuve d'une signature Brix

> Ce document explique, en français simple, pourquoi et comment Brix conserve la preuve qu'un client a signé un devis. **Ce n'est pas un avis juridique.** Les références d'articles sont données pour aider à la relecture par un avocat ou un juriste, qui doit valider le dispositif avant la mise en ligne.

## 1. Quelle signature, quelle valeur ?

Le règlement européen **eIDAS** (règlement (UE) n° 910/2014, modifié par le règlement (UE) 2024/1183) distingue trois niveaux de signature électronique (article 3) :

| Niveau | Ce que c'est | Valeur |
|---|---|---|
| **Simple** | Toute donnée électronique jointe à un document pour le signer : case cochée, nom tapé, signature dessinée, code reçu par e-mail ou SMS | Recevable en justice : on ne peut pas la rejeter au seul motif qu'elle est électronique (article 25-1). Mais en cas de contestation, c'est à celui qui s'en prévaut (l'artisan) de prouver qu'elle est fiable |
| **Avancée** | Liée au signataire de façon univoque, sous son contrôle exclusif, toute modification ultérieure détectable (article 26) | Plus solide, sans présomption légale en droit français |
| **Qualifiée** | Avancée + certificat qualifié + dispositif qualifié, délivrée par un prestataire qualifié | Équivaut à une signature manuscrite (article 25-2) ; fiabilité présumée en France (article 1367 du Code civil et décret n° 2017-1416 du 28 septembre 2017) |

**Brix utilise par défaut la signature simple**, authentifiée par un code à usage unique, avec un dossier de preuve complet. C'est le niveau utilisé par la plupart des logiciels de devis pour les artisans. Pour un client qui exige plus, Brix peut déléguer à Yousign (signature avancée ou qualifiée) : voir `README.md`, section 3.5.

En droit français :
- **Article 1366 du Code civil** : l'écrit électronique a la même force probante que l'écrit papier, si l'on peut identifier la personne dont il émane et s'il est conservé dans des conditions qui en garantissent l'intégrité. Tout le dossier de preuve sert à démontrer ces deux points.
- **Article 1367** : la signature identifie son auteur et manifeste son consentement ; sous forme électronique, elle consiste en un procédé fiable d'identification garantissant son lien avec l'acte.
- **Articles 1358 et 1359** : entre commerçants la preuve est libre ; face à un particulier, un écrit est exigé au-delà de 1 500 € (décret n° 80-533). La signature électronique simple constitue cet écrit si les conditions de l'article 1366 sont réunies ; à défaut, elle reste un commencement de preuve que le juge apprécie.
- **Article 1368** : en cas de conflit de preuves, le juge retient le titre le plus vraisemblable. Un dossier précis et cohérent pèse lourd.

## 2. Ce que contient le dossier (et pourquoi)

Pour chaque signature, Brix enregistre, au moment même de la signature et côté serveur :

| Élément | Pourquoi |
|---|---|
| **Le document exact signé**, sous une forme canonique (JSON trié : lignes, quantités, prix, TVA, totaux, proposition choisie, conditions, CGV, acompte, version) | Savoir précisément à quoi le client s'est engagé, même si le devis évolue ensuite (un devis signé ne peut plus être modifié : il faut un avenant) |
| **L'empreinte SHA-256** de ce document | Prouver l'intégrité : la moindre modification change l'empreinte. Elle est aussi envoyée au client dans l'e-mail de confirmation, qui en garde donc une trace indépendante |
| **L'horodatage du serveur** (et non celui du téléphone du client) | Date certaine de l'accord, point de départ des délais |
| **L'identité déclarée** (nom tapé) et la **mention** (« Bon pour accord ») | Manifestation du consentement (article 1367) |
| **L'image de la signature** (dessinée ou tapée), avec son empreinte | Élément visuel, utile pour le client et devant un juge, même s'il ne prouve pas l'identité à lui seul |
| **La méthode d'authentification** : code à 6 chiffres envoyé à l'adresse e-mail (ou au numéro) du client enregistré par l'artisan ; heure d'envoi, heure de vérification, nombre d'essais | Lier la signature à une personne qui contrôle cette boîte e-mail ou ce téléphone. Le code est conservé uniquement sous forme hachée |
| **Les consentements cochés et le texte exact affiché** (bon pour accord, CGV, information sur la rétractation, demande de démarrage anticipé) | Prouver que le client a été informé et a accepté chaque point, avec les mots qu'il a vus |
| **L'adresse IP complète et le navigateur** (user-agent) | Indices techniques de qui a signé et depuis quel appareil |
| **Le journal des ouvertures** du lien (dates, IP tronquées) | Montrer que le client a consulté le devis avant de signer |
| **Le scellement** : empreinte du dossier entier + sceau (HMAC avec une clé secrète du serveur) | Rendre détectable toute modification ultérieure du dossier lui-même |

Le dossier est stocké en trois exemplaires cohérents : une ligne en base (D1), un fichier `dossier.json` et un **certificat de signature** lisible (`certificat.html`) dans le stockage de fichiers (R2), avec l'image de la signature.

## 3. Contrat avec un particulier hors établissement ou à distance

Quand le client est un **particulier** et que le contrat est conclu **hors établissement** (au domicile du client, sur le chantier) ou **à distance** (devis envoyé par e-mail et signé en ligne sans rencontre au moment de la signature), le Code de la consommation impose des règles précises. L'artisan indique le mode de conclusion sur le devis (`modeConclusion`) ; Brix applique alors :

- **Droit de rétractation de 14 jours** à compter de la conclusion du contrat pour une prestation de services (**article L221-18**). Brix calcule et enregistre la date de fin du délai, et l'affiche au client avant la signature. Si l'information sur ce droit n'a pas été donnée, le délai est prolongé de 12 mois (**article L221-20**) : d'où l'importance de la mention affichée et conservée.
- **Aucun paiement avant 7 jours** pour un contrat **hors établissement** (**article L221-10**) : Brix bloque la demande d'acompte pendant 7 jours après la signature. Cette interdiction ne vise pas le contrat à distance. L'article prévoit des exceptions limitées (à vérifier avec un juriste avant d'en ouvrir une dans l'app).
- **Demande expresse de démarrage anticipé** (**article L221-25**) : si le client veut que les travaux commencent avant la fin des 14 jours, il doit le demander expressément. Brix propose une case dédiée, avec le texte exact conservé. S'il se rétracte ensuite, il doit payer la part des travaux déjà réalisés.
- **Exception** : pour certains travaux d'urgence demandés par le client, le droit de rétractation peut ne pas s'appliquer (**article L221-28**, 8°). Brix ne gère pas ce cas automatiquement.
- **Formulaire de rétractation** : il doit être fourni au client (**article L221-5** et annexe à l'article R221-1). À joindre au devis ou à l'e-mail de confirmation (à faire côté modèles d'e-mails et PDF).
- **Confirmation sur support durable** (**article L221-13** pour le contrat à distance, **L221-9** hors établissement) : l'e-mail « devis signé » envoyé au client, avec la copie et l'empreinte, joue ce rôle.

Pour un client **professionnel**, ces règles ne s'appliquent pas (sauf cas particulier de la petite entreprise de 5 salariés au plus dont l'activité principale n'est pas celle du contrat, **article L221-3** : à vérifier si l'on veut le gérer).

## 4. Données personnelles (RGPD)

- **Base légale** : exécution du contrat et intérêt légitime de l'artisan à prouver l'accord (règlement (UE) 2016/679, article 6-1 b et f).
- **Minimisation** (article 5-1 c) : l'IP n'est conservée en entier que dans le dossier de signature ; partout ailleurs (journal d'ouverture, limitation de débit), elle est tronquée ou hachée.
- **Durée** : les dossiers de preuve doivent rester disponibles tant qu'une action en justice est possible : 5 ans en droit commun (**article 2224 du Code civil**), 10 ans après la réception des travaux pour la garantie décennale (**article 1792-4-1**). Durée proposée : 10 ans après la fin du chantier, à valider. Les journaux d'ouverture : 13 mois.
- **Information** : la politique de confidentialité de Brix et celle de l'artisan doivent mentionner cette collecte.
- **Rôles** : l'artisan est responsable du traitement pour ses clients ; Brix est sous-traitant (article 28) : prévoir l'accord de sous-traitance dans les conditions d'utilisation.

## 5. Limites à connaître

- Une signature simple prouve qu'**une personne ayant accès à l'e-mail (ou au téléphone) du client** a signé. Si l'artisan a saisi une mauvaise adresse, la preuve s'affaiblit : l'app doit faire vérifier l'adresse du client avant l'envoi.
- Le sceau du dossier repose sur `PUBLIC_LINK_SECRET` : cette clé doit être gardée secrète et ne jamais changer (la conserver dans un coffre). Pour une preuve opposable même à Brix, ajouter un **horodatage qualifié** (jeton RFC 3161 d'un prestataire qualifié eIDAS) de l'empreinte du dossier : non fait, coût à vérifier.
- Le dossier ne remplace pas les **mentions obligatoires du devis** (identité de l'entreprise, assurance décennale et sa couverture géographique, détail des prestations, prix, validité, conditions de paiement, médiateur de la consommation (**article L612-1**)) : elles sont de la responsabilité du module Devis.

## 6. Où trouver quoi

| Quoi | Où |
|---|---|
| Construction et scellement du dossier | `worker/src/modules/signature/preuve.ts` |
| Textes affichés et conservés | `worker/src/modules/signature/mentions.ts` |
| Document canonique et empreinte | `worker/src/modules/documents/vues.ts` (`documentCanonique`, `empreinte`) |
| Règles de rétractation | `worker/src/modules/documents/vues.ts` (`regleRetractation`), `worker/src/modules/paiements/handlers.ts` (`demanderAcompte`) |
| Télécharger un dossier (artisan) | `GET /api/signature/preuves/:id/dossier` |
| Certificat (client) | `GET /api/p/devis/:jeton/certificat` |
