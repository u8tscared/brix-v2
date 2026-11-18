/**
 * Cas d'erreur et de sécurité : jetons, codes, webhooks, hors établissement, limitation de débit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hmacHex } from '../commun';
import { signerPourTest, verifierSignatureStripe } from '../../paiements/stripe';
import { PNG, appeler, creerEnv, jetonArtisan, semer } from './outils';

const emails: { modele: string; donnees: any }[] = [];
vi.mock('../../emails/envoi', () => ({
  envoyerEmail: async (_env: unknown, e: { modele: string; donnees: unknown }) => (emails.push(e as never), { id: 'sim', simule: true }),
}));

let env: any;
let token: string;
const code = () => [...emails].reverse().find((e) => e.modele === 'code_signature')!.donnees.code as string;
const corps = (c: string, extra: Record<string, unknown> = {}) => ({ code: c, nom: 'Claire Lefèvre', mentions: { bonPourAccord: true }, signatureImage: PNG, ...extra });

beforeEach(async () => {
  emails.length = 0;
  env = creerEnv();
  ({ token } = await semer(env));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function lien(type = 'devis', documentId = 'dv1', extra: Record<string, unknown> = {}) {
  const r = await appeler(env, 'POST', '/api/documents/liens', { token, body: { type, documentId, ...extra } });
  return r.data as { id: string; jeton: string };
}

describe('jetons publics', () => {
  it('rejette un jeton falsifié, tronqué, d’un autre type, révoqué ou expiré', async () => {
    const { id, jeton } = await lien();
    const modifie = (i: number) => `${jeton.slice(0, i)}${jeton[i] === 'A' ? 'B' : 'A'}${jeton.slice(i + 1)}`;
    expect((await appeler(env, 'GET', `/api/p/devis/${modifie(5)}`)).data.error).toBe('lien_invalide'); // id modifié
    expect((await appeler(env, 'GET', `/api/p/devis/${modifie(30)}`)).data.error).toBe('lien_invalide'); // signature modifiée
    expect((await appeler(env, 'GET', `/api/p/devis/${jeton.slice(0, 30)}`)).data.error).toBe('lien_invalide');
    expect((await appeler(env, 'GET', `/api/p/facture/${jeton}`)).status).toBe(404); // signé pour « devis » seulement
    // Même id, autre secret : refusé
    const autre = { ...env, PUBLIC_LINK_SECRET: 'autre-secret' };
    expect((await appeler(autre, 'GET', `/api/p/devis/${jeton}`)).status).toBe(404);

    expect((await appeler(env, 'POST', `/api/documents/liens/${id}/revoquer`, { token })).data.ok).toBe(true);
    expect((await appeler(env, 'GET', `/api/p/devis/${jeton}`))).toMatchObject({ status: 410, data: { error: 'lien_revoque' } });

    const court = await lien('devis', 'dv1', { expireJours: 1 });
    vi.useFakeTimers({ now: Date.now() + 2 * 86_400_000, toFake: ['Date'] });
    expect((await appeler(env, 'GET', `/api/p/devis/${court.jeton}`))).toMatchObject({ status: 410, data: { error: 'lien_expire' } });
  });

  it('cloisonne les entreprises et protège les routes artisan', async () => {
    const autre = await jetonArtisan('org_b', 'usr_b');
    expect((await appeler(env, 'POST', '/api/documents/liens', { token: autre, body: { type: 'devis', documentId: 'dv1' } })).status).toBe(404);
    expect((await appeler(env, 'POST', '/api/documents/liens', { body: { type: 'devis', documentId: 'dv1' } })).status).toBe(401);
    expect((await appeler(env, 'POST', '/api/documents/liens', { token, body: { type: 'secret', documentId: 'dv1' } })).data.error).toBe('type_invalide');
    expect((await appeler(env, 'GET', '/api/notifications')).status).toBe(401);
  });

  it('limite le débit des ouvertures par IP', async () => {
    const { jeton } = await lien();
    let dernier = 0;
    for (let i = 0; i < 121; i++) dernier = (await appeler(env, 'GET', `/api/p/devis/${jeton}`)).status;
    expect(dernier).toBe(429);
    expect((await appeler(env, 'GET', `/api/p/devis/${jeton}`, { headers: { 'cf-connecting-ip': '198.51.100.7' } })).status).toBe(200);
  });
});

describe('codes de signature', () => {
  it('bloque après 5 essais et refuse un code expiré', async () => {
    const { jeton } = await lien();
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const bon = code();
    const faux = bon === '123456' ? '654321' : '123456';
    const restants = [];
    for (let i = 0; i < 5; i++) restants.push((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(faux) })).data.essaisRestants);
    expect(restants).toEqual([4, 3, 2, 1, 0]);
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(bon) })).data.error).toBe('code_bloque');

    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const nouveau = code();
    vi.useFakeTimers({ now: Date.now() + 11 * 60_000, toFake: ['Date'] });
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(nouveau) })).data.error).toBe('code_expire');
  });

  it('un nouveau code annule le précédent ; 3 envois maximum par quart d’heure', async () => {
    const { jeton } = await lien();
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const ancien = code();
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const nouveau = code();
    if (ancien !== nouveau) expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(ancien) })).data.error).toBe('code_incorrect');
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} })).status).toBe(429);
  });

  it('valide l’image et le corps de la signature', async () => {
    const { jeton } = await lien();
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(code(), { signatureImage: 'data:image/svg+xml;base64,PHN2Zz4=' }) })).data.error).toBe('signature_invalide');
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps('12ab56') })).data.error).toBe('code_invalide');
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(code(), { nom: 'X' }) })).data.error).toBe('champ_invalide');
  });

  it('renvoie le code en démo seulement si PARCOURS_DEMO=1', async () => {
    env.PARCOURS_DEMO = '1';
    const { jeton } = await lien();
    const r = await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    expect(r.data.codeDemo).toBe(code());
  });
});

describe('contrat hors établissement (particulier)', () => {
  it('trace la rétractation de 14 jours, le démarrage anticipé et bloque l’acompte 7 jours', async () => {
    env = creerEnv();
    ({ token } = await semer(env, { horsEtablissement: true }));
    const { jeton } = await lien();
    const v = await appeler(env, 'GET', `/api/p/devis/${jeton}`);
    expect(v.data.retractation.applicable).toBe(true);
    expect(v.data.mentions.demarrageAnticipe).toContain('L221-25');
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const s = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(code(), { mentions: { bonPourAccord: true, demarrageAnticipe: true } }) });
    expect(s.status).toBe(200);
    expect(s.data.retractation.fin - s.data.signeLe).toBe(14 * 86_400_000);
    expect(s.data.retractation.demarrageAnticipe).toBe(true);
    expect((await env.DB.prepare('SELECT demarrage_anticipe, hors_etablissement FROM signature_preuves').first())).toMatchObject({ demarrage_anticipe: 1, hors_etablissement: 1 });

    const a = await appeler(env, 'POST', `/api/p/devis/${jeton}/acompte`, { body: { moyen: 'carte' } });
    expect(a).toMatchObject({ status: 409, data: { error: 'acompte_trop_tot' } });
    vi.useFakeTimers({ now: Date.now() + 8 * 86_400_000, toFake: ['Date'] });
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/acompte`, { body: { moyen: 'carte' } })).data.mode).toBe('redirection');
  });

  it('contrat à distance : rétractation de 14 jours mais acompte possible tout de suite', async () => {
    await appeler(env, 'PUT', '/api/documents/complements/devis/dv1', { token, body: { modeConclusion: 'distance' } });
    const { jeton } = await lien();
    const v = await appeler(env, 'GET', `/api/p/devis/${jeton}`);
    expect(v.data.retractation).toMatchObject({ applicable: true, mode: 'distance', paiementBloqueJours: 0 });
    expect(v.data.mentions.retractation).toContain('à distance');
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    const s = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(code()) });
    expect(s.data.retractation.demarrageAnticipe).toBe(false);
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/acompte`, { body: { moyen: 'carte' } })).data.mode).toBe('redirection');
  });

  it('client professionnel : pas de rétractation', async () => {
    env = creerEnv();
    ({ token } = await semer(env, { pro: true, horsEtablissement: true }));
    const { jeton } = await lien();
    expect((await appeler(env, 'GET', `/api/p/devis/${jeton}`)).data.retractation.applicable).toBe(false);
  });

  it('refuse de modifier un devis signé', async () => {
    const { jeton } = await lien();
    await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: corps(code()) });
    expect((await appeler(env, 'PUT', '/api/documents/complements/devis/dv1', { token, body: { titre: 'Autre' } })).data.error).toBe('deja_signe');
  });
});

describe('webhooks', () => {
  it('Stripe : rejette une signature invalide, périmée ou absente', async () => {
    env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const evt = JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed', data: { object: {} } });
    expect((await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt })).data.error).toBe('signature_invalide');
    expect((await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt, headers: { 'stripe-signature': await signerPourTest(evt, 'mauvais') } })).status).toBe(400);
    const vieux = await signerPourTest(evt, 'whsec_test', Math.floor(Date.now() / 1000) - 600);
    expect((await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt, headers: { 'stripe-signature': vieux } })).status).toBe(400);
    expect((await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt + ' ', headers: { 'stripe-signature': await signerPourTest(evt, 'whsec_test') } })).status).toBe(400);
    expect(await verifierSignatureStripe(evt, `${await signerPourTest(evt, 'autre')},v1=${(await signerPourTest(evt, 'whsec_test')).split('v1=')[1]}`, 'whsec_test')).toBe(true);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM paiements_webhooks').first()).n).toBe(0);
  });

  it('Yousign : vérifie le HMAC du webhook', async () => {
    env.YOUSIGN_WEBHOOK_SECRET = 'ys_secret';
    const evt = JSON.stringify({ event_name: 'signature_request.done', data: { signature_request: { id: 'sr_inconnu' } } });
    expect((await appeler(env, 'POST', '/api/signature/webhook/yousign', { brut: evt, headers: { 'x-yousign-signature-256': 'sha256=00' } })).status).toBe(400);
    const ok = await appeler(env, 'POST', '/api/signature/webhook/yousign', { brut: evt, headers: { 'x-yousign-signature-256': `sha256=${await hmacHex('ys_secret', evt)}` } });
    expect(ok).toMatchObject({ status: 200, data: { doublon: true } });
  });
});

describe('convention des routes', () => {
  it('chaque module renvoie null pour une route qui ne le concerne pas', async () => {
    const { handleDocumentsRoutes } = await import('../routes');
    const { handleSignatureRoutes } = await import('../../signature/routes');
    const { handlePaiementsRoutes } = await import('../../paiements/routes');
    const { handleNotificationsRoutes } = await import('../../notifications/routes');
    for (const chemin of ['/api/public/v1/produits', '/api/fournisseurs/annuaire', '/api/health', '/api/p/inconnu/x']) {
      const req = new Request(`https://app.test${chemin}`);
      for (const h of [handleDocumentsRoutes, handleSignatureRoutes, handlePaiementsRoutes, handleNotificationsRoutes]) expect(await h(req, env, chemin)).toBeNull();
    }
  });
});
