/**
 * Documents /.well-known/* servis par le worker AVANT les fichiers statiques de l'app
 * (sinon la SPA répondrait index.html en 200 et aucun client OAuth ne trouverait le serveur).
 */
import type { Env } from '../../env';
import { CORS, metadonneesRessource, metadonneesServeur } from './config';

const docJson = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=300' : 'no-store', ...CORS },
  });

export async function handleWellKnown(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/.well-known/')) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'GET' && request.method !== 'HEAD') return docJson({ error: 'method_not_allowed' }, 405);
  const p = pathname.replace(/\/+$/, '');
  if (p === '/.well-known/oauth-protected-resource' || p === '/.well-known/oauth-protected-resource/api/mcp') return docJson(metadonneesRessource(env));
  if (p === '/.well-known/oauth-authorization-server' || p === '/.well-known/openid-configuration' || p === '/.well-known/oauth-authorization-server/api/mcp') {
    return docJson(metadonneesServeur(env));
  }
  if (p === '/.well-known/openai-apps-challenge') {
    const v = env.OPENAI_APPS_CHALLENGE?.trim();
    if (!v) return docJson({ error: 'not_found' }, 404);
    return new Response(v, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  return docJson({ error: 'not_found' }, 404);
}
