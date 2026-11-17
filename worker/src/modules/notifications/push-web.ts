/**
 * Web Push (navigateurs, PWA) : chiffrement du message en aes128gcm (RFC 8291) et
 * authentification VAPID (RFC 8292), uniquement avec WebCrypto (aucune dépendance).
 *
 * Clés : VAPID_PUBLIC_KEY (point P-256 non compressé, 65 octets, base64url) et VAPID_PRIVATE_KEY
 * (scalaire d, 32 octets, base64url). Génération : `npx web-push generate-vapid-keys` (voir docs/parcours).
 */
import { b64url, deB64url, hmacBrut } from '../documents/commun';
import type { EnvParcours } from '../documents/env';

export interface AbonnementWeb {
  endpoint: string;
  p256dh: string; // clé publique du navigateur (base64url, 65 octets)
  auth: string; // secret d'authentification (base64url, 16 octets)
}

export type ResultatPush = 'envoye' | 'expire' | 'echec' | 'simule';

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) (out.set(p, i), (i += p.length));
  return out;
};
const utf8 = (s: string) => new TextEncoder().encode(s);

/** HKDF (RFC 5869) en une étape d'expansion : suffisant pour des sorties ≤ 32 octets. */
async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, longueur: number) {
  const prk = await hmacBrut(sel, ikm);
  return (await hmacBrut(prk, concat(info, new Uint8Array([1])))).slice(0, longueur);
}

/** Chiffre `contenu` pour un abonnement (RFC 8291, un seul enregistrement). Exporté pour les tests. */
export async function chiffrerAes128gcm(contenu: Uint8Array, abo: { p256dh: string; auth: string }, selFixe?: Uint8Array) {
  const uaPublic = deB64url(abo.p256dh);
  const authSecret = deB64url(abo.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Abonnement Web Push invalide');
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer);
  const cleNavigateur = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cleNavigateur } as Parameters<SubtleCrypto['deriveBits']>[0], local.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdh, concat(utf8('WebPush: info\0'), uaPublic, asPublic), 32);
  const sel = selFixe ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sel, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const cle = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const clair = concat(contenu, new Uint8Array([2])); // délimiteur du dernier enregistrement, sans bourrage
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cle, clair));
  const rs = 4096;
  const entete = concat(sel, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, 65]), asPublic);
  return concat(entete, chiffre);
}

/** JWT VAPID signé ES256 (la signature WebCrypto r‖s de 64 octets est directement au format JWS). */
export async function jetonVapid(env: EnvParcours, endpoint: string): Promise<string> {
  const pub = deB64url(env.VAPID_PUBLIC_KEY!);
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY!, x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), ext: true };
  const cle = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const entete = b64url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corps = b64url(
    utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT ?? 'mailto:contact@brix-app.fr' })),
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, utf8(`${entete}.${corps}`));
  return `${entete}.${corps}.${b64url(sig)}`;
}

export const webPushConfigure = (env: EnvParcours) => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/** Envoie un message. 404/410 : l'abonnement n'existe plus (à supprimer). */
export async function envoyerWebPush(env: EnvParcours, abo: AbonnementWeb, message: Record<string, unknown>): Promise<ResultatPush> {
  if (!webPushConfigure(env)) return 'simule';
  if (!/^https:\/\//.test(abo.endpoint)) return 'echec';
  try {
    const corps = await chiffrerAes128gcm(utf8(JSON.stringify(message)), abo);
    const res = await fetch(abo.endpoint, {
      method: 'POST',
      headers: {
        authorization: `vapid t=${await jetonVapid(env, abo.endpoint)}, k=${env.VAPID_PUBLIC_KEY}`,
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        ttl: '86400',
        urgency: 'normal',
      },
      body: corps,
    });
    if (res.status === 404 || res.status === 410) return 'expire';
    return res.ok ? 'envoye' : 'echec';
  } catch (e) {
    console.error('[notifications] web push', e);
    return 'echec';
  }
}
