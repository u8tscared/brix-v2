// Module e-mails du worker : choix du fournisseur, en-têtes, webhooks signés, désinscription, aperçu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envoyerEmail } from './envoi';
import { handleEmailsRoutes } from './routes';
import { signerDesinscription, signerSvix, verifierSvix } from './securite';
import { exemples } from '../../../../src/emails/exemples';

/** Fausse D1 : garde les requêtes et simule l'unicité de email_events.cle. */
function fausseDb() {
  const requetes: { sql: string; params: unknown[] }[] = [];
  const cles = new Set<string>();
  return {
    requetes,
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              requetes.push({ sql, params });
              if (sql.includes('INSERT OR IGNORE INTO email_events')) {
                const cle = String(params[9]);
                const changes = cles.has(cle) ? 0 : 1;
                cles.add(cle);
                return { meta: { changes } };
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

const EX = exemples('https://app.test/');
const envDe = (extra: Record<string, unknown> = {}) => ({ DB: fausseDb(), JWT_SECRET: 'secret-jwt', APP_ORIGIN: 'https://app.test', ...extra }) as never;

afterEach(() => vi.restoreAllMocks());

describe('envoi', () => {
  it('simule sans clé et journalise', async () => {
    const env = envDe();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await envoyerEmail(env, { modele: 'devis_envoye', donnees: EX.devis_envoye.donnees, a: 'claire@exemple.fr' });
    expect(r).toMatchObject({ simule: true, envoye: false, fournisseur: 'simulation' });
    expect((env as { DB: ReturnType<typeof fausseDb> }).DB.requetes[0].sql).toContain('INSERT INTO email_envois');
  });

  it('refuse une adresse invalide', async () => {
    const r = await envoyerEmail(envDe(), { modele: 'devis_envoye', donnees: EX.devis_envoye.donnees, a: 'pas-une-adresse' });
    expect(r.erreur).toMatch(/invalide/);
  });

  it('Brevo : expéditeur, reply-to artisan, tags et List-Unsubscribe sur les relances', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ messageId: '<abc@brevo>' }), { status: 201 }));
    const env = envDe({ BREVO_API_KEY: 'k', EMAIL_FROM: 'devis@brix-app.fr' });
    const r = await envoyerEmail(env, { modele: 'facture_relance', donnees: EX.facture_relance.donnees, a: 'gestion@sci.fr', deNom: 'Karim Benali · Benali Électricité' });
    expect(r).toMatchObject({ envoye: true, fournisseur: 'brevo', id: '<abc@brevo>' });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ name: 'Karim Benali · Benali Électricité', email: 'devis@brix-app.fr' });
    expect(body.replyTo).toEqual({ email: 'karim@benali-elec.fr' });
    expect(body.tags).toContain('modele:facture_relance');
    expect(body.headers['List-Unsubscribe']).toMatch(/^<https:\/\/app\.test\/api\/emails\/desinscription\?a=gestion%40sci\.fr&r=F-2026-198&s=/);
    expect(body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(body.subject).toMatch(/^Mise en demeure/);
  });

  it('Resend si pas de Brevo ; pas de List-Unsubscribe hors relance', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 're_1' }), { status: 200 }));
    const r = await envoyerEmail(envDe({ RESEND_API_KEY: 'r' }), { modele: 'devis_envoye', donnees: EX.devis_envoye.donnees, a: 'claire@exemple.fr' });
    expect(r).toMatchObject({ envoye: true, fournisseur: 'resend', id: 're_1' });
    const body = JSON.parse(String((f.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.from).toBe('Karim Benali · Benali Électricité <devis@brix-app.fr>');
    expect(body.reply_to).toBe('karim@benali-elec.fr');
    expect(body.headers['List-Unsubscribe']).toBeUndefined();
    expect(body.tags).toContainEqual({ name: 'modele', value: 'devis_envoye' });
  });

  it("remonte l'erreur du fournisseur sans lever", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('quota', { status: 429 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await envoyerEmail(envDe({ BREVO_API_KEY: 'k' }), { modele: 'bienvenue', donnees: EX.bienvenue.donnees, a: 'karim@benali-elec.fr' });
    expect(r.envoye).toBe(false);
    expect(r.erreur).toContain('429');
  });
});

