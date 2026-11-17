// Routes du module e-mails : webhooks de suivi, désinscription des relances, aperçu des modèles.
//
// BRANCHEMENT (à faire dans worker/src/index.ts, ce module ne le modifie pas) :
//   import { handleEmailsRoutes } from './modules/emails/routes';
//   const handlers = [handleCoreRoutes, handleFournisseursRoutes, handleApiPubliqueRoutes, handleMcpRoutes, handleEmailsRoutes];
//
// VARIABLES D'ENVIRONNEMENT (à ajouter dans worker/src/env.ts, interface Env ; voir ./config.ts) :
//   RESEND_API_KEY?: string;        // si pas de Brevo (BREVO_API_KEY existe déjà)
//   EMAIL_FROM?: string;            // ex. « devis@brix-app.fr » (domaine authentifié SPF, DKIM, DMARC)
//   EMAIL_FROM_NAME?: string;       // nom par défaut, ex. « Brix »
//   EMAIL_WEBHOOK_SECRET?: string;  // Brevo : secret partagé ; Resend : « whsec_… » fourni par Resend
//   ENVIRONMENT?: string;           // « production » en prod (coupe l'aperçu des modèles)
// Base D1 : appliquer worker/src/modules/emails/schema.sql.
//
// Routes :
//   POST /api/emails/webhook/brevo     secret dans l'en-tête x-brix-webhook-secret (ou Bearer, ou Basic)
//   POST /api/emails/webhook/resend    signature Svix (svix-id, svix-timestamp, svix-signature)
//   GET|POST /api/emails/desinscription?a=…&r=…&s=…   lien List-Unsubscribe des relances (signé HMAC)
//   GET /api/emails/apercu             liste des modèles (hors production)
//   GET /api/emails/apercu/:modele     HTML de l'exemple (?format=texte pour la version texte)

