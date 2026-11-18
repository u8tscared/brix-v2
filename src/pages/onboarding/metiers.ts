// Contenu métier de l'onboarding : exemple de devis réaliste, vocabulaire et premières actions conseillées.
// Prix HT plausibles en France (2026), fournitures et pose comprises sauf mention.

import type { TradeKey } from '@/lib/types';

export interface LigneExemple {
  l: string; // libellé
  q: number; // quantité
  u: string; // unité
  pu: number; // prix unitaire HT
}

export interface ProfilMetier {
  titre: string; // objet du devis d'exemple
  client: string;
  tva: number; // taux en %
  lignes: LigneExemple[];
  vocab: string[]; // mots que Brix connaît pour ce métier
  etapes: [string, string, string]; // 3 premières actions conseillées
}

export const PROFILS: Record<TradeKey, ProfilMetier> = {
  electricien: {
    titre: 'Rénovation électrique T3',
    client: 'Claire Lefèvre',
    tva: 10,
    lignes: [
      { l: 'Tableau 3 rangées, différentiels 30 mA type A et AC', q: 1, u: 'u', pu: 890 },
      { l: 'Point lumineux DCL avec interrupteur', q: 8, u: 'u', pu: 85 },
      { l: 'Prise 16 A encastrée', q: 14, u: 'u', pu: 62 },
      { l: 'Attestation Consuel', q: 1, u: 'forfait', pu: 180 },
    ],
    vocab: ['Consuel', 'NF C 15-100', 'IRVE', 'Différentiel 30 mA', 'Mise à la terre'],
    etapes: ['Créer un devis de rénovation pièce par pièce (NF C 15-100)', 'Importer vos tarifs Rexel ou Sonepar', 'Préparer le dossier Consuel de votre prochain chantier'],
  },
  plombier: {
    titre: 'Chauffe-eau et diagnostic fuite',
    client: 'Marc Dubois',
    tva: 10,
    lignes: [
      { l: 'Diagnostic fuite non destructif', q: 1, u: 'forfait', pu: 190 },
      { l: 'Chauffe-eau électrique 200 L vertical', q: 1, u: 'u', pu: 980 },
      { l: 'Groupe de sécurité et raccords', q: 1, u: 'u', pu: 95 },
      { l: 'Déplacement et mise en service', q: 1, u: 'forfait', pu: 65 },
    ],
    vocab: ['PGN', 'Diagnostic fuite', 'Groupe de sécurité', 'Entretien chaudière', 'PAC'],
    etapes: ['Créer un devis de dépannage depuis votre téléphone', 'Lancer vos contrats d\'entretien chaudière annuels', 'Envoyer un lien de paiement à la fin de l\'intervention'],
  },
  peintre: {
    titre: 'Peinture séjour et couloir',
    client: 'Sophie Martin',
    tva: 10,
    lignes: [
      { l: 'Protection des sols et du mobilier', q: 1, u: 'forfait', pu: 120 },
      { l: 'Rebouchage, ponçage et impression', q: 46, u: 'm²', pu: 9 },
      { l: 'Peinture murs, 2 couches velours', q: 46, u: 'm²', pu: 24 },
      { l: 'Peinture plafond, 2 couches mat', q: 22, u: 'm²', pu: 26 },
    ],
    vocab: ['Impression', 'Velours', 'Ratissage', 'Toile de verre', 'Rendement m²/L'],
    etapes: ['Prendre les cotes d\'une pièce, le devis se remplit seul', 'Calculer les litres de peinture d\'un chantier', 'Envoyer les photos avant/après à votre client'],
  },
  carreleur: {
    titre: 'Carrelage salle de bain',
    client: 'Julien Moreau',
    tva: 10,
    lignes: [
      { l: 'Dépose ancien carrelage et évacuation', q: 6, u: 'm²', pu: 28 },
      { l: 'Ragréage et primaire d\'accrochage', q: 6, u: 'm²', pu: 22 },
      { l: 'Pose grès cérame 60x60, colle C2', q: 6, u: 'm²', pu: 58 },
      { l: 'Faïence murale toute hauteur', q: 14, u: 'm²', pu: 62 },
    ],
    vocab: ['Calepinage', 'Colle C2', 'Ragréage', 'SPEC', 'Plinthes'],
    etapes: ['Faire un calepinage avec les chutes et la colle', 'Créer un devis de salle de bain en 2 minutes', 'Commander le carrelage chez votre fournisseur'],
  },
  plaquiste: {
    titre: 'Cloisons et plafond des combles',
    client: 'Nadia Benali',
    tva: 10,
    lignes: [
      { l: 'Cloison 72/48 BA13 isolée', q: 18, u: 'm²', pu: 48 },
      { l: 'Plafond sur fourrures F530', q: 24, u: 'm²', pu: 52 },
      { l: 'Laine de verre 200 mm', q: 24, u: 'm²', pu: 28 },
      { l: 'Bandes et enduit, prêt à peindre', q: 66, u: 'm²', pu: 9 },
    ],
    vocab: ['BA13', 'Rails et montants', 'Fourrures', 'Plaque hydro', 'Bandes'],
    etapes: ['Calculer plaques, rails et vis d\'une cloison', 'Créer votre premier devis de combles', 'Demander un prix à trois fournisseurs en une fois'],
  },
  menuisier: {
    titre: 'Remplacement de 3 fenêtres',
    client: 'Anne Girard',
    tva: 5.5,
    lignes: [
      { l: 'Fenêtre PVC 2 vantaux 125 x 135, Uw 1,3', q: 3, u: 'u', pu: 690 },
      { l: 'Dépose en rénovation et évacuation', q: 3, u: 'u', pu: 80 },
      { l: 'Pose et calfeutrement', q: 3, u: 'u', pu: 140 },
      { l: 'Volet roulant motorisé', q: 2, u: 'u', pu: 520 },
    ],
    vocab: ['Uw', 'Dormant', 'Pose en rénovation', 'Tableau', 'TVA 5,5 %'],
    etapes: ['Saisir les cotes tableau de vos fenêtres', 'Créer un devis à 5,5 % avec les mentions obligatoires', 'Planifier la pose avec votre client'],
  },
  couvreur: {
    titre: 'Réfection partielle de toiture',
    client: 'Pierre Lambert',
    tva: 10,
    lignes: [
      { l: 'Échafaudage et sécurité', q: 1, u: 'forfait', pu: 650 },
      { l: 'Remplacement tuiles mécaniques', q: 32, u: 'm²', pu: 68 },
      { l: 'Faîtage scellé', q: 12, u: 'ml', pu: 45 },
      { l: 'Zinguerie : gouttière zinc de 25', q: 14, u: 'ml', pu: 58 },
    ],
    vocab: ['Zinguerie', 'Faîtage', 'Liteaux', 'Écran sous-toiture', 'Noue'],
    etapes: ['Calculer la surface d\'un toit avec sa pente', 'Créer un devis de zinguerie en 2 minutes', 'Envoyer un rapport photo de toiture au client'],
  },
  macon: {
    titre: 'Ouverture dans un mur porteur',
    client: 'Thomas Petit',
    tva: 10,
    lignes: [
      { l: 'Étaiement et sciage du mur', q: 1, u: 'forfait', pu: 1200 },
      { l: 'Pose IPN et sommiers béton', q: 1, u: 'u', pu: 950 },
      { l: 'Évacuation des gravats', q: 1, u: 'forfait', pu: 280 },
      { l: 'Enduit et reprises', q: 6, u: 'm²', pu: 45 },
    ],
    vocab: ['IPN', 'Chaînage', 'Ferraillage', 'Dalle', 'Mètre cube'],
    etapes: ['Calculer le béton et les sacs d\'une dalle', 'Créer un devis avec acompte de 30 %', 'Suivre la marge de votre chantier en cours'],
  },
  paysagiste: {
    titre: 'Entretien annuel du jardin',
    client: 'Famille Roux',
    tva: 20,
    lignes: [
      { l: 'Tonte et bordures, 12 passages', q: 12, u: 'u', pu: 55 },
      { l: 'Taille des haies, 2 passages', q: 80, u: 'ml', pu: 6.5 },
      { l: 'Ramassage des feuilles', q: 2, u: 'forfait', pu: 90 },
      { l: 'Désherbage des massifs', q: 4, u: 'u', pu: 45 },
    ],
    vocab: ['Entretien annuel', 'Crédit d\'impôt 50 %', 'Engazonnement', 'Paillage', 'Arrosage'],
    etapes: ['Créer vos contrats d\'entretien annuel', 'Planifier vos tournées de la semaine', 'Faire signer un devis de création de jardin'],
  },
  climaticien: {
    titre: 'Climatisation réversible 3 pièces',
    client: 'Laura Fontaine',
    tva: 10,
    lignes: [
      { l: 'Unité extérieure multisplit 7 kW', q: 1, u: 'u', pu: 2490 },
      { l: 'Unités intérieures murales', q: 3, u: 'u', pu: 520 },
      { l: 'Liaisons frigorifiques et goulottes', q: 18, u: 'ml', pu: 42 },
      { l: 'Tirage au vide et mise en service', q: 1, u: 'forfait', pu: 290 },
    ],
    vocab: ['Fluide R32', 'Attestation de capacité', 'Multisplit', 'SCOP', 'Tirage au vide'],
    etapes: ['Calculer la puissance de clim pièce par pièce', 'Créer vos contrats d\'entretien annuels', 'Créer un devis de PAC avec les aides'],
  },
  serrurier: {
    titre: 'Ouverture de porte et serrure',
    client: 'Karine Blanc',
    tva: 10,
    lignes: [
      { l: 'Déplacement', q: 1, u: 'forfait', pu: 49 },
      { l: 'Ouverture de porte claquée', q: 1, u: 'forfait', pu: 89 },
      { l: 'Cylindre haute sécurité A2P 1 étoile', q: 1, u: 'u', pu: 165 },
      { l: 'Pose et réglage', q: 1, u: 'forfait', pu: 60 },
    ],
    vocab: ['A2P', 'Cylindre', 'Multipoints', 'Porte blindée', 'Devis avant intervention'],
    etapes: ['Faire un devis express signé sur place', 'Encaisser par carte sur votre téléphone', 'Envoyer la facture avant de quitter le client'],
  },
  cuisiniste: {
    titre: 'Salle de bain clé en main',
    client: 'Hélène Mercier',
    tva: 10,
    lignes: [
      { l: 'Dépose et évacuation', q: 1, u: 'forfait', pu: 650 },
      { l: 'Receveur extra-plat et paroi 120', q: 1, u: 'u', pu: 1180 },
      { l: 'Meuble vasque 80 cm et miroir', q: 1, u: 'u', pu: 890 },
      { l: 'Faïence, fourniture et pose', q: 12, u: 'm²', pu: 78 },
    ],
    vocab: ['Métré', 'Receveur extra-plat', 'Crédence', 'SPEC', 'Plan de travail'],
    etapes: ['Prendre le métré de la pièce sur votre téléphone', 'Créer un devis avec options pour votre client', 'Commander les meubles et suivre la livraison'],
  },
  renovation: {
    titre: 'Rénovation appartement 60 m²',
    client: 'Isabelle Garnier',
    tva: 10,
    lignes: [
      { l: 'Lot 1 : démolition et évacuation', q: 1, u: 'forfait', pu: 2400 },
      { l: 'Lot 2 : cloisons et doublages', q: 38, u: 'm²', pu: 52 },
      { l: 'Lot 3 : électricité mise aux normes', q: 1, u: 'forfait', pu: 6800 },
      { l: 'Lot 4 : peinture complète', q: 180, u: 'm²', pu: 24 },
    ],
    vocab: ['Lots', 'Situations de travaux', 'Retenue de garantie', 'Sous-traitance', 'Autoliquidation'],
    etapes: ['Créer un devis par lots avec vos sous-traitants', 'Planifier les corps d\'état sur le chantier', 'Facturer votre première situation de travaux'],
  },
  autre: {
    titre: 'Petits travaux',
    client: 'Paul Renaud',
    tva: 10,
    lignes: [
      { l: 'Main-d\'oeuvre', q: 6, u: 'h', pu: 50 },
      { l: 'Fournitures', q: 1, u: 'forfait', pu: 180 },
      { l: 'Déplacement', q: 1, u: 'forfait', pu: 35 },
    ],
    vocab: ['Taux horaire', 'Forfait', 'Acompte', 'Fournitures'],
    etapes: ['Régler votre taux horaire et vos mentions', 'Créer votre premier devis en 2 minutes', 'Envoyer votre première facture'],
  },
};

export const totalHt = (p: ProfilMetier) => p.lignes.reduce((s, x) => s + x.q * x.pu, 0);

export const eur = (n: number, dec = 0) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n).replace(/ /g, ' ');
