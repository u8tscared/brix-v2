// Routes d'accès : inscription, connexion, profil, déconnexion (un appareil ou tous).
import type { Env } from '../../env';
import { requireAuth, timingSafeEqual } from '../../lib/auth';
import { HttpError, json, readJson } from '../../lib/http';
import {
  EMAIL_RE, creerCompte, effacerEchecs, hashPassword, ipDe, noterEchec, normaliserEmail, profil, session, userParEmail, verifierLimite, verifierMotDePasse,
  type Inscription,
} from './comptes';

const MSG_IDENTIFIANTS = 'E-mail ou mot de passe incorrect';

export async function handleAuthRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname === '/api/auth/signup' && request.method === 'POST') {
    const body = await readJson<Inscription & { email: string; password: string }>(request);
    const email = normaliserEmail(body.email);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Adresse e-mail invalide');
    verifierMotDePasse(body.password);
    const u = await creerCompte(env, email, body, { passwordHash: await hashPassword(body.password) });
    return session(env, u, 201);
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await readJson<{ email: string; password: string }>(request);
    const email = normaliserEmail(body.email);
    const cle = `${email}|${ipDe(request)}`;
    await verifierLimite(env, cle);
    const user = email ? await userParEmail(env, email) : null;
    // Toujours un calcul de hash, même sans compte : le temps de réponse ne trahit pas l'existence d'un compte.
    const [salt] = (user?.password_hash ?? 'x:').split(':');
    const calcule = await hashPassword(String(body.password ?? ''), salt);
    if (!user || !user.password_hash || !timingSafeEqual(calcule, user.password_hash)) {
      await noterEchec(env, cle);
      if (user && !user.password_hash && user.google_sub) return json({ error: 'Ce compte se connecte avec Google.', code: 'compte_google' }, 401);
      throw new HttpError(401, MSG_IDENTIFIANTS);
    }
    await effacerEchecs(env, cle);
    return session(env, user);
  }

  if (pathname === '/api/auth/me' && request.method === 'GET') {
    const auth = await requireAuth(request, env);
    return json(await profil(env, auth.userId));
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    // Jetons sans état : l'appareil oublie le sien. `partout` révoque tous les jetons déjà émis.
    const body = await readJson<{ partout?: boolean }>(request).catch(() => ({ partout: false }));
    if (body.partout) {
      const auth = await requireAuth(request, env);
      await env.DB.prepare('UPDATE users SET sessions_revoquees_avant = ? WHERE id = ?').bind(Math.floor(Date.now() / 1000), auth.userId).run();
    }
    return json({ ok: true });
  }

  return null;
}
