/** Brix AI MCP : découverte, défi 401, DCR, CIMD, /authorize, écran d'autorisation, jetons, rotation. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORIGINE, appel, creerEnv, rpc, semer, session } from './aides';

let env: any;
beforeEach(async () => {
  env = creerEnv();
  await semer(env);
});
afterEach(() => vi.restoreAllMocks());

const RESSOURCE = `${ORIGINE}/api/mcp`;
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function pkce() {
  const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}

async function inscrire(redirect_uris: string[], extra: Record<string, unknown> = {}) {
  const res = await appel(env, '/api/mcp/oauth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Cursor', redirect_uris, ...extra }) });
  return { status: res.status, data: (await res.json()) as any };
}

const urlAutoriser = (p: Record<string, string>) => `/api/mcp/oauth/authorize?${new URLSearchParams({ response_type: 'code', code_challenge_method: 'S256', resource: RESSOURCE, scope: 'brix.lecture brix.ecriture', state: 'etat-123', ...p })}`;

const jwt = (org = 'org_a', role = 'patron') => session(org, role).then((t) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' }));

/** Parcours complet : inscription, /authorize, écran de l'app, approbation, échange du code. */
async function connecter(ecriture = true, redirect = 'cursor://anysphere.cursor-mcp/oauth/callback') {
  const client = (await inscrire([redirect])).data;
  const { verifier, challenge } = await pkce();
  const auth = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge }));
  expect(auth.status).toBe(302);
  const loc = auth.headers.get('location')!;
  expect(loc.startsWith(`${ORIGINE}/#/autoriser?req=`)).toBe(true);
  const req = new URL(loc.replace('/#/', '/')).searchParams.get('req')!;
  const ok = await appel(env, `/api/mcp/oauth/demande/${req}/approuver`, { method: 'POST', headers: await jwt(), body: JSON.stringify({ ecriture }) });
  expect(ok.status).toBe(200);
  const retour = new URL(((await ok.json()) as any).redirect);
  expect(retour.searchParams.get('state')).toBe('etat-123');
  expect(retour.searchParams.get('iss')).toBe(ORIGINE);
  const tok = await appel(env, '/api/mcp/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: retour.searchParams.get('code')!, code_verifier: verifier, client_id: client.client_id, redirect_uri: redirect, resource: RESSOURCE }),
  });
  expect(tok.status).toBe(200);
  expect(tok.headers.get('cache-control')).toContain('no-store');
  return { client, jetons: (await tok.json()) as any, req };
}

