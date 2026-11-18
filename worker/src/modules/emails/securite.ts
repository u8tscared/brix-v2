// Signatures du module e-mails : HMAC (liens de désinscription), Svix (webhooks Resend), secret partagé (Brevo).

const enc = new TextEncoder();

function b64(buf: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}
const b64url = (buf: ArrayBuffer) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function b64Octets(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(cle: Uint8Array | string, message: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', typeof cle === 'string' ? enc.encode(cle) : cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(message));
}

/** Comparaison à temps constant (évite de deviner un secret caractère par caractère). */
export function egaux(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Jeton du lien de désinscription des relances (adresse + référence du document). */
export async function signerDesinscription(secret: string, email: string, reference: string): Promise<string> {
  return b64url(await hmac(secret, `desinscription|${email.toLowerCase()}|${reference}`));
}

export async function verifierDesinscription(secret: string, email: string, reference: string, sig: string): Promise<boolean> {
  return egaux(await signerDesinscription(secret, email, reference), sig);
}

/**
 * Webhook Resend (format Svix) : signature HMAC-SHA256 de « id.timestamp.corps »
 * avec la clé « whsec_… » décodée en base64 ; horodatage accepté à ± 5 minutes.
 */
export async function verifierSvix(secret: string, entetes: Headers, corps: string, maintenant = Date.now()): Promise<boolean> {
  const id = entetes.get('svix-id') ?? entetes.get('webhook-id');
  const ts = entetes.get('svix-timestamp') ?? entetes.get('webhook-timestamp');
  const sigs = entetes.get('svix-signature') ?? entetes.get('webhook-signature');
  if (!id || !ts || !sigs || !secret) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(maintenant / 1000 - t) > 300) return false;
  let cle: Uint8Array;
  try {
    cle = secret.startsWith('whsec_') ? b64Octets(secret.slice(6)) : enc.encode(secret);
  } catch {
    return false;
  }
  const attendu = b64(await hmac(cle, `${id}.${ts}.${corps}`));
  return sigs.split(' ').some((s) => {
    const [version, valeur] = s.split(',');
    return version === 'v1' && egaux(valeur ?? '', attendu);
  });
}

/** Signe comme Svix (tests et outils locaux). */
export async function signerSvix(secret: string, id: string, ts: number, corps: string): Promise<string> {
  const cle = secret.startsWith('whsec_') ? b64Octets(secret.slice(6)) : enc.encode(secret);
  return `v1,${b64(await hmac(cle, `${id}.${ts}.${corps}`))}`;
}

/**
 * Webhook Brevo : Brevo ne signe pas ses appels. On exige le secret partagé, au choix :
 * en-tête « x-brix-webhook-secret » (en-tête personnalisé du webhook Brevo), « Authorization: Bearer … »,
 * ou authentification Basic (mot de passe = secret), configurables dans l'interface Brevo.
 */
export function verifierSecretBrevo(secret: string, entetes: Headers): boolean {
  if (!secret) return false;
  const direct = entetes.get('x-brix-webhook-secret');
  if (direct) return egaux(direct, secret);
  const auth = entetes.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) return egaux(auth.slice(7).trim(), secret);
  if (auth.startsWith('Basic ')) {
    try {
      const paire = atob(auth.slice(6).trim());
      const i = paire.indexOf(':');
      return i >= 0 && egaux(paire.slice(i + 1), secret);
    } catch {
      return false;
    }
  }
  return false;
}
