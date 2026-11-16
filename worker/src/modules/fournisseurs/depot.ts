/**
 * Accès base de données commun au module (journal, numérotation, lectures fréquentes).
 */

import type { Env } from '../../env';
import type { Acteur, Commande, Demande, Destinataire, Fournisseur, LigneCommande, LigneDemande, ReponseLigne } from './types';
import { HttpError, newId } from './util';

export async function all<T>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const res = await env.DB.prepare(sql).bind(...binds).all<T>();
  return res.results ?? [];
}

export async function first<T>(env: Env, sql: string, ...binds: unknown[]): Promise<T | null> {
  return (await env.DB.prepare(sql).bind(...binds).first<T>()) ?? null;
}

export async function run(env: Env, sql: string, ...binds: unknown[]): Promise<void> {
  await env.DB.prepare(sql).bind(...binds).run();
}

export async function journal(
  env: Env,
  orgId: string,
  objet: 'demande' | 'commande' | 'connexion',
  objetId: string,
  type: string,
  acteur: Acteur,
  detail?: unknown,
): Promise<void> {
  await run(
    env,
    `INSERT INTO fournisseurs_evenements (id, organization_id, objet, objet_id, type, acteur, detail, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    newId('evt'),
    orgId,
    objet,
    objetId,
    type,
    acteur,
    detail === undefined ? null : JSON.stringify(detail),
    Date.now(),
  );
}

/** DP-2026-0007 / BC-2026-0012 : séquence annuelle par organisation. */
export async function prochainNumero(env: Env, orgId: string, type: 'DP' | 'BC'): Promise<string> {
  const annee = new Date().getUTCFullYear();
  const prefix = `${type}-${annee}-`;
  const table = type === 'DP' ? 'fournisseurs_demandes' : 'fournisseurs_commandes';
  const row = await first<{ n: number | null }>(
    env,
    `SELECT MAX(CAST(substr(numero, ${prefix.length + 1}) AS INTEGER)) AS n FROM ${table} WHERE organization_id = ? AND numero LIKE ?`,
    orgId,
    `${prefix}%`,
  );
  const last = row?.n ? Number(row.n) : 0;
  return `${prefix}${String((Number.isFinite(last) ? last : 0) + 1).padStart(4, '0')}`;
}

export async function fournisseurOuErreur(env: Env, orgId: string, id: string): Promise<Fournisseur> {
  const f = await first<Fournisseur>(env, `SELECT * FROM fournisseurs_annuaire WHERE id = ? AND organization_id = ?`, id, orgId);
  if (!f) throw new HttpError(404, 'fournisseur_introuvable', 'Fournisseur introuvable');
  return f;
}

export async function demandeOuErreur(env: Env, orgId: string, id: string): Promise<Demande> {
  const d = await first<Demande>(env, `SELECT * FROM fournisseurs_demandes WHERE id = ? AND organization_id = ?`, id, orgId);
  if (!d) throw new HttpError(404, 'demande_introuvable', 'Demande de prix introuvable');
  return d;
}

export async function commandeOuErreur(env: Env, orgId: string, id: string): Promise<Commande> {
  const c = await first<Commande>(env, `SELECT * FROM fournisseurs_commandes WHERE id = ? AND organization_id = ?`, id, orgId);
  if (!c) throw new HttpError(404, 'commande_introuvable', 'Commande introuvable');
  return c;
}

export function lignesDemande(env: Env, demandeId: string) {
  return all<LigneDemande>(env, `SELECT * FROM fournisseurs_demandes_lignes WHERE demande_id = ? ORDER BY position`, demandeId);
}

export function destinatairesDemande(env: Env, demandeId: string) {
  return all<Destinataire & { fournisseur_nom: string; fournisseur_email: string | null; franco_cents: number | null }>(
    env,
    `SELECT d.*, f.nom AS fournisseur_nom, f.email AS fournisseur_email, f.franco_cents
     FROM fournisseurs_demandes_destinataires d JOIN fournisseurs_annuaire f ON f.id = d.fournisseur_id
     WHERE d.demande_id = ? ORDER BY f.nom`,
    demandeId,
  );
}

export function reponsesDemande(env: Env, demandeId: string) {
  return all<ReponseLigne>(
    env,
    `SELECT r.* FROM fournisseurs_reponses_lignes r
     JOIN fournisseurs_demandes_destinataires d ON d.id = r.destinataire_id WHERE d.demande_id = ?`,
    demandeId,
  );
}

export function lignesCommande(env: Env, commandeId: string) {
  return all<LigneCommande>(env, `SELECT * FROM fournisseurs_commandes_lignes WHERE commande_id = ? ORDER BY position`, commandeId);
}

export function evenements(env: Env, orgId: string, objet: string, objetId: string) {
  return all<{ id: string; type: string; acteur: string; detail: string | null; created_at: number }>(
    env,
    `SELECT id, type, acteur, detail, created_at FROM fournisseurs_evenements
     WHERE organization_id = ? AND objet = ? AND objet_id = ? ORDER BY created_at DESC LIMIT 100`,
    orgId,
    objet,
    objetId,
  );
}
