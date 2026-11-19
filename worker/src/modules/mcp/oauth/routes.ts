/**
 * Serveur d'autorisation OAuth 2.1 de Brix AI (public clients, PKCE S256, RFC 8707, RFC 9207).
 *
 *   POST /api/mcp/oauth/register                  DCR (RFC 7591)
 *   GET  /api/mcp/oauth/authorize                 valide puis renvoie vers l'app (#/autoriser?req=…)
 *   GET  /api/mcp/oauth/demande/:id               détail pour l'écran « Autoriser » (session Brix)
 *   POST /api/mcp/oauth/demande/:id/approuver     { ecriture } → { redirect } (gérant uniquement)
 *   POST /api/mcp/oauth/demande/:id/refuser       → { redirect } (access_denied)
 *   POST /api/mcp/oauth/token                     authorization_code | refresh_token
 *   POST /api/mcp/oauth/revoke                    RFC 7009
 */
import type { Env } from '../../../env';
import { requireAuth } from '../../../lib/auth';
import { HttpError } from '../../../lib/http';
import { first, run } from '../../fournisseurs/depot';
import { newId, randomToken } from '../../fournisseurs/util';
import { CORS, DUREE, SCOPE_DEFAUT, SCOPE_LECTURE, aEcriture, emetteur, jsonCors, memeRessource, normaliserScope, origine, ressource } from '../config';
import { definirRelier, relierActif } from '../reglages';
import { ErreurOAuth, hoteDe, inscrireClient, libelleClient, redirectionCorrespond, seulementBoucleLocale, trouverClient } from './clients';
import { creerCode, echangerCode, rafraichir, revoquerJetonOAuth, type Grant } from './jetons-oauth';
import { pageErreur } from './page-erreur';

const SANS_CACHE = { 'cache-control': 'no-store', pragma: 'no-cache' };
const erreurOAuth = (e: ErreurOAuth) => jsonCors({ error: e.code, error_description: e.message }, e.status, SANS_CACHE);

/** Adresse de retour avec les paramètres de réponse + iss (RFC 9207), y compris en cas d'erreur. */
function retour(env: Env, redirectUri: string, params: Record<string, string | null | undefined>) {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  u.searchParams.set('iss', emetteur(env));
  return u.toString();
}

async function lireFormulaire(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  const texte = await request.text();
  if (texte.length > 20_000) throw new ErreurOAuth('invalid_request', 'Requête trop volumineuse');
  if (type.includes('application/json')) {
    try {
      const o = JSON.parse(texte || '{}') as Record<string, unknown>;
      return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    } catch {
      throw new ErreurOAuth('invalid_request', 'Corps JSON invalide');
    }
  }
  return Object.fromEntries(new URLSearchParams(texte));
}

// ---------------------------------------------------------------- /authorize

async function autoriser(request: Request, env: Env): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const clientId = q.get('client_id') ?? '';
  let client;
  try {
    client = await trouverClient(env, clientId);
  } catch (e) {
    return pageErreur('Assistant non reconnu', e instanceof ErreurOAuth ? e.message : 'Impossible de vérifier cet assistant.');
  }
  if (!client) return pageErreur('Assistant non reconnu', 'Cet assistant n’est pas inscrit auprès de Brix (client_id inconnu).');
  const demandee = q.get('redirect_uri') ?? (client.redirect_uris.length === 1 ? client.redirect_uris[0] : '');
  if (!demandee || !redirectionCorrespond(client.redirect_uris, demandee)) {
    return pageErreur('Adresse de retour refusée', 'L’adresse de retour ne fait pas partie de celles déclarées par cet assistant.');
  }
  const state = q.get('state');
  const echec = (error: string, description: string) => Response.redirect(retour(env, demandee, { error, error_description: description, state }), 302);

  if (q.get('response_type') !== 'code') return echec('unsupported_response_type', 'Seul response_type=code est accepté');
  const challenge = q.get('code_challenge') ?? '';
  if (!challenge || q.get('code_challenge_method') !== 'S256') return echec('invalid_request', 'PKCE obligatoire : code_challenge avec code_challenge_method=S256');
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return echec('invalid_request', 'code_challenge invalide');
  const res = q.get('resource');
  if (res !== null && !memeRessource(env, res)) return echec('invalid_target', `Ressource inconnue : utilisez ${ressource(env)}`);
  const { scope } = normaliserScope(q.get('scope') || SCOPE_DEFAUT);

  const id = `req_${randomToken(18)}`;
  const maintenant = Date.now();
  await run(
    env,
    `INSERT INTO mcp_oauth_demandes (id, client_id, redirect_uri, state, challenge, resource, scope, created_at, exp) VALUES (?,?,?,?,?,?,?,?,?)`,
    id, client.id, demandee, state, challenge, ressource(env), scope, maintenant, maintenant + DUREE.demande,
  );
  await run(env, `DELETE FROM mcp_oauth_demandes WHERE exp < ?`, maintenant - 86_400_000);
  await run(env, `UPDATE mcp_oauth_clients SET last_used = ? WHERE id = ?`, maintenant, client.id);
  return new Response(null, { status: 302, headers: { location: `${origine(env)}/#/autoriser?req=${id}`, ...SANS_CACHE } });
}

