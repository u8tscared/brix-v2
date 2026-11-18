/**
 * Définitions des outils de Bob (exécutés côté navigateur, sur les données locales de l'artisan :
 * src/modules/bob/outils/index.ts). Les noms, écrans et sujets doivent rester alignés avec le front
 * (un test le vérifie : src/modules/bob/outils/outils.test.ts).
 *
 * strict: true + additionalProperties: false + toutes les propriétés dans `required` :
 * une valeur facultative est déclarée nullable (anyOf … null).
 * Pas d'eager_input_streaming : on ne montre pas les entrées des outils pendant qu'elles
 * s'écrivent (entrées courtes), et on garde la validation du schéma par l'API.
 * L'ordre et le contenu sont fixes : ils font partie du préfixe mis en cache.
 */
import type { BetaTool } from '@anthropic-ai/sdk/resources/beta/messages/messages';

export const ECRANS = [
  'accueil', 'demandes', 'clients', 'rendez_vous', 'avis', 'devis', 'factures', 'facture_electronique', 'paiements', 'relances',
  'tresorerie', 'notes_de_frais', 'chantiers', 'planning', 'prise_de_cotes', 'photos', 'pv_reception', 'sav', 'equipe', 'pointage',
  'conges', 'habilitations', 'paie', 'fournisseurs', 'stock', 'vehicules', 'sous_traitants', 'bob', 'brief', 'outils',
  'calcul_nfc15100', 'site', 'compta', 'documents', 'reglages',
] as const;

export const SUJETS = ['nfc-cuisine', 'nfc-sdb', 'nfc-pieces', 'irve', 'tva', 'efacture', 'consuel', 'devis'] as const;

const nullable = (schema: Record<string, unknown>, description: string) => ({ anyOf: [schema, { type: 'null' }], description });
const objet = (properties: Record<string, unknown>) => ({ type: 'object' as const, properties, required: Object.keys(properties), additionalProperties: false });

const LIGNES = {
  type: 'array',
  description: 'Ouvrages ou fournitures, dans l’ordre dicté.',
  items: objet({
    libelle: { type: 'string', description: 'Ouvrage tel que dit par l’artisan, sans la quantité : « prise de courant », « peinture murs », « radiateur à inertie ».' },
    quantite: { type: 'number', description: 'Quantité (nombre d’unités, de m², de mètres…). 1 si non précisé.' },
    unite: nullable({ type: 'string' }, 'Unité si l’artisan l’a dite (u, m², m, h, forfait), sinon null.'),
    prix_unitaire_ht: nullable({ type: 'number' }, 'Prix unitaire HT en euros seulement si l’artisan l’a donné, sinon null (la bibliothèque de prix le remplit).'),
  }),
};

const outil = (name: string, description: string, properties: Record<string, unknown>): BetaTool => ({
  name,
  description,
  strict: true,
  input_schema: objet(properties),
});

