// Comptes : mots de passe, création d'entreprise + gérant, session (jeton + profil), limite d'essais.
import type { Env } from '../../env';
import { secretJwt, signJwt } from '../../lib/auth';
import { ecrireEtat } from '../../lib/etat';
import { HttpError, json, uid } from '../../lib/http';

export interface LigneUser {
  id: string;
  organization_id: string;
  email: string;
  password_hash: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  google_sub: string | null;
  sessions_revoquees_avant: number | null;
}

/** Données d'inscription communes (mot de passe ou Google). */
export interface Inscription {
  firstName?: string;
  lastName?: string;
  company?: Record<string, unknown>;
  enabledModules?: string[];
  plan?: string;
  /** État initial du store (src/lib/store.ts), écrit tel quel dans le document de l'entreprise. */
  donnees?: Record<string, unknown>;
}

export const MSG_EXISTE = 'Un compte existe déjà avec cet e-mail';
export const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

/** E-mail comparable : sans espaces, en minuscules, forme Unicode unique. */
export const normaliserEmail = (e: unknown) => String(e ?? '').normalize('NFC').trim().toLowerCase();

export async function hashPassword(password: string, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return `${salt}:${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;
}

export function verifierMotDePasse(password: string) {
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Mot de passe de 8 caractères minimum');
  if (password.length > 200) throw new HttpError(400, 'Mot de passe trop long');
}

const COLONNES = 'id, organization_id, email, password_hash, first_name, last_name, role, google_sub, sessions_revoquees_avant';

export const userParEmail = (env: Env, email: string) => env.DB.prepare(`SELECT ${COLONNES} FROM users WHERE email = ?`).bind(email).first<LigneUser>();
export const userParId = (env: Env, id: string) => env.DB.prepare(`SELECT ${COLONNES} FROM users WHERE id = ?`).bind(id).first<LigneUser>();
export const userParGoogle = (env: Env, sub: string) => env.DB.prepare(`SELECT ${COLONNES} FROM users WHERE google_sub = ?`).bind(sub).first<LigneUser>();

/** Profil renvoyé au front (jamais le hash). */
export async function profil(env: Env, userId: string) {
  const u = await userParId(env, userId);
  if (!u) throw new HttpError(401, 'Session expirée');
  const org = await env.DB.prepare('SELECT id, name, siret, trade, size, plan, city FROM organizations WHERE id = ?').bind(u.organization_id).first<Record<string, unknown>>();
  return {
    user: { id: u.id, email: u.email, firstName: u.first_name ?? '', lastName: u.last_name ?? '', role: u.role, google: !!u.google_sub, motDePasse: !!u.password_hash },
    organization: org ?? { id: u.organization_id },
  };
}

/** Réponse de connexion : jeton + profil. */
export async function session(env: Env, u: Pick<LigneUser, 'id' | 'organization_id' | 'role'>, status = 200) {
  const token = await signJwt({ sub: u.id, org: u.organization_id, role: u.role }, secretJwt(env, true));
  return json({ token, ...(await profil(env, u.id)) }, status);
}

/** Crée l'entreprise et son gérant, puis le document synchronisé si l'app l'envoie. */
export async function creerCompte(env: Env, email: string, ins: Inscription, auth: { passwordHash?: string; googleSub?: string }) {
  secretJwt(env, true); // refuse avant d'écrire quoi que ce soit si le serveur est mal configuré
  if (await userParEmail(env, email)) throw new HttpError(409, MSG_EXISTE);
  const orgId = uid('org');
  const userId = uid('usr');
  const c = ins.company ?? {};
  const txt = (v: unknown, max = 200) => String(v ?? '').slice(0, max);
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO organizations (id, name, siret, trade, size, plan, enabled_modules, city, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(
        orgId, txt(c.name), txt(c.siret, 20), txt(c.trade || 'autre', 40), txt(c.size || 'solo', 20), txt(ins.plan || 'start', 20),
        JSON.stringify(Array.isArray(ins.enabledModules) ? ins.enabledModules.map(String).slice(0, 100) : []), txt(c.city), txt(c.address), email,
      ),
      env.DB.prepare('INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role, google_sub) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(
        userId, orgId, email, auth.passwordHash ?? null, txt(ins.firstName, 80), txt(ins.lastName, 80), 'patron', auth.googleSub ?? null,
      ),
    ]);
  } catch (e) {
    // Deux inscriptions simultanées avec la même adresse : la contrainte UNIQUE tranche.
    if (/UNIQUE/i.test(e instanceof Error ? e.message : String(e))) throw new HttpError(409, MSG_EXISTE);
    throw e;
  }
  if (ins.donnees && typeof ins.donnees === 'object') await ecrireEtat(env, orgId, ins.donnees, null, userId);
  return { id: userId, organization_id: orgId, role: 'patron' };
}

// ── Limite d'essais ────────────────────────────────────────────────────────────────

const FENETRE = 15 * 60;
export const MAX_ESSAIS = 10;
const maintenant = () => Math.floor(Date.now() / 1000);

export const ipDe = (request: Request) => request.headers.get('cf-connecting-ip') || 'inconnue';

/** Lève 429 si `cle` a déjà `max` échecs sur les 15 dernières minutes. */
export async function verifierLimite(env: Env, cle: string, max = MAX_ESSAIS) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM auth_tentatives WHERE cle = ? AND a > ?').bind(cle, maintenant() - FENETRE).first<{ n: number }>();
  if ((r?.n ?? 0) >= max) throw new HttpError(429, "Trop d'essais. Réessayez dans 15 minutes.");
}

export async function noterEchec(env: Env, cle: string) {
  const t = maintenant();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO auth_tentatives (cle, a) VALUES (?, ?)').bind(cle, t),
    env.DB.prepare('DELETE FROM auth_tentatives WHERE a < ?').bind(t - FENETRE),
  ]);
}

export const effacerEchecs = (env: Env, cle: string) => env.DB.prepare('DELETE FROM auth_tentatives WHERE cle = ?').bind(cle).run();
