/**
 * Jetons OAuth opaques de Brix AI : brx_oat_… (accès, 1 h) et brx_ort_… (renouvellement).
 * Seul le SHA-256 est stocké. Le renouvellement tourne à chaque usage ; réutiliser un ancien
 * jeton de renouvellement coupe toute l'autorisation (vol présumé).
 */
import type { Env } from '../../../env';
import { all, first, run } from '../../fournisseurs/depot';
import { randomToken, sha256Hex } from '../../fournisseurs/util';
import { DUREE, memeRessource } from '../config';
import { ErreurOAuth } from './clients';

export interface Grant {
  id: string;
  organization_id: string;
  user_id: string;
  client_id: string;
  client_label: string;
  client_host: string | null;
  scope: string;
  resource: string;
  created_at: number;
  last_used: number | null;
  revoked_at: number | null;
}

export const grantParId = (env: Env, id: string) => first<Grant>(env, `SELECT * FROM mcp_oauth_grants WHERE id = ?`, id);

export async function revoquerGrant(env: Env, grantId: string) {
  const t = Date.now();
  await run(env, `UPDATE mcp_oauth_grants SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?`, t, grantId);
  await run(env, `UPDATE mcp_oauth_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE grant_id = ?`, t, grantId);
}

async function emettre(env: Env, g: Grant, scope: string) {
  const maintenant = Date.now();
  const acces = `brx_oat_${randomToken(32)}`;
  const refresh = `brx_ort_${randomToken(32)}`;
  const finRefresh = Math.min(maintenant + DUREE.refreshGlissant, g.created_at + DUREE.refreshAbsolu);
  await run(env, `INSERT INTO mcp_oauth_tokens (hash, grant_id, kind, scope, exp, created_at) VALUES (?, ?, 'access', ?, ?, ?)`, await sha256Hex(acces), g.id, scope, maintenant + DUREE.acces, maintenant);
  await run(env, `INSERT INTO mcp_oauth_tokens (hash, grant_id, kind, scope, exp, created_at) VALUES (?, ?, 'refresh', ?, ?, ?)`, await sha256Hex(refresh), g.id, scope, finRefresh, maintenant);
  return { access_token: acces, token_type: 'Bearer', expires_in: Math.floor(DUREE.acces / 1000), refresh_token: refresh, scope };
}

/** Code d'autorisation (usage unique) pour une autorisation qui vient d'être donnée. */
export async function creerCode(env: Env, g: Grant, p: { redirect_uri: string; challenge: string; resource: string; scope: string }) {
  const code = `brx_cod_${randomToken(32)}`;
  await run(
    env,
    `INSERT INTO mcp_oauth_codes (hash, grant_id, client_id, redirect_uri, challenge, resource, scope, exp) VALUES (?,?,?,?,?,?,?,?)`,
    await sha256Hex(code), g.id, g.client_id, p.redirect_uri, p.challenge, p.resource, p.scope, Date.now() + DUREE.code,
  );
  return code;
}

