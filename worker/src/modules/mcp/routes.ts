/**
 * Brix AI MCP : routes du worker.
 *
 *   POST /api/mcp                  serveur MCP, Authorization: Bearer brx_oat_… (OAuth) ou brx_mcp_… (jeton personnel)
 *   POST /api/mcp/k/<brx_mcp_…>    secours pour les outils qui ne savent pas envoyer d'en-tête (n8n, scripts)
 *   /api/mcp/oauth/*               serveur d'autorisation (oauth/routes.ts)
 *
 * Gestion par l'artisan connecté à l'app (session Brix) :
 *   GET/POST /api/mcp/reglages     interrupteur « Relier votre IA »
 *   GET /api/mcp/acces             assistants reliés (OAuth) + jetons personnels
 *   DELETE /api/mcp/acces/:id      « Couper »
 *   GET /api/mcp/journal           actions faites par les assistants
 *   GET/POST /api/mcp/jetons, DELETE /api/mcp/jetons/:id   jetons personnels (« Avancé »)
 *
 * Origine : toute origine est acceptée, car chaque appel exige un jeton (pas de cookie, pas de
 * session ambiante) ; une page tierce ne peut donc rien lire sans jeton. Voir docs/brix-ai/README.md.
 */
import type { Env } from '../../env';
import { requireAuth, type AuthContext } from '../../lib/auth';
import { HttpError as CoreHttpError, json } from '../../lib/http';
import { all } from '../fournisseurs/depot';
import { erreurEnReponse } from '../fournisseurs/routes';
import { CORS, SCOPE_DEFAUT, aEcriture, jsonCors, ressource, urlPrm } from './config';
import { creerJeton, listerJetons, revoquerJeton, verifierJeton } from './jetons';
import { grantsActifs, revoquerGrant } from './oauth/jetons-oauth';
import { handleOAuthRoutes } from './oauth/routes';
import { VERSIONS, rpcErr, traiterRpc, type EnTetes, type RpcReq } from './protocole';
import { definirRelier, lireJournal, relierActif } from './reglages';

const gerant = (a: AuthContext) => {
  if (a.role !== 'patron') throw new CoreHttpError(403, 'Seul le gérant peut gérer les accès des assistants IA.');
};

async function gestion(request: Request, env: Env, pathname: string): Promise<Response | null> {
  const auth = await requireAuth(request, env);
  const org = auth.organizationId;
  const m = request.method;
  if (pathname === '/api/mcp/reglages') {
    if (m === 'GET') return json({ actif: await relierActif(env, org), url_serveur: ressource(env) });
    if (m === 'POST') {
      gerant(auth);
      const b = (await request.json().catch(() => ({}))) as { actif?: unknown };
      if (typeof b.actif !== 'boolean') throw new CoreHttpError(400, 'actif doit valoir true ou false');
      await definirRelier(env, org, b.actif, auth.userId);
      return json({ actif: b.actif, url_serveur: ressource(env) });
    }
    return null;
  }
  if (pathname === '/api/mcp/acces' && m === 'GET') {
    const [grants, jetons] = await Promise.all([grantsActifs(env, org), listerJetons(env, org)]);
    return json({
      acces: [
        ...grants.map((g) => ({ id: `g_${g.id}`, type: 'oauth', nom: g.client_label, hote: g.client_host, ecriture: aEcriture(g.scope), cree_le: g.created_at, derniere_utilisation: g.last_used })),
        ...jetons.map((j) => ({ id: `j_${j.id}`, type: 'jeton', nom: j.nom, hote: null, prefixe: j.prefixe, ecriture: aEcriture(j.scope), cree_le: j.created_at, derniere_utilisation: j.derniere_utilisation, nb_appels: j.nb_appels })),
      ],
    });
  }
  const acc = pathname.match(/^\/api\/mcp\/acces\/([gj])_([A-Za-z0-9_-]+)$/);
  if (acc && m === 'DELETE') {
    gerant(auth);
    if (acc[1] === 'g') {
      const mien = await all<{ id: string }>(env, `SELECT id FROM mcp_oauth_grants WHERE id = ? AND organization_id = ?`, acc[2], org);
      if (mien.length) await revoquerGrant(env, acc[2]);
    } else await revoquerJeton(env, org, acc[2]);
    return json({ ok: true });
  }
  if (pathname === '/api/mcp/journal' && m === 'GET') {
    const limite = Number(new URL(request.url).searchParams.get('limite') ?? 50);
    return json({ journal: (await lireJournal(env, org, Number.isFinite(limite) ? limite : 50)).map((l) => ({ ...l, ok: l.ok === 1 })) });
  }
  const jet = pathname.match(/^\/api\/mcp\/jetons(?:\/([A-Za-z0-9_-]+))?$/);
  if (jet) {
    if (!jet[1] && m === 'GET') return json(await listerJetons(env, org));
    if (!jet[1] && m === 'POST') {
      gerant(auth);
      const b = (await request.json().catch(() => ({}))) as { nom?: string; ecriture?: boolean };
      const j = await creerJeton(env, org, auth.userId, typeof b.nom === 'string' ? b.nom : 'Assistant IA', b.ecriture === true);
      return json({ ...j, url_serveur: ressource(env), url_avec_jeton: `${ressource(env)}/k/${j.jeton}` }, 201);
    }
    if (jet[1] && m === 'DELETE') {
      gerant(auth);
      await revoquerJeton(env, org, jet[1]);
      return json({ ok: true });
    }
  }
  return null;
}

