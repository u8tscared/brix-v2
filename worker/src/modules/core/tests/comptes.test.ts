/** Comptes : inscription (doublon), connexion (limite d'essais), session, déconnexion partout, mot de passe oublié. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appeler, creerEnv, inscription } from './outils';

let env: any;
beforeEach(() => {
  env = creerEnv();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('inscription', () => {
  it('crée l’entreprise, le gérant et renvoie une session', async () => {
    const r = await appeler(env, 'POST', '/api/auth/signup', { body: inscription() });
    expect(r.status).toBe(201);
    expect(r.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(r.data.user).toMatchObject({ email: 'karim@benali.test', firstName: 'Karim', motDePasse: true, google: false });
    expect(r.data.organization.name).toBe('Benali Électricité');
    const me = await appeler(env, 'GET', '/api/auth/me', { token: r.data.token });
    expect(me.status).toBe(200);
    expect(me.data.user.email).toBe('karim@benali.test');
  });

  it('refuse un doublon avec 409, même écrit autrement', async () => {
    await appeler(env, 'POST', '/api/auth/signup', { body: inscription() });
    const r = await appeler(env, 'POST', '/api/auth/signup', { body: inscription('  Karim@Benali.TEST ') });
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('Un compte existe déjà avec cet e-mail');
  });

  it('écrit les données initiales dans le document synchronisé', async () => {
    const donnees = { clients: [{ id: 'c1', name: 'Mme Martin' }], company: { name: 'Benali' }, prefs: { voice: true } };
    const r = await appeler(env, 'POST', '/api/auth/signup', { body: inscription(undefined, { donnees }) });
    const s = await appeler(env, 'GET', '/api/sync', { token: r.data.token });
    expect(s.data.version).toBe(1);
    expect(s.data.donnees.clients).toEqual([{ id: 'c1', name: 'Mme Martin' }]);
    expect(s.data.donnees.prefs).toBeUndefined();
  });

  it('erreur de configuration claire sans JWT_SECRET ou avec un secret trop court', async () => {
    const sans = await appeler(creerEnv({ JWT_SECRET: '' }), 'POST', '/api/auth/signup', { body: inscription() });
    expect(sans.status).toBe(500);
    expect(sans.data.error).toMatch(/JWT_SECRET manquant/);
    const court = await appeler(creerEnv({ JWT_SECRET: 'court' }), 'POST', '/api/auth/signup', { body: inscription() });
    expect(court.data.error).toMatch(/JWT_SECRET trop court/);
  });
});

describe('connexion', () => {
  beforeEach(async () => {
    await appeler(env, 'POST', '/api/auth/signup', { body: inscription() });
  });

  it('connecte avec le bon mot de passe, refuse le mauvais', async () => {
    expect((await appeler(env, 'POST', '/api/auth/login', { body: { email: 'KARIM@benali.test', password: 'motdepasse-solide' } })).status).toBe(200);
    const r = await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'faux' } });
    expect(r.status).toBe(401);
    expect(r.data.error).toBe('E-mail ou mot de passe incorrect');
  });

  it('bloque après 10 échecs en 15 minutes pour un e-mail et une IP, puis débloque', async () => {
    for (let i = 0; i < 10; i++) expect((await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: `faux${i}` } })).status).toBe(401);
    const bloque = await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'motdepasse-solide' } });
    expect(bloque.status).toBe(429);
    expect(bloque.data.error).toMatch(/Réessayez dans 15 minutes/);
    // Autre adresse IP : pas concernée.
    expect((await appeler(env, 'POST', '/api/auth/login', { ip: '198.51.100.9', body: { email: 'karim@benali.test', password: 'motdepasse-solide' } })).status).toBe(200);
    // 16 minutes plus tard : débloqué.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect((await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'motdepasse-solide' } })).status).toBe(200);
  });

  it('« déconnecter tous les appareils » révoque les jetons déjà émis', async () => {
    const a = await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'motdepasse-solide' } });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 5000);
    expect((await appeler(env, 'POST', '/api/auth/logout', { token: a.data.token, body: { partout: true } })).status).toBe(200);
    expect((await appeler(env, 'GET', '/api/auth/me', { token: a.data.token })).status).toBe(401);
    vi.setSystemTime(Date.now() + 2000);
    const b = await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'motdepasse-solide' } });
    expect((await appeler(env, 'GET', '/api/auth/me', { token: b.data.token })).status).toBe(200);
  });
});

describe('mot de passe oublié', () => {
  it('répond toujours 200, envoie un lien à usage unique valable 1 h', async () => {
    const ins = await appeler(env, 'POST', '/api/auth/signup', { body: inscription() });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
    expect((await appeler(env, 'POST', '/api/auth/mot-de-passe/oubli', { body: { email: 'inconnu@nulle.part' } })).status).toBe(200);
    expect(logs.some((l) => l.includes('lien simulé'))).toBe(false);
    expect((await appeler(env, 'POST', '/api/auth/mot-de-passe/oubli', { body: { email: 'karim@benali.test' } })).status).toBe(200);
    const lien = logs.find((l) => l.includes('lien simulé'))!.split(' ').pop()!;
    expect(lien).toMatch(/^https:\/\/app\.test\/#\/mot-de-passe\?jeton=/);
    const jeton = new URL(lien.replace('#/', '')).searchParams.get('jeton')!;

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 3000);
    const n = await appeler(env, 'POST', '/api/auth/mot-de-passe/nouveau', { body: { jeton, motDePasse: 'nouveau-mot-de-passe' } });
    expect(n.status).toBe(200);
    expect(n.data.token).toBeTruthy();
    // Usage unique, anciens appareils déconnectés, nouveau mot de passe actif.
    expect((await appeler(env, 'POST', '/api/auth/mot-de-passe/nouveau', { body: { jeton, motDePasse: 'encore-un-autre' } })).status).toBe(400);
    expect((await appeler(env, 'GET', '/api/auth/me', { token: ins.data.token })).status).toBe(401);
    expect((await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'motdepasse-solide' } })).status).toBe(401);
    expect((await appeler(env, 'POST', '/api/auth/login', { body: { email: 'karim@benali.test', password: 'nouveau-mot-de-passe' } })).status).toBe(200);
  });

  it('refuse un lien expiré', async () => {
    await appeler(env, 'POST', '/api/auth/signup', { body: inscription() });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
    await appeler(env, 'POST', '/api/auth/mot-de-passe/oubli', { body: { email: 'karim@benali.test' } });
    const jeton = logs.find((l) => l.includes('lien simulé'))!.split('jeton=').pop()!;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 61 * 60 * 1000);
    const r = await appeler(env, 'POST', '/api/auth/mot-de-passe/nouveau', { body: { jeton, motDePasse: 'nouveau-mot-de-passe' } });
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/expiré/);
  });
});
