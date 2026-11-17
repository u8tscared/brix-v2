/**
 * Routes du module paiements.
 *   Public : POST /api/p/facture/:jeton/payer, POST /api/p/devis/:jeton/acompte,
 *            GET /api/p/paiement-demo/:session, POST /api/p/paiement-demo/:session/confirmer (sans clé Stripe)
 *   Webhooks : POST /api/paiements/webhook/stripe, GET|POST /api/paiements/webhook/alma?pid=…
 *   Artisan (JWT) : GET /api/paiements/connect, POST /api/paiements/connect
 * Renvoie null si la route ne concerne pas ce module.
 */
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json, lireJson, reponseErreur } from '../documents/commun';
import { asParcours } from '../documents/env';
import { confirmerDemo, connectInscription, connectStatut, demanderAcompte, ipnAlma, lireSessionDemo, payerFacture, webhookStripe } from './handlers';

const sansCache = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

export async function handlePaiementsRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  const e = asParcours(env);
  const m = request.method;
  try {
    let r = pathname.match(/^\/api\/p\/facture\/([A-Za-z0-9_-]{1,100})\/payer$/);
    if (r && m === 'POST') return json(await payerFacture(e, r[1], request, await lireJson(request, 2000)), 200, sansCache);
    r = pathname.match(/^\/api\/p\/devis\/([A-Za-z0-9_-]{1,100})\/acompte$/);
    if (r && m === 'POST') return json(await demanderAcompte(e, r[1], request, await lireJson(request, 2000)), 200, sansCache);
    r = pathname.match(/^\/api\/p\/paiement-demo\/(pay_[A-Za-z0-9_-]{22})(\/confirmer)?$/);
    if (r && m === 'GET' && !r[2]) return json(await lireSessionDemo(e, r[1]), 200, sansCache);
    if (r && m === 'POST' && r[2]) return json(await confirmerDemo(e, r[1]), 200, sansCache);

    if (!pathname.startsWith('/api/paiements/')) return null;
    if (pathname === '/api/paiements/webhook/stripe' && m === 'POST') return json(await webhookStripe(e, request));
    if (pathname === '/api/paiements/webhook/alma' && (m === 'GET' || m === 'POST')) return json(await ipnAlma(e, request));

    if (pathname === '/api/paiements/connect') {
      const auth = await requireAuth(request, env);
      if (m === 'GET') return json(await connectStatut(e, auth.organizationId));
      if (m === 'POST') {
        if (auth.role !== 'patron') return json({ error: 'interdit', message: "Seul le patron peut activer l'encaissement en ligne." }, 403);
        return json(await connectInscription(e, auth.organizationId));
      }
    }
    return null;
  } catch (err) {
    return reponseErreur(err, 'paiements');
  }
}
