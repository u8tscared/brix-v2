import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json, readJson } from '../../lib/http';
import { handleAuthRoutes } from './auth-routes';
import { handleGoogleRoutes } from './google';
import { handleMotDePasseRoutes } from './mot-de-passe';

/** Routes CORE : santé, configuration publique, comptes (auth-routes, google, mot-de-passe), profil d'entreprise. */
export async function handleCoreRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname === '/api/health') return json({ ok: true, version: '2.0.0' });

  // Ce que le front doit savoir pour afficher les boutons de connexion (aucune clé dans le build).
  if (pathname === '/api/auth/config' && request.method === 'GET') {
    return json({ google: env.GOOGLE_CLIENT_ID ? { clientId: env.GOOGLE_CLIENT_ID } : null, apple: false });
  }

  if (pathname.startsWith('/api/auth/')) {
    for (const h of [handleAuthRoutes, handleGoogleRoutes, handleMotDePasseRoutes]) {
      const res = await h(request, env, pathname);
      if (res) return res;
    }
    return null;
  }

  if (pathname === '/api/organization' && request.method === 'GET') {
    const auth = await requireAuth(request, env);
    const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(auth.organizationId).first();
    return json({ organization: org });
  }

  if (pathname === '/api/organization/modules' && request.method === 'PUT') {
    const auth = await requireAuth(request, env);
    const { enabledModules } = await readJson<{ enabledModules: string[] }>(request);
    await env.DB.prepare('UPDATE organizations SET enabled_modules = ? WHERE id = ?').bind(JSON.stringify(enabledModules), auth.organizationId).run();
    return json({ ok: true });
  }

  return null;
}
