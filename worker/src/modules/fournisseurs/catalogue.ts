/**
 * Catalogue de prix : enregistrement avec historique, import de tarifs, recherche multi-fournisseurs,
 * alertes de hausse.
 */

import type { Env } from '../../env';
import { analyserTarif, parseCsv, type ChampCatalogue, type LigneImportee } from './catalogue-import';
import { all, first, fournisseurOuErreur, run } from './depot';
import type { ArticleCatalogue } from './types';
import { DAY_MS, HttpError, newId, normalize } from './util';

export interface PrixSaisi {
  reference: string;
  designation: string;
  unite?: string | null;
  ean?: string | null;
  ref_fabricant?: string | null;
  marque?: string | null;
  famille?: string | null;
  conditionnement?: number | null;
  prix_public_cents?: number | null;
  prix_net_cents: number | null;
  eco_part_cents?: number | null;
  source: string;
}

/** Insère ou met à jour un article ; archive l'ancien prix net s'il change. Renvoie 'cree' | 'maj' | 'identique'. */
export async function enregistrerPrix(env: Env, orgId: string, fournisseurId: string, p: PrixSaisi): Promise<'cree' | 'maj' | 'identique'> {
  const now = Date.now();
  const exist = await first<ArticleCatalogue>(
    env,
    `SELECT * FROM fournisseurs_catalogue WHERE organization_id = ? AND fournisseur_id = ? AND reference = ?`,
    orgId,
    fournisseurId,
    p.reference,
  );
  if (!exist) {
    const id = newId('art');
    await run(
      env,
      `INSERT INTO fournisseurs_catalogue (id, organization_id, fournisseur_id, reference, ean, ref_fabricant, marque, designation, designation_norm, famille, unite, conditionnement, prix_public_cents, prix_net_cents, eco_part_cents, source, maj_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, orgId, fournisseurId, p.reference, p.ean ?? null, p.ref_fabricant ?? null, p.marque ?? null, p.designation,
      normalize(`${p.designation} ${p.marque ?? ''} ${p.reference}`), p.famille ?? null, p.unite || 'u', p.conditionnement ?? null,
      p.prix_public_cents ?? null, p.prix_net_cents, p.eco_part_cents ?? null, p.source, now,
    );
    if (p.prix_net_cents != null) {
      await run(env, `INSERT INTO fournisseurs_prix_historique (id, organization_id, catalogue_id, prix_net_cents, releve_le) VALUES (?,?,?,?,?)`, newId('ph'), orgId, id, p.prix_net_cents, now);
    }
    return 'cree';
  }
  const change = p.prix_net_cents != null && p.prix_net_cents !== exist.prix_net_cents;
  await run(
    env,
    `UPDATE fournisseurs_catalogue SET ean = COALESCE(?, ean), ref_fabricant = COALESCE(?, ref_fabricant), marque = COALESCE(?, marque),
       designation = ?, designation_norm = ?, famille = COALESCE(?, famille), unite = ?, conditionnement = COALESCE(?, conditionnement),
       prix_public_cents = COALESCE(?, prix_public_cents), prix_net_cents = COALESCE(?, prix_net_cents), eco_part_cents = COALESCE(?, eco_part_cents),
       source = ?, maj_le = ? WHERE id = ?`,
    p.ean ?? null, p.ref_fabricant ?? null, p.marque ?? null, p.designation,
    normalize(`${p.designation} ${p.marque ?? exist.marque ?? ''} ${p.reference}`), p.famille ?? null, p.unite || exist.unite,
    p.conditionnement ?? null, p.prix_public_cents ?? null, p.prix_net_cents, p.eco_part_cents ?? null, p.source, now, exist.id,
  );
  if (change) {
    await run(env, `INSERT INTO fournisseurs_prix_historique (id, organization_id, catalogue_id, prix_net_cents, releve_le) VALUES (?,?,?,?,?)`, newId('ph'), orgId, exist.id, p.prix_net_cents, now);
    return 'maj';
  }
  return 'identique';
}

export interface ResultatImport {
  format: 'csv' | 'fabdis';
  colonnes: Partial<Record<ChampCatalogue, number>>;
  entetes: string[];
  lus: number;
  crees: number;
  mis_a_jour: number;
  identiques: number;
  hausses: number;
  rejets: { ligne: number; raison: string }[];
  apercu?: LigneImportee[];
}

/**
 * Importe un tarif. `simulation: true` analyse sans rien écrire (écran « vérifier avant d'importer »).
 * Accepte du texte CSV ou des lignes déjà découpées (Excel lu côté navigateur).
 */
export async function importerTarif(
  env: Env,
  orgId: string,
  fournisseurId: string,
  input: { csv?: string; lignes?: string[][]; mapping?: Partial<Record<ChampCatalogue, number>>; simulation?: boolean },
): Promise<ResultatImport> {
  await fournisseurOuErreur(env, orgId, fournisseurId);
  const rows = input.lignes ?? (input.csv ? parseCsv(input.csv) : []);
  if (rows.length < 2) throw new HttpError(400, 'fichier_vide', 'Le fichier ne contient aucune ligne de tarif');
  if (rows.length > 20_001) throw new HttpError(413, 'fichier_trop_gros', '20 000 lignes maximum par import (découpez le fichier)');
  const analyse = analyserTarif(rows, input.mapping);
  if (analyse.colonnes.designation == null || (analyse.colonnes.reference == null && analyse.colonnes.ean == null)) {
    throw new HttpError(422, 'colonnes_non_reconnues', 'Colonnes « référence » et « désignation » introuvables : indiquez-les à la main');
  }
  const res: ResultatImport = {
    format: analyse.format,
    colonnes: analyse.colonnes,
    entetes: analyse.entetes,
    lus: analyse.lignes.length,
    crees: 0,
    mis_a_jour: 0,
    identiques: 0,
    hausses: 0,
    rejets: analyse.rejets.slice(0, 200),
  };
  if (input.simulation) {
    res.apercu = analyse.lignes.slice(0, 20);
    return res;
  }
  const source = analyse.format === 'fabdis' ? 'fabdis' : 'import_csv';
  const anciens = new Map(
    (await all<{ reference: string; prix_net_cents: number | null }>(
      env,
      `SELECT reference, prix_net_cents FROM fournisseurs_catalogue WHERE organization_id = ? AND fournisseur_id = ?`,
      orgId,
      fournisseurId,
    )).map((r) => [r.reference, r.prix_net_cents]),
  );
  for (const l of analyse.lignes) {
    const avant = anciens.get(l.reference);
    const r = await enregistrerPrix(env, orgId, fournisseurId, { ...l, source });
    if (r === 'cree') res.crees++;
    else if (r === 'maj') {
      res.mis_a_jour++;
      if (avant != null && l.prix_net_cents != null && l.prix_net_cents > avant) res.hausses++;
    } else res.identiques++;
  }
  return res;
}

/** Recherche sans accents, tous fournisseurs, regroupée par produit (EAN puis référence). */
export async function rechercherCatalogue(env: Env, orgId: string, q: string, opts: { fournisseur_id?: string; limite?: number } = {}) {
  const termes = normalize(q).split(' ').filter((t) => t.length >= 2).slice(0, 6);
  if (termes.length === 0) return [];
  const where = ['c.organization_id = ?', ...termes.map(() => '(c.designation_norm LIKE ? OR c.ean = ? OR c.reference = ?)')];
  const binds: unknown[] = [orgId];
  for (const t of termes) binds.push(`%${t}%`, t, t.toUpperCase());
  if (opts.fournisseur_id) (where.push('c.fournisseur_id = ?'), binds.push(opts.fournisseur_id));
  const rows = await all<ArticleCatalogue & { fournisseur_nom: string }>(
    env,
    `SELECT c.*, f.nom AS fournisseur_nom FROM fournisseurs_catalogue c JOIN fournisseurs_annuaire f ON f.id = c.fournisseur_id
     WHERE ${where.join(' AND ')} ORDER BY c.prix_net_cents IS NULL, c.prix_net_cents LIMIT ?`,
    ...binds,
    Math.min(opts.limite ?? 60, 200),
  );
  // Regroupement : même EAN = même produit chez plusieurs fournisseurs → comparaison directe
  const groupes = new Map<string, { cle: string; designation: string; unite: string; offres: typeof rows }>();
  for (const r of rows) {
    const cle = r.ean ? `ean:${r.ean}` : `ref:${r.fournisseur_id}:${r.reference}`;
    const g = groupes.get(cle) ?? { cle, designation: r.designation, unite: r.unite, offres: [] };
    g.offres.push(r);
    groupes.set(cle, g);
  }
  return [...groupes.values()].map((g) => ({
    ...g,
    meilleur_prix_cents: g.offres.map((o) => o.prix_net_cents).filter((p): p is number => p != null).sort((a, b) => a - b)[0] ?? null,
  }));
}

/** Hausses de prix récentes (≥ seuil %) sur la période. */
export async function haussesRecentes(env: Env, orgId: string, jours = 90, seuilPct = 3) {
  const depuis = Date.now() - jours * DAY_MS;
  const rows = await all<{ catalogue_id: string; designation: string; reference: string; fournisseur_nom: string; ancien: number; actuel: number; maj_le: number }>(
    env,
    `SELECT c.id AS catalogue_id, c.designation, c.reference, f.nom AS fournisseur_nom, c.maj_le,
       (SELECT h.prix_net_cents FROM fournisseurs_prix_historique h WHERE h.catalogue_id = c.id AND h.releve_le < ? ORDER BY h.releve_le DESC LIMIT 1) AS ancien,
       c.prix_net_cents AS actuel
     FROM fournisseurs_catalogue c JOIN fournisseurs_annuaire f ON f.id = c.fournisseur_id
     WHERE c.organization_id = ? AND c.maj_le >= ? AND c.prix_net_cents IS NOT NULL`,
    depuis,
    orgId,
    depuis,
  );
  return rows
    .filter((r) => r.ancien != null && r.ancien > 0 && r.actuel > r.ancien)
    .map((r) => ({ ...r, hausse_pct: Math.round(((r.actuel - r.ancien) / r.ancien) * 1000) / 10 }))
    .filter((r) => r.hausse_pct >= seuilPct)
    .sort((a, b) => b.hausse_pct - a.hausse_pct)
    .slice(0, 100);
}

/** Meilleur prix connu pour une ligne (référence exacte, sinon désignation proche) chez un fournisseur donné. */
export async function prixConnu(env: Env, orgId: string, fournisseurId: string, reference: string | null, designation: string) {
  if (reference) {
    const r = await first<ArticleCatalogue>(
      env,
      `SELECT * FROM fournisseurs_catalogue WHERE organization_id = ? AND fournisseur_id = ? AND (reference = ? OR ean = ?)`,
      orgId,
      fournisseurId,
      reference,
      reference,
    );
    if (r) return r;
  }
  return first<ArticleCatalogue>(
    env,
    `SELECT * FROM fournisseurs_catalogue WHERE organization_id = ? AND fournisseur_id = ? AND designation_norm LIKE ? ORDER BY maj_le DESC LIMIT 1`,
    orgId,
    fournisseurId,
    `%${normalize(designation)}%`,
  );
}
