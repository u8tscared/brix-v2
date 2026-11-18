import type { Env } from '../env';
import { ConfigError, HttpError } from './http';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: 'patron' | 'conducteur' | 'chef_equipe' | 'ouvrier' | 'secretaire' | 'comptable' | 'apprenti' | 'api';
}

export const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
}

/** Comparaison en temps constant (évite les attaques par mesure du temps). */
export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Secret des sessions. Absent : erreur de configuration claire (jamais de repli silencieux).
 * `strict` (émission d'un jeton) exige aussi 32 caractères au moins.
 */
export function secretJwt(env: Pick<Env, 'JWT_SECRET'>, strict = false): string {
  const s = env.JWT_SECRET;
  if (!s) throw new ConfigError('Configuration du serveur incomplète : JWT_SECRET manquant');
  if (strict && s.length < 32) throw new ConfigError('Configuration du serveur incomplète : JWT_SECRET trop court (32 caractères minimum)');
  return s;
}

/** Signe un JWT HS256 (sessions de l'app). Porte `iat` (révocation « déconnecter tous les appareils »). */
export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(new TextEncoder().encode(JSON.stringify({ iat: now, ...payload, exp: now + ttlSeconds })));
  const sig = b64url(await hmac(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) return null;
  const expected = b64url(await hmac(secret, `${h}.${b}`));
  if (!timingSafeEqual(expected, s)) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(b)));
  } catch {
    return null;
  }
  if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null;
  return payload;
}

/** Vérifie le jeton Bearer et renvoie l'utilisateur et son entreprise. Lève 401 sinon. */
export async function requireAuth(request: Request, env: Env): Promise<AuthContext> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new HttpError(401, 'Non connecté');
  const payload = await verifyJwt(token, secretJwt(env));
  if (!payload?.sub || !payload.org) throw new HttpError(401, 'Session expirée');
  if (await sessionRevoquee(env, String(payload.sub), Number(payload.iat ?? 0))) throw new HttpError(401, 'Session expirée');
  return { userId: String(payload.sub), organizationId: String(payload.org), role: (payload.role as AuthContext['role']) ?? 'patron' };
}

/**
 * « Déconnecter tous les appareils » : un jeton émis avant users.sessions_revoquees_avant est refusé.
 * Base sans la colonne (migration pas encore passée) ou utilisateur inconnu : on laisse passer.
 */
async function sessionRevoquee(env: Env, userId: string, iat: number): Promise<boolean> {
  if (!env.DB) return false;
  try {
    const row = await env.DB.prepare('SELECT sessions_revoquees_avant AS r FROM users WHERE id = ?').bind(userId).first<{ r: number | null }>();
    return !!row?.r && iat < row.r;
  } catch {
    return false;
  }
}