async function s256(verifier: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  let s = '';
  for (const b of d) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function echangerCode(env: Env, p: Record<string, string | undefined>) {
  const { code, code_verifier: verifier, client_id: clientId, redirect_uri: redirectUri, resource } = p;
  if (!code || !verifier || !clientId) throw new ErreurOAuth('invalid_request', 'code, code_verifier et client_id sont obligatoires');
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new ErreurOAuth('invalid_grant', 'code_verifier invalide');
  const hash = await sha256Hex(code);
  const c = await first<{ grant_id: string; client_id: string; redirect_uri: string; challenge: string; resource: string; scope: string; exp: number; utilise_le: number | null }>(
    env, `SELECT grant_id, client_id, redirect_uri, challenge, resource, scope, exp, utilise_le FROM mcp_oauth_codes WHERE hash = ?`, hash,
  );
  if (!c) throw new ErreurOAuth('invalid_grant', 'Code inconnu');
  if (c.utilise_le) {
    // Code rejoué : on coupe tout ce qui en est sorti (RFC 6749 §4.1.2).
    await revoquerGrant(env, c.grant_id);
    throw new ErreurOAuth('invalid_grant', 'Code déjà utilisé');
  }
  const marque = await env.DB.prepare(`UPDATE mcp_oauth_codes SET utilise_le = ? WHERE hash = ? AND utilise_le IS NULL`).bind(Date.now(), hash).run();
  if (!marque.meta.changes) throw new ErreurOAuth('invalid_grant', 'Code déjà utilisé');
  if (c.exp < Date.now()) throw new ErreurOAuth('invalid_grant', 'Code expiré');
  if (c.client_id !== clientId) throw new ErreurOAuth('invalid_grant', 'Code émis pour un autre client');
  if (redirectUri !== undefined && redirectUri !== c.redirect_uri) throw new ErreurOAuth('invalid_grant', 'redirect_uri différente de celle de la demande');
  if (resource !== undefined && !memeRessource(env, resource)) throw new ErreurOAuth('invalid_target', 'Ressource inconnue');
  if ((await s256(verifier)) !== c.challenge) throw new ErreurOAuth('invalid_grant', 'Vérification PKCE échouée');
  const g = await grantParId(env, c.grant_id);
  if (!g || g.revoked_at) throw new ErreurOAuth('invalid_grant', 'Autorisation coupée');
  return emettre(env, g, c.scope);
}

export async function rafraichir(env: Env, p: Record<string, string | undefined>) {
  const { refresh_token: rt, client_id: clientId, resource, scope } = p;
  if (!rt || !clientId) throw new ErreurOAuth('invalid_request', 'refresh_token et client_id sont obligatoires');
  const hash = await sha256Hex(rt);
  const t = await first<{ grant_id: string; kind: string; scope: string; exp: number; utilise_le: number | null; revoked_at: number | null }>(
    env, `SELECT grant_id, kind, scope, exp, utilise_le, revoked_at FROM mcp_oauth_tokens WHERE hash = ?`, hash,
  );
  if (!t || t.kind !== 'refresh') throw new ErreurOAuth('invalid_grant', 'Jeton de renouvellement inconnu');
  const g = await grantParId(env, t.grant_id);
  if (!g || g.revoked_at) throw new ErreurOAuth('invalid_grant', 'Autorisation coupée');
  if (g.client_id !== clientId) throw new ErreurOAuth('invalid_grant', 'Jeton émis pour un autre client');
  if (t.utilise_le || t.revoked_at) {
    await revoquerGrant(env, g.id);
    throw new ErreurOAuth('invalid_grant', 'Jeton de renouvellement déjà utilisé : autorisation coupée par sécurité');
  }
  if (t.exp < Date.now()) throw new ErreurOAuth('invalid_grant', 'Jeton de renouvellement expiré');
  if (resource !== undefined && !memeRessource(env, resource)) throw new ErreurOAuth('invalid_target', 'Ressource inconnue');
  const marque = await env.DB.prepare(`UPDATE mcp_oauth_tokens SET utilise_le = ? WHERE hash = ? AND utilise_le IS NULL`).bind(Date.now(), hash).run();
  if (!marque.meta.changes) {
    await revoquerGrant(env, g.id);
    throw new ErreurOAuth('invalid_grant', 'Jeton de renouvellement déjà utilisé');
  }
  // Une portée plus étroite peut être demandée, jamais une plus large.
  let portee = t.scope;
  if (scope) {
    const voulue = scope.split(/\s+/).filter(Boolean);
    if (voulue.some((s) => !t.scope.split(' ').includes(s))) throw new ErreurOAuth('invalid_scope', 'Portée plus large que celle autorisée');
    portee = t.scope.split(' ').filter((s) => voulue.includes(s)).join(' ') || t.scope;
  }
  return emettre(env, g, portee);
}

/** RFC 7009 : jamais d'erreur sur un jeton inconnu. Un refresh coupe toute l'autorisation. */
export async function revoquerJetonOAuth(env: Env, jeton: string) {
  if (!jeton) return;
  const t = await first<{ grant_id: string; kind: string }>(env, `SELECT grant_id, kind FROM mcp_oauth_tokens WHERE hash = ?`, await sha256Hex(jeton));
  if (!t) return;
  if (t.kind === 'refresh') await revoquerGrant(env, t.grant_id);
  else await run(env, `UPDATE mcp_oauth_tokens SET revoked_at = ? WHERE hash = ?`, Date.now(), await sha256Hex(jeton));
}

/** Vérifie un jeton d'accès présenté à /api/mcp : expiration, révocation, audience (RFC 8707). */
export async function verifierAccesOAuth(env: Env, jeton: string) {
  if (!/^brx_oat_[A-Za-z0-9_-]{40,}$/.test(jeton)) return null;
  const t = await first<{ grant_id: string; kind: string; scope: string; exp: number; revoked_at: number | null }>(
    env, `SELECT grant_id, kind, scope, exp, revoked_at FROM mcp_oauth_tokens WHERE hash = ?`, await sha256Hex(jeton),
  );
  if (!t || t.kind !== 'access' || t.revoked_at || t.exp < Date.now()) return null;
  const g = await grantParId(env, t.grant_id);
  if (!g || g.revoked_at || !memeRessource(env, g.resource)) return null;
  const maintenant = Date.now();
  if (!g.last_used || maintenant - g.last_used > 60_000) await run(env, `UPDATE mcp_oauth_grants SET last_used = ? WHERE id = ?`, maintenant, g.id);
  return { grant: g, scope: t.scope };
}

export const grantsActifs = (env: Env, orgId: string) =>
  all<Grant>(
    env,
    `SELECT g.* FROM mcp_oauth_grants g WHERE g.organization_id = ? AND g.revoked_at IS NULL
       AND EXISTS (SELECT 1 FROM mcp_oauth_tokens t WHERE t.grant_id = g.id)
     ORDER BY COALESCE(g.last_used, g.created_at) DESC LIMIT 50`,
    orgId,
  );
