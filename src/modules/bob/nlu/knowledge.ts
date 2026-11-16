// Fiches de formation pré-écrites (démo). Le vrai modèle répondra à tout,
// mais ces fiches restent la base vérifiée qu'on lui donnera en contexte.

import type { BobCard } from './types';

export interface Lesson {
  key: string;
  match: RegExp;
  intro: string;
  card: BobCard;
}

export const LESSONS: Lesson[] = [
  {
    key: 'nfc-cuisine',
    match: /cuisine/,
    intro: 'Voilà l’essentiel de la NF C 15-100 pour une cuisine.',
    card: {
      kind: 'lesson', icon: 'ShieldCheck', title: 'NF C 15-100 · Cuisine',
      subtitle: 'Logement neuf ou rénovation totale',
      bullets: [
        '6 prises 16 A minimum, dont 4 au-dessus du plan de travail (3 prises si la cuisine fait 4 m² ou moins).',
        'Jamais de prise au-dessus de l’évier ni de la plaque de cuisson.',
        'Plaque de cuisson : circuit dédié 32 A en 6 mm² cuivre, sortie de câble ou prise 32 A.',
        'Four, lave-vaisselle et lave-linge : un circuit 20 A en 2,5 mm² chacun. Congélateur : circuit dédié conseillé.',
        'Différentiel 30 mA type A pour la plaque et le lave-linge (type F conseillé).',
        'Un point lumineux au plafond commandé par un interrupteur.',
      ],
      source: 'NF C 15-100, partie 10-1 (locaux d’habitation). Vérifie la version applicable à la date du permis.',
      actions: [{ label: 'Ouvrir le calcul pièce par pièce', to: '/app/outils/nfc15100', icon: 'Calculator' }],
    },
  },
  {
    key: 'nfc-sdb',
    match: /salle de bain|salle d'eau|sdb|volume/,
    intro: 'Pour une salle de bain, tout tourne autour des volumes.',
    card: {
      kind: 'lesson', icon: 'Droplets', title: 'NF C 15-100 · Salle de bain',
      bullets: [
        'Volume 0 (dans la baignoire ou la douche) : uniquement du matériel IPX7 en très basse tension 12 V.',
        'Volume 1 (au-dessus, jusqu’à 2,25 m) : IPX4, très basse tension 12 V, ou chauffe-eau horizontal protégé 30 mA.',
        'Volume 2 (60 cm autour du volume 1) : IPX4, luminaires et radiateurs classe II, prise rasoir avec transformateur.',
        'Prises 16 A : uniquement hors volumes.',
        'Liaison équipotentielle supplémentaire obligatoire, et tout le local protégé par un différentiel 30 mA.',
      ],
      source: 'NF C 15-100, section 701.',
      actions: [{ label: 'Ouvrir le calcul pièce par pièce', to: '/app/outils/nfc15100', icon: 'Calculator' }],
    },
  },
  {
    key: 'nfc-pieces',
    match: /sejour|salon|chambre|piece|combien de prises|nombre de prises|nf ?c ?15[- ]?100/,
    intro: 'Les minimums pièce par pièce, en bref.',
    card: {
      kind: 'lesson', icon: 'ShieldCheck', title: 'NF C 15-100 · Pièce par pièce',
      bullets: [
        'Séjour : 5 prises minimum (7 au-delà de 28 m²), et 1 prise RJ45 (2 conseillées).',
        'Chambre : 3 prises minimum, 1 prise RJ45.',
        'Entrée et couloir : 1 prise. WC : 1 point lumineux.',
        'Chaque pièce : un point lumineux au plafond (ou deux prises commandées).',
        'Circuits prises : 2,5 mm² protégé en 20 A ou 1,5 mm² protégé en 16 A, nombre de prises limité par circuit selon la version de la norme.',
      ],
      source: 'NF C 15-100, partie 10-1.',
      actions: [{ label: 'Calculer pour mon chantier', to: '/app/outils/nfc15100', icon: 'Calculator' }],
    },
  },
  {
    key: 'irve',
    match: /irve|borne|recharge|voiture electrique|wallbox/,
    intro: 'Les règles à connaître pour poser une borne de recharge.',
    card: {
      kind: 'lesson', icon: 'PlugZap', title: 'Borne de recharge (IRVE)',
      bullets: [
        'Au-delà de 3,7 kW, la pose doit être faite par un installateur qualifié IRVE.',
        'Circuit dédié depuis le tableau, avec son disjoncteur et un différentiel 30 mA (type A au minimum, type B si la borne ne détecte pas les fuites continues).',
        '7,4 kW en monophasé = 32 A : câble 6 mm² cuivre pour une distance courte, plus gros si c’est loin (vérifie la chute de tension).',
        'Particulier : crédit d’impôt de 75 % plafonné à 500 € par borne, TVA réduite en logement de plus de 2 ans.',
      ],
      source: 'Décret IRVE 2017-26, NF C 15-100 section 722, guide UTE C 15-722.',
      actions: [{ label: 'Ouvrir le calcul IRVE', to: '/app/outils/irve', icon: 'Calculator' }],
    },
  },
  {
    key: 'tva',
    match: /tva|taux reduit|5[,.]5|attestation/,
    intro: 'Les taux de TVA dans le bâtiment, simplement.',
    card: {
      kind: 'lesson', icon: 'Receipt', title: 'Quel taux de TVA ?',
      bullets: [
        '20 % : construction neuve, logement de moins de 2 ans, locaux professionnels.',
        '10 % : amélioration, entretien et transformation d’un logement de plus de 2 ans.',
        '5,5 % : rénovation énergétique (isolation, pompe à chaleur, chaudière bois…) et équipements pour personnes âgées ou handicapées.',
        'Depuis mars 2025, plus d’attestation papier : une mention signée par le client sur le devis ou la facture suffit. Brix l’ajoute toute seule.',
      ],
      source: 'Code général des impôts, articles 278-0 bis A et 279-0 bis.',
    },
  },
  {
    key: 'efacture',
    match: /facture electronique|facturation electronique|e-?facture|factur-?x|plateforme agree|pdp|2026|2027/,
    intro: 'La facture électronique, ce qui change pour toi.',
    card: {
      kind: 'lesson', icon: 'ShieldCheck', title: 'Facture électronique',
      bullets: [
        'Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques.',
        'Émission obligatoire : septembre 2026 pour les grandes entreprises et ETI, septembre 2027 pour les PME, TPE et micro-entreprises.',
        'Les factures passent par une plateforme agréée, au format Factur-X, UBL ou CII. Pour les particuliers, on transmet seulement les montants (e-reporting).',
        'Avec Brix, tu n’as rien à faire : chaque facture part au bon format et tu vois son statut.',
      ],
      source: 'Article 289 bis du CGI, loi de finances 2024.',
      actions: [{ label: 'Voir mes statuts', to: '/app/facture-electronique', icon: 'ShieldCheck' }],
    },
  },
  {
    key: 'consuel',
    match: /consuel|attestation de conformite|mise en service enedis/,
    intro: 'Quand il faut un Consuel, et lequel.',
    card: {
      kind: 'lesson', icon: 'BadgeCheck', title: 'Attestation Consuel',
      bullets: [
        'Obligatoire pour une installation neuve, et pour une rénovation totale qui demande une remise sous tension par Enedis.',
        'Attestation jaune : logement réalisé par un professionnel. Bleue : logement réalisé par un particulier.',
        'Verte : locaux non résidentiels. Violette : production d’électricité (photovoltaïque).',
        'Compte 2 à 3 semaines entre la demande et la visite : demande-la dès que le tableau est posé.',
      ],
      source: 'Décret 72-1120 modifié, site consuel.com.',
    },
  },
  {
    key: 'devis',
    match: /mention|obligatoire.*devis|devis.*obligatoire|retenue de garantie|acompte|decennale|retractation/,
    intro: 'Ce qu’un devis doit contenir pour te protéger.',
    card: {
      kind: 'lesson', icon: 'FileText', title: 'Devis : les mentions et les règles',
      bullets: [
        'Mentions obligatoires : ton identité et SIRET, la date, le détail des travaux, les prix HT, la TVA, la durée de validité, et ton assurance décennale (assureur et zone couverte).',
        'Acompte : libre, souvent 30 %. Vendu à domicile à un particulier : 14 jours de rétractation, aucun paiement pendant 7 jours.',
        'Retenue de garantie : 5 % au maximum, pendant un an, remplaçable par une caution bancaire.',
        'Brix ajoute toutes ces mentions automatiquement sur tes devis.',
      ],
      source: 'Arrêté du 24 janvier 2017, Code de la consommation L221-18, loi 71-584.',
    },
  },
];

export const findLesson = (n: string) => LESSONS.find((l) => l.match.test(n));
