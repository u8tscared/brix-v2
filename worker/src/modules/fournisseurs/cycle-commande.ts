/**
 * Cycle de vie d'une commande fournisseur : transitions autorisées et libellés.
 */

import type { Acteur, StatutCommande } from './types';

const TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
  brouillon: ['envoyee', 'annulee'],
  envoyee: ['confirmee', 'expediee', 'livree_partiel', 'livree', 'annulee'],
  confirmee: ['expediee', 'livree_partiel', 'livree', 'annulee'],
  expediee: ['livree_partiel', 'livree'],
  livree_partiel: ['livree_partiel', 'livree'],
  livree: ['facturee'],
  facturee: [],
  annulee: [],
};

/** Ce que le fournisseur a le droit de faire depuis le portail ou l'API. */
const FOURNISSEUR_PEUT: StatutCommande[] = ['confirmee', 'expediee', 'livree_partiel', 'livree'];

export function transitionAutorisee(de: StatutCommande, vers: StatutCommande, acteur: Acteur): boolean {
  if (!TRANSITIONS[de]?.includes(vers)) return false;
  if ((acteur === 'fournisseur' || acteur === 'api') && !FOURNISSEUR_PEUT.includes(vers)) return false;
  return true;
}

export const LIBELLES_COMMANDE: Record<StatutCommande, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  confirmee: 'Confirmée par le fournisseur',
  expediee: 'Expédiée',
  livree_partiel: 'Livrée en partie',
  livree: 'Livrée',
  facturee: 'Facturée',
  annulee: 'Annulée',
};

/** Statut déduit des quantités livrées. */
export function statutDepuisLivraisons(lignes: { quantite: number; quantite_livree: number }[]): StatutCommande | null {
  if (lignes.length === 0) return null;
  const toutes = lignes.every((l) => l.quantite_livree >= l.quantite);
  if (toutes) return 'livree';
  const aucune = lignes.every((l) => l.quantite_livree <= 0);
  return aucune ? null : 'livree_partiel';
}
