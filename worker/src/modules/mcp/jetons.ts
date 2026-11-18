/**
 * Accès à Brix AI MCP : jetons personnels (brx_mcp_…, section « Avancé » de l'app) et jetons
 * OAuth (brx_oat_…, voie normale). verifierJeton accepte les deux et rend le même contexte.
 */
import type { Env } from '../../env';
import { all, first, run } from '../fournisseurs/depot';
import { HttpError, newId, randomToken, sha256Hex } from '../fournisseurs/util';
import { SCOPE_DEFAUT, SCOPE_LECTURE, aEcriture } from './config';
import { verifierAccesOAuth } from './oauth/jetons-oauth';
import { relierActif } from './reglages';

export interface McpCtx {
  organizationId: string;
  userId: string;
  /** Id du jeton personnel ou de l'autorisation OAuth. */
  jetonId: string;
  type: 'pat' | 'oauth';
  scope: string;
  /** Nom affiché dans le journal (« Claude », « n8n »…). */
  clientLabel: string;
}

export const peutEcrire = (ctx: Pick<McpCtx, 'scope'>) => aEcriture(ctx.scope);

export async function creerJeton(env: Env, orgId: string, userId: string, nom: string, ecriture = false) {
  const n = await first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM mcp_jetons WHERE organization_id = ? AND revoque_le IS NULL`, orgId);
  if ((n?.n ?? 0) >= 20) throw new HttpError(409, 'limite', '20 jetons actifs maximum');
  const jeton = `brx_mcp_${randomToken(30)}`;
  const id = newId('mcp');
  const scope = ecriture ? SCOPE_DEFAUT : SCOPE_LECTURE;
  const libelle = (nom || 'Assistant IA').slice(0, 80);
  await run(
    env,
    `INSERT INTO mcp_jetons (id, organization_id, user_id, nom, prefixe, hash, nb_appels, created_at, scope) VALUES (?,?,?,?,?,?,0,?,?)`,
    id, orgId, userId, libelle, jeton.slice(0, 14), await sha256Hex(jeton), Date.now(), scope,
  );
  return { id, jeton, nom: libelle, scope, avertissement: 'Copiez ce jeton maintenant : il ne sera plus affiché.' };
}

export function listerJetons(env: Env, orgId: string) {
  return all<{ id: string; nom: string; prefixe: string; derniere_utilisation: number | null; nb_appels: number; created_at: number; scope: string }>(
    env,
    `SELECT id, nom, prefixe, derniere_utilisation, nb_appels, created_at, scope FROM mcp_jetons WHERE organization_id = ? AND revoque_le IS NULL ORDER BY created_at DESC`,
    orgId,
  );
}

export async function revoquerJeton(env: Env, orgId: string, id: string) {
  await run(env, `UPDATE mcp_jetons SET revoque_le = ? WHERE id = ? AND organization_id = ?`, Date.now(), id, orgId);
}

async function verifierPat(env: Env, jeton: string): Promise<McpCtx | null> {
  if (!/^brx_mcp_[A-Za-z0-9_-]{30,}$/.test(jeton)) return null;
  const row = await first<{ id: string; organization_id: string; user_id: string; nom: string; scope: string | null }>(
    env,
    `SELECT id, organization_id, user_id, nom, scope FROM mcp_jetons WHERE hash = ? AND revoque_le IS NULL`,
    await sha256Hex(jeton),
  );
  if (!row) return null;
  await run(env, `UPDATE mcp_jetons SET derniere_utilisation = ?, nb_appels = nb_appels + 1 WHERE id = ?`, Date.now(), row.id);
  return { organizationId: row.organization_id, userId: row.user_id, jetonId: row.id, type: 'pat', scope: row.scope || SCOPE_LECTURE, clientLabel: row.nom };
}

/** Jeton personnel ou OAuth valide, et interrupteur « Relier votre IA » allumé. Null sinon. */
export async function verifierJeton(env: Env, jeton: string): Promise<McpCtx | null> {
  let ctx: McpCtx | null = null;
  if (jeton.startsWith('brx_mcp_')) ctx = await verifierPat(env, jeton);
  else if (jeton.startsWith('brx_oat_')) {
    const r = await verifierAccesOAuth(env, jeton);
    if (r) ctx = { organizationId: r.grant.organization_id, userId: r.grant.user_id, jetonId: r.grant.id, type: 'oauth', scope: r.scope, clientLabel: r.grant.client_label };
  }
  if (!ctx) return null;
  if (!(await relierActif(env, ctx.organizationId))) return null;
  return ctx;
}
