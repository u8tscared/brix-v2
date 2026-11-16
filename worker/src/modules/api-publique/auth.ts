/**
 * Authentification des partenaires fournisseurs par clé API (Authorization: Bearer brx_live_…).
 */

import type { Env } from '../../env';
import { first, run } from '../fournisseurs/depot';
import { HttpError, newId, parseJsonArray, randomToken, sha256Hex } from '../fournisseurs/util';

export type Scope = 'demandes:read' | 'demandes:write' | 'commandes:read' | 'commandes:write' | 'catalogue:write' | 'webhooks:write';

export const TOUS_SCOPES: Scope[] = ['demandes:read', 'demandes:write', 'commandes:read', 'commandes:write', 'catalogue:write', 'webhooks:write'];

export interface PartenaireCtx {
  partenaireId: string;
  nom: string;
  cleId: string;
  scopes: Scope[];
  mode: 'live' | 'test';
}

export async function authentifierPartenaire(request: Request, env: Env): Promise<PartenaireCtx> {
  const h = request.headers.get('authorization') ?? '';
  const cle = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!/^brx_(live|test)_[A-Za-z0-9_-]{30,}$/.test(cle)) throw new HttpError(401, 'cle_absente', 'Clé API manquante ou mal formée (Authorization: Bearer brx_live_…)');
  const row = await first<{ id: string; partenaire_id: string; scopes: string; mode: 'live' | 'test'; revoquee_le: number | null; nom: string; actif: number }>(
    env,
    `SELECT k.id, k.partenaire_id, k.scopes, k.mode, k.revoquee_le, p.nom, p.actif FROM api_cles k JOIN api_partenaires p ON p.id = k.partenaire_id WHERE k.hash = ?`,
    await sha256Hex(cle),
  );
  if (!row || row.revoquee_le) throw new HttpError(401, 'cle_invalide', 'Clé API invalide ou révoquée');
  if (!row.actif) throw new HttpError(403, 'partenaire_suspendu', 'Compte partenaire suspendu');
  // Mise à jour de la dernière utilisation au plus une fois par minute
  await run(env, `UPDATE api_cles SET derniere_utilisation = ? WHERE id = ? AND (derniere_utilisation IS NULL OR derniere_utilisation < ?)`, Date.now(), row.id, Date.now() - 60_000);
  return { partenaireId: row.partenaire_id, nom: row.nom, cleId: row.id, scopes: parseJsonArray(row.scopes) as Scope[], mode: row.mode };
}

export function exiger(ctx: PartenaireCtx, scope: Scope) {
  if (!ctx.scopes.includes(scope)) throw new HttpError(403, 'scope_manquant', `Cette clé n'a pas le droit « ${scope} »`);
}

export async function creerCle(env: Env, partenaireId: string, nom: string, scopes: Scope[], mode: 'live' | 'test' = 'live') {
  const valides = scopes.filter((s) => TOUS_SCOPES.includes(s));
  if (valides.length === 0) throw new HttpError(400, 'scopes_requis', 'Au moins un droit');
  const cle = `brx_${mode}_${randomToken(30)}`;
  const id = newId('key');
  await run(
    env,
    `INSERT INTO api_cles (id, partenaire_id, nom, prefixe, hash, scopes, mode, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    id, partenaireId, nom.slice(0, 80), cle.slice(0, 14), await sha256Hex(cle), JSON.stringify(valides), mode, Date.now(),
  );
  return { id, cle, prefixe: cle.slice(0, 14), scopes: valides, mode, avertissement: 'Copiez cette clé maintenant : elle ne sera plus jamais affichée.' };
}

/** Code partenaire lisible à dicter au téléphone : BRX-7KQ2-M9XA (sans 0/O/1/I). */
export function genererCodePartenaire(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const c = [...buf].map((b) => alpha[b % alpha.length]).join('');
  return `BRX-${c.slice(0, 4)}-${c.slice(4)}`;
}
