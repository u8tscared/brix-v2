// Petit client du worker Brix. Base : VITE_API_BASE, sinon même origine (l'app est servie par le worker).
// En preview statique (pas de worker), cloudDisponible() renvoie false et l'app reste 100 % locale.

export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

// ── Session ─────────────────────────────────────────────────────────────────────────

export interface Session {
  token: string;
  userId: string;
  orgId: string;
  email: string;
}

const CLE_SESSION = 'brix-session';
const ecouteurs = new Set<(s: Session | null) => void>();

export function lireSession(): Session | null {
  try {
    const raw = localStorage.getItem(CLE_SESSION);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function ecrireSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(CLE_SESSION, JSON.stringify(s));
    else localStorage.removeItem(CLE_SESSION);
  } catch {
    /* navigation privée : session en mémoire seulement, perdue au rechargement */
  }
  ecouteurs.forEach((f) => f(s));
}

export const surSession = (f: (s: Session | null) => void) => {
  ecouteurs.add(f);
  return () => void ecouteurs.delete(f);
};

// ── Erreurs ─────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
  /** Le serveur n'a pas répondu (hors ligne, coupure). */
  get horsLigne() {
    return this.status === 0;
  }
}

const MESSAGES: Record<number, string> = {
  0: 'Pas de connexion internet. Vos modifications sont gardées sur cet appareil.',
  401: 'Votre session a expiré, reconnectez-vous.',
  403: "Vous n'avez pas accès à cette action.",
  404: 'Introuvable.',
  413: 'Trop de données à envoyer en une fois.',
  429: "Trop d'essais. Réessayez dans quelques minutes.",
  500: 'Le serveur a rencontré un problème. Réessayez dans un instant.',
  503: 'Service momentanément indisponible. Réessayez dans un instant.',
};

/** Appelé quand le serveur refuse le jeton (session expirée ou révoquée). */
let surExpiration: (() => void) | null = null;
export const quandSessionExpire = (f: () => void) => {
  surExpiration = f;
};

export async function api<T = unknown>(chemin: string, o: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['content-type'] = 'application/json';
  const s = o.auth === false ? null : lireSession();
  if (s) headers.authorization = `Bearer ${s.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${chemin}`, { method: o.method ?? (o.body === undefined ? 'GET' : 'POST'), headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal: o.signal });
  } catch {
    throw new ApiError(0, MESSAGES[0]);
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* réponse vide ou non JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && s) surExpiration?.();
    const msg = typeof data.error === 'string' && data.error !== 'Erreur interne' ? data.error : MESSAGES[res.status] ?? MESSAGES[500];
    throw new ApiError(res.status, msg, typeof data.code === 'string' ? data.code : undefined, data);
  }
  return data as T;
}

// ── Disponibilité du cloud ──────────────────────────────────────────────────────────

let dispo: Promise<boolean> | null = null;

/** Le worker répond-il ? (mis en cache). En preview statique, /api/health renvoie la page HTML : false. */
export function cloudDisponible(): Promise<boolean> {
  if (!dispo) {
    dispo = fetch(`${API_BASE}/api/health`, { headers: { accept: 'application/json' } })
      .then(async (r) => r.ok && ((await r.json()) as { ok?: boolean }).ok === true)
      .catch(() => false);
    // Hors ligne au démarrage avec une session : on retentera plus tard.
    void dispo.then((ok) => {
      if (!ok && lireSession()) dispo = null;
    });
  }
  return dispo;
}

export interface ConfigAuth {
  google: { clientId: string } | null;
  apple: boolean;
}

let config: Promise<ConfigAuth> | null = null;
export function configAuth(): Promise<ConfigAuth> {
  const vide: ConfigAuth = { google: null, apple: false };
  if (!config) {
    config = cloudDisponible().then((ok) => (ok ? api<ConfigAuth>('/api/auth/config', { auth: false }).catch(() => vide) : vide));
  }
  return config;
}

// ── Comptes ─────────────────────────────────────────────────────────────────────────

export interface Profil {
  user: { id: string; email: string; firstName: string; lastName: string; role: string; google: boolean; motDePasse: boolean };
  organization: { id: string; name?: string };
}
export type ReponseSession = Profil & { token: string };

/** Garde la session renvoyée par le serveur. */
export function ouvrirSession(r: ReponseSession): Session {
  const s = { token: r.token, userId: r.user.id, orgId: r.organization.id, email: r.user.email };
  ecrireSession(s);
  return s;
}

export const connexion = (email: string, password: string) => api<ReponseSession>('/api/auth/login', { body: { email, password }, auth: false });
export const connexionGoogle = (credential: string, extra: Record<string, unknown> = {}) => api<ReponseSession>('/api/auth/google', { body: { credential, mode: 'login', ...extra }, auth: false });
export const moi = () => api<Profil>('/api/auth/me');
export const demanderNouveauMotDePasse = (email: string) => api<{ ok: true }>('/api/auth/mot-de-passe/oubli', { body: { email }, auth: false });
export const choisirMotDePasse = (jeton: string, motDePasse: string) => api<ReponseSession>('/api/auth/mot-de-passe/nouveau', { body: { jeton, motDePasse }, auth: false });
export const deconnecterServeur = (partout = false) => api<{ ok: true }>('/api/auth/logout', { body: { partout } });

/** Identité lue dans un jeton Google, pour l'affichage seulement (le serveur, lui, vérifie la signature). */
export function lireJetonGoogle(credential: string): { email: string; prenom: string; nom: string } | null {
  try {
    const b = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)))) as Record<string, string>;
    return { email: p.email ?? '', prenom: p.given_name ?? '', nom: p.family_name ?? '' };
  } catch {
    return null;
  }
}