// ---------------------------------------------------------------- demande (écran de l'app)

interface Demande {
  id: string;
  client_id: string;
  redirect_uri: string;
  state: string | null;
  challenge: string;
  resource: string;
  scope: string;
  exp: number;
  traitee_le: number | null;
}

async function demandeOuErreur(env: Env, id: string): Promise<Demande> {
  const d = await first<Demande>(env, `SELECT * FROM mcp_oauth_demandes WHERE id = ?`, id);
  if (!d || d.traitee_le || d.exp < Date.now()) throw new HttpError(410, 'Cette demande a expiré. Relancez la connexion depuis votre assistant.');
  return d;
}

async function marquerTraitee(env: Env, id: string) {
  const r = await env.DB.prepare(`UPDATE mcp_oauth_demandes SET traitee_le = ? WHERE id = ? AND traitee_le IS NULL AND exp >= ?`).bind(Date.now(), id, Date.now()).run();
  if (!r.meta.changes) throw new HttpError(410, 'Cette demande a expiré. Relancez la connexion depuis votre assistant.');
}

async function detailDemande(request: Request, env: Env, id: string) {
  const auth = await requireAuth(request, env);
  const d = await demandeOuErreur(env, id);
  const client = await trouverClient(env, d.client_id).catch(() => null);
  if (!client) throw new HttpError(410, 'Assistant introuvable. Relancez la connexion depuis votre assistant.');
  const { nom, connu } = libelleClient(client, d.redirect_uri);
  const org = await first<{ name: string }>(env, `SELECT name FROM organizations WHERE id = ?`, auth.organizationId).catch(() => null);
  return jsonCors({
    id: d.id,
    client: { nom, nom_declare: client.nom, hote: client.hote, connu, inscription: client.kind, boucle_locale: seulementBoucleLocale(client.redirect_uris) },
    redirection: { hote: hoteDe(d.redirect_uri) ?? d.redirect_uri.split(':')[0], schema: d.redirect_uri.split(':')[0] },
    ecriture_demandee: aEcriture(d.scope),
    entreprise: org?.name ?? null,
    peut_autoriser: auth.role === 'patron',
    relier_actif: await relierActif(env, auth.organizationId),
    expire_le: d.exp,
  }, 200, SANS_CACHE);
}

