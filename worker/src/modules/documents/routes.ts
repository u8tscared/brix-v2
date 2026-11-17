/**
 * Routes du module documents.
 *   Public (jeton) : GET /api/p/devis/:jeton, GET /api/p/facture/:jeton, GET /api/p/chantier/:jeton,
 *                    POST /api/p/devis/:jeton/refuser, POST /api/p/devis/:jeton/question
 *   Artisan (JWT)  : /api/documents/liens, /api/documents/complements/:type/:id, /api/documents/suivi/:type/:id,
 *                    /api/documents/pdf/:type/:id
 * Renvoie null si la route ne concerne pas ce module (les autres /api/p/… sont à signature et paiements).
 */
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json, lireJson, reponseErreur } from './commun';
import { asParcours } from './env';
import { DocumentsService, ouvrirChantier, ouvrirDevis, ouvrirFacture, questionDevis, refuserDevis, typeDocument } from './handlers';

const JETON = '([A-Za-z0-9_-]{1,100})';
const sansCache = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' };

export async function handleDocumentsRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  const e = asParcours(env);
  const m = request.method;
  try {
    // ---------- Public ----------
    let r = pathname.match(new RegExp(`^/api/p/(devis|facture|chantier)/${JETON}$`));
    if (r && m === 'GET') {
      const [, type, jeton] = r;
      const vue = type === 'devis' ? await ouvrirDevis(e, jeton, request) : type === 'facture' ? await ouvrirFacture(e, jeton, request) : await ouvrirChantier(e, jeton, request);
      return json(vue, 200, sansCache);
    }
    r = pathname.match(new RegExp(`^/api/p/devis/${JETON}/(refuser|question)$`));
    if (r && m === 'POST') {
      const body = await lireJson(request, 8000);
      return json(r[2] === 'refuser' ? await refuserDevis(e, r[1], request, body) : await questionDevis(e, r[1], request, body), 200, sansCache);
    }
    if (!pathname.startsWith('/api/documents/')) return null;

    // ---------- Artisan ----------
    const auth = await requireAuth(request, env);
    const s = new DocumentsService(e, { organizationId: auth.organizationId, userId: auth.userId });
    const url = new URL(request.url);

    if (pathname === '/api/documents/liens' && m === 'POST') return json(await s.creerLien(await lireJson(request, 200_000)), 201);
    if (pathname === '/api/documents/liens' && m === 'GET') return json(await s.listerLiens(url.searchParams.get('type'), url.searchParams.get('documentId')));
    r = pathname.match(/^\/api\/documents\/liens\/([A-Za-z0-9_-]{22})\/revoquer$/);
    if (r && m === 'POST') return json(await s.revoquer(r[1]));
    r = pathname.match(/^\/api\/documents\/(complements|suivi|pdf)\/([a-z]+)\/([A-Za-z0-9_-]{1,64})$/);
    if (r) {
      const type = typeDocument(r[2]);
      if (r[1] === 'complements' && m === 'PUT') return json(await s.majComplements(type, r[3], await lireJson(request, 200_000)));
      if (r[1] === 'suivi' && m === 'GET') return json(await s.suivi(type, r[3]));
      if (r[1] === 'pdf' && m === 'PUT') return json(await s.deposerPdf(type, r[3], request));
    }
    return null;
  } catch (err) {
    return reponseErreur(err, 'documents');
  }
}