describe('découverte', () => {
  it('sert les métadonnées de ressource et de serveur, et un 404 JSON ailleurs', async () => {
    for (const p of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/api/mcp']) {
      const r = await appel(env, p);
      expect(r.status).toBe(200);
      expect(r.headers.get('access-control-allow-origin')).toBe('*');
      const d = (await r.json()) as any;
      expect(d.resource).toBe(RESSOURCE);
      expect(d.authorization_servers).toEqual([ORIGINE]);
      expect(d.scopes_supported).toEqual(['brix.lecture', 'brix.ecriture']);
    }
    for (const p of ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration']) {
      const d = (await (await appel(env, p)).json()) as any;
      expect(d.issuer).toBe(ORIGINE);
      expect(d.token_endpoint).toBe(`${ORIGINE}/api/mcp/oauth/token`);
      expect(d.code_challenge_methods_supported).toEqual(['S256']);
      expect(d.token_endpoint_auth_methods_supported).toEqual(['none']);
      expect(d.client_id_metadata_document_supported).toBe(true);
      expect(d.authorization_response_iss_parameter_supported).toBe(true);
      expect(d.scopes_supported).not.toContain('offline_access');
    }
    const inconnu = await appel(env, '/.well-known/apple-app-site-association');
    expect(inconnu.status).toBe(404);
    expect(inconnu.headers.get('content-type')).toContain('application/json');
    expect((await appel(env, '/.well-known/openai-apps-challenge')).status).toBe(404);
    env.OPENAI_APPS_CHALLENGE = 'jeton-openai';
    expect(await (await appel(env, '/.well-known/openai-apps-challenge')).text()).toBe('jeton-openai');
  });

  it('répond 401 avec resource_metadata et scope sans jeton, et après un jeton inconnu', async () => {
    const r = await rpc(env, null, { jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(r.status).toBe(401);
    const h = r.headers.get('www-authenticate')!;
    expect(h).toContain(`resource_metadata="${ORIGINE}/.well-known/oauth-protected-resource/api/mcp"`);
    expect(h).toContain('scope="brix.lecture brix.ecriture"');
    expect(r.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate');
    const g = await appel(env, '/api/mcp');
    expect(g.status).toBe(401);
    const faux = await rpc(env, 'brx_oat_' + 'x'.repeat(43), { jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(faux.status).toBe(401);
    expect(faux.headers.get('www-authenticate')).toContain('error="invalid_token"');
  });
});

describe('OAuth 2.1', () => {
  it('relie un assistant de bout en bout, puis tourne le jeton de renouvellement et détecte sa réutilisation', async () => {
    const { client, jetons } = await connecter(true);
    expect(jetons.access_token).toMatch(/^brx_oat_/);
    expect(jetons.refresh_token).toMatch(/^brx_ort_/);
    expect(jetons.expires_in).toBe(3600);
    expect(jetons.scope).toBe('brix.lecture brix.ecriture');
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(200);

    const rafraichir = (rt: string) =>
      appel(env, '/api/mcp/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, client_id: client.client_id }) });
    const r1 = await rafraichir(jetons.refresh_token);
    expect(r1.status).toBe(200);
    const n1 = (await r1.json()) as any;
    expect(n1.refresh_token).not.toBe(jetons.refresh_token);
    expect((await rpc(env, n1.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(200);

    // Réutilisation de l'ancien jeton : refus et autorisation entière coupée.
    const vol = await rafraichir(jetons.refresh_token);
    expect(vol.status).toBe(400);
    expect(((await vol.json()) as any).error).toBe('invalid_grant');
    expect((await rpc(env, n1.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
    expect((await rafraichir(n1.refresh_token)).status).toBe(400);
  });

  it('refuse un code rejoué, un mauvais vérificateur PKCE et une ressource étrangère', async () => {
    const redirect = 'https://chatgpt.com/connector_platform_oauth_redirect';
    const client = (await inscrire([redirect])).data;
    const { challenge } = await pkce();
    const autre = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, resource: 'https://evil.test/api/mcp' }));
    expect(autre.status).toBe(302);
    const err = new URL(autre.headers.get('location')!);
    expect(err.origin + err.pathname).toBe(redirect);
    expect(err.searchParams.get('error')).toBe('invalid_target');
    expect(err.searchParams.get('state')).toBe('etat-123');
    expect(err.searchParams.get('iss')).toBe(ORIGINE);

    const plain = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'plain' }));
    expect(new URL(plain.headers.get('location')!).searchParams.get('error')).toBe('invalid_request');

    const auth = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge }));
    const req = new URL(auth.headers.get('location')!.replace('/#/', '/')).searchParams.get('req')!;
    const code = new URL(((await (await appel(env, `/api/mcp/oauth/demande/${req}/approuver`, { method: 'POST', headers: await jwt(), body: '{}' })).json()) as any).redirect).searchParams.get('code')!;
    const echange = (verifier: string, resource = RESSOURCE) =>
      appel(env, '/api/mcp/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id: client.client_id, redirect_uri: redirect, resource }) });
    const mauvais = await echange('a'.repeat(43));
    expect(((await mauvais.json()) as any).error).toBe('invalid_grant');
    // Le code est à usage unique, même après un échec.
    expect(((await (await echange('b'.repeat(43))).json()) as any).error).toBe('invalid_grant');
  });

  it('affiche une page d’erreur (sans redirection) pour un client ou une adresse de retour non vérifiés', async () => {
    const { challenge } = await pkce();
    const inconnu = await appel(env, urlAutoriser({ client_id: 'brx_cli_inconnu', redirect_uri: 'https://evil.test/cb', code_challenge: challenge }));
    expect(inconnu.status).toBe(400);
    expect(inconnu.headers.get('location')).toBeNull();
    expect(inconnu.headers.get('x-frame-options')).toBe('DENY');
    expect(inconnu.headers.get('content-type')).toContain('text/html');

    const client = (await inscrire(['http://127.0.0.1/callback'])).data;
    const detourne = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: 'https://evil.test/callback', code_challenge: challenge }));
    expect(detourne.status).toBe(400);
    expect(detourne.headers.get('location')).toBeNull();
    // Boucle locale : le port est ignoré, pas le chemin.
    expect((await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: 'http://127.0.0.1:53123/callback', code_challenge: challenge }))).status).toBe(302);
    expect((await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: 'http://127.0.0.1:53123/autre', code_challenge: challenge }))).status).toBe(400);
  });

  it('valide les adresses de retour à l’inscription', async () => {
    expect((await inscrire(['javascript:alert(1)'])).status).toBe(400);
    expect((await inscrire(['http://evil.test/cb'])).status).toBe(400);
    expect((await inscrire([])).status).toBe(400);
    const ok = await inscrire(['cursor://anysphere.cursor-mcp/oauth/callback', 'http://localhost/callback'], { token_endpoint_auth_method: 'client_secret_post' });
    expect(ok.status).toBe(201);
    expect(ok.data.client_id).toMatch(/^brx_cli_/);
    expect(ok.data.token_endpoint_auth_method).toBe('none');
    expect(ok.data.client_secret).toBeUndefined();
  });

  it('accepte un client CIMD (document https) et montre son hôte sur l’écran d’autorisation', async () => {
    const id = 'https://claude.ai/oauth/claude-code-client-metadata';
    const doc = { client_id: id, client_name: 'Claude Code', redirect_uris: ['http://localhost/callback', 'http://127.0.0.1/callback'], token_endpoint_auth_method: 'none' };
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'max-age=600' } }));
    const { challenge } = await pkce();
    const auth = await appel(env, urlAutoriser({ client_id: id, redirect_uri: 'http://localhost:61000/callback', code_challenge: challenge }));
    expect(auth.status).toBe(302);
    const req = new URL(auth.headers.get('location')!.replace('/#/', '/')).searchParams.get('req')!;
    const d = (await (await appel(env, `/api/mcp/oauth/demande/${req}`, { headers: await jwt() })).json()) as any;
    expect(d.client).toMatchObject({ nom: 'Claude', hote: 'claude.ai', connu: true, inscription: 'cimd', boucle_locale: true });
    expect(d.redirection.hote).toBe('localhost');
    expect(d.ecriture_demandee).toBe(true);
    expect(d.peut_autoriser).toBe(true);
    expect(d.entreprise).toBe('Benali Électricité');
    expect(f).toHaveBeenCalledTimes(1); // mis en cache ensuite
    // Document dont le client_id ne correspond pas : refusé.
    f.mockResolvedValueOnce(new Response(JSON.stringify({ ...doc, client_id: 'https://autre.test/x' }), { status: 200 }));
    expect((await appel(env, urlAutoriser({ client_id: 'https://vscode.dev/oauth/client-metadata.json', redirect_uri: 'http://127.0.0.1:33418/', code_challenge: challenge }))).status).toBe(400);
  });

  it('réserve l’approbation au gérant, et « Refuser » renvoie access_denied avec state et iss', async () => {
    const redirect = 'https://claude.ai/api/mcp/auth_callback';
    const client = (await inscrire([redirect])).data;
    const { challenge } = await pkce();
    const auth = await appel(env, urlAutoriser({ client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge }));
    const req = new URL(auth.headers.get('location')!.replace('/#/', '/')).searchParams.get('req')!;
    expect((await appel(env, `/api/mcp/oauth/demande/${req}`)).status).toBe(401);
    const ouvrier = await appel(env, `/api/mcp/oauth/demande/${req}/approuver`, { method: 'POST', headers: await jwt('org_a', 'ouvrier'), body: '{}' });
    expect(ouvrier.status).toBe(403);
    const refus = await appel(env, `/api/mcp/oauth/demande/${req}/refuser`, { method: 'POST', headers: await jwt(), body: '{}' });
    const u = new URL(((await refus.json()) as any).redirect);
    expect(u.searchParams.get('error')).toBe('access_denied');
    expect(u.searchParams.get('state')).toBe('etat-123');
    expect(u.searchParams.get('iss')).toBe(ORIGINE);
    // Demande déjà traitée.
    expect((await appel(env, `/api/mcp/oauth/demande/${req}/approuver`, { method: 'POST', headers: await jwt(), body: '{}' })).status).toBe(410);
  });

  it('applique la portée : lecture seule = pas d’outils d’écriture, 403 insufficient_scope', async () => {
    const { jetons } = await connecter(false);
    expect(jetons.scope).toBe('brix.lecture');
    const list = await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(list.data.result.tools.some((t: any) => t.name === 'creer_client')).toBe(false);
    const w = await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'creer_client', arguments: { nom: 'X' } } });
    expect(w.status).toBe(403);
    expect(w.headers.get('www-authenticate')).toContain('error="insufficient_scope"');
    expect(w.data.error.message).toContain('lecture seule');
  });

  it('liste les assistants reliés, coupe un accès et l’interrupteur général', async () => {
    const { jetons } = await connecter(true);
    const h = await jwt();
    const acces = ((await (await appel(env, '/api/mcp/acces', { headers: h })).json()) as any).acces;
    expect(acces).toHaveLength(1);
    expect(acces[0]).toMatchObject({ type: 'oauth', nom: 'Cursor', ecriture: true });

    await appel(env, '/api/mcp/reglages', { method: 'POST', headers: h, body: JSON.stringify({ actif: false }) });
    expect(((await (await appel(env, '/api/mcp/reglages', { headers: h })).json()) as any).actif).toBe(false);
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
    await appel(env, '/api/mcp/reglages', { method: 'POST', headers: h, body: JSON.stringify({ actif: true }) });
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(200);

    // Une autre entreprise ne peut pas couper cet accès.
    await appel(env, `/api/mcp/acces/${acces[0].id}`, { method: 'DELETE', headers: await jwt('org_b') });
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(200);
    await appel(env, `/api/mcp/acces/${acces[0].id}`, { method: 'DELETE', headers: h });
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
  });

  it('révoque un jeton de renouvellement (RFC 7009)', async () => {
    const { jetons } = await connecter(true);
    const r = await appel(env, '/api/mcp/oauth/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: jetons.refresh_token }) });
    expect(r.status).toBe(200);
    expect((await rpc(env, jetons.access_token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
  });
});
