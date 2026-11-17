/**
 * Notifications : chiffrement Web Push (aller-retour RFC 8291), VAPID, préférences, heures calmes, cron.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { b64url, deB64url, hmacBrut } from '../../documents/commun';
import { appeler, creerEnv, semer } from '../../documents/tests/outils';
import { enHeuresCalmes, envoyerPushDifferes, notifier } from '../notifier';
import { chiffrerAes128gcm, jetonVapid } from '../push-web';

const concat = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of p) (o.set(x, i), (i += x.length));
  return o;
};
const utf8 = (s: string) => new TextEncoder().encode(s);
const hkdf = async (sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) => (await hmacBrut(await hmacBrut(sel, ikm), concat(info, new Uint8Array([1])))).slice(0, n);

/** Côté navigateur : génère un abonnement et sait déchiffrer (implémentation indépendante de l'envoi). */
async function navigateur() {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pub = new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    abo: { p256dh: b64url(pub), auth: b64url(auth) },
    async dechiffrer(corps: Uint8Array) {
      const sel = corps.slice(0, 16);
      const idlen = corps[20];
      const asPub = corps.slice(21, 21 + idlen);
      const chiffre = corps.slice(21 + idlen);
      const cle = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cle } as never, kp.privateKey, 256));
      const ikm = await hkdf(auth, ecdh, concat(utf8('WebPush: info\0'), pub, asPub), 32);
      const cek = await hkdf(sel, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
      const nonce = await hkdf(sel, ikm, utf8('Content-Encoding: nonce\0'), 12);
      const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
      const clair = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, k, chiffre));
      expect(clair.at(-1)).toBe(2);
      return new TextDecoder().decode(clair.slice(0, -1));
    },
  };
}

async function clesVapid() {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey('jwk', kp.privateKey)) as JsonWebKey;
  const pub = new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer);
  return { VAPID_PUBLIC_KEY: b64url(pub), VAPID_PRIVATE_KEY: jwk.d!, VAPID_SUBJECT: 'mailto:test@brix.test', publicKey: kp.publicKey };
}