import type { Env } from '../../env';
import { rendreEmail } from '../../../../src/emails/index';
import { exemples, ORDRE_MODELES } from '../../../../src/emails/exemples';
import { NOM_MODELE } from '../../../../src/emails/modeles/index';
import type { ModeleEmail } from '../../../../src/emails/types';
import { apercuAutorise, asEnv } from './config';
import { depuisBrevo, depuisResend, enregistrer } from './evenements';
import { verifierDesinscription, verifierSecretBrevo, verifierSvix } from './securite';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const html = (corps: string, status = 200) =>
  new Response(corps, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:" } });

const MAX_CORPS = 256 * 1024;

async function lireCorps(request: Request): Promise<string | null> {
  const t = await request.text();
  return t.length > MAX_CORPS ? null : t;
}

async function webhook(request: Request, env: Env, source: 'brevo' | 'resend'): Promise<Response> {
  const secret = asEnv(env).EMAIL_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook non configuré' }, 503);
  const corps = await lireCorps(request);
  if (corps === null) return json({ error: 'Corps trop volumineux' }, 413);
  const ok = source === 'resend' ? await verifierSvix(secret, request.headers, corps) : verifierSecretBrevo(secret, request.headers);
  if (!ok) return json({ error: 'Signature invalide' }, 401);
  let data: unknown;
  try {
    data = JSON.parse(corps);
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }
  const evs = source === 'resend' ? depuisResend(data) : depuisBrevo(data);
  const nouveaux = evs.length ? await enregistrer(env, evs) : 0;
  return json({ ok: true, recus: evs.length, nouveaux });
}

const PAGE_DESINSCRIPTION = (titre: string, texte: string) => `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head>
<body style="margin:0;background:#f4f3fa;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#130f26;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
<div style="max-width:420px;background:#fff;border:1px solid #ececf1;border-radius:20px;padding:32px"><h1 style="margin:0 0 10px;font-size:22px;letter-spacing:-0.4px">${titre}</h1><p style="margin:0;color:#5f5f70;line-height:1.6">${texte}</p></div></body></html>`;

async function desinscription(request: Request, env: Env, url: URL): Promise<Response> {
  const a = (url.searchParams.get('a') ?? '').slice(0, 320);
  const r = (url.searchParams.get('r') ?? '').slice(0, 80);
  const s = url.searchParams.get('s') ?? '';
  const valide = !!a && (await verifierDesinscription(env.JWT_SECRET || 'brix', a, r, s));
  if (!valide) return html(PAGE_DESINSCRIPTION('Lien invalide', 'Ce lien de désinscription est incomplet ou a expiré. Répondez simplement au dernier e-mail reçu.'), 400);
  // GET n'enregistre rien (les antivirus des messageries ouvrent les liens) : on demande une confirmation.
  // POST : clic sur « Confirmer » ou désinscription en un clic du client mail (RFC 8058).
  if (request.method === 'GET') {
    const action = `/api/emails/desinscription?${url.searchParams.toString().replace(/"/g, '%22')}`;
    return html(
      PAGE_DESINSCRIPTION(
        'Arrêter les relances ?',
        `Vous ne recevrez plus de relance automatique pour ce document.</p><form method="post" action="${action}" style="margin:20px 0 0"><button type="submit" style="width:100%;min-height:48px;border:0;border-radius:12px;background:#130f26;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Confirmer</button></form><p style="margin:0">`,
      ),
    );
  }
  await enregistrer(env, [{ fournisseur: 'brix', messageId: null, type: 'desinscrit', typeBrut: 'list-unsubscribe', email: a.toLowerCase(), modele: null, reference: r || null, survenuLe: new Date().toISOString(), brut: { methode: request.method } }]);
  return html(PAGE_DESINSCRIPTION("C'est noté.", "Vous ne recevrez plus de relance automatique pour ce document. L'artisan reste joignable en répondant à ses e-mails."));
}

function apercu(env: Env, url: URL, modele: string | null): Response {
  if (!apercuAutorise(env)) return json({ error: 'Route inconnue' }, 404);
  const base = `${(env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/$/, '')}/`;
  if (!modele) {
    const liens = ORDRE_MODELES.map((m) => `<li style="margin:6px 0"><a href="/api/emails/apercu/${m}" style="color:#6d28d9">${NOM_MODELE[m]}</a> <span style="color:#9898a8">(${m})</span></li>`).join('');
    return html(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Modèles d'e-mails</title></head><body style="font-family:system-ui,sans-serif;padding:32px;color:#130f26"><h1 style="font-size:22px">Modèles d'e-mails Brix</h1><ul style="padding-left:18px">${liens}</ul></body></html>`);
  }
  if (!(ORDRE_MODELES as string[]).includes(modele)) return json({ error: 'Modèle inconnu', modeles: ORDRE_MODELES }, 404);
  const m = modele as ModeleEmail;
  const r = rendreEmail(m, exemples(base)[m].donnees as never);
  if (url.searchParams.get('format') === 'texte') return new Response(`Sujet : ${r.sujet}\nAperçu : ${r.preheader}\n\n${r.texte}`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (url.searchParams.get('format') === 'json') return json({ sujet: r.sujet, preheader: r.preheader, texte: r.texte, html: r.html });
  return html(r.html);
}

export async function handleEmailsRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/emails/')) return null;
  const url = new URL(request.url);

  if (request.method === 'POST' && pathname === '/api/emails/webhook/brevo') return webhook(request, env, 'brevo');
  if (request.method === 'POST' && pathname === '/api/emails/webhook/resend') return webhook(request, env, 'resend');

  if ((request.method === 'GET' || request.method === 'POST') && pathname === '/api/emails/desinscription') return desinscription(request, env, url);

  if (request.method === 'GET' && (pathname === '/api/emails/apercu' || pathname === '/api/emails/apercu/')) return apercu(env, url, null);
  const m = /^\/api\/emails\/apercu\/([a-z_]+)$/.exec(pathname);
  if (request.method === 'GET' && m) return apercu(env, url, m[1]);

  return null;
}
