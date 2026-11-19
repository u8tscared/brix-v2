// Registre des modèles : un rendu par ModeleEmail (le typage garantit qu'aucun n'est oublié).

import type { DonneesEmail, ModeleEmail, RenduEmail } from '../types';
import { bienvenue, devisSigneArtisan, paiementRecuArtisan, reponseFournisseur } from './artisan';
import { codeSignature, devisEnvoye, devisRelance, devisSigneClient } from './client-devis';
import { factureEnvoyee, factureRelance, paiementRecuClient } from './client-facture';
import { commandeFournisseur, demandePrix } from './fournisseur';
import { motDePasse } from './compte';

export const MODELES: { [M in ModeleEmail]: (d: DonneesEmail[M]) => RenduEmail } = {
  devis_envoye: devisEnvoye,
  devis_relance: devisRelance,
  code_signature: codeSignature,
  devis_signe_client: devisSigneClient,
  devis_signe_artisan: devisSigneArtisan,
  facture_envoyee: factureEnvoyee,
  facture_relance: factureRelance,
  paiement_recu_client: paiementRecuClient,
  paiement_recu_artisan: paiementRecuArtisan,
  demande_prix: demandePrix,
  commande_fournisseur: commandeFournisseur,
  reponse_fournisseur: reponseFournisseur,
  bienvenue,
  mot_de_passe: motDePasse,
};

/** À qui s'adresse chaque modèle (filtres de la boîte, en-têtes List-Unsubscribe, tags). */
export const PUBLIC_MODELE: Record<ModeleEmail, 'client' | 'artisan' | 'fournisseur'> = {
  devis_envoye: 'client',
  devis_relance: 'client',
  code_signature: 'client',
  devis_signe_client: 'client',
  devis_signe_artisan: 'artisan',
  facture_envoyee: 'client',
  facture_relance: 'client',
  paiement_recu_client: 'client',
  paiement_recu_artisan: 'artisan',
  demande_prix: 'fournisseur',
  commande_fournisseur: 'fournisseur',
  reponse_fournisseur: 'artisan',
  bienvenue: 'artisan',
  mot_de_passe: 'artisan',
};

/** Nom lisible du modèle (galerie, journal). */
export const NOM_MODELE: Record<ModeleEmail, string> = {
  devis_envoye: 'Devis envoyé',
  devis_relance: 'Relance de devis',
  code_signature: 'Code de signature',
  devis_signe_client: 'Devis signé (client)',
  devis_signe_artisan: 'Devis signé (artisan)',
  facture_envoyee: 'Facture envoyée',
  facture_relance: 'Relance de facture',
  paiement_recu_client: 'Reçu de paiement',
  paiement_recu_artisan: 'Paiement reçu (artisan)',
  demande_prix: 'Demande de prix',
  commande_fournisseur: 'Bon de commande',
  reponse_fournisseur: 'Réponse fournisseur',
  bienvenue: 'Bienvenue',
  mot_de_passe: 'Nouveau mot de passe',
};

export { esc, euros, dateLongue, dateHeure } from './outils';
