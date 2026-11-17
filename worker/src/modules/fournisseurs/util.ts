/**
 * Petits utilitaires partagés par les modules fournisseurs, api-publique et mcp.
 */

export const DAY_MS = 86_400_000;

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/** Jeton aléatoire URL-safe (256 bits). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

export function base64url(buf: Uint8Array): string {
  let s = '';
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant de deux chaînes hexadécimales. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Minuscules, sans accents, espaces normalisés : « Tube PER Ø16 » → « tube per o16 ». */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .toLowerCase()
    .replace(/[^a-z0-9.,/×x-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** « 12,50 » / « 12.5 » / « 1 234,56 € » → 1250 / 1250 / 123456. NULL si illisible. */
export function parseEurosToCents(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw * 100) : null;
  if (typeof raw !== 'string') return null;
  let s = raw.replace(/[€\s ]/g, '').trim();
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    // « 1.234,56 » (FR) ou « 1,234.56 » (EN) : le dernier séparateur est la décimale
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // « 1.250 » : séparateur de milliers à la française, pas une décimale
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function formatEuros(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatDate(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(
    new Date(ms),
  );
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
