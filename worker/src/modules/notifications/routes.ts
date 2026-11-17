/**
 * Routes /api/notifications/* (artisan connecté, JWT via worker/src/lib/auth.ts).
 * Renvoie null si la route ne concerne pas ce module.
 */
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json, lireJson, reponseErreur } from '../documents/commun';
import { asParcours } from '../documents/env';
import { NotificationsService } from './handlers';

export async function handleNotificationsRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname !== '/api/notifications' && !pathname.startsWith('/api/notifications/')) return null;
  try {
    const auth = await requireAuth(request, env);
    const s = new NotificationsService(asParcours(env), { organizationId: auth.organizationId, userId: auth.userId });
    const m = request.method;
    const url = new URL(request.url);

    if (pathname === '/api/notifications' && m === 'GET') {
      const avant = Number(url.searchParams.get('avant'));
      return json(await s.lister({ nonLues: url.searchParams.get('nonLues') === '1', limite: Number(url.searchParams.get('limite')) || 50, avant: avant > 0 ? avant : undefined }));
    }
    if (pathname === '/api/notifications/lu' && m === 'POST') return json(await s.marquerLu(await lireJson(request)));
    if (pathname === '/api/notifications/preferences' && m === 'GET') return json(await s.preferences());
    if (pathname === '/api/notifications/preferences' && m === 'PUT') return json(await s.majPreferences(await lireJson(request)));
    if (pathname === '/api/notifications/push/cle' && m === 'GET') return json(s.cleVapid());
    if (pathname === '/api/notifications/push/abonnement' && m === 'POST') return json(await s.abonner(await lireJson(request, 8000)), 201);
    if (pathname === '/api/notifications/push/abonnement' && m === 'DELETE') return json(await s.desabonner(await lireJson(request, 8000)));
    if (pathname === '/api/notifications/push/test' && m === 'POST') return json(await s.tester());
    return null;
  } catch (e) {
    return reponseErreur(e, 'notifications');
  }
}
