/** Jetons personnels Brix AI MCP (brx_mcp_…). */
import type { Env } from '../../env';
import { all, first, run } from '../fournisseurs/depot';
import { HttpError, newId, randomToken, sha256Hex } from '../fournisseurs/util';

export interface McpCtx {
  organizationId: string;
  userId: string;
  jetonId: string;
}

export async function creerJeton(env: Env, orgId: string, userId: string, nom: string) {
  const n = await first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM mcp_jetons WHERE organization_id = ? AND revoque_le IS NULL`, orgId);
  if ((n?.n ?? 0) >= 20) throw new HttpError(409, 'limite', '20 connexions actives maximum');
  const jeton = `brx_mcp_${randomToken(30)}`;
  const id = newId('mcp');
  await run(
    env,
    `INSERT INTO mcp_jetons (id, organization_id, user_id, nom, prefixe, hash, nb_appels, created_at) VALUES (?,?,?,?,?,?,0,?)`,
    id, orgId, userId, (nom || 'Assistant IA').slice(0, 80), jeton.slice(0, 14), await sha256Hex(jeton), Date.now(),
  );
  return { id, jeton, nom, avertissement: 'Copiez ce jeton maintenant : il ne sera plus affiché.' };
}

export function listerJetons(env: Env, orgId: string) {
  return all<{ id: string; nom: string; prefixe: string; derniere_utilisation: number | null; nb_appels: number; created_at: number }>(
    env,
    `SELECT id, nom, prefixe, derniere_utilisation, nb_appels, created_at FROM mcp_jetons WHERE organization_id = ? AND revoque_le IS NULL ORDER BY created_at DESC`,
    orgId,
  );
}

export async function revoquerJeton(env: Env, orgId: string, id: string) {
  await run(env, `UPDATE mcp_jetons SET revoque_le = ? WHERE id = ? AND organization_id = ?`, Date.now(), id, orgId);
}

export async function verifierJeton(env: Env, jeton: string): Promise<McpCtx | null> {
  if (!/^brx_mcp_[A-Za-z0-9_-]{30,}$/.test(jeton)) return null;
  const row = await first<{ id: string; organization_id: string; user_id: string }>(
    env,
    `SELECT id, organization_id, user_id FROM mcp_jetons WHERE hash = ? AND revoque_le IS NULL`,
    await sha256Hex(jeton),
  );
  if (!row) return null;
  await run(env, `UPDATE mcp_jetons SET derniere_utilisation = ?, nb_appels = nb_appels + 1 WHERE id = ?`, Date.now(), row.id);
  return { organizationId: row.organization_id, userId: row.user_id, jetonId: row.id };
}
