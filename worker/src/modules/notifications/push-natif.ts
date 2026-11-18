/**
 * Notifications de l'app mobile Capacitor : APNs (iPhone) et FCM (Android, ou iPhone via Firebase).
 * Interface CanalPush commune : sans clé, l'envoi est « simulé » (rien ne part, rien ne casse).
 *
 * À vérifier au premier essai réel (non testable sans comptes) :
 * - APNs exige HTTP/2 : le fetch des Workers négocie HTTP/2 avec les serveurs qui le proposent,
 *   mais si Apple refuse, passer par FCM pour iOS aussi (plugin @capacitor-firebase/messaging).
 */
import { b64url } from '../documents/commun';
import type { EnvParcours } from '../documents/env';
import type { ResultatPush } from './push-web';

export interface MessagePush {
  titre: string;
  texte: string;
  vers?: string | null;
  type: string;
  id: string;
}

export interface CanalPush {
  plateforme: 'apns' | 'fcm';
  configure(env: EnvParcours): boolean;
  envoyer(env: EnvParcours, jetonAppareil: string, m: MessagePush): Promise<ResultatPush>;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** Clé PEM PKCS#8 (« -----BEGIN PRIVATE KEY----- ») → octets DER. Accepte les \n échappés. */
function pemVersDer(pem: string): Uint8Array {
  const b64 = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function jwt(entete: Record<string, unknown>, corps: Record<string, unknown>, cle: CryptoKey, algo: Parameters<SubtleCrypto['sign']>[0]) {
  const t = `${b64url(utf8(JSON.stringify(entete)))}.${b64url(utf8(JSON.stringify(corps)))}`;
  return `${t}.${b64url(await crypto.subtle.sign(algo, cle, utf8(t)))}`;
}

// ---------- APNs (jeton ES256, clé .p8) ----------

let jetonApns: { valeur: string; expire: number } | null = null;

export const apns: CanalPush = {
  plateforme: 'apns',
  configure: (env) => !!(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_PRIVATE_KEY && env.APNS_BUNDLE_ID),
  async envoyer(env, jeton, m) {
    if (!this.configure(env)) return 'simule';
    if (!/^[0-9a-fA-F]{32,200}$/.test(jeton)) return 'echec';
    try {
      if (!jetonApns || jetonApns.expire < Date.now()) {
        const cle = await crypto.subtle.importKey('pkcs8', pemVersDer(env.APNS_PRIVATE_KEY!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
        const valeur = await jwt({ alg: 'ES256', kid: env.APNS_KEY_ID }, { iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, cle, { name: 'ECDSA', hash: 'SHA-256' });
        jetonApns = { valeur, expire: Date.now() + 40 * 60_000 }; // Apple : renouveler entre 20 et 60 min
      }
      const hote = env.APNS_SANDBOX === '1' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
      const res = await fetch(`https://${hote}/3/device/${jeton}`, {
        method: 'POST',
        headers: { authorization: `bearer ${jetonApns.valeur}`, 'apns-topic': env.APNS_BUNDLE_ID!, 'apns-push-type': 'alert', 'apns-priority': '10' },
        body: JSON.stringify({ aps: { alert: { title: m.titre, body: m.texte }, sound: 'default' }, vers: m.vers, type: m.type, id: m.id }),
      });
      if (res.status === 410 || res.status === 400) return 'expire'; // 410 Unregistered, 400 BadDeviceToken
      return res.ok ? 'envoye' : 'echec';
    } catch (e) {
      console.error('[notifications] apns', e);
      return 'echec';
    }
  },
};

// ---------- FCM HTTP v1 (compte de service Google, jeton OAuth RS256) ----------

let jetonFcm: { valeur: string; expire: number } | null = null;

async function accesFcm(compte: { client_email: string; private_key: string }) {
  if (jetonFcm && jetonFcm.expire > Date.now()) return jetonFcm.valeur;
  const cle = await crypto.subtle.importKey('pkcs8', pemVersDer(compte.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const maintenant = Math.floor(Date.now() / 1000);
  const assertion = await jwt(
    { alg: 'RS256', typ: 'JWT' },
    { iss: compte.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: maintenant, exp: maintenant + 3600 },
    cle,
    'RSASSA-PKCS1-v1_5',
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`OAuth Google ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  jetonFcm = { valeur: j.access_token, expire: Date.now() + (j.expires_in - 300) * 1000 };
  return j.access_token;
}

export const fcm: CanalPush = {
  plateforme: 'fcm',
  configure: (env) => !!env.FCM_SERVICE_ACCOUNT_JSON,
  async envoyer(env, jeton, m) {
    if (!this.configure(env)) return 'simule';
    if (!/^[A-Za-z0-9_:-]{20,4096}$/.test(jeton)) return 'echec';
    try {
      const compte = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON!) as { project_id: string; client_email: string; private_key: string };
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(compte.project_id)}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await accesFcm(compte)}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: { token: jeton, notification: { title: m.titre, body: m.texte }, data: { vers: m.vers ?? '', type: m.type, id: m.id } } }),
      });
      if (res.status === 404) return 'expire'; // UNREGISTERED
      return res.ok ? 'envoye' : 'echec';
    } catch (e) {
      console.error('[notifications] fcm', e);
      return 'echec';
    }
  },
};

export const CANAUX_NATIFS: Record<'apns' | 'fcm', CanalPush> = { apns, fcm };