let env: any;
let token: string;
beforeEach(async () => {
  env = creerEnv();
  ({ token } = await semer(env));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Web Push', () => {
  it('chiffre en aes128gcm de façon déchiffrable par le navigateur', async () => {
    const nav = await navigateur();
    const corps = await chiffrerAes128gcm(utf8('{"titre":"Payé !"}'), nav.abo);
    expect(corps.length).toBe(16 + 4 + 1 + 65 + utf8('{"titre":"Payé !"}').length + 1 + 16);
    expect(await nav.dechiffrer(corps)).toBe('{"titre":"Payé !"}');
  });

  it('signe un JWT VAPID vérifiable avec la clé publique', async () => {
    const k = await clesVapid();
    const jwt = await jetonVapid({ ...env, ...k }, 'https://fcm.googleapis.com/fcm/send/abc');
    const [h, b, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(deB64url(b)))).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'mailto:test@brix.test' });
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k.publicKey, deB64url(s), utf8(`${h}.${b}`))).toBe(true);
  });

  it('abonnement, envoi, préférences, heures calmes et reprise par le cron', async () => {
    const k = await clesVapid();
    Object.assign(env, k);
    const nav = await navigateur();
    const r = await appeler(env, 'POST', '/api/notifications/push/abonnement', { token, body: { plateforme: 'web', endpoint: 'https://push.exemple.test/abc', keys: nav.abo } });
    expect(r.status).toBe(201);
    expect((await appeler(env, 'GET', '/api/notifications/push/cle', { token })).data.vapidPublicKey).toBe(k.VAPID_PUBLIC_KEY);

    const recus: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      expect(String((init.headers as Record<string, string>).authorization)).toMatch(/^vapid t=.+, k=/);
      recus.push(await nav.dechiffrer(new Uint8Array(init.body as Uint8Array)));
      return new Response(null, { status: 201 });
    });
    const n1 = await notifier(env, { entrepriseId: 'org_a', type: 'paiement_recu', titre: 'Payé', texte: '100 €', vers: 'factures/fa1', montant: 100 });
    expect(n1.push.envoye).toBe(1);
    expect(JSON.parse(recus[0])).toMatchObject({ titre: 'Payé', vers: 'factures/fa1', type: 'paiement_recu' });

    // Push désactivé pour ce type : la notification reste dans le fil
    await appeler(env, 'PUT', '/api/notifications/preferences', { token, body: { preferences: { devis_ouvert: { push: false } } } });
    expect((await notifier(env, { entrepriseId: 'org_a', type: 'devis_ouvert', titre: 'Ouvert', texte: 'x' })).push.envoye).toBe(0);
    // Masqué du fil : n'apparaît plus dans la liste
    await appeler(env, 'PUT', '/api/notifications/preferences', { token, body: { preferences: { devis_ouvert: { app: false } } } });
    const liste = await appeler(env, 'GET', '/api/notifications', { token });
    expect(liste.data.notifications.map((x: any) => x.type)).toEqual(['paiement_recu']);

    // Heures calmes toute la journée sauf la minute courante → envoi différé puis repris
    const prefs = await appeler(env, 'PUT', '/api/notifications/preferences', { token, body: { heuresCalmes: { debut: '00:00', fin: '23:59' } } });
    expect(prefs.data.heuresCalmes).toMatchObject({ debut: '00:00', fin: '23:59' });
    vi.useFakeTimers({ now: new Date('2026-11-17T12:00:00+01:00').getTime(), toFake: ['Date'] });
    const n2 = await notifier(env, { entrepriseId: 'org_a', type: 'devis_signe', titre: 'Signé', texte: 'y' });
    expect(n2.push).toMatchObject({ differe: 1, envoye: 0 });
    expect(await envoyerPushDifferes(env)).toBe(0); // toujours en heures calmes
    vi.setSystemTime(new Date('2026-11-17T23:59:30+01:00'));
    expect(await envoyerPushDifferes(env)).toBe(1);
    expect(JSON.parse(recus.at(-1)!).titre).toBe('Signé');

    // Abonnement expiré (410) : supprimé
    vi.stubGlobal('fetch', async () => new Response(null, { status: 410 }));
    await appeler(env, 'PUT', '/api/notifications/preferences', { token, body: { heuresCalmes: null } });
    expect((await notifier(env, { entrepriseId: 'org_a', type: 'devis_signe', titre: 'Signé', texte: 'z' })).push.expire).toBe(1);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM notifications_abonnements').first()).n).toBe(0);
  });

  it('valide les entrées', async () => {
    expect((await appeler(env, 'POST', '/api/notifications/push/abonnement', { token, body: { plateforme: 'web', endpoint: 'http://x.test/a', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } } })).status).toBe(400);
    expect((await appeler(env, 'PUT', '/api/notifications/preferences', { token, body: { heuresCalmes: { debut: '25:00', fin: '07:00' } } })).status).toBe(400);
    expect((await appeler(env, 'POST', '/api/notifications/lu', { token, body: { ids: ['pas-un-id'] } })).status).toBe(400);
  });
});

describe('heures calmes', () => {
  it('gère les plages qui passent minuit', () => {
    const a = (iso: string) => new Date(iso).getTime();
    expect(enHeuresCalmes(a('2026-11-17T22:30:00+01:00'), '21:00', '07:00')).toBe(true);
    expect(enHeuresCalmes(a('2026-11-17T06:59:00+01:00'), '21:00', '07:00')).toBe(true);
    expect(enHeuresCalmes(a('2026-11-17T07:00:00+01:00'), '21:00', '07:00')).toBe(false);
    expect(enHeuresCalmes(a('2026-11-17T13:00:00+01:00'), '12:00', '14:00')).toBe(true);
    expect(enHeuresCalmes(a('2026-11-17T13:00:00+01:00'), null, null)).toBe(false);
  });
});
