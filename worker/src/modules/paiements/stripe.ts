/**
 * Stripe sans SDK : appels REST en application/x-www-form-urlencoded et vérification des webhooks.
 * Doc : https://docs.stripe.com/api et https://docs.stripe.com/webhooks#verify-manually
 */
import { egalTempsConstant, hmacHex } from '../documents/commun';
import type { EnvParcours } from '../documents/env';

/** { a: { b: [1, 2] } } → a[b][0]=1&a[b][1]=2 (format attendu par l'API Stripe). */
export function encoderFormulaire(obj: Record<string, unknown>, prefixe = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' && x ? encoderFormulaire(x as Record<string, unknown>, `${cle}[${i}]`, out) : out.append(`${cle}[${i}]`, String(x))));
    else if (typeof v === 'object') encoderFormulaire(v as Record<string, unknown>, cle, out);
    else out.append(cle, String(v));
  }
  return out;
}

export class ErreurStripe extends Error {
  constructor(public status: number, public code: string | undefined, message: string) {
    super(message);
  }
}

export async function stripe<T = Record<string, unknown>>(
  env: EnvParcours,
  methode: 'GET' | 'POST',
  chemin: string,
  params: Record<string, unknown> = {},
  o: { idempotence?: string; compte?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'stripe-version': '2024-06-20',
  };
  if (o.idempotence) headers['idempotency-key'] = o.idempotence;
  if (o.compte) headers['stripe-account'] = o.compte;
  let url = `https://api.stripe.com/v1${chemin}`;
  let body: string | undefined;
  if (methode === 'POST') {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = encoderFormulaire(params).toString();
  } else if (Object.keys(params).length) url += `?${encoderFormulaire(params).toString()}`;
  const res = await fetch(url, { method: methode, headers, body });
  const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (!res.ok) throw new ErreurStripe(res.status, data.error?.code, data.error?.message ?? `Stripe ${res.status}`);
  return data as T;
}

/**
 * Vérifie l'en-tête Stripe-Signature : « t=<horodatage>,v1=<hmac>[,v1=…] ».
 * Signature attendue = HMAC-SHA256(secret, "<t>.<corps brut>"), en hexadécimal. Tolérance : 5 minutes.
 */
export async function verifierSignatureStripe(corps: string, entete: string | null, secret: string, toleranceS = 300, maintenant = Date.now()): Promise<boolean> {
  if (!entete || !secret) return false;
  const parts = entete.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!t || !/^\d+$/.test(t) || !signatures.length) return false;
  if (Math.abs(maintenant / 1000 - Number(t)) > toleranceS) return false;
  const attendu = await hmacHex(secret, `${t}.${corps}`);
  let ok = false;
  for (const s of signatures) ok = egalTempsConstant(attendu, s) || ok; // pas de sortie anticipée
  return ok;
}

/** Fabrique un en-tête valide (tests et outil de recette). */
export async function signerPourTest(corps: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${corps}`)}`;
}

export interface SessionCheckout {
  id: string;
  url: string;
  payment_status?: string;
  amount_total?: number;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
}

export const commissionCents = (env: EnvParcours, montant: number) => {
  const bps = Math.min(Math.max(Number(env.STRIPE_PLATFORM_FEE_BPS ?? 0) || 0, 0), 1000); // 10 % maximum par sécurité
  return Math.floor((montant * bps) / 10_000);
};
