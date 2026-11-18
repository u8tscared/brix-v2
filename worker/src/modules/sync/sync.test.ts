/** Synchronisation : version optimiste, conflit avec copie serveur, tirage léger, accès protégé. */
import { beforeEach, describe, expect, it } from 'vitest';
import { modifierEtat } from '../../lib/etat';
import { appeler, creerEnv, inscription } from '../core/tests/outils';

let env: any;
let token: string;
let org: string;
beforeEach(async () => {
  env = creerEnv();
  const r = await appeler(env, 'POST', '/api/auth/signup', { body: inscription(undefined, { donnees: { clients: [{ id: 'c1', name: 'A' }] } }) });
  token = r.data.token;
  org = r.data.organization.id;
});

describe('/api/sync', () => {
  it('exige une session', async () => {
    expect((await appeler(env, 'GET', '/api/sync')).status).toBe(401);
  });

  it('écrit avec la bonne version de base et ignore les préférences', async () => {
    const r = await appeler(env, 'PUT', '/api/sync', { token, body: { baseVersion: 1, donnees: { clients: [{ id: 'c1', name: 'B' }], prefs: { voice: false } } } });
    expect(r.status).toBe(200);
    expect(r.data.version).toBe(2);
    const g = await appeler(env, 'GET', '/api/sync', { token });
    expect(g.data).toMatchObject({ version: 2, donnees: { clients: [{ id: 'c1', name: 'B' }] } });
    expect(g.data.donnees.prefs).toBeUndefined();
  });

  it('409 avec la copie serveur quand un autre appareil (ou le MCP) a écrit entre-temps', async () => {
    await modifierEtat(env, org, 'mcp', (d) => {
      d.clients!.push({ id: 'c2', name: 'Ajouté par Claude' });
    });
    const r = await appeler(env, 'PUT', '/api/sync', { token, body: { baseVersion: 1, donnees: { clients: [{ id: 'c1', name: 'Local' }] } } });
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('conflit');
    expect(r.data.version).toBe(2);
    expect(r.data.donnees.clients.map((c: any) => c.id)).toEqual(['c1', 'c2']);
    // Après fusion, l'app réécrit sur la version serveur.
    expect((await appeler(env, 'PUT', '/api/sync', { token, body: { baseVersion: 2, donnees: { clients: [{ id: 'c1', name: 'Local' }, { id: 'c2', name: 'Ajouté par Claude' }] } } })).data.version).toBe(3);
  });

  it('tirage léger : « inchangé » quand la version connue est à jour', async () => {
    const r = await appeler(env, 'GET', '/api/sync?version=1', { token });
    expect(r.data).toMatchObject({ version: 1, inchange: true });
    expect(r.data.donnees).toBeUndefined();
    expect((await appeler(env, 'GET', '/api/sync?version=0', { token })).data.donnees.clients).toHaveLength(1);
  });
});
