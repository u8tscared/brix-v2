/**
 * Parcours complet artisan ↔ fournisseur, à travers les routes HTTP du module.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerD1 } from './d1-memoire';

vi.mock('../../../lib/auth', () => ({
  requireAuth: async (req: Request) => {
    const org = req.headers.get('x-test-org');
    if (!org) throw new Response('{"error":"unauthorized"}', { status: 401 });
    return { userId: 'u1', organizationId: org, role: 'owner' };
  },
}));
vi.mock('../../../lib/http', () => ({
  json: (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }),
}));

const { handleFournisseursRoutes } = await import('../routes');

let env: any;
async function call(method: string, path: string, body?: unknown, org: string | null = 'org_a') {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (org) headers['x-test-org'] = org;
  const req = new Request(`https://app.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await handleFournisseursRoutes(req, env, new URL(req.url).pathname);
  if (!res) return { status: 404, data: null as any };
  return { status: res.status, data: (await res.json()) as any };
}

beforeEach(() => {
  env = { DB: creerD1(), JWT_SECRET: 'test', APP_ORIGIN: 'https://app.test' };
});

describe('parcours demande de prix → commande → livraison', () => {
  it('fonctionne de bout en bout', async () => {
    await env.DB.prepare(`INSERT INTO organizations (id, name, email) VALUES ('org_a','Plomberie Durand','contact@durand.test')`).run();
    await env.DB.prepare(`INSERT INTO chantiers (id, organization_id, name, address) VALUES ('ch1','org_a','SDB Martin','12 rue Paul Bert, Lyon')`).run();
    await env.DB.prepare(`INSERT INTO devis (id, organization_id, chantier_id, number, status, title) VALUES ('dv1','org_a','ch1','D-2026-042','signe','Salle de bains')`).run();
    const lignes = [
      ['l1', 1, 'section', 'Plomberie', 0, null, 0, null],
      ['l2', 2, 'fourniture', 'Tube multicouche Ø16 barre 4 m', 10, 'u', 7.5, null],
      ['l3', 3, 'main_oeuvre', 'Pose', 8, 'h', 0, null],
      ['l4', 4, 'fourniture', 'Tube multicouche Ø16 barre 4 m', 5, 'u', 7.5, null],
      ['l5', 5, 'ouvrage', 'Ballon 200 L posé', 1, 'u', 400, 'BALLON-200'],
    ];
    for (const [id, pos, kind, des, q, u, cost, ref] of lignes) {
      await env.DB.prepare(`INSERT INTO devis_lignes (id, devis_id, position, kind, designation, quantity, unit, unit_cost_ht, supplier_ref) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, 'dv1', pos, kind, des, q, u, cost, ref).run();
    }

    const a = await call('POST', '/api/fournisseurs/annuaire', { nom: 'Cedeo Villeurbanne', email: 'cedeo@exemple.fr', franco: '250', enseigne: 'cedeo' });
    expect(a.status).toBe(201);
    expect(a.data.connecteur).toBe('cedeo');
    const b = await call('POST', '/api/fournisseurs/annuaire', { nom: 'Point.P', email: 'pp@exemple.fr' });
    const sansMail = await call('POST', '/api/fournisseurs/annuaire', { nom: 'Quincaillerie du coin' });

    // Demande depuis le devis : 2 lignes (tubes additionnés + ballon), main d'œuvre et section ignorées
    const dp = await call('POST', '/api/fournisseurs/demandes', { devis_id: 'dv1', fournisseur_ids: [a.data.id, b.data.id, sansMail.data.id], envoyer: true });
    expect(dp.status).toBe(201);
    expect(dp.data.demande.numero).toMatch(/^DP-\d{4}-0001$/);
    expect(dp.data.demande.adresse_livraison).toBe('12 rue Paul Bert, Lyon');
    expect(dp.data.envoi.envoyes).toBe(2);
    expect(dp.data.envoi.simules).toHaveLength(2); // pas de clé e-mail → envoi simulé
    expect(dp.data.envoi.erreurs[0].fournisseur).toBe('Quincaillerie du coin');

    const detail = await call('GET', `/api/fournisseurs/demandes/${dp.data.demande.id}`);
    expect(detail.data.lignes).toHaveLength(2);
    expect(detail.data.lignes[0].quantite).toBe(15);
    expect(detail.data.destinataires[0].token_hash).toBeUndefined();

    // Le fournisseur ouvre le lien portail (sans auth)
    const lienCedeo = dp.data.envoi.simules.find((s: any) => s.fournisseur === 'Cedeo Villeurbanne').lien as string;
    const tokenCedeo = lienCedeo.split('/').pop()!;
    const portail = await call('GET', `/api/fournisseurs/portail/${tokenCedeo}`, undefined, null);
    expect(portail.status).toBe(200);
    expect(portail.data.type).toBe('demande');
    expect(portail.data.entreprise.nom).toBe('Plomberie Durand');
    const [lt, lb] = portail.data.lignes;

    const rep = await call('POST', `/api/fournisseurs/portail/${tokenCedeo}/reponse`, {
      lignes: [{ ligne_id: lt.id, prix_unitaire_cents: 720 }, { ligne_id: lb.id, prix_unitaire_cents: 37_900 }],
      frais_port_cents: 0, delai_livraison_jours: 1,
    }, null);
    expect(rep.status).toBe(200);

    const tokenPP = (dp.data.envoi.simules.find((s: any) => s.fournisseur === 'Point.P').lien as string).split('/').pop()!;
    await call('POST', `/api/fournisseurs/portail/${tokenPP}/reponse`, {
      lignes: [{ ligne_id: lt.id, prix_unitaire_cents: 690 }, { ligne_id: lb.id, prix_unitaire_cents: 39_500 }],
      frais_port_cents: 3_000,
    }, null);

    // Un autre artisan ne voit rien
    const intrus = await call('GET', `/api/fournisseurs/demandes/${dp.data.demande.id}`, undefined, 'org_b');
    expect(intrus.status).toBe(404);

    const comp = (await call('GET', `/api/fournisseurs/demandes/${dp.data.demande.id}`)).data.comparatif;
    expect(comp.reponses).toBe(2);
    expect(comp.recommandation.repartition[0].fournisseur_nom).toBe('Cedeo Villeurbanne');
    // Cedeo : 15×7,20 + 379 = 487 € ; Point.P : 15×6,90 + 395 + 30 port = 528,50 €
    expect(comp.recommandation.total_cents).toBe(48_700);

    // Les réponses ont alimenté le catalogue
    const cat = await call('GET', '/api/fournisseurs/catalogue?q=multicouche');
    expect(cat.data.length).toBeGreaterThan(0);

    // Commander selon la recommandation
    const cmds = await call('POST', `/api/fournisseurs/demandes/${dp.data.demande.id}/commander`, {});
    expect(cmds.data).toHaveLength(1);
    const cmd = cmds.data[0];
    expect(cmd.total_ht_cents).toBe(48_700);
    const again = await call('POST', `/api/fournisseurs/demandes/${dp.data.demande.id}/commander`, {});
    expect(again.status).toBe(409);

    const env1 = await call('POST', `/api/fournisseurs/commandes/${cmd.id}/envoyer`);
    expect(env1.data.envoyee).toBe(true);
    expect(env1.data.edi).toContain('UNH+1+ORDERS:D:96A:UN:EAN008');
    const tokenCmd = env1.data.lien_portail.split('/').pop();

    // Ancien lien de demande ≠ lien de commande
    const mauvais = await call('POST', `/api/fournisseurs/portail/${tokenCedeo}/statut`, { statut: 'confirmee' }, null);
    expect(mauvais.status).toBe(400);
    // Le fournisseur ne peut pas annuler
    const annul = await call('POST', `/api/fournisseurs/portail/${tokenCmd}/statut`, { statut: 'annulee' }, null);
    expect(annul.status).toBe(400);
    const conf = await call('POST', `/api/fournisseurs/portail/${tokenCmd}/statut`, { statut: 'confirmee', reference_fournisseur: 'ARC-1' }, null);
    expect(conf.data.statut).toBe('confirmee');

    // Livraison partielle puis complète
    const dc = (await call('GET', `/api/fournisseurs/commandes/${cmd.id}`)).data;
    const liv = await call('POST', `/api/fournisseurs/commandes/${cmd.id}/livraison`, { lignes: [{ ligne_id: dc.lignes[0].id, quantite_recue: 10 }] });
    expect(liv.data.statut).toBe('livree_partiel');
    expect(liv.data.manquants.find((m: any) => m.designation.includes('multicouche')).manque).toBe(5);
    const liv2 = await call('POST', `/api/fournisseurs/commandes/${cmd.id}/livraison`, { lignes: dc.lignes.map((l: any) => ({ ligne_id: l.id, quantite_recue: l.quantite })) });
    expect(liv2.data.statut).toBe('livree');

    const fac = await call('POST', `/api/fournisseurs/commandes/${cmd.id}/facture`, { facture_id: 'ff1', montant_ht_cents: 50_000 });
    expect(fac.data.alerte).toBe(true);
    expect(fac.data.ecart_cents).toBe(1_300);
    const fin = (await call('GET', `/api/fournisseurs/commandes/${cmd.id}`)).data;
    expect(fin.commande.statut).toBe('facturee');
    expect(fin.journal.length).toBeGreaterThanOrEqual(5);

    const tdb = await call('GET', '/api/fournisseurs/tableau-de-bord');
    expect(tdb.status).toBe(200);
  });

  it('refuse sans authentification et sur jeton invalide', async () => {
    expect((await call('GET', '/api/fournisseurs/annuaire', undefined, null)).status).toBe(401);
    expect((await call('GET', '/api/fournisseurs/portail/abc', undefined, null)).status).toBe(404);
    expect((await call('GET', `/api/fournisseurs/portail/${'x'.repeat(43)}`, undefined, null)).status).toBe(404);
  });

  it('charge la démo et produit un tableau de bord parlant', async () => {
    const d = await call('POST', '/api/fournisseurs/demo');
    expect(d.data.fournisseurs).toBe(5);
    const tdb = (await call('GET', '/api/fournisseurs/tableau-de-bord')).data;
    expect(tdb.commandes_en_cours.nombre).toBe(1);
    expect(tdb.livraisons_a_venir).toHaveLength(1);
    expect(tdb.hausses_prix.length).toBeGreaterThan(0);
    const cat = (await call('GET', '/api/fournisseurs/catalogue?q=chauffe eau')).data;
    expect(cat[0].offres).toHaveLength(3); // même EAN chez 3 négoces → regroupé
    expect((await call('POST', '/api/fournisseurs/demo')).data.deja).toBe(true);
  });
});
