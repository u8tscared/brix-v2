/** Brix AI MCP : protocole (deux époques), annotations, chaque outil sur un document d'entreprise semé. */
import { beforeEach, describe, expect, it } from 'vitest';
import { lireEtat } from '../../../lib/etat';
import { handleFournisseursRoutes } from '../../fournisseurs/routes';
import { OUTILS } from '../outils';
import { ORIGINE, appel, appelOutil, creerEnv, jetonPersonnel, rpc, semer, session, valider } from './aides';

let env: any;
let jeton: string;
beforeEach(async () => {
  env = creerEnv();
  await semer(env);
  jeton = await jetonPersonnel(env, 'org_a', true);
});

const ARGS: Record<string, Record<string, unknown>> = {
  lire_devis: { id: 'D-2026-121' },
  lire_facture: { id: 'f_201' },
  lire_chantier: { id: 'ch_lefevre' },
  lire_client: { id: 'Claire Lefèvre' },
  comparer_prix_materiaux: { recherche: 'chauffe-eau' },
  search: { query: 'Lefèvre' },
  fetch: { id: 'devis:q_121' },
  creer_client: { nom: 'Nouvelle cliente', ville: '69001 Lyon' },
  creer_devis_brouillon: { client_id: 'c_roux', titre: 'Borne de recharge', lignes: [{ designation: 'Borne 7 kW', quantite: 1, unite: 'u', prix_unitaire_ht: 1200 }, { designation: 'Pose', quantite: 4, unite: 'h', prix_unitaire_ht: 55, tva_pct: 20 }] },
  ajouter_ligne_devis: { devis_id: 'D-2026-119', lignes: [{ designation: 'Bouche hygro', prix_unitaire_ht: 35, quantite: 3 }] },
  creer_rendez_vous: { titre: 'Visite Roux', date: '2026-12-01', debut: '09:00', fin: '10:00' },
  noter_demande: { nom: 'Paul Arnaud', telephone: '06 77 12 34 56', besoin: 'Borne Tesla' },
  marquer_relance_a_faire: { type: 'facture', id: 'F-2026-201', note: 'Appeler mardi' },
};

