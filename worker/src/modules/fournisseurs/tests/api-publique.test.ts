/** API publique fournisseurs : inscription, liaison par code, demande → réponse → commande, webhooks signés. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerD1 } from './d1-memoire';

vi.mock('../../../lib/auth', () => ({
  requireAuth: async (req: Request) => {
    const org = req.headers.get('x-test-org');
    if (!org) throw new Response('{"error":"unauthorized"}', { status: 401 });
    return { userId: 'u1', organizationId: org, role: 'patron' };
  },
}));

const { handleFournisseursRoutes } = await import('../routes');
const { handleApiPubliqueRoutes } = await import('../../api-publique/routes');
const { signer } = await import('../../api-publique/webhooks');

let env: any;
const recus: { url: string; headers: Headers; body: string }[] = [];

async function artisan(method: string, path: string, body?: unknown, org = 'org_a') {
  const req = new Request(`https://app.test${path}`, { method, headers: { 'x-test-org': org, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = (await handleFournisseursRoutes(req, env, new URL(req.url).pathname))!;
  return { status: res.status, data: (await res.json()) as any };
}
async function api(method: string, path: string, cle: string | null, body?: unknown, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...extra };
  if (cle) headers.authorization = `Bearer ${cle}`;
  const req = new Request(`https://app.test/api/public/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = (await handleApiPubliqueRoutes(req, env, new URL(req.url).pathname))!;
  return { status: res.status, data: (await res.json()) as any, headers: res.headers };
}

beforeEach(() => {
  env = { DB: creerD1(), JWT_SECRET: 't', APP_ORIGIN: 'https://app.test' };
  recus.length = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    recus.push({ url, headers: new Headers(init.headers), body: String(init.body) });
    return new Response('ok', { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('API Brix Fournisseurs', () => {
  it('parcours partenaire complet', async () => {
    expect((await api('GET', '/openapi.json', null)).data.openapi).toBe('3.1.0');
    expect((await api('GET', '/demandes', null)).status).toBe(401);
    expect((await api('GET', '/demandes', 'brx_live_' + 'a'.repeat(40))).status).toBe(401);

    const ins = await api('POST', '/partenaires', null, { nom: 'Négoce Rhône Matériaux', email_technique: 'it@negoce.test' });
    expect(ins.status).toBe(201);
    const cle = ins.data.cle.cle as string;
    const code = ins.data.partenaire.code as string;
    expect(code).toMatch(/^BRX-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const wh = await api('POST', '/webhooks', cle, { url: 'https://erp.negoce.test/brix' });
    expect(wh.status).toBe(201);
    expect((await api('POST', '/webhooks', cle, { url: 'http://127.0.0.1/x' })).status).toBe(400);

    // L'artisan relie sa fiche avec le code
    const f = (await artisan('POST', '/api/fournisseurs/annuaire', { nom: 'Rhône Matériaux', numero_compte_client: 'C-889' })).data;
    expect((await artisan('POST', `/api/fournisseurs/annuaire/${f.id}/relier`, { code: 'BRX-XXXX-XXXX' })).status).toBe(404);
    const lien = await artisan('POST', `/api/fournisseurs/annuaire/${f.id}/relier`, { code: code.toLowerCase() });
    expect(lien.data.ok).toBe(true);
    expect(recus.at(-1)!.body).toContain('liaison.creee');

    const clients = await api('GET', '/clients', cle);
    expect(clients.data.data).toHaveLength(1);
    expect(clients.data.data[0].numero_compte_client).toBe('C-889');

    // Demande envoyée sans e-mail : passe par l'API (webhook)
    const dp = await artisan('POST', '/api/fournisseurs/demandes', { fournisseur_ids: [f.id], lignes: [{ designation: 'Parpaing 20x20x50', quantite: 200 }, { designation: 'Ciment 35 kg', quantite: 10, unite: 'sac' }], envoyer: true });
    expect(dp.data.envoi.envoyes).toBe(1);
    const evt = recus.find((r) => r.body.includes('demande.creee'))!;
    const sig = evt.headers.get('brix-signature')!;
    const t = Number(sig.match(/t=(\d+)/)![1]);
    expect(sig).toBe(await signer(wh.data.secret, evt.body, t));

    const liste = await api('GET', '/demandes', cle);
    expect(liste.data.data).toHaveLength(1);
    const det = await api('GET', `/demandes/${liste.data.data[0].id}`, cle);
    expect(det.data.lignes).toHaveLength(2);
    const rep = await api('POST', `/demandes/${det.data.id}/reponse`, cle, {
      lignes: det.data.lignes.map((l: any, i: number) => ({ ligne_id: l.ligne_id, prix_unitaire_cents: i === 0 ? 125 : 890 })),
      delai_livraison_jours: 2,
    }, { 'idempotency-key': 'rep-1' });
    expect(rep.status).toBe(200);
    const replay = await api('POST', `/demandes/${det.data.id}/reponse`, cle, {}, { 'idempotency-key': 'rep-1' });
    expect(replay.headers.get('idempotent-replay')).toBe('true');

    // Un autre partenaire ne voit rien
    const autre = (await api('POST', '/partenaires', null, { nom: 'Concurrent', email_technique: 'x@y.test' })).data.cle.cle;
    expect((await api('GET', `/demandes/${det.data.id}`, autre)).status).toBe(404);
    expect((await api('GET', '/demandes', autre)).data.data).toHaveLength(0);

    // Commande → le partenaire confirme et expédie par API
    const cmds = await artisan('POST', `/api/fournisseurs/demandes/${dp.data.demande.id}/commander`, {});
    expect(cmds.data[0].total_ht_cents).toBe(200 * 125 + 10 * 890);
    const envoi = await artisan('POST', `/api/fournisseurs/commandes/${cmds.data[0].id}/envoyer`);
    expect(envoi.data.canal).toBe('api');
    const c = (await api('GET', '/commandes', cle)).data.data[0];
    expect((await api('POST', `/commandes/${c.id}/statut`, cle, { statut: 'annulee' })).status).toBe(409);
    expect((await api('POST', `/commandes/${c.id}/statut`, cle, { statut: 'confirmee', reference_fournisseur: 'AR-77' })).data.statut).toBe('confirmee');
    const cd = (await api('GET', `/commandes/${c.id}`, cle)).data;
    expect(cd.token_hash).toBeUndefined();
    expect(cd.organization_id).toBeUndefined();
    const liv = await api('POST', `/commandes/${c.id}/livraison`, cle, { lignes: cd.lignes.map((l: any) => ({ ligne_id: l.ligne_id, quantite_livree: l.quantite })) });
    expect(liv.data.statut).toBe('livree');

    // Tarif poussé par API → visible dans le catalogue de l'artisan
    const tarif = await api('PUT', `/clients/${clients.data.data[0].client_id}/tarif`, cle, { articles: [{ reference: 'PARP20', designation: 'Parpaing creux 20x20x50', prix_net_cents: 119, ean: '3000000000001' }, { reference: '', designation: 'x', prix_net_cents: 1 }] });
    expect(tarif.data.crees).toBe(1);
    expect(tarif.data.rejets).toHaveLength(1);
    expect((await artisan('GET', '/api/fournisseurs/catalogue?q=parpaing')).data.length).toBeGreaterThan(0);

    // Révocation
    const k2 = (await api('POST', '/cles', cle, { nom: 'ERP', scopes: ['demandes:read'] })).data;
    expect((await api('GET', '/commandes', k2.cle)).status).toBe(403);
    await api('DELETE', `/cles/${k2.id}`, cle);
    expect((await api('GET', '/demandes', k2.cle)).status).toBe(401);
  });
});