export const OUTILS_BOB: BetaTool[] = [
  outil('rechercher', 'Cherche par texte dans les clients, devis, factures et chantiers de l’artisan (nom, numéro comme D-2026-118 ou F-2026-204, ville, titre). À utiliser dès qu’un nom ou un numéro est cité de façon approximative.', {
    texte: { type: 'string', description: 'Mots à chercher : nom, numéro, ville…' },
    types: nullable({ type: 'array', items: { type: 'string', enum: ['client', 'devis', 'facture', 'chantier'] } }, 'Limiter à certains types, ou null pour tout.'),
  }),
  outil('lire_resume', 'Chiffres clés du moment : encaissé sur la période, reste à encaisser, impayés (nombre et montant), devis en attente de signature, solde de trésorerie, chantiers en cours.', {
    periode: { type: 'string', enum: ['mois', 'semaine', 'annee'], description: 'Période des encaissements : mois en cours, 7 derniers jours ou depuis janvier.' },
  }),
  outil('lister_impayes', 'Liste les factures échues et non réglées (client, numéro, reste dû, jours de retard, relances déjà envoyées).', {}),
  outil('relancer_factures', 'PRÉPARE des relances de paiement par e-mail. N’envoie rien : une carte de confirmation s’affiche et l’artisan doit cliquer pour envoyer. Sans liste, prépare toutes les factures en retard.', {
    factures: nullable({ type: 'array', items: { type: 'string' } }, 'Numéros (F-2026-204) ou identifiants des factures à relancer, ou null pour toutes les factures en retard.'),
  }),
  outil('lister_devis_en_attente', 'Liste les devis envoyés ou vus par le client qui attendent une signature.', {}),
  outil('creer_devis', 'Crée un devis en BROUILLON pour un client (fiche client créée si elle n’existe pas), chiffré avec la bibliothèque de prix de l’artisan et une ligne de main-d’œuvre. Rien n’est envoyé au client.', {
    client: { type: 'string', description: 'Nom du client avec civilité si dite : « Mme Martin », « Boulangerie Dupuis ».' },
    titre: nullable({ type: 'string' }, 'Titre court du devis, ou null pour le déduire des lignes.'),
    lignes: LIGNES,
  }),
  outil('ajouter_lignes_devis', 'Ajoute des lignes à un devis encore en brouillon (le dernier brouillon si aucun devis n’est précisé).', {
    devis: nullable({ type: 'string' }, 'Numéro (D-2026-123) ou identifiant du devis, ou null pour le dernier brouillon.'),
    lignes: LIGNES,
  }),
  outil('lire_agenda', 'Lit le planning entre deux dates incluses, pour l’artisan seul ou pour toute l’équipe.', {
    du: { type: 'string', format: 'date', description: 'Date de début AAAA-MM-JJ.' },
    au: { type: 'string', format: 'date', description: 'Date de fin AAAA-MM-JJ (égale à du pour un seul jour).' },
    equipe: { type: 'boolean', description: 'true pour toute l’équipe, false pour l’artisan seul.' },
  }),
  outil('planifier', 'Place un compagnon de l’équipe sur un chantier à une date (ajouté au planning et à l’équipe du chantier). Signale les conflits de créneau.', {
    employe: { type: 'string', description: 'Prénom du compagnon.' },
    chantier: { type: 'string', description: 'Nom du chantier ou du client.' },
    date: { type: 'string', format: 'date', description: 'Jour AAAA-MM-JJ.' },
    creneau: { type: 'string', enum: ['journee', 'matin', 'apres_midi'], description: 'Journée entière, matin ou après-midi.' },
  }),
  outil('statut_chantier', 'Point complet sur un chantier : avancement, statut, budget, dépensé, marge prévue, équipe, prochaine étape.', {
    chantier: { type: 'string', description: 'Nom du chantier ou du client.' },
  }),
  outil('creer_client', 'Crée une fiche client (ne fait rien si un client du même nom existe déjà).', {
    nom: { type: 'string', description: 'Nom avec civilité si dite, ou raison sociale.' },
    telephone: nullable({ type: 'string' }, 'Téléphone, ou null.'),
    email: nullable({ type: 'string' }, 'E-mail, ou null.'),
    ville: nullable({ type: 'string' }, 'Ville, ou null.'),
    adresse: nullable({ type: 'string' }, 'Adresse, ou null.'),
  }),
  outil('calculer_marge', 'Calcule la marge : sur les devis signés, ou prévue à la fin des chantiers en cours au rythme actuel.', {
    portee: { type: 'string', enum: ['devis_signes', 'chantiers_en_cours'], description: 'Ce sur quoi calculer la marge.' },
  }),
  outil('ouvrir_ecran', 'Ouvre un écran de l’application, éventuellement sur une fiche précise.', {
    ecran: { type: 'string', enum: [...ECRANS], description: 'Écran à ouvrir.' },
    identifiant: nullable({ type: 'string' }, 'Numéro ou identifiant de la fiche (devis, facture, client, chantier), ou null pour la liste.'),
  }),
  outil('expliquer_regle', 'Renvoie la fiche vérifiée sur une règle du métier : NF C 15-100 (cuisine, salle de bain, pièces de vie), borne IRVE, taux de TVA, facture électronique, Consuel, mentions obligatoires du devis.', {
    sujet: { type: 'string', enum: [...SUJETS], description: 'Sujet de la fiche.' },
  }),
];
