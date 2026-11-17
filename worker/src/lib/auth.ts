import type { Env } from '../env';
import { HttpError } from './http';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: 'patron' | 'conducteur' | 'chef_equipe' | 'ouvrier' | 'secretaire' | 'comptable' | 'apprenti' | 'api';
}

const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmac(secret: string, data: string) {
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

/** Signe un JWT HS256 (sessions de l'app). */
export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const sig = b64url(await hmac(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) return null;
  const expected = b64url(await hmac(secret, `${h}.${b}`));
  if (!timingSafeEqual(expected, s)) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(b)));
  if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null;
  return payload;
}

/** Vérifie le jeton Bearer et renvoie l'utilisateur et son entreprise. Lève 401 sinon. */
export async function requireAuth(request: Request, env: Env): Promise<AuthContext> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new HttpError(401, 'Non connecté');
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload?.sub || !payload.org) throw new HttpError(401, 'Session expirée');
  return { userId: String(payload.sub), organizationId: String(payload.org), role: (payload.role as AuthContext['role']) ?? 'patron' };
}