describe('webhooks', () => {
  const post = (path: string, body: string, headers: Record<string, string>, env: unknown) =>
    handleEmailsRoutes(new Request(`https://app.test${path}`, { method: 'POST', body, headers }), env as never, path);

  it('Brevo : refuse sans secret, enregistre avec, ignore les rejeux', async () => {
    const env = envDe({ EMAIL_WEBHOOK_SECRET: 's3cret' });
    const corps = JSON.stringify({ event: 'hard_bounce', email: 'x@y.fr', 'message-id': '<abc@brevo>', ts_event: 1763380000, tags: ['modele:devis_envoye', 'doc:D-2026-121'] });
    expect((await post('/api/emails/webhook/brevo', corps, {}, env))!.status).toBe(401);
    const ok = await post('/api/emails/webhook/brevo', corps, { 'x-brix-webhook-secret': 's3cret' }, env);
    expect(await ok!.json()).toEqual({ ok: true, recus: 1, nouveaux: 1 });
    const rejeu = await post('/api/emails/webhook/brevo', corps, { authorization: 'Bearer s3cret' }, env);
    expect(await rejeu!.json()).toEqual({ ok: true, recus: 1, nouveaux: 0 });
    const ins = (env as { DB: ReturnType<typeof fausseDb> }).DB.requetes.find((q) => q.sql.includes('email_events'))!;
    expect(ins.params.slice(1, 8)).toEqual(['brevo', '<abc@brevo>', 'rebond', 'hard_bounce', 'x@y.fr', 'devis_envoye', 'D-2026-121']);
  });

  it('Resend : signature Svix vérifiée', async () => {
    const secret = `whsec_${btoa('cle-de-test-resend')}`;
    const env = envDe({ EMAIL_WEBHOOK_SECRET: secret });
    const corps = JSON.stringify({ type: 'email.complained', created_at: '2026-11-17T10:00:00Z', data: { email_id: 're_1', to: ['claire@exemple.fr'], tags: { modele: 'facture_relance' } } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signerSvix(secret, 'msg_1', ts, corps);
    const mauvais = await post('/api/emails/webhook/resend', corps, { 'svix-id': 'msg_1', 'svix-timestamp': String(ts), 'svix-signature': 'v1,AAAA' }, env);
    expect(mauvais!.status).toBe(401);
    const bon = await post('/api/emails/webhook/resend', corps, { 'svix-id': 'msg_1', 'svix-timestamp': String(ts), 'svix-signature': sig }, env);
    expect(await bon!.json()).toMatchObject({ ok: true, nouveaux: 1 });
    expect(await verifierSvix(secret, new Headers({ 'svix-id': 'msg_1', 'svix-timestamp': String(ts - 3600), 'svix-signature': sig }), corps)).toBe(false);
  });

  it('webhook non configuré : 503', async () => {
    expect((await post('/api/emails/webhook/brevo', '{}', {}, envDe()))!.status).toBe(503);
  });
});

describe('désinscription et aperçu', () => {
  it('GET demande confirmation, POST enregistre, signature vérifiée', async () => {
    const env = envDe();
    const s = await signerDesinscription('secret-jwt', 'gestion@sci.fr', 'F-2026-198');
    const q = `/api/emails/desinscription?a=gestion%40sci.fr&r=F-2026-198&s=${s}`;
    const get = await handleEmailsRoutes(new Request(`https://app.test${q}`), env, '/api/emails/desinscription');
    expect(await get!.text()).toContain('Confirmer');
    expect((env as { DB: ReturnType<typeof fausseDb> }).DB.requetes).toHaveLength(0);
    const p = await handleEmailsRoutes(new Request(`https://app.test${q}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), env, '/api/emails/desinscription');
    expect(p!.status).toBe(200);
    expect((env as { DB: ReturnType<typeof fausseDb> }).DB.requetes[0].params).toContain('desinscrit');
    const faux = await handleEmailsRoutes(new Request(`https://app.test${q.replace('F-2026-198', 'F-2026-199')}`, { method: 'POST' }), env, '/api/emails/desinscription');
    expect(faux!.status).toBe(400);
  });

  it('aperçu : HTML hors production, 404 en production', async () => {
    const r = await handleEmailsRoutes(new Request('https://app.test/api/emails/apercu/devis_envoye'), envDe(), '/api/emails/apercu/devis_envoye');
    expect(r!.headers.get('content-type')).toContain('text/html');
    expect(await r!.text()).toContain('Consulter et signer');
    const prod = await handleEmailsRoutes(new Request('https://app.test/api/emails/apercu/devis_envoye'), envDe({ ENVIRONMENT: 'production' }), '/api/emails/apercu/devis_envoye');
    expect(prod!.status).toBe(404);
    expect(await handleEmailsRoutes(new Request('https://app.test/api/autre'), envDe(), '/api/autre')).toBeNull();
  });
});
