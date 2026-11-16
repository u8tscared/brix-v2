import type { Env } from '../../env';
import { requireAuth, signJwt, timingSafeEqual } from '../../lib/auth';
import { HttpError, json, readJson, uid } from '../../lib/http';

async function hashPassword(password: string, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return `${salt}:${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;
}

/** Routes CORE : santé, inscription (onboarding), connexion, profil d'entreprise. */
export async function handleCoreRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname === '/api/health') return json({ ok: true, version: '2.0.0' });

  if (pathname === '/api/auth/signup' && request.method === 'POST') {
    const body = await readJson<{ email: string; password: string; firstName: string; lastName: string; company: Record<string, unknown>; enabledModules: string[]; plan?: string }>(request);
    if (!body.email || !body.password || body.password.length < 8) throw new HttpError(400, 'E-mail et mot de passe (8 caractères minimum) requis');
    const orgId = uid('org');
    const userId = uid('usr');
    const c = body.company ?? {};
    await env.DB.batch([
      env.DB.prepare('INSERT INTO organizations (id, name, siret, trade, size, plan, enabled_modules) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(orgId, String(c.name ?? ''), String(c.siret ?? ''), String(c.trade ?? 'autre'), String(c.size ?? 'solo'), body.plan ?? 'start', JSON.stringify(body.enabledModules ?? [])),
      env.DB.prepare('INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, orgId, body.email.toLowerCase(), await hashPassword(body.password), body.firstName, body.lastName, 'patron'),
    ]);
    return json({ token: await signJwt({ sub: userId, org: orgId, role: 'patron' }, env.JWT_SECRET), organizationId: orgId }, 201);
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const { email, password } = await readJson<{ email: string; password: string }>(request);
    const user = await env.DB.prepare('SELECT id, organization_id, password_hash, role FROM users WHERE email = ?').bind(String(email).toLowerCase()).first<{ id: string; organization_id: string; password_hash: string; role: string }>();
    if (!user) throw new HttpError(401, 'Identifiants incorrects');
    const [salt] = user.password_hash.split(':');
    if (!timingSafeEqual(await hashPassword(password, salt), user.password_hash)) throw new HttpError(401, 'Identifiants incorrects');
    return json({ token: await signJwt({ sub: user.id, org: user.organization_id, role: user.role }, env.JWT_SECRET) });
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
