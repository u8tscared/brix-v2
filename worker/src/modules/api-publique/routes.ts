/**
 * Routes /api/public/v1/* — API Brix Fournisseurs.
 * Authentification : Authorization: Bearer brx_live_… ; idempotence : en-tête Idempotency-Key.
 */

import type { Env } from '../../env';
import { first, run } from '../fournisseurs/depot';
import { erreurEnReponse } from '../fournisseurs/routes';
import { HttpError } from '../fournisseurs/util';
import { authentifierPartenaire, exiger, type Scope } from './auth';
import { ApiFournisseursService, inscrirePartenaire } from './handlers';
import { OPENAPI } from './openapi';

const PREFIX = '/api/public/v1';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, idempotency-key',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function repondre(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-brix-api-version': '2026-11-17', ...CORS, ...extra },
  });
}

type R = { m: string; re: RegExp; scope: Scope | null; h: (s: ApiFournisseursService, p: string[], b: any, u: URL) => Promise<unknown> };
const r = (m: string, path: string, scope: Scope | null, h: R['h']): R => ({
  m,
  re: new RegExp('^' + PREFIX + path.replace(/:[a-z_]+/g, '([A-Za-z0-9_-]+)') + '$'),
  scope,
  h,
});

const ROUTES: R[] = [
  r('GET', '/moi', null, (s) => s.moi()),
  r('GET', '/clients', null, (s) => s.clients()),
  r('GET', '/demandes', 'demandes:read', (s, _p, _b, u) => s.demandes(u.searchParams.get('statut') ?? undefined)),
  r('GET', '/demandes/:id', 'demandes:read', (s, p) => s.demande(p[0])),
  r('POST', '/demandes/:id/reponse', 'demandes:write', (s, p, b) => s.repondre(p[0], b)),
  r('POST', '/demandes/:id/decliner', 'demandes:write', (s, p, b) => s.decliner(p[0], b?.motif ?? null)),
  r('GET', '/commandes', 'commandes:read', (s, _p, _b, u) => s.commandes(u.searchParams.get('statut') ?? undefined)),
  r('GET', '/commandes/:id', 'commandes:read', (s, p) => s.commande(p[0])),
  r('POST', '/commandes/:id/statut', 'commandes:write', (s, p, b) => s.statutCommande(p[0], b)),
  r('POST', '/commandes/:id/livraison', 'commandes:write', (s, p, b) => s.livraisonCommande(p[0], b?.lignes ?? [])),
  r('PUT', '/clients/:id/tarif', 'catalogue:write', (s, p, b) => s.publierTarif(p[0], b?.articles)),
  r('GET', '/webhooks', 'webhooks:write', (s) => s.webhooks()),
  r('POST', '/webhooks', 'webhooks:write', (s, _p, b) => s.creerWebhook(b)),
  r('DELETE', '/webhooks/:id', 'webhooks:write', (s, p) => s.supprimerWebhook(p[0])),
  r('POST', '/cles', 'webhooks:write', (s, _p, b) => s.creerCle(b)),
  r('DELETE', '/cles/:id', 'webhooks:write', (s, p) => s.revoquerCle(p[0])),
];

export async function handleApiPubliqueRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith(PREFIX)) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    if (pathname === `${PREFIX}/openapi.json` && request.method === 'GET') return repondre(OPENAPI);
    const body = ['POST', 'PUT'].includes(request.method) ? await lireJson(request) : {};
    if (pathname === `${PREFIX}/partenaires` && request.method === 'POST') return repondre(await inscrirePartenaire(env, body), 201);

    const route = ROUTES.find((x) => x.m === request.method && x.re.test(pathname));
    if (!route) return repondre({ error: 'route_inconnue', message: 'Route inconnue. Documentation : /api/public/v1/openapi.json' }, 404);

    const ctx = await authentifierPartenaire(request, env);
    if (route.scope) exiger(ctx, route.scope);

    // Idempotence : rejouer la même réponse pour la même clé (24 h)
    const idem = request.headers.get('idempotency-key');
    const idemCle = idem && request.method !== 'GET' ? `${ctx.partenaireId}:${idem.slice(0, 100)}` : null;
    if (idemCle) {
      const deja = await first<{ statut: number; reponse: string; created_at: number }>(env, `SELECT statut, reponse, created_at FROM api_idempotence WHERE cle = ?`, idemCle);
      if (deja && deja.created_at > Date.now() - 86_400_000) return repondre(JSON.parse(deja.reponse), deja.statut, { 'idempotent-replay': 'true' });
    }

    const params = pathname.match(route.re)!.slice(1);
    const data = await route.h(new ApiFournisseursService(env, ctx), params, body, new URL(request.url));
    const status = request.method === 'POST' && /\/(webhooks|cles)$/.test(pathname) ? 201 : 200;
    if (idemCle) {
      await run(env, `INSERT OR REPLACE INTO api_idempotence (cle, statut, reponse, created_at) VALUES (?,?,?,?)`, idemCle, status, JSON.stringify(data), Date.now());
    }
    return repondre(data, status);
  } catch (err) {
    const res = erreurEnReponse(err);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  }
}

async function lireJson(request: Request) {
  const text = await request.text();
  if (text.length > 5_000_000) throw new HttpError(413, 'trop_gros', 'Corps limité à 5 Mo');
  return text ? JSON.parse(text) : {};
}
