// Source unique de « l'argent encaissé » sur une période : les paiements reçus sur les factures
// (saisis dans Brix, ou reconstitués depuis le montant réglé). Utilisé par l'accueil, l'écran Factures et Brix AI.
import type { Facture } from '@/lib/types';
import { allPayments } from '../store';
import type { Payment } from './model';

/** Paiements reçus entre `from` et `to` inclus (dates ISO AAAA-MM-JJ), du plus récent au plus ancien. */
export function encaisseEntre(factures: Facture[], payments: Payment[], from: string, to: string) {
  const paiements = allPayments(factures, payments).filter((p) => p.date.slice(0, 10) >= from && p.date.slice(0, 10) <= to);
  return { paiements, total: paiements.reduce((a, p) => a + p.amount, 0) };
}

/** Encaissé depuis le 1er du mois de `today`. */
export const encaisseDuMois = (factures: Facture[], payments: Payment[], today: string) => encaisseEntre(factures, payments, today.slice(0, 8) + '01', today);
