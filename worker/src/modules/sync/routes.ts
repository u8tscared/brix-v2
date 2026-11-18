// Synchronisation de l'app : un document JSON par entreprise (voir worker/src/lib/etat.ts).
// GET  /api/sync[?version=N] → { version, majLe, donnees } (ou { version, majLe, inchange: true } si N est à jour)
// PUT  /api/sync { baseVersion, donnees } → { version, majLe } ; 409 { error: 'conflit', version, majLe, donnees }
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { ecrireEtat, lireEtat } from '../../lib/etat';
import { HttpError, json, readJson } from '../../lib/http';

export async function handleSyncRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname !== '/api/sync') return null;
  const auth = await requireAuth(request, env);
  const pasDeCache = { 'cache-control': 'no-store' };

  if (request.method === 'GET') {
    const connue = new URL(request.url).searchParams.get('version');
    if (connue !== null) {
      // Tirage périodique : on évite de relire le document R2 quand rien n'a changé.
      const row = await env.DB.prepare('SELECT version, maj_le FROM etat_org WHERE organization_id = ?').bind(auth.organizationId).first<{ version: number; maj_le: string | null }>();
      if ((row?.version ?? 0) === Number(connue)) return json({ version: row?.version ?? 0, majLe: row?.maj_le ?? null, inchange: true }, 200, pasDeCache);
    }
    return json(await lireEtat(env, auth.organizationId), 200, pasDeCache);
  }

  if (request.method === 'PUT') {
    const body = await readJson<{ baseVersion: number; donnees: Record<string, unknown> }>(request);
    if (!body.donnees || typeof body.donnees !== 'object' || Array.isArray(body.donnees)) throw new HttpError(400, 'Données manquantes');
    if (typeof body.baseVersion !== 'number') throw new HttpError(400, 'Version de base manquante');
    try {
      const e = await ecrireEtat(env, auth.organizationId, body.donnees, body.baseVersion, auth.userId);
      return json({ version: e.version, majLe: e.majLe }, 200, pasDeCache);
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 409) throw err;
      // Quelqu'un a écrit entre-temps (autre appareil, MCP, Bob) : on renvoie la copie serveur pour fusion.
      const srv = await lireEtat(env, auth.organizationId);
      return json({ error: 'conflit', ...srv }, 409, pasDeCache);
    }
  }

  return null;
}
