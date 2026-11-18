// Données d'exemple pour chaque modèle (galerie de la boîte de démo, aperçu du worker, tests).
// Persona : Karim Benali, Benali Électricité (Villeurbanne). Cliente : Claire Lefèvre (Lyon 3e).
// Les dates sont relatives à aujourd'hui. TypeScript pur (app + worker).

import type { DonneesEmail, Emetteur, ModeleEmail } from './types';
import { PUBLIC_MODELE } from './modeles/index';

export const KARIM: Emetteur = {
  entreprise: 'Benali Électricité',
  prenom: 'Karim',
  nom: 'Benali',
  telephone: '06 12 45 78 90',
  email: 'karim@benali-elec.fr',
  ville: 'Villeurbanne',
  initiales: 'BE',
  siret: '812 457 963 00021',
};

/** Date du jour décalée, au format AAAA-MM-JJ. */
function jour(decalage: number, ref = new Date()): string {
  const d = new Date(ref.getTime() + decalage * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function instant(minutesAvant: number, ref = new Date()): string {
  return new Date(ref.getTime() - minutesAvant * 60000).toISOString();
}

export interface Exemple<M extends ModeleEmail = ModeleEmail> {
  modele: M;
  donnees: DonneesEmail[M];
  de: string;
  a: string;
  pour: 'client' | 'artisan' | 'fournisseur';
}

/** Tous les exemples. `base` : racine de l'app pour les liens (HashRouter), ex. « https://app.brix-app.fr/ ». */
export function exemples(base = 'https://app.brix-app.fr/'): { [M in ModeleEmail]: Exemple<M> } {
  const l = (chemin: string) => `${base.replace(/#.*$/, '')}#/${chemin}`;
  const devis = {
    emetteur: KARIM,
    destinataire: 'Claire Lefèvre',
    civilite: 'Claire',
    numero: 'D-2026-121',
    titre: 'Rénovation électrique appartement T3',
    montantTtc: 4374.81,
    lien: l('d/q_121'),
    lignes: [
      { libelle: 'Tableau électrique et protections', montant: 910.69 },
      { libelle: 'Distribution et 20 prises', montant: 2087.14 },
      { libelle: 'Éclairage : 12 spots LED', montant: 1057.98 },
      { libelle: 'Mise en service et Consuel', montant: 319.0 },
    ],
    echeance: jour(30),
    acomptePourcent: 30,
    acompteMontant: 1312.44,
  };
  const de = 'Karim Benali · Benali Électricité';
  const ex = <M extends ModeleEmail>(modele: M, donnees: DonneesEmail[M], a: string, deNom = de): Exemple<M> => ({ modele, donnees, de: deNom, a, pour: PUBLIC_MODELE[modele] });
  const brix = 'Brix';
  return {
    devis_envoye: ex('devis_envoye', { ...devis, message: "Comme promis après la visite de mardi, voici le devis. J'ai ajouté le différentiel type F pour la plaque à induction.\nBonne soirée !" }, 'claire.lefevre@gmail.com'),
    devis_relance: ex(
      'devis_relance',
      { ...devis, destinataire: 'Thomas Garnier', civilite: 'Monsieur Garnier', numero: 'D-2026-118', titre: 'Mise en conformité NF C 15-100', montantTtc: 4496.8, lien: l('d/q_118'), echeance: jour(9), lignes: undefined, rang: 2 },
      't.garnier@orange.fr',
    ),
    code_signature: ex('code_signature', { emetteur: KARIM, civilite: 'Claire', code: '482913', numero: 'D-2026-121', minutes: 10 }, 'claire.lefevre@gmail.com'),
    devis_signe_client: ex(
      'devis_signe_client',
      { ...devis, signeLe: instant(42), signataire: 'Claire Lefèvre', formule: 'Avec option éclairage LED', empreinte: '9f2c4e71b8a03d5e6c1f8a2b47d90e3c' },
      'claire.lefevre@gmail.com',
    ),
    devis_signe_artisan: ex('devis_signe_artisan', { ...devis, signeLe: instant(41), signataire: 'Claire Lefèvre', formule: 'Avec option éclairage LED', lienApp: l('app/devis/q_121') }, 'karim@benali-elec.fr', brix),
    facture_envoyee: ex(
      'facture_envoyee',
      {
        ...devis,
        destinataire: 'Boulangerie Martin',
        civilite: 'Madame Martin',
        numero: 'F-2026-203',
        titre: 'Passage en triphasé, situation n°1',
        montantTtc: 4492.8,
        lien: l('f/f_203'),
        echeance: jour(23),
        lignes: [
          { libelle: 'Tableau triphasé 4 rangées', montant: 1364.0 },
          { libelle: 'Câble U1000 R2V 5G10 (35 m)', montant: 712.25 },
          { libelle: 'Raccordement four et chambre froide', montant: 1496.0 },
          { libelle: "Main d'œuvre (60 % réalisés)", montant: 920.55 },
        ],
        message: undefined,
        type: 'situation',
      },
      'contact@boulangerie-martin.fr',
    ),
    facture_relance: ex(
      'facture_relance',
      { ...devis, destinataire: 'SCI Les Tilleuls', civilite: 'Monsieur Roche', numero: 'F-2026-198', titre: 'Éclairage LED des cages d\'escalier, situation n°2', montantTtc: 2398.0, lien: l('f/f_198'), echeance: jour(-12), lignes: undefined, rang: 3, joursRetard: 12, clientPro: true },
      'gestion@sci-tilleuls.fr',
    ),
    paiement_recu_client: ex('paiement_recu_client', { ...devis, numero: 'F-2026-201', titre: 'Acompte 30 %, rénovation T3', montantTtc: 1312.44, lien: l('f/f_201'), payeLe: jour(0), moyen: 'Carte bancaire', reste: 3062.37 }, 'claire.lefevre@gmail.com'),
    paiement_recu_artisan: ex('paiement_recu_artisan', { ...devis, numero: 'F-2026-201', titre: 'Acompte 30 %, rénovation T3', montantTtc: 1312.44, lien: l('f/f_201'), payeLe: jour(0), moyen: 'Carte bancaire', client: 'Claire Lefèvre', lienApp: l('app/factures/f_201') }, 'karim@benali-elec.fr', brix),
    demande_prix: ex(
      'demande_prix',
      {
        emetteur: KARIM,
        fournisseur: 'Rexel Villeurbanne',
        contact: 'Julien',
        reference: 'DP-2026-044',
        chantier: 'Rénovation T3, Lyon 3e',
        articles: [
          { designation: 'Coffret Drivia 3 rangées 39 modules', quantite: 1, unite: 'u' },
          { designation: 'Interrupteur différentiel 40 A 30 mA type A', quantite: 2, unite: 'u' },
          { designation: 'Interrupteur différentiel 40 A 30 mA type F', quantite: 1, unite: 'u' },
          { designation: 'Disjoncteur DX³ 16 A courbe C', quantite: 8, unite: 'u' },
          { designation: 'Prise 2P+T Céliane blanc', quantite: 20, unite: 'u' },
          { designation: 'Câble R2V 3G2,5 mm²', quantite: 84, unite: 'm' },
        ],
        reponseAvant: jour(2),
        livraison: jour(6),
        lien: l('portail-fournisseur/dp_044'),
        message: 'Bonjour Julien, si le Drivia est en rupture, le XL³ 160 me va aussi.',
      },
      'julien.m@rexel-villeurbanne.fr',
    ),
    commande_fournisseur: ex(
      'commande_fournisseur',
      {
        emetteur: KARIM,
        fournisseur: 'Rexel Villeurbanne',
        contact: 'Julien',
        numero: 'BC-2026-031',
        chantier: 'Rénovation T3, Lyon 3e',
        montantHt: 612.5,
        articles: [
          { designation: 'Coffret Drivia 3 rangées 39 modules', quantite: 1, unite: 'u', prixHt: 82.9 },
          { designation: 'Interrupteur différentiel 40 A type A', quantite: 2, unite: 'u', prixHt: 44.2 },
          { designation: 'Interrupteur différentiel 40 A type F', quantite: 1, unite: 'u', prixHt: 78.0 },
          { designation: 'Disjoncteur DX³ 16 A courbe C', quantite: 8, unite: 'u', prixHt: 7.1 },
          { designation: 'Prise 2P+T Céliane blanc', quantite: 20, unite: 'u', prixHt: 12.8 },
          { designation: 'Câble R2V 3G2,5 mm²', quantite: 84, unite: 'm', prixHt: 0.6 },
        ],
        livraison: jour(4),
        adresse: '18 rue Paul Bert, 69003 Lyon',
        lien: l('portail-fournisseur/bc_031'),
      },
      'julien.m@rexel-villeurbanne.fr',
    ),
    reponse_fournisseur: ex('reponse_fournisseur', { emetteur: KARIM, fournisseur: 'Rexel Villeurbanne', reference: 'DP-2026-044', montantHt: 598.7, delai: 'Livrable sous 48 h', lienApp: l('app/fournisseurs'), meilleur: true }, 'karim@benali-elec.fr', brix),
    bienvenue: ex(
      'bienvenue',
      {
        prenom: 'Karim',
        entreprise: 'Benali Électricité',
        metier: 'Électricien',
        lienApp: l('app'),
        etapes: ['Ajoutez votre logo et vos mentions (2 minutes)', 'Créez votre premier devis, à la voix ou au clavier', 'Envoyez-le : votre client signe depuis son téléphone'],
      },
      'karim@benali-elec.fr',
      brix,
    ),
    mot_de_passe: ex('mot_de_passe', { prenom: 'Karim', lien: l('mot-de-passe?jeton=exemple'), minutes: 60 }, 'karim@benali-elec.fr', brix),
  };
}

/** Liste ordonnée (ordre du parcours : devis, signature, facture, paiement, achats, compte). */
export const ORDRE_MODELES: ModeleEmail[] = [
  'devis_envoye',
  'code_signature',
  'devis_signe_client',
  'devis_signe_artisan',
  'devis_relance',
  'facture_envoyee',
  'facture_relance',
  'paiement_recu_client',
  'paiement_recu_artisan',
  'demande_prix',
  'reponse_fournisseur',
  'commande_fournisseur',
  'bienvenue',
  'mot_de_passe',
];
