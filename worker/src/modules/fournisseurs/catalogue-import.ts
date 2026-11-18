/**
 * Import de tarifs fournisseurs : CSV (séparateur ; , ou tabulation) et onglet « COMMERCE » d'un
 * fichier FAB-DIS exporté en CSV. Les colonnes sont reconnues automatiquement par leur en-tête.
 *
 * FAB-DIS est le format d'échange de catalogues entre fabricants et distributeurs du bâtiment
 * (négoce matériaux, sanitaire-chauffage, électricité). Les distributeurs le transmettent souvent à
 * leurs clients pros sous forme Excel ; l'import Excel natif (.xlsx) est prévu côté front (lecture
 * du fichier dans le navigateur puis envoi des lignes en JSON à cette même fonction).
 */

import { normalize, parseEurosToCents } from './util';

export type ChampCatalogue =
  | 'reference'
  | 'ean'
  | 'ref_fabricant'
  | 'marque'
  | 'designation'
  | 'famille'
  | 'unite'
  | 'conditionnement'
  | 'prix_public'
  | 'prix_net'
  | 'remise'
  | 'eco_part';

/** En-têtes reconnus (normalisés : minuscules, sans accents). Les noms FAB-DIS sont inclus. */
const ALIAS: Record<ChampCatalogue, string[]> = {
  reference: ['reference', 'ref', 'ref fournisseur', 'reference fournisseur', 'code article', 'article', 'refciale', 'ref distributeur', 'code'],
  ean: ['ean', 'ean13', 'gtin', 'gtin13', 'code barre', 'code ean'],
  ref_fabricant: ['ref fabricant', 'reference fabricant', 'refart', 'ref constructeur'],
  marque: ['marque', 'fabricant', 'fournisseur fabricant'],
  designation: ['designation', 'libelle', 'libelle80', 'libelle240', 'libelle30', 'description', 'nom', 'produit'],
  famille: ['famille', 'categorie', 'sous famille', 'fam', 'famille article'],
  unite: ['unite', 'ub', 'unite de vente', 'uv', 'unite base'],
  conditionnement: ['conditionnement', 'cond', 'qmv', 'quantite minimale', 'colisage', 'qte'],
  prix_public: ['prix public', 'tarif', 'prix catalogue', 'ppht', 'prix public ht', 'tarif ht'],
  prix_net: ['prix net', 'net', 'prix net ht', 'votre prix', 'prix client', 'prix remise', 'pu net'],
  remise: ['remise', 'remise %', 'taux remise', 'remise client'],
  eco_part: ['eco part', 'ecopart', 'eco participation', 'deee', 'eco contribution'],
};

export interface LigneImportee {
  reference: string;
  ean: string | null;
  ref_fabricant: string | null;
  marque: string | null;
  designation: string;
  famille: string | null;
  unite: string;
  conditionnement: number | null;
  prix_public_cents: number | null;
  prix_net_cents: number | null;
  eco_part_cents: number | null;
}

export interface ResultatAnalyse {
  colonnes: Partial<Record<ChampCatalogue, number>>;
  entetes: string[];
  lignes: LigneImportee[];
  rejets: { ligne: number; raison: string }[];
  format: 'csv' | 'fabdis';
}

/** Parseur CSV tolérant (guillemets, séparateur détecté, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', '\t', ','].map((s) => ({ s, n: firstLine.split(s).length })).sort((a, b) => b.n - a.n)[0].s;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === '') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export function detecterColonnes(entetes: string[]): Partial<Record<ChampCatalogue, number>> {
  const out: Partial<Record<ChampCatalogue, number>> = {};
  const norm = entetes.map((h) => normalize(h).replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim());
  for (const champ of Object.keys(ALIAS) as ChampCatalogue[]) {
    // 1) correspondance exacte, 2) l'en-tête commence par l'alias
    let idx = norm.findIndex((h, i) => ALIAS[champ].includes(h) && !Object.values(out).includes(i));
    if (idx < 0) idx = norm.findIndex((h, i) => ALIAS[champ].some((a) => h.startsWith(a + ' ')) && !Object.values(out).includes(i));
    if (idx >= 0) out[champ] = idx;
  }
  return out;
}

export function analyserTarif(
  rows: string[][],
  mapping?: Partial<Record<ChampCatalogue, number>>,
): ResultatAnalyse {
  const rejets: { ligne: number; raison: string }[] = [];
  if (rows.length === 0) return { colonnes: {}, entetes: [], lignes: [], rejets, format: 'csv' };
  const entetes = rows[0].map((h) => h.trim());
  const colonnes = mapping ?? detecterColonnes(entetes);
  const fabdis = entetes.some((h) => /^(REFCIALE|LIBELLE80|GTIN13)$/i.test(h));

  const get = (r: string[], champ: ChampCatalogue): string | null => {
    const idx = colonnes[champ];
    if (idx == null) return null;
    const v = (r[idx] ?? '').trim();
    return v === '' ? null : v;
  };

  const lignes: LigneImportee[] = [];
  const vues = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const reference = get(r, 'reference') ?? get(r, 'ean');
    const designation = get(r, 'designation');
    if (!reference) {
      rejets.push({ ligne: i + 1, raison: 'Référence manquante' });
      continue;
    }
    if (!designation) {
      rejets.push({ ligne: i + 1, raison: 'Désignation manquante' });
      continue;
    }
    if (vues.has(reference)) {
      rejets.push({ ligne: i + 1, raison: `Référence ${reference} en double` });
      continue;
    }
    vues.add(reference);

    const prixPublic = parseEurosToCents(get(r, 'prix_public'));
    let prixNet = parseEurosToCents(get(r, 'prix_net'));
    const remiseRaw = get(r, 'remise');
    if (prixNet == null && prixPublic != null && remiseRaw) {
      const remise = Number(remiseRaw.replace('%', '').replace(',', '.'));
      if (Number.isFinite(remise) && remise >= 0 && remise < 100) prixNet = Math.round(prixPublic * (1 - remise / 100));
    }
    if (prixNet == null && prixPublic == null) {
      rejets.push({ ligne: i + 1, raison: 'Aucun prix lisible' });
      continue;
    }
    const cond = get(r, 'conditionnement');
    const condNum = cond ? Number(cond.replace(',', '.')) : null;

    lignes.push({
      reference,
      ean: get(r, 'ean'),
      ref_fabricant: get(r, 'ref_fabricant'),
      marque: get(r, 'marque'),
      designation: designation.slice(0, 240),
      famille: get(r, 'famille'),
      unite: (get(r, 'unite') ?? 'u').slice(0, 12),
      conditionnement: condNum != null && Number.isFinite(condNum) && condNum > 0 ? condNum : null,
      prix_public_cents: prixPublic,
      prix_net_cents: prixNet ?? prixPublic,
      eco_part_cents: parseEurosToCents(get(r, 'eco_part')),
    });
  }
  return { colonnes, entetes, lignes, rejets, format: fabdis ? 'fabdis' : 'csv' };
}