function defi401(env: Env, jetonPresent: boolean) {
  const err = jetonPresent ? 'error="invalid_token", error_description="Jeton invalide, expiré ou accès coupé", ' : '';
  return jsonCors(rpcErr(null, -32001, `Connexion à Brix requise : ajoutez ${ressource(env)} dans votre assistant puis autorisez-le.`), 401, {
    'www-authenticate': `Bearer ${err}resource_metadata="${urlPrm(env)}", scope="${SCOPE_DEFAUT}"`,
  });
}

async function serveurMcp(request: Request, env: Env, jetonUrl: string | undefined): Promise<Response> {
  const h = request.headers.get('authorization') ?? '';
  const jeton = jetonUrl ?? (h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '');
  if (jetonUrl && !jetonUrl.startsWith('brx_mcp_')) return defi401(env, true);
  const ctx = jeton ? await verifierJeton(env, jeton) : null;
  if (!ctx) return defi401(env, !!jeton);

  if (request.method === 'GET' || request.method === 'DELETE') return jsonCors({ error: 'Utilisez POST (pas de flux SSE ni de session sur ce serveur)' }, 405, { allow: 'POST, OPTIONS' });
  if (request.method !== 'POST') return jsonCors({ error: 'Méthode non prise en charge' }, 405, { allow: 'POST, OPTIONS' });

  const version = request.headers.get('mcp-protocol-version');
  if (version && !VERSIONS.includes(version)) return jsonCors(rpcErr(null, -32022, 'Version du protocole non prise en charge', { supported: VERSIONS, requested: version }), 400);
  const enTetes: EnTetes = { version, methode: request.headers.get('mcp-method'), nom: request.headers.get('mcp-name') };

  const texte = await request.text();
  if (texte.length > 1_000_000) return jsonCors(rpcErr(null, -32600, 'Requête trop volumineuse'), 413);
  let payload: RpcReq | RpcReq[];
  try {
    payload = JSON.parse(texte);
  } catch {
    return jsonCors(rpcErr(null, -32700, 'JSON invalide'), 400);
  }
  if (Array.isArray(payload)) {
    if (!payload.length) return jsonCors(rpcErr(null, -32600, 'Lot vide'), 400);
    const sorties = await Promise.all(payload.slice(0, 20).map((p) => traiterRpc(env, ctx, p, enTetes, true)));
    const corps = sorties.map((s) => s.body).filter((b) => b !== null);
    return corps.length ? jsonCors(corps) : jsonCors(null, 202);
  }
  const s = await traiterRpc(env, ctx, payload, enTetes);
  return s.body === null ? jsonCors(null, 202) : jsonCors(s.body, s.status, s.headers);
}

export async function handleMcpRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/mcp')) return null;
  if (pathname.startsWith('/api/mcp/oauth/')) return handleOAuthRoutes(request, env, pathname);

  if (/^\/api\/mcp\/(reglages|acces|journal|jetons)(\/|$)/.test(pathname)) {
    try {
      return await gestion(request, env, pathname);
    } catch (e) {
      return erreurEnReponse(e);
    }
  }

  const m = pathname.match(/^\/api\/mcp(?:\/k\/([A-Za-z0-9_-]+))?\/?$/);
  if (!m) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  return serveurMcp(request, env, m[1]);
}
