// Mot de passe oublié : lien signé valable 1 h, à usage unique (la signature dépend du hash actuel).
import type { Env } from '../../env';
import { b64url, fromB64url, hmac, secretJwt, timingSafeEqual } from '../../lib/auth';
import { HttpError, json, readJson } from '../../lib/http';
import { envoyerEmail } from '../emails/envoi';
import { EMAIL_RE, effacerEchecs, hashPassword, ipDe, normaliserEmail, noterEchec, session, userParEmail, userParId, verifierLimite, verifierMotDePasse, type LigneUser } from './comptes';

const DUREE = 60 * 60; // 1 h

const empreinte = (u: Pick<LigneUser, 'id' | 'password_hash'>) => `${u.id}|${u.password_hash ?? 'sans'}`;

export async function creerJetonMdp(env: Env, u: Pick<LigneUser, 'id' | 'password_hash'>, now = Date.now()) {
  const corps = b64url(new TextEncoder().encode(JSON.stringify({ sub: u.id, exp: Math.floor(now / 1000) + DUREE })));
  const sig = b64url(await hmac(secretJwt(env, true), `mdp|${corps}|${empreinte(u)}`));
  return `${corps}.${sig}`;
}

/** Renvoie l'utilisateur si le jeton est valide, non expiré et pas encore utilisé. */
export async function lireJetonMdp(env: Env, jeton: string): Promise<LigneUser | null> {
  const [corps, sig] = String(jeton ?? '').split('.');
  if (!corps || !sig) return null;
  let p: { sub?: string; exp?: number };
  try {
    p = JSON.parse(new TextDecoder().decode(fromB64url(corps)));
  } catch {
    return null;
  }
  if (!p.sub || typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
  const u = await userParId(env, p.sub);
  if (!u) return null;
  const attendu = b64url(await hmac(secretJwt(env, true), `mdp|${corps}|${empreinte(u)}`));
  return timingSafeEqual(attendu, sig) ? u : null;
}

/** Racine de l'app pour le lien : l'origine de la demande si elle est connue (dev local), sinon APP_ORIGIN. */
function racine(request: Request, env: Env) {
  const o = request.headers.get('origin');
  const ok = o && (o === env.APP_ORIGIN || o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1'));
  return (ok ? o : env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/$/, '');
}

export async function handleMotDePasseRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname === '/api/auth/mot-de-passe/oubli' && request.method === 'POST') {
    const body = await readJson<{ email: string }>(request);
    const email = normaliserEmail(body.email);
    // Toujours la même réponse : on ne dit jamais si un compte existe.
    const reponse = json({ ok: true });
    if (!EMAIL_RE.test(email)) return reponse;
    const cle = `oubli|${email}`;
    try {
      await verifierLimite(env, cle, 5);
    } catch {
      return reponse;
    }
    await noterEchec(env, cle);
    const u = await userParEmail(env, email);
    if (!u) return reponse;
    const lien = `${racine(request, env)}/#/mot-de-passe?jeton=${await creerJetonMdp(env, u)}`;
    const r = await envoyerEmail(env, { modele: 'mot_de_passe', donnees: { prenom: u.first_name ?? '', lien, minutes: DUREE / 60 }, a: u.email, deNom: 'Brix' });
    // Sans fournisseur d'e-mail (développement), le lien est journalisé pour pouvoir tester le parcours.
    if (r.simule && env.ENVIRONMENT !== 'production') console.log('[mot de passe] lien simulé', lien);
    return reponse;
  }

  if (pathname === '/api/auth/mot-de-passe/nouveau' && request.method === 'POST') {
    const body = await readJson<{ jeton: string; motDePasse: string }>(request);
    verifierMotDePasse(body.motDePasse);
    const u = await lireJetonMdp(env, body.jeton);
    if (!u) throw new HttpError(400, 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.');
    const maintenant = Math.floor(Date.now() / 1000);
    // Nouveau mot de passe : les autres appareils sont déconnectés, celui-ci reçoit une session neuve.
    await env.DB.prepare('UPDATE users SET password_hash = ?, sessions_revoquees_avant = ? WHERE id = ?').bind(await hashPassword(body.motDePasse), maintenant, u.id).run();
    await effacerEchecs(env, `${u.email}|${ipDe(request)}`);
    return session(env, u);
  }

  return null;
}
