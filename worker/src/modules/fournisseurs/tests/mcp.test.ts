/** Serveur MCP Brix AI : jetons, protocole JSON-RPC, chaque outil sur des données de démo. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerD1 } from './d1-memoire';

vi.mock('../../../lib/auth', () => ({
  requireAuth: async (req: Request) => {
    const org = req.headers.get('x-test-org');
    if (!org) throw new Response('{"error":"unauthorized"}', { status: 401 });
    return { userId: 'u1', organizationId: org, role: 'patron' };
  },
}));

const { handleMcpRoutes } = await import('../../mcp/routes');
const { handleFournisseursRoutes } = await import('../routes');
const { OUTILS } = await import('../../mcp/outils');

let env: any;
const rpc = async (url: string, body: unknown, auth?: string) => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) headers.authorization = `Bearer ${auth}`;
  const req = new Request(`https://app.test${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const res = (await handleMcpRoutes(req, env, new URL(req.url).pathname))!;
  return { status: res.status, data: res.status === 202 ? null : ((await res.json()) as any) };
};

async function seed() {
  const q = (sql: string) => env.DB.prepare(sql).run();
  await q(`INSERT INTO organizations (id, name, trade, size, enabled_modules, city) VALUES ('org_a','Benali Électricité','electricien','petite','["devis","fournisseurs"]','Villeurbanne')`);
  await q(`INSERT INTO organizations (id, name) VALUES ('org_b','Autre')`);
  await q(`INSERT INTO clients (id, organization_id, name, city, email) VALUES ('c1','org_a','Mme Martin','Lyon','martin@test.fr'),('c2','org_b','Secret','Paris',null)`);
  await q(`INSERT INTO chantiers (id, organization_id, client_id, name, status, budget_ht, start_date) VALUES ('ch1','org_a','c1','Rénovation Martin','en_cours',8000,'2026-11-02')`);
  await q(`INSERT INTO devis (id, organization_id, client_id, chantier_id, number, status, title, total_ht, created_at) VALUES ('d1','org_a','c1','ch1','D-001','signe','Tableau électrique',5200,'2026-11-01'),('d2','org_a','c1',null,'D-002','envoye','Prises',900,'2026-11-10')`);
  await q(`INSERT INTO devis_lignes (id, devis_id, position, kind, designation, quantity, unit, unit_price_ht, unit_cost_ht) VALUES ('l1','d1',1,'fourniture','Tableau 3 rangées',1,'u',450,280)`);
  await q(`INSERT INTO factures (id, organization_id, client_id, number, status, issue_date, due_date, total_ht, total_ttc, paid_amount) VALUES ('f1','org_a','c1','F-001','envoyee','2026-09-01','2026-10-01',1000,1200,200),('f2','org_a','c1','F-002','payee','2026-11-05','2026-12-05',2000,2400,2400)`);
}

beforeEach(async () => {
  env = { DB: creerD1(), JWT_SECRET: 't', APP_ORIGIN: 'https://app.test' };
  await seed();
});

describe('Brix AI MCP', () => {
  it('refuse sans jeton, puis répond au protocole et à chaque outil', async () => {
    expect((await rpc('/api/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize' })).status).toBe(401);

    const jreq = new Request('https://app.test/api/mcp/jetons', { method: 'POST', headers: { 'x-test-org': 'org_a' }, body: JSON.stringify({ nom: 'Claude' }) });
    const j = (await (await handleMcpRoutes(jreq, env, '/api/mcp/jetons'))!.json()) as any;
    expect(j.jeton).toMatch(/^brx_mcp_/);
    expect(j.url_avec_jeton).toContain('/api/mcp/k/');

    const init = await rpc('/api/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } } }, j.jeton);
    expect(init.data.result.protocolVersion).toBe('2025-03-26');
    expect(init.data.result.serverInfo.name).toBe('brix-ai');
    expect((await rpc('/api/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' }, j.jeton)).status).toBe(202);

    const list = await rpc(`/api/mcp/k/${j.jeton}`, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(list.data.result.tools.length).toBe(OUTILS.length);
    expect(list.data.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(true);

    // Données fournisseurs de démo pour les outils achats
    await handleFournisseursRoutes(new Request('https://app.test/api/fournisseurs/demo', { method: 'POST', headers: { 'x-test-org': 'org_a' } }), env, '/api/fournisseurs/demo');

    const args: Record<string, unknown> = { prix_materiaux: { recherche: 'chauffe-eau' }, chantiers: { id: 'ch1' }, devis: { depuis_jours: 365 } };
    const out: Record<string, any> = {};
    for (const t of OUTILS) {
      const r = await rpc('/api/mcp', { jsonrpc: '2.0', id: t.name, method: 'tools/call', params: { name: t.name, arguments: args[t.name] ?? {} } }, j.jeton);
      expect(r.data.result.isError, t.name).toBe(false);
      expect(r.data.result.structuredContent.donnees_du, t.name).toBeTruthy();
      out[t.name] = r.data.result.structuredContent;
    }
    expect(out.entreprise.nom).toBe('Benali Électricité');
    expect(out.entreprise.compteurs.devis_en_attente.nombre).toBe(1);
    expect(out.impayes.total_en_retard_ttc).toBe(1000);
    expect(out.clients.clients.map((c: any) => c.nom)).toEqual(['Mme Martin']); // pas de fuite vers org_b
    expect(out.chantiers.marge_estimee_ht).toBe(8000);
    expect(out.prix_materiaux.produits[0].offres).toHaveLength(3);
    expect(out.demandes_prix.demandes).toHaveLength(1);
    expect(out.achats.commandes_en_cours.nombre).toBe(1);
    expect(out.chiffre_affaires.devis.signes).toBe(1);

    const inconnu = await rpc('/api/mcp', { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'supprimer_tout' } }, j.jeton);
    expect(inconnu.data.error.code).toBe(-32602);

    // Révocation
    const del = new Request(`https://app.test/api/mcp/jetons/${j.id}`, { method: 'DELETE', headers: { 'x-test-org': 'org_a' } });
    await handleMcpRoutes(del, env, `/api/mcp/jetons/${j.id}`);
    expect((await rpc('/api/mcp', { jsonrpc: '2.0', id: 1, method: 'ping' }, j.jeton)).status).toBe(401);
  });
});