async function approuver(request: Request, env: Env, id: string) {
  const auth = await requireAuth(request, env);
  if (auth.role !== 'patron') throw new HttpError(403, 'Seul le gérant peut relier une IA à Brix.');
  const corps = (await request.json().catch(() => ({}))) as { ecriture?: unknown };
  const d = await demandeOuErreur(env, id);
  const client = await trouverClient(env, d.client_id).catch(() => null);
  if (!client) throw new HttpError(410, 'Assistant introuvable. Relancez la connexion depuis votre assistant.');
  await marquerTraitee(env, id);
  const scope = corps.ecriture === true && aEcriture(d.scope) ? SCOPE_DEFAUT : SCOPE_LECTURE;
  const { nom } = libelleClient(client, d.redirect_uri);
  const g: Grant = {
    id: newId('mgr'), organization_id: auth.organizationId, user_id: auth.userId, client_id: client.id, client_label: nom,
    client_host: client.hote ?? hoteDe(d.redirect_uri), scope, resource: d.resource, created_at: Date.now(), last_used: null, revoked_at: null,
  };
  await run(
    env,
    `INSERT INTO mcp_oauth_grants (id, organization_id, user_id, client_id, client_label, client_host, scope, resource, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    g.id, g.organization_id, g.user_id, g.client_id, g.client_label, g.client_host, g.scope, g.resource, g.created_at,
  );
  if (!(await relierActif(env, auth.organizationId))) await definirRelier(env, auth.organizationId, true, auth.userId);
  const code = await creerCode(env, g, { redirect_uri: d.redirect_uri, challenge: d.challenge, resource: d.resource, scope });
  return jsonCors({ redirect: retour(env, d.redirect_uri, { code, state: d.state }) }, 200, SANS_CACHE);
}

async function refuser(request: Request, env: Env, id: string) {
  await requireAuth(request, env);
  const d = await demandeOuErreur(env, id);
  await marquerTraitee(env, id);
  return jsonCors({ redirect: retour(env, d.redirect_uri, { error: 'access_denied', error_description: 'Accès refusé par l’utilisateur', state: d.state }) }, 200, SANS_CACHE);
}

// ---------------------------------------------------------------- routeur

export async function handleOAuthRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/mcp/oauth/')) return null;
  const p = pathname.replace(/\/+$/, '');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (p === '/api/mcp/oauth/register') {
      if (request.method !== 'POST') return jsonCors({ error: 'invalid_request', error_description: 'Utilisez POST' }, 405, { allow: 'POST' });
      let corps: Record<string, unknown>;
      try {
        corps = (await request.json()) as Record<string, unknown>;
      } catch {
        throw new ErreurOAuth('invalid_client_metadata', 'Corps JSON invalide');
      }
      const meta = await inscrireClient(env, corps ?? {}, request.headers.get('cf-connecting-ip') ?? 'inconnue');
      return jsonCors(meta, 201, SANS_CACHE);
    }
    if (p === '/api/mcp/oauth/authorize') {
      if (request.method !== 'GET') return pageErreur('Méthode non prise en charge', 'Utilisez GET.', 405);
      return await autoriser(request, env);
    }
    if (p === '/api/mcp/oauth/token') {
      if (request.method !== 'POST') return jsonCors({ error: 'invalid_request', error_description: 'Utilisez POST' }, 405, { allow: 'POST' });
      const f = await lireFormulaire(request);
      if (f.grant_type === 'authorization_code') return jsonCors(await echangerCode(env, f), 200, SANS_CACHE);
      if (f.grant_type === 'refresh_token') return jsonCors(await rafraichir(env, f), 200, SANS_CACHE);
      throw new ErreurOAuth('unsupported_grant_type', 'grant_type accepté : authorization_code ou refresh_token');
    }
    if (p === '/api/mcp/oauth/revoke') {
      if (request.method !== 'POST') return jsonCors({ error: 'invalid_request' }, 405, { allow: 'POST' });
      const f = await lireFormulaire(request);
      await revoquerJetonOAuth(env, f.token ?? '');
      return new Response(null, { status: 200, headers: { ...CORS, ...SANS_CACHE } });
    }
    const m = p.match(/^\/api\/mcp\/oauth\/demande\/(req_[A-Za-z0-9_-]+)(?:\/(approuver|refuser))?$/);
    if (m) {
      if (!m[2] && request.method === 'GET') return await detailDemande(request, env, m[1]);
      if (m[2] === 'approuver' && request.method === 'POST') return await approuver(request, env, m[1]);
      if (m[2] === 'refuser' && request.method === 'POST') return await refuser(request, env, m[1]);
    }
    return jsonCors({ error: 'not_found' }, 404);
  } catch (e) {
    if (e instanceof ErreurOAuth) return erreurOAuth(e);
    if (e instanceof HttpError) return jsonCors({ error: e.message, message: e.message }, e.status, SANS_CACHE);
    if (e instanceof Response) return e;
    console.error('[mcp oauth]', e);
    return jsonCors({ error: 'server_error', error_description: 'Erreur interne, réessayez dans un instant' }, 500, SANS_CACHE);
  }
}
