/** « Continuer avec Google » : vérification RS256 contre un JWKS simulé, iss / aud / exp / e-mail vérifié, liaison de compte. */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { b64url } from '../../../lib/auth';
import { JWKS_GOOGLE, verifierJetonGoogle, viderCacheGoogle } from '../google';
import { appeler, creerEnv, inscription } from './outils';

const CLIENT = '1234-test.apps.googleusercontent.com';
let paire: CryptoKeyPair;
let autre: CryptoKeyPair;
let jwks: unknown;

const algo = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

async function jeton(p: Record<string, unknown> = {}, o: { kid?: string; cle?: CryptoKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = enc({ alg: 'RS256', kid: o.kid ?? 'cle-1', typ: 'JWT' });
  const b = enc({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '10769150350006150715113082367', email: 'Karim.Benali@gmail.com', email_verified: true, given_name: 'Karim', family_name: 'Benali', iat: now, exp: now + 3600, ...p });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', o.cle ?? paire.privateKey, new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64url(sig)}`;
}

beforeAll(async () => {
  paire = (await crypto.subtle.generateKey(algo, true, ['sign', 'verify'])) as CryptoKeyPair;
  autre = (await crypto.subtle.generateKey(algo, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pub = (await crypto.subtle.exportKey('jwk', paire.publicKey)) as JsonWebKey;
  jwks = { keys: [{ ...pub, kid: 'cle-1', alg: 'RS256', use: 'sig' }] };
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  viderCacheGoogle();
  fetchMock = vi.fn(async (url: string) => {
    expect(url).toBe(JWKS_GOOGLE);
    return new Response(JSON.stringify(jwks), { headers: { 'cache-control': 'public, max-age=20000' } });
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('verifierJetonGoogle', () => {
  it('accepte un jeton valide et met les clés en cache', async () => {
    const id = await verifierJetonGoogle(await jeton(), CLIENT);
    expect(id).toEqual({ sub: '10769150350006150715113082367', email: 'karim.benali@gmail.com', prenom: 'Karim', nom: 'Benali' });
    await verifierJetonGoogle(await jeton({ iss: 'accounts.google.com' }), CLIENT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['mauvaise audience', { aud: 'autre-client.apps.googleusercontent.com' }],
    ['mauvais émetteur', { iss: 'https://evil.example' }],
    ['expiré', { exp: Math.floor(Date.now() / 1000) - 3600 }],
    ['e-mail non vérifié', { email_verified: false }],
  ])('refuse : %s', async (_n, p) => {
    await expect(verifierJetonGoogle(await jeton(p), CLIENT)).rejects.toMatchObject({ status: 401 });
  });

  it('refuse une signature d’une autre clé, un jeton modifié et une clé inconnue (après un nouveau tirage du JWKS)', async () => {
    await expect(verifierJetonGoogle(await jeton({}, { cle: autre.privateKey }), CLIENT)).rejects.toMatchObject({ status: 401 });
    const [h, , s] = (await jeton()).split('.');
    await expect(verifierJetonGoogle(`${h}.${enc({ sub: 'pirate', email: 'x@y.z', email_verified: true, iss: 'accounts.google.com', aud: CLIENT, exp: 9e9 })}.${s}`, CLIENT)).rejects.toMatchObject({ status: 401 });
    fetchMock.mockClear();
    await expect(verifierJetonGoogle(await jeton({}, { kid: 'inconnue' }), CLIENT)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // rotation : le JWKS est relu une fois
  });
});

describe('/api/auth/google', () => {
  let env: any;
  beforeEach(() => {
    env = creerEnv({ GOOGLE_CLIENT_ID: CLIENT });
  });

  it('config : expose le client Google seulement s’il est configuré, jamais Apple', async () => {
    expect((await appeler(env, 'GET', '/api/auth/config')).data).toEqual({ google: { clientId: CLIENT }, apple: false });
    expect((await appeler(creerEnv(), 'GET', '/api/auth/config')).data).toEqual({ google: null, apple: false });
  });

  it('connexion sans compte → 404 pas_de_compte avec l’identité, puis inscription, puis connexion', async () => {
    const credential = await jeton();
    const r = await appeler(env, 'POST', '/api/auth/google', { body: { credential, mode: 'login' } });
    expect(r.status).toBe(404);
    expect(r.data).toMatchObject({ code: 'pas_de_compte', email: 'karim.benali@gmail.com', prenom: 'Karim' });

    const s = await appeler(env, 'POST', '/api/auth/google', { body: { credential, mode: 'signup', company: { name: 'Benali Électricité' }, donnees: { clients: [] } } });
    expect(s.status).toBe(201);
    expect(s.data.user).toMatchObject({ email: 'karim.benali@gmail.com', firstName: 'Karim', google: true, motDePasse: false });
    expect((await appeler(env, 'POST', '/api/auth/google', { body: { credential, mode: 'signup' } })).status).toBe(409);
    expect((await appeler(env, 'POST', '/api/auth/google', { body: { credential, mode: 'login' } })).status).toBe(200);
    // Pas de mot de passe sur ce compte : la connexion par e-mail le dit.
    const l = await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim.benali@gmail.com', password: 'nimportequoi' } });
    expect(l.data.code).toBe('compte_google');
  });

  it('relie un compte existant créé avec la même adresse', async () => {
    await appeler(env, 'POST', '/api/auth/signup', { body: inscription('karim.benali@gmail.com') });
    const r = await appeler(env, 'POST', '/api/auth/google', { body: { credential: await jeton(), mode: 'login' } });
    expect(r.status).toBe(200);
    expect(r.data.user).toMatchObject({ google: true, motDePasse: true });
  });

  it('404 si Google n’est pas configuré', async () => {
    expect((await appeler(creerEnv(), 'POST', '/api/auth/google', { body: { credential: await jeton() } })).status).toBe(404);
  });
});
