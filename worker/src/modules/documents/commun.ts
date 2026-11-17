/**
 * Outils communs aux modules des parcours externes (documents, signature, paiements, notifications).
 * Erreurs à code stable, lecture de corps bornée, IP, limitation de débit (D1), hachage, JSON canonique.
 */
import { HttpError, json } from '../../lib/http';

/** Erreur métier : `code` stable pour le front, `message` lisible par le client final. */
export class ErreurParcours extends HttpError {
  constructor(status: number, public code: string, message: string, public extra: Record<string, unknown> = {}) {
    super(status, message);
  }
}

/** Convertit toute erreur en réponse JSON, sans jamais exposer de détail interne. */
export function reponseErreur(err: unknown, module: string): Response {
  if (err instanceof Response) return err;
  if (err instanceof ErreurParcours) return json({ error: err.code, message: err.message, ...err.extra }, err.status);
  if (err instanceof HttpError) return json({ error: err.status === 401 ? 'non_connecte' : 'erreur', message: err.message }, err.status);
  console.error(`[${module}]`, err);
  return json({ error: 'erreur_interne', message: 'Une erreur est survenue, réessayez dans un instant.' }, 500);
}

/** Lit un corps JSON objet, borné en taille (défaut 64 Ko). */
export async function lireJson(request: Request, max = 64_000): Promise<Record<string, unknown>> {
  const texte = await request.text();
  if (texte.length > max) throw new ErreurParcours(413, 'trop_gros', 'Requête trop volumineuse.');
  if (!texte) return {};
  try {
    const v = JSON.parse(texte);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new ErreurParcours(400, 'json_invalide', 'Corps de requête invalide.');
  }
}

/** Chaîne obligatoire, nettoyée, bornée. */
export function texte(v: unknown, champ: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new ErreurParcours(400, 'champ_invalide', `Le champ « ${champ} » est requis.`, { champ });
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (s.length < min || s.length > max) throw new ErreurParcours(400, 'champ_invalide', `Le champ « ${champ} » doit faire entre ${min} et ${max} caractères.`, { champ });
  return s;
}

export function texteOptionnel(v: unknown, champ: string, max: number): string | null {
  if (v === undefined || v === null || v === '') return null;
  return texte(v, champ, 0, max);
}

// ---------- IP et navigateur ----------

export const ipDe = (request: Request) => request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? '0.0.0.0';
export const uaDe = (request: Request) => (request.headers.get('user-agent') ?? '').slice(0, 400);

/** IPv4 : dernier octet à zéro. IPv6 : préfixe /48. Pour les journaux d'ouverture (minimisation RGPD). */
export function ipTronquee(ip: string): string {
  if (ip.includes('.') && !ip.includes(':')) return ip.split('.').slice(0, 3).concat('0').join('.');
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::';
  return '';
}

// ---------- Hachage et encodage ----------

export function b64url(buf: ArrayBuffer | Uint8Array): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b + '='.repeat((4 - (b.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export const hex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

export async function hmacBrut(secret: string | Uint8Array, data: string | Uint8Array): Promise<Uint8Array> {
  const k = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret;
  const key = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, typeof data === 'string' ? new TextEncoder().encode(data) : data));
}

export const hmacHex = async (secret: string, data: string) => hex(await hmacBrut(secret, data));

/** Comparaison en temps constant (la durée ne dépend pas de la position de la première différence). */
export function egalTempsConstant(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function aleatoire(octets = 16): Uint8Array {
  const buf = new Uint8Array(octets);
  crypto.getRandomValues(buf);
  return buf;
}

export const nouvelId = (prefixe: string) => `${prefixe}_${b64url(aleatoire(12))}`;

/** JSON canonique : clés triées récursivement, pas d'espace. Sert à l'empreinte du document signé. */
export function jsonCanonique(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(jsonCanonique).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${jsonCanonique(o[k])}`)
    .join(',')}}`;
}

// ---------- Montants et dates ----------

export const enCentimes = (euros: number | null | undefined) => Math.round((Number(euros) || 0) * 100);
export const enEuros = (centimes: number) => Math.round(centimes) / 100;

/** Dates SQLite « YYYY-MM-DD HH:MM:SS » (UTC) ou ISO → millisecondes. */
export function dateMs(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) ? v.replace(' ', 'T') + 'Z' : v;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export const isoMs = (ms: number) => new Date(ms).toISOString();

export const JOUR_MS = 86_400_000;

// ---------- Limitation de débit ----------

/**
 * Compteur à fenêtre fixe dans D1 (table parcours_limites).
 * Pourquoi D1 plutôt que KV : KV est à cohérence éventuelle (une écriture met jusqu'à 60 s à se propager),
 * ce qui laisse passer des rafales ; D1 est cohérente et déjà liée au worker. Pour un très fort trafic,
 * passer à un Durable Object ou au binding Rate Limiting de Cloudflare.
 * Les clés contenant une IP sont hachées : aucune IP en clair dans cette table.
 */
export async function limiter(env: { DB: D1Database }, cle: string, max: number, fenetreMs: number): Promise<void> {
  const maintenant = Date.now();
  const debut = maintenant - (maintenant % fenetreMs);
  const row = await env.DB.prepare(
    `INSERT INTO parcours_limites (cle, compteur, fenetre_debut) VALUES (?, 1, ?)
     ON CONFLICT(cle) DO UPDATE SET
       compteur = CASE WHEN parcours_limites.fenetre_debut < excluded.fenetre_debut THEN 1 ELSE parcours_limites.compteur + 1 END,
       fenetre_debut = MAX(parcours_limites.fenetre_debut, excluded.fenetre_debut)
     RETURNING compteur`,
  )
    .bind(cle, debut)
    .first<{ compteur: number }>();
  if ((row?.compteur ?? 0) > max) {
    const attente = Math.ceil((debut + fenetreMs - maintenant) / 1000);
    throw new ErreurParcours(429, 'trop_de_demandes', 'Trop de tentatives. Réessayez dans quelques minutes.', { reessayerDans: attente });
  }
}

export const cleIp = async (prefixe: string, ip: string) => `${prefixe}:ip:${(await sha256Hex(ip)).slice(0, 24)}`;

/** Purge des compteurs expirés (à appeler depuis le cron). */
export async function purgerLimites(env: { DB: D1Database }) {
  await env.DB.prepare('DELETE FROM parcours_limites WHERE fenetre_debut < ?').bind(Date.now() - JOUR_MS).run();
}

export { json };
