// « Continuer avec Google » : vérifie le jeton d'identité (ID token) de Google Identity Services,
// puis connecte ou crée le compte. Aucune clé secrète : la signature RS256 est vérifiée contre les
// clés publiques de Google (JWKS, mises en cache selon Cache-Control).
import type { Env } from '../../env';
import { fromB64url } from '../../lib/auth';
import { HttpError, json, readJson } from '../../lib/http';
import { creerCompte, normaliserEmail, session, userParEmail, userParGoogle, type Inscription } from './comptes';

export const JWKS_GOOGLE = 'https://www.googleapis.com/oauth2/v3/certs';
const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

export interface IdentiteGoogle {
  sub: string;
  email: string;
  prenom: string;
  nom: string;
}

let cache: { cles: Map<string, CryptoKey>; expire: number } | null = null;

/** Pour les tests : oublie les clés en cache. */
export const viderCacheGoogle = () => {
  cache = null;
};

async function clesGoogle(forcer = false): Promise<Map<string, CryptoKey>> {
  if (cache && !forcer && cache.expire > Date.now()) return cache.cles;
  const res = await fetch(JWKS_GOOGLE);
  if (!res.ok) throw new HttpError(503, 'Google ne répond pas, réessayez dans un instant');
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  const cles = new Map<string, CryptoKey>();
  for (const k of keys ?? []) {
    if (k.kty !== 'RSA' || !k.kid) continue;
    cles.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  cache = { cles, expire: Date.now() + Math.min(maxAge, 6 * 3600) * 1000 };
  return cles;
}

const decoder = (s: string) => JSON.parse(new TextDecoder().decode(fromB64url(s)));

/** Vérifie signature, émetteur, audience, expiration et e-mail vérifié. Lève 401 sinon. */
export async function verifierJetonGoogle(credential: string, clientId: string): Promise<IdentiteGoogle> {
  const refus = (m = 'Connexion Google refusée, réessayez') => new HttpError(401, m);
  const [h, b, s] = String(credential ?? '').split('.');
  if (!h || !b || !s) throw refus();
  let entete: { alg?: string; kid?: string };
  let p: Record<string, unknown>;
  try {
    entete = decoder(h);
    p = decoder(b);
  } catch {
    throw refus();
  }
  if (entete.alg !== 'RS256' || !entete.kid) throw refus();
  let cle = (await clesGoogle()).get(entete.kid);
  if (!cle) cle = (await clesGoogle(true)).get(entete.kid); // rotation des clés Google
  if (!cle) throw refus();
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cle, fromB64url(s), new TextEncoder().encode(`${h}.${b}`));
  if (!ok) throw refus();
  if (!EMETTEURS.includes(String(p.iss))) throw refus();
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!aud.includes(clientId)) throw refus();
  if (typeof p.exp !== 'number' || p.exp < Date.now() / 1000 - 60) throw refus('Connexion Google expirée, réessayez');
  if (p.email_verified !== true && p.email_verified !== 'true') throw refus("Cette adresse Google n'est pas vérifiée");
  if (!p.sub || !p.email) throw refus();
  return { sub: String(p.sub), email: normaliserEmail(p.email), prenom: String(p.given_name ?? ''), nom: String(p.family_name ?? '') };
}

export async function handleGoogleRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname !== '/api/auth/google' || request.method !== 'POST') return null;
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(404, "La connexion Google n'est pas activée");
  const body = await readJson<Inscription & { credential: string; mode?: 'login' | 'signup' }>(request);
  const id = await verifierJetonGoogle(body.credential, env.GOOGLE_CLIENT_ID);

  const existant = (await userParGoogle(env, id.sub)) ?? (await userParEmail(env, id.email));
  if (body.mode === 'signup') {
    if (existant) return json({ error: 'Un compte existe déjà avec cet e-mail', code: 'compte_existe' }, 409);
    const u = await creerCompte(env, id.email, { ...body, firstName: body.firstName || id.prenom, lastName: body.lastName || id.nom }, { googleSub: id.sub });
    return session(env, u, 201);
  }

  if (!existant) return json({ error: 'Aucun compte Brix pour cette adresse Google', code: 'pas_de_compte', email: id.email, prenom: id.prenom, nom: id.nom }, 404);
  // Compte créé avec un mot de passe et la même adresse (vérifiée par Google) : on relie les deux.
  if (existant.google_sub !== id.sub) await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(id.sub, existant.id).run();
  return session(env, existant);
}
