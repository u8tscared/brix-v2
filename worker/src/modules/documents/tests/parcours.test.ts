/**
 * Parcours complet : lien → ouverture → code → signature → acompte → webhook Stripe → notifications.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signerPourTest } from '../../paiements/stripe';
import { PNG, appeler, creerEnv, semer } from './outils';

const emails: { modele: string; a: string; donnees: any }[] = [];
vi.mock('../../emails/envoi', () => ({
  envoyerEmail: async (_env: unknown, e: { modele: string; a: string; donnees: unknown }) => {
    emails.push(e as never);
    return { id: `sim_${emails.length}`, simule: true };
  },
}));

let env: any;
let token: string;
const dernierCode = () => [...emails].reverse().find((e) => e.modele === 'code_signature')!.donnees.code as string;

beforeEach(async () => {
  emails.length = 0;
  env = creerEnv();
  ({ token } = await semer(env));
});
afterEach(() => vi.unstubAllGlobals());

async function lienDevis() {
  const r = await appeler(env, 'POST', '/api/documents/liens', { token, body: { type: 'devis', documentId: 'dv1', complements: { cgv: { texte: 'CGV de test' }, validiteJours: 30 } } });
  expect(r.status).toBe(201);
  return r.data.jeton as string;
}

describe('parcours devis → signature → acompte → paiement', () => {
  it('fonctionne de bout en bout avec Stripe (simulé par fetch)', async () => {
    const jeton = await lienDevis();
    expect(jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Ouverture : vue sans coûts internes, notification « devis ouvert » une seule fois par 30 min
    const v = await appeler(env, 'GET', `/api/p/devis/${jeton}`);
    expect(v.status).toBe(200);
    expect(v.data.statut).toBe('a_signer');
    expect(v.data.totaux).toMatchObject({ ht: 1305, tva: 248.5, ttc: 1553.5 });
    expect(v.data.acompte.montant).toBe(466.05);
    expect(JSON.stringify(v.data)).not.toContain('unit_cost');
    expect(v.data.mentions.cgv).toContain('conditions générales');
    await appeler(env, 'GET', `/api/p/devis/${jeton}`);
    const ouv = await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE type = 'devis_ouvert'").first();
    expect(ouv.n).toBe(1);
    const journal = await env.DB.prepare('SELECT ip_tronquee FROM documents_ouvertures').all();
    expect(journal.results[0].ip_tronquee).toBe('203.0.113.0');
    expect((await env.DB.prepare("SELECT status FROM devis WHERE id = 'dv1'").first()).status).toBe('vu');

    // Code puis mauvais code puis bon code
    const c = await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} });
    expect(c.status).toBe(200);
    expect(c.data.canal).toBe('email');
    expect(c.data.destinataire).toBe('c•••••@client.test');
    expect(c.data.codeDemo).toBeUndefined();
    const code = dernierCode();
    const stocke = await env.DB.prepare('SELECT code_hash FROM signature_codes').first();
    expect(stocke.code_hash).not.toContain(code);

    const corps = { nom: 'Claire Lefèvre', formule: 'Bon pour accord', mentions: { bonPourAccord: true, cgv: true }, signatureImage: PNG };
    const faux = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: { ...corps, code: code === '000000' ? '111111' : '000000' } });
    expect(faux.status).toBe(400);
    expect(faux.data).toMatchObject({ error: 'code_incorrect', essaisRestants: 4 });
    const sansCgv = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: { ...corps, code, mentions: { bonPourAccord: true } } });
    expect(sansCgv.data.error).toBe('mention_manquante');

    const s = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: { ...corps, code } });
    expect(s.status).toBe(200);
    expect(s.data.statut).toBe('signe');
    expect(s.data.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(s.data.retractation).toBeNull();
    expect((await env.DB.prepare("SELECT status FROM devis WHERE id = 'dv1'").first()).status).toBe('signe');
    const preuve = await env.DB.prepare('SELECT * FROM signature_preuves').first();
    expect(preuve).toMatchObject({ statut: 'signe', methode_auth: 'code_email', ip: '203.0.113.42', signataire_nom: 'Claire Lefèvre' });
    expect([...env.FILES.objets.keys()].some((k: string) => k.endsWith('dossier.json'))).toBe(true);
    expect([...env.FILES.objets.keys()].some((k: string) => k.endsWith('signature.png'))).toBe(true);
    expect(emails.map((e) => e.modele)).toEqual(expect.arrayContaining(['devis_signe_client', 'devis_signe_artisan']));
    expect(emails.find((e) => e.modele === 'devis_signe_client')!.donnees.empreinte).toBe(s.data.empreinte);

    // Le code ne resert pas ; le devis signé ne se re-signe pas
    const bis = await appeler(env, 'POST', `/api/p/devis/${jeton}/signer`, { body: { ...corps, code } });
    expect(bis.status).toBe(409);
    const cert = await appeler(env, 'GET', `/api/p/devis/${jeton}/certificat`);
    expect(cert.status).toBe(200);
    expect(String(cert.data)).toContain('Certificat de signature');
    expect(cert.headers.get('content-security-policy')).toContain("default-src 'none'");

    // Acompte avec Stripe : compte Connect actif, fetch vers Stripe simulé
    env.STRIPE_SECRET_KEY = 'sk_test_x';
    env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    env.STRIPE_PLATFORM_FEE_BPS = '100';
    await env.DB.prepare("INSERT INTO paiements_comptes (organization_id, stripe_account_id, charges_actives, maj_le) VALUES ('org_a', 'acct_123', 1, 0)").run();
    const appels: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      appels.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 });
    });
    const a = await appeler(env, 'POST', `/api/p/devis/${jeton}/acompte`, { body: { moyen: 'carte' } });
    expect(a.status).toBe(200);
    expect(a.data).toMatchObject({ mode: 'redirection', url: 'https://checkout.stripe.com/c/pay/cs_test_1', simulation: false, montant: 466.05 });
    expect(a.data.facture.numero).toMatch(/^FA-\d{4}-0001$/);
    const p = new URLSearchParams(appels[0].body);
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('46605');
    expect(p.get('payment_intent_data[transfer_data][destination]')).toBe('acct_123');
    expect(p.get('payment_intent_data[application_fee_amount]')).toBe('466');
    expect(p.get('payment_method_types[0]')).toBeNull();

    // Webhook Stripe signé
    const evt = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 46605, payment_intent: 'pi_1', metadata: { brix_session: a.data.sessionId } } } });
    const w = await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt, headers: { 'stripe-signature': await signerPourTest(evt, 'whsec_test') } });
    expect(w.status).toBe(200);
    const fa = await env.DB.prepare("SELECT * FROM factures WHERE kind = 'acompte'").first();
    expect(fa).toMatchObject({ status: 'payee', paid_amount: 466.05, devis_id: 'dv1' });
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM paiements_ecritures').first()).n).toBe(1);
    expect(emails.map((e) => e.modele)).toEqual(expect.arrayContaining(['paiement_recu_client', 'paiement_recu_artisan']));

    // Rejeu du même événement, puis même paiement sous un autre id d'événement : rien n'est compté deux fois
    const rejeu = await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt, headers: { 'stripe-signature': await signerPourTest(evt, 'whsec_test') } });
    expect(rejeu.data.doublon).toBe(true);
    const evt2 = evt.replace('evt_1', 'evt_2');
    await appeler(env, 'POST', '/api/paiements/webhook/stripe', { brut: evt2, headers: { 'stripe-signature': await signerPourTest(evt2, 'whsec_test') } });
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM paiements_ecritures').first()).n).toBe(1);
    expect((await env.DB.prepare("SELECT paid_amount FROM factures WHERE kind = 'acompte'").first()).paid_amount).toBe(466.05);

    // Notifications de l'artisan
    const n = await appeler(env, 'GET', '/api/notifications', { token });
    expect(n.status).toBe(200);
    expect(n.data.notifications.map((x: any) => x.type)).toEqual(['paiement_recu', 'devis_signe', 'devis_ouvert']);
    expect(n.data.nonLues).toBe(3);
    expect(n.data.notifications[0].montant).toBe(466.05);
    await appeler(env, 'POST', '/api/notifications/lu', { token, body: { ids: [n.data.notifications[0].id] } });
    expect((await appeler(env, 'GET', '/api/notifications', { token })).data.nonLues).toBe(2);
    await appeler(env, 'POST', '/api/notifications/lu', { token, body: { tout: true } });
    expect((await appeler(env, 'GET', '/api/notifications?nonLues=1', { token })).data.notifications).toHaveLength(0);
    // Cloisonnement : une autre entreprise ne voit rien
    const { jetonArtisan } = await import('./outils');
    expect((await appeler(env, 'GET', '/api/notifications', { token: await jetonArtisan('org_b', 'usr_b') })).data.notifications).toHaveLength(0);

    // Suivi côté artisan
    const suivi = await appeler(env, 'GET', '/api/documents/suivi/devis/dv1', { token });
    expect(suivi.data.nbOuvertures).toBe(2);
    expect(suivi.data.evenements.map((e: any) => e.evenement)).toEqual(expect.arrayContaining(['code_envoye', 'signature', 'acompte_paye']));
    const preuves = await appeler(env, 'GET', '/api/signature/devis/dv1/preuves', { token });
    expect(preuves.data.preuves[0].ip).toBe('203.0.113.0');
    const dossier = await appeler(env, 'GET', `/api/signature/preuves/${preuves.data.preuves[0].id}/dossier`, { token });
    expect(dossier.data.document.empreinte.valeur).toBe(s.data.empreinte);
  });

  it('sans clé Stripe : paiement de facture en simulation, virement par RIB', async () => {
    const l = await appeler(env, 'POST', '/api/documents/liens', { token, body: { type: 'facture', documentId: 'fa1' } });
    const f = await appeler(env, 'GET', `/api/p/facture/${l.data.jeton}`);
    expect(f.data).toMatchObject({ statut: 'a_payer', reste: 1200, moyens: { carte: { disponible: true, simulation: true }, virement: { disponible: true, mode: 'rib' }, troisFois: { disponible: false } } });
    const vir = await appeler(env, 'POST', `/api/p/facture/${l.data.jeton}/payer`, { body: { moyen: 'virement' } });
    expect(vir.data).toMatchObject({ mode: 'instructions', iban: 'FR7630006000011234567890189', reference: 'F-2026-206', montant: 1200 });
    const troisFois = await appeler(env, 'POST', `/api/p/facture/${l.data.jeton}/payer`, { body: { moyen: '3x' } });
    expect(troisFois.status).toBe(409);
    const p = await appeler(env, 'POST', `/api/p/facture/${l.data.jeton}/payer`, { body: { moyen: 'carte' } });
    expect(p.data).toMatchObject({ mode: 'redirection', simulation: true });
    expect(p.data.url).toContain(`/#/paiement-demo/${p.data.sessionId}`);
    expect((await appeler(env, 'GET', `/api/p/paiement-demo/${p.data.sessionId}`)).data).toMatchObject({ montant: 1200, facture: 'F-2026-206' });
    const ok = await appeler(env, 'POST', `/api/p/paiement-demo/${p.data.sessionId}/confirmer`);
    expect(ok.data.ok).toBe(true);
    expect((await env.DB.prepare("SELECT status, paid_amount FROM factures WHERE id = 'fa1'").first())).toMatchObject({ status: 'payee', paid_amount: 1200 });
    const encore = await appeler(env, 'POST', `/api/p/facture/${l.data.jeton}/payer`, { body: { moyen: 'carte' } });
    expect(encore.data.error).toBe('deja_payee');
  });

  it('refus et question du client', async () => {
    const jeton = await lienDevis();
    const q = await appeler(env, 'POST', `/api/p/devis/${jeton}/question`, { body: { texte: 'Peut-on décaler au mois de mars ?' } });
    expect(q.status).toBe(200);
    const r = await appeler(env, 'POST', `/api/p/devis/${jeton}/refuser`, { body: { motif: 'Trop cher' } });
    expect(r.data.statut).toBe('refuse');
    expect((await appeler(env, 'GET', `/api/p/devis/${jeton}`)).data).toMatchObject({ statut: 'refuse', refus: { motif: 'Trop cher' } });
    expect((await appeler(env, 'POST', `/api/p/devis/${jeton}/code`, { body: {} })).status).toBe(409);
    const types = (await env.DB.prepare('SELECT type FROM notifications ORDER BY created_at').all()).results.map((x: any) => x.type);
    expect(types).toEqual(expect.arrayContaining(['devis_question', 'devis_refuse']));
  });
});
