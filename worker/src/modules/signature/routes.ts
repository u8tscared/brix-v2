/**
 * Routes du module signature.
 *   Public : POST /api/p/devis/:jeton/code, POST /api/p/devis/:jeton/signer,
 *            POST /api/p/devis/:jeton/signature-avancee (Yousign), GET /api/p/devis/:jeton/certificat
 *   Webhook : POST /api/signature/webhook/yousign
 *   Artisan (JWT) : GET /api/signature/devis/:id/preuves, GET /api/signature/preuves/:id/dossier
 * Renvoie null si la route ne concerne pas ce module.
 */
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json, lireJson, reponseErreur } from '../documents/commun';
import { asParcours } from '../documents/env';
import { envoyerCode } from './codes';
import { certificat, dossierPreuve, preuvesDevis, signatureAvancee, signer, webhookYousign } from './handlers';

const sansCache = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

export async function handleSignatureRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  const e = asParcours(env);
  const m = request.method;
  try {
    let r = pathname.match(/^\/api\/p\/devis\/([A-Za-z0-9_-]{1,100})\/(code|signer|signature-avancee|certificat)$/);
    if (r) {
      const [, jeton, action] = r;
      if (action === 'certificat' && m === 'GET') {
        return new Response(await certificat(e, jeton, request), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            // Page autonome : aucun script, images en data: uniquement.
            'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'",
            ...sansCache,
          },
        });
      }
      if (m !== 'POST') return null;
      // L'image de signature peut peser jusqu'à ~540 Ko en base64.
      const body = await lireJson(request, action === 'signer' ? 600_000 : 8000);
      if (action === 'code') return json(await envoyerCode(e, jeton, request, body), 200, sansCache);
      if (action === 'signer') return json(await signer(e, jeton, request, body), 200, sansCache);
      if (action === 'signature-avancee') return json(await signatureAvancee(e, jeton, request, body), 200, sansCache);
    }

    if (!pathname.startsWith('/api/signature/')) return null;
    if (pathname === '/api/signature/webhook/yousign' && m === 'POST') return json(await webhookYousign(e, request));

    const auth = await requireAuth(request, env);
    r = pathname.match(/^\/api\/signature\/devis\/([A-Za-z0-9_-]{1,64})\/preuves$/);
    if (r && m === 'GET') return json(await preuvesDevis(e, auth.organizationId, r[1]));
    r = pathname.match(/^\/api\/signature\/preuves\/(prv_[A-Za-z0-9_-]{16})\/dossier$/);
    if (r && m === 'GET') {
      return new Response(await dossierPreuve(e, auth.organizationId, r[1]), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="dossier-de-preuve-${r[1]}.json"` },
      });
    }
    return null;
  } catch (err) {
    return reponseErreur(err, 'signature');
  }
}
