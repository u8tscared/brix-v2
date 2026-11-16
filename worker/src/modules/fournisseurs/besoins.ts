/**
 * Transforme les lignes d'un devis en besoins matériaux (lignes de demande de prix).
 *
 * Règles :
 *  - on garde les lignes « fourniture » ; les « ouvrage » seulement si elles portent une référence fournisseur ;
 *  - main d'œuvre et sections ignorées ;
 *  - deux lignes identiques (même référence, ou même désignation normalisée et même unité) sont additionnées.
 */

import type { DevisLigneSource } from './types';
import { normalize } from './util';

export interface Besoin {
  designation: string;
  reference: string | null;
  quantite: number;
  unite: string;
  devis_ligne_ids: string[];
  prix_cible_cents: number | null;
}

/** Les montants du module devis sont en euros HT (REAL). Point unique de conversion. */
export function devisAmountToCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function extraireBesoins(lignes: DevisLigneSource[]): Besoin[] {
  const map = new Map<string, Besoin>();
  const sorted = [...lignes].sort((a, b) => a.position - b.position);

  for (const l of sorted) {
    const ref = l.supplier_ref?.trim() || null;
    const garder = l.kind === 'fourniture' || (l.kind === 'ouvrage' && !!ref);
    if (!garder) continue;
    const qty = Number(l.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const designation = l.designation.trim();
    if (!designation) continue;
    const unite = (l.unit || 'u').trim();
    const key = ref ? `ref:${ref.toLowerCase()}` : `des:${normalize(designation)}|${unite.toLowerCase()}`;

    const cible = devisAmountToCents(l.unit_cost_ht);
    const existing = map.get(key);
    if (existing) {
      existing.quantite = round3(existing.quantite + qty);
      existing.devis_ligne_ids.push(l.id);
      if (existing.prix_cible_cents == null) existing.prix_cible_cents = cible;
    } else {
      map.set(key, {
        designation,
        reference: ref,
        quantite: round3(qty),
        unite,
        devis_ligne_ids: [l.id],
        prix_cible_cents: cible,
      });
    }
  }
  return [...map.values()];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