describe('protocole', () => {
  it('parle les deux époques du protocole', async () => {
    const init = await rpc(env, jeton, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '1' } } }, { 'mcp-session-id': 'ignoree' });
    expect(init.data.result.protocolVersion).toBe('2025-11-25');
    expect(init.data.result.serverInfo.name).toBe('brix-ai');
    expect((await rpc(env, jeton, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2099-01-01' } })).data.result.protocolVersion).toBe('2025-11-25');
    expect((await rpc(env, jeton, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })).data.result.protocolVersion).toBe('2025-03-26');
    expect((await rpc(env, jeton, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);

    const meta = { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } };
    const disc = await rpc(env, jeton, { jsonrpc: '2.0', id: 2, method: 'server/discover', params: meta });
    expect(disc.data.result.supportedVersions).toContain('2026-07-28');
    expect(disc.data.result.resultType).toBe('complete');
    const list = await rpc(env, jeton, { jsonrpc: '2.0', id: 3, method: 'tools/list', params: meta }, { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' });
    expect(list.data.result.ttlMs).toBeGreaterThan(0);
    expect(list.data.result.cacheScope).toBe('private');
    expect(list.data.result._meta['io.modelcontextprotocol/serverInfo'].name).toBe('brix-ai');

    const ecart = await rpc(env, jeton, { jsonrpc: '2.0', id: 4, method: 'tools/list', params: meta }, { 'mcp-method': 'tools/call' });
    expect(ecart.status).toBe(400);
    expect(ecart.data.error.code).toBe(-32020);
    const version = await rpc(env, jeton, { jsonrpc: '2.0', id: 5, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '1999-01-01' } } });
    expect(version.status).toBe(400);
    expect(version.data.error.code).toBe(-32022);
    expect((await rpc(env, jeton, { jsonrpc: '2.0', id: 6, method: 'inconnue', params: meta })).status).toBe(404);
    expect((await rpc(env, jeton, { jsonrpc: '2.0', id: 6, method: 'inconnue' })).data.error.code).toBe(-32601);
    expect((await rpc(env, jeton, { jsonrpc: '2.0', id: 7, method: 'ping' }, { 'mcp-protocol-version': '1990-01-01' })).status).toBe(400);
    expect((await appel(env, '/api/mcp', { headers: { authorization: `Bearer ${jeton}` } })).status).toBe(405);
    const pre = await appel(env, '/api/mcp', { method: 'OPTIONS', headers: { origin: 'https://claude.ai' } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-headers')).toContain('mcp-protocol-version');
    // Jeton personnel dans l'URL (secours n8n).
    const k = await appel(env, `/api/mcp/k/${jeton}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) });
    expect(k.status).toBe(200);
  });

  it('décrit chaque outil avec des annotations explicites et un schéma de sortie', async () => {
    const list = await rpc(env, jeton, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const tools = list.data.result.tools as any[];
    expect(tools).toHaveLength(OUTILS.length);
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
    for (const t of tools) {
      expect(t.name, t.name).toMatch(/^[a-z_]{3,64}$/);
      expect(t.title && t.description, t.name).toBeTruthy();
      expect(t.description, t.name).not.toMatch(/commence ici|toujours|always|must/i);
      for (const k of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) expect(typeof t.annotations[k], `${t.name}.${k}`).toBe('boolean');
      expect(t.annotations.title).toBe(t.title);
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.inputSchema.type).toBe('object');
      expect(t.outputSchema.type, t.name).toBe('object');
    }
    const ecriture = tools.filter((t) => !t.annotations.readOnlyHint).map((t) => t.name).sort();
    expect(ecriture).toEqual(['ajouter_ligne_devis', 'creer_client', 'creer_devis_brouillon', 'creer_rendez_vous', 'marquer_relance_a_faire', 'noter_demande']);
  });
});

describe('outils', () => {
  it('répond sur chaque outil avec un contenu conforme au schéma et un miroir texte', async () => {
    await handleFournisseursRoutes(new Request(`${ORIGINE}/api/fournisseurs/demo`, { method: 'POST', headers: { authorization: `Bearer ${await session('org_a')}` } }), env, '/api/fournisseurs/demo');
    const out: Record<string, any> = {};
    for (const o of OUTILS) {
      const r = await appelOutil(env, jeton, o.name, ARGS[o.name] ?? {});
      expect(r.status, o.name).toBe(200);
      expect(r.data.result.isError, `${o.name} : ${r.data.result.content?.[0]?.text}`).toBe(false);
      const sc = r.data.result.structuredContent;
      expect(valider(o.outputSchema, sc), o.name).toEqual([]);
      expect(JSON.parse(r.data.result.content[0].text), o.name).toEqual(sc);
      out[o.name] = sc;
    }
    expect(out.lire_entreprise.nom).toBe('Benali Électricité');
    expect(out.lire_entreprise.compteurs.devis_en_attente).toEqual({ nombre: 1, montant_ht: 420 });
    expect(out.lire_entreprise.actions_autorisees).toBe(true);
    expect(out.lire_devis.totaux).toMatchObject({ ht: 1550, ttc: 1705 });
    expect(out.lire_devis.devis.lien).toBe(`${ORIGINE}/#/app/devis/q_121`);
    expect(out.lister_impayes.total_en_retard_ttc).toBe(1000);
    expect(out.lister_impayes.factures[0]).toMatchObject({ numero: 'F-2026-201', jours_de_retard: 15, email: 'michel@test.fr' });
    expect(out.lister_clients.clients.map((c: any) => c.nom)).toEqual(['Claire Lefèvre', 'Michel Roux']); // rien de org_b
    expect(out.lire_chantier.marge_estimee_ht).toBe(5500 - out.lire_chantier.achats_engages_ht);
    expect(out.calculer_chiffre_affaires.devis.signes).toBe(1);
    expect(out.lire_planning.creneaux).toHaveLength(1);
    expect(out.lister_demandes.demandes[0].nom).toBe('Sarah Kaci');
    expect(out.comparer_prix_materiaux.produits[0].offres.length).toBeGreaterThan(1);
    expect(out.lister_demandes_prix.demandes).toHaveLength(1);
    expect(out.search.results[0]).toMatchObject({ url: expect.stringContaining('/#/app/') });
    expect(out.fetch.text).toContain('D-2026-121');
    expect(out.creer_devis_brouillon.devis).toMatchObject({ numero: `D-${new Date().getFullYear()}-122`, statut: 'brouillon', total_ht: 1420 });
  });

  it('écrit des brouillons dans le document de l’entreprise et les journalise', async () => {
    const r = await appelOutil(env, jeton, 'creer_devis_brouillon', ARGS.creer_devis_brouillon);
    const id = r.data.result.structuredContent.devis.id;
    await appelOutil(env, jeton, 'creer_rendez_vous', ARGS.creer_rendez_vous);
    await appelOutil(env, jeton, 'marquer_relance_a_faire', ARGS.marquer_relance_a_faire);
    const { donnees, version } = await lireEtat(env, 'org_a');
    expect(version).toBe(4);
    const d = (donnees.devis as any[]).find((x) => x.id === id);
    expect(d).toMatchObject({ status: 'brouillon', clientId: 'c_roux', source: 'brix-ai', validityDays: 30, depositPercent: 30 });
    expect(d.lines[0]).toMatchObject({ kind: 'ouvrage', designation: 'Borne 7 kW', quantity: 1, unit: 'u', unitPriceHt: 1200, unitCostHt: 0, vatRate: 10 });
    expect(d.lines[1].vatRate).toBe(20);
    expect((donnees.events as any[]).at(-1)).toMatchObject({ employeeId: 'e_karim', kind: 'rdv', start: '09:00', source: 'brix-ai' });
    expect((donnees.factures as any[]).find((f) => f.id === 'f_201').relanceAFaire.note).toBe('Appeler mardi');
    expect((donnees.factures as any[]).find((f) => f.id === 'f_201').remindersSent).toBe(1); // rien envoyé

    const refus = await appelOutil(env, jeton, 'ajouter_ligne_devis', { devis_id: 'D-2026-121', lignes: [{ designation: 'X', prix_unitaire_ht: 1 }] });
    expect(refus.data.result.isError).toBe(true);
    expect(refus.data.result.content[0].text).toContain('n’est plus un brouillon');
    const doublon = await appelOutil(env, jeton, 'creer_client', { nom: 'michel roux' });
    expect(doublon.data.result.isError).toBe(true);

    const journal = ((await (await appel(env, '/api/mcp/journal', { headers: { authorization: `Bearer ${await session('org_a')}` } })).json()) as any).journal;
    expect(journal.map((j: any) => j.outil)).toEqual(['creer_client', 'ajouter_ligne_devis', 'marquer_relance_a_faire', 'creer_rendez_vous', 'creer_devis_brouillon']);
    expect(journal[0]).toMatchObject({ ok: false, client_label: 'Test' });
    expect(journal[4].resume).toContain('Devis brouillon');
  });

  it('jeton personnel en lecture seule par défaut : écriture refusée en 403', async () => {
    const lecture = await jetonPersonnel(env, 'org_a', false);
    const r = await appelOutil(env, lecture, 'noter_demande', ARGS.noter_demande);
    expect(r.status).toBe(403);
    expect(r.headers.get('www-authenticate')).toContain('insufficient_scope');
    expect((await lireEtat(env, 'org_a')).version).toBe(1);
  });

  it('renvoie des erreurs lisibles en français', async () => {
    const r = await appelOutil(env, jeton, 'lire_devis', { id: 'D-0000' });
    expect(r.data.result.isError).toBe(true);
    expect(r.data.result.content[0].text).toContain('lister_devis');
    const p = await appelOutil(env, jeton, 'lire_planning', { du: 'demain' });
    expect(p.data.result.content[0].text).toContain('AAAA-MM-JJ');
    const inconnu = await appelOutil(env, jeton, 'supprimer_tout');
    expect(inconnu.data.error.code).toBe(-32602);
  });
});
