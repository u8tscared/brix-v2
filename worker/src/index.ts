import type { Env } from './env';
import { HttpError, json } from './lib/http';
import { handleCoreRoutes } from './modules/core/routes';

// Point d'entrée du worker Brix V2. Chaque module expose handleXRoutes(request, env, pathname)
// qui renvoie null si la route ne le concerne pas (convention du CLAUDE.md).
// Modules à brancher quand ils arrivent : fournisseurs, api-publique, mcp.

const cors = (origin: string | null, env: Env) => ({
  'access-control-allow-origin': origin && (origin === env.APP_ORIGIN || origin.startsWith('http://localhost')) ? origin : env.APP_ORIGIN,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  vary: 'origin',
});

const withHeaders = (res: Response, headers: Record<string, string>) => {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) r.headers.set(k, v);
  r.headers.set('x-content-type-options', 'nosniff');
  return r;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const h = cors(request.headers.get('origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      if (url.pathname.startsWith('/api/')) {
        const handlers = [handleCoreRoutes];
        for (const handle of handlers) {
          const res = await handle(request, env, url.pathname);
          if (res) return withHeaders(res, h);
        }
        return withHeaders(json({ error: 'Route inconnue' }, 404), h);
      }
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Brix V2 API', { status: 200 });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : 'Erreur';
      if (status === 500) console.error(e);
      return withHeaders(json({ error: message }, status), h);
    }
  },
};
