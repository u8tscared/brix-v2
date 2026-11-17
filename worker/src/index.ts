import type { Env } from './env';
import { HttpError, json } from './lib/http';
import { handleCoreRoutes } from './modules/core/routes';
import { handleFournisseursRoutes } from './modules/fournisseurs/routes';
import { handleApiPubliqueRoutes } from './modules/api-publique/routes';
import { handleMcpRoutes } from './modules/mcp/routes';
import { relancerWebhooks } from './modules/api-publique/webhooks';
import { handleDocumentsRoutes } from './modules/documents/routes';
import { handleSignatureRoutes } from './modules/signature/routes';
import { handlePaiementsRoutes } from './modules/paiements/routes';
import { handleNotificationsRoutes } from './modules/notifications/routes';
import { cronParcours } from './modules/notifications/cron';
import { handleEmailsRoutes } from './modules/emails/routes';

// Point d'entrée du worker Brix V2. Chaque module expose handleXRoutes(request, env, pathname)
// qui renvoie null si la route ne le concerne pas (convention du CLAUDE.md).

const cors = (origin: string | null, env: Env) => ({
  'access-control-allow-origin': origin && (origin === env.APP_ORIGIN || origin === env.PUBLIC_BASE_URL || origin.startsWith('http://localhost')) ? origin : env.APP_ORIGIN,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  vary: 'origin',
});

const withHeaders = (res: Response, headers: Record<string, string>) => {
  const r = new Response(res.body, res);
  // L'API publique et le MCP gèrent leur propre CORS (accès par clé) : on ne l'écrase pas.
  const ownCors = r.headers.has('access-control-allow-origin');
  for (const [k, v] of Object.entries(headers)) if (!(ownCors && k.startsWith('access-control'))) r.headers.set(k, v);
  r.headers.set('x-content-type-options', 'nosniff');
  return r;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const h = cors(request.headers.get('origin'), env);
    // L'API publique et le MCP répondent eux-mêmes à OPTIONS (CORS ouvert, accès par clé).
    const selfCors = url.pathname.startsWith('/api/public/') || url.pathname.startsWith('/api/mcp');
    if (request.method === 'OPTIONS' && !selfCors) return new Response(null, { status: 204, headers: h });
    try {
      if (url.pathname.startsWith('/api/')) {
        const handlers = [handleCoreRoutes, handleDocumentsRoutes, handleSignatureRoutes, handlePaiementsRoutes, handleNotificationsRoutes, handleFournisseursRoutes, handleApiPubliqueRoutes, handleMcpRoutes, handleEmailsRoutes];
        for (const handle of handlers) {
          const res = await handle(request, env, url.pathname);
          if (res) return withHeaders(res, h);
        }
        return withHeaders(json({ error: 'Route inconnue' }, 404), h);
      }
      // Liens courts reçus par e-mail / SMS : /d/<jeton> → /#/d/<jeton> (l'app est en HashRouter)
      const court = url.pathname.match(/^\/(d|f|p)\/([A-Za-z0-9_-]{43})$/);
      if (court) return Response.redirect(`${url.origin}/#/${court[1]}/${court[2]}`, 302);
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Brix V2 API', { status: 200 });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      // Jamais de détail interne dans une erreur 500.
      const message = status === 500 ? 'Erreur interne' : e instanceof Error ? e.message : 'Erreur';
      if (status === 500) console.error(e);
      return withHeaders(json({ error: message }, status), h);
    }
  },

  // Cron (toutes les minutes, voir wrangler.toml) : renvoi des webhooks partenaires en échec.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([relancerWebhooks(env), cronParcours(env)]));
  },
};
