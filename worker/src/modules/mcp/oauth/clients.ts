/**
 * Identité des assistants (clients OAuth publics) :
 *  - DCR, RFC 7591 : POST /api/mcp/oauth/register (Cursor, Le Chat, Perplexity, Grok, Copilot Studio…)
 *  - CIMD : client_id = URL https d'un document de métadonnées (Claude, Claude Code, ChatGPT, VS Code)
 * Les redirections sont toujours validées contre la liste du client ; le port est ignoré en boucle locale.
 */
import type { Env } from '../../../env';
import { first, run } from '../../fournisseurs/depot';
import { randomToken, sha256Hex } from '../../fournisseurs/util';

export interface ClientOAuth {
  id: string;
  kind: 'dcr' | 'cimd';
  nom: string;
  hote: string | null; // hôte du client_id (CIMD) ou de client_uri (DCR, déclaratif)
  redirect_uris: string[];
  logo_uri?: string;
}

export class ErreurOAuth extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

const SCHEMAS_INTERDITS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:', 'about:', 'ftp:', 'ws:', 'wss:']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Redirection acceptable à l'inscription : https, http en boucle locale, ou schéma privé (cursor://…). */
export function redirectionValide(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.username || u.password) return false;
  if (u.protocol === 'https:') return !!u.hostname;
  if (u.protocol === 'http:') return LOOPBACK.has(u.hostname);
  if (SCHEMAS_INTERDITS.has(u.protocol)) return false;
  return /^[a-z][a-z0-9+.-]*:$/.test(u.protocol);
}

/** Correspondance exacte, sauf le port des adresses de boucle locale (Claude Code, VS Code, Gemini CLI). */
export function redirectionCorrespond(enregistrees: string[], demandee: string): boolean {
  if (enregistrees.includes(demandee)) return true;
  let d: URL;
  try {
    d = new URL(demandee);
  } catch {
    return false;
  }
  if (d.protocol !== 'http:' || !LOOPBACK.has(d.hostname)) return false;
  return enregistrees.some((r) => {
    try {
      const e = new URL(r);
      return e.protocol === 'http:' && e.hostname === d.hostname && e.pathname === d.pathname && e.search === d.search;
    } catch {
      return false;
    }
  });
}

export const seulementBoucleLocale = (uris: string[]) =>
  uris.every((r) => {
    try {
      return LOOPBACK.has(new URL(r).hostname);
    } catch {
      return false;
    }
  });

const hoteDe = (u: unknown) => {
  try {
    return typeof u === 'string' ? new URL(u).hostname : null;
  } catch {
    return null;
  }
};

const texteCourt = (v: unknown, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

// ---------------------------------------------------------------- DCR (RFC 7591)

const LIMITE_PAR_HEURE = 30;

export async function inscrireClient(env: Env, corps: Record<string, unknown>, ip: string) {
  const uris = corps.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10) throw new ErreurOAuth('invalid_redirect_uri', 'redirect_uris est obligatoire (1 à 10 adresses)');
  for (const u of uris) if (!redirectionValide(u)) throw new ErreurOAuth('invalid_redirect_uri', `Adresse de retour refusée : ${String(u).slice(0, 200)}`);
  const grants = Array.isArray(corps.grant_types) ? corps.grant_types.map(String) : ['authorization_code', 'refresh_token'];
  if (!grants.includes('authorization_code')) throw new ErreurOAuth('invalid_client_metadata', 'grant_types doit contenir authorization_code');
  const types = Array.isArray(corps.response_types) ? corps.response_types.map(String) : ['code'];
  if (!types.includes('code')) throw new ErreurOAuth('invalid_client_metadata', 'response_types doit contenir code');

  const ipHash = (await sha256Hex(`ip:${ip}`)).slice(0, 32);
  const maintenant = Date.now();
  const n = await first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM mcp_oauth_clients WHERE ip_hash = ? AND created_at > ?`, ipHash, maintenant - 3_600_000);
  if ((n?.n ?? 0) >= LIMITE_PAR_HEURE) throw new ErreurOAuth('too_many_requests', 'Trop d’inscriptions depuis cette adresse, réessayez dans une heure', 429);
  // Ménage : clients DCR jamais utilisés depuis 30 jours (Claude s'inscrit à chaque connexion).
  await run(
    env,
    `DELETE FROM mcp_oauth_clients WHERE kind = 'dcr' AND created_at < ? AND id NOT IN (SELECT client_id FROM mcp_oauth_grants)`,
    maintenant - 30 * 86_400_000,
  );

  const meta = {
    client_id: `brx_cli_${randomToken(18)}`,
    client_id_issued_at: Math.floor(maintenant / 1000),
    client_name: texteCourt(corps.client_name) ?? 'Assistant IA',
    client_uri: typeof corps.client_uri === 'string' && corps.client_uri.startsWith('https://') ? corps.client_uri.slice(0, 500) : undefined,
    logo_uri: typeof corps.logo_uri === 'string' && corps.logo_uri.startsWith('https://') ? corps.logo_uri.slice(0, 500) : undefined,
    redirect_uris: uris as string[],
    grant_types: grants.filter((g) => g === 'authorization_code' || g === 'refresh_token'),
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: corps.application_type === 'native' ? 'native' : corps.application_type === 'web' ? 'web' : undefined,
    scope: typeof corps.scope === 'string' ? corps.scope.slice(0, 200) : undefined,
  };
  await run(env, `INSERT INTO mcp_oauth_clients (id, kind, metadata_json, ip_hash, created_at) VALUES (?, 'dcr', ?, ?, ?)`, meta.client_id, JSON.stringify(meta), ipHash, maintenant);
  return meta;
}

// ---------------------------------------------------------------- CIMD

const TAILLE_MAX_CIMD = 5 * 1024;
const DELAI_CIMD_MS = 4000;

/** Une URL https avec un chemin, vers un hôte public (pas d'IP privée, pas de nom local). */
export function urlCimdAcceptable(id: string): URL | null {
  let u: URL;
  try {
    u = new URL(id);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.port) return null;
  if (u.pathname === '/' || !u.pathname) return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || !h.includes('.')) return null;
  // Pas d'adresse IP littérale : les clients sérieux publient leur document sous un nom de domaine.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.startsWith('[')) return null;
  return u;
}

async function lireLimite(res: Response): Promise<string> {
  const annonce = Number(res.headers.get('content-length') ?? 0);
  if (annonce > TAILLE_MAX_CIMD) throw new ErreurOAuth('invalid_client', 'Document client trop volumineux');
  const reader = res.body?.getReader();
  if (!reader) return '';
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAILLE_MAX_CIMD) {
      await reader.cancel();
      throw new ErreurOAuth('invalid_client', 'Document client trop volumineux');
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let o = 0;
  for (const m of morceaux) (tout.set(m, o), (o += m.byteLength));
  return new TextDecoder().decode(tout);
}

function dureeCache(res: Response) {
  const cc = res.headers.get('cache-control') ?? '';
  const m = cc.match(/max-age=(\d+)/);
  const s = m ? Number(m[1]) : 3600;
  return Math.min(Math.max(s, 300), 86_400) * 1000;
}

async function chargerCimd(env: Env, url: URL): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url.toString(), { redirect: 'manual', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(DELAI_CIMD_MS) });
  } catch {
    throw new ErreurOAuth('invalid_client', 'Document client injoignable');
  }
  if (res.status !== 200) throw new ErreurOAuth('invalid_client', `Document client indisponible (HTTP ${res.status})`);
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(await lireLimite(res));
  } catch (e) {
    if (e instanceof ErreurOAuth) throw e;
    throw new ErreurOAuth('invalid_client', 'Document client illisible');
  }
  if (doc.client_id !== url.toString()) throw new ErreurOAuth('invalid_client', 'Le document client ne correspond pas à son adresse');
  if (!Array.isArray(doc.redirect_uris) || doc.redirect_uris.length === 0 || !doc.redirect_uris.every(redirectionValide)) {
    throw new ErreurOAuth('invalid_client', 'Le document client n’a pas d’adresse de retour valide');
  }
  const maintenant = Date.now();
  await run(
    env,
    `INSERT INTO mcp_oauth_clients (id, kind, metadata_json, created_at, expire_le) VALUES (?, 'cimd', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET metadata_json = excluded.metadata_json, expire_le = excluded.expire_le`,
    url.toString(), JSON.stringify(doc), maintenant, maintenant + dureeCache(res),
  );
  return doc;
}

function versClient(id: string, kind: 'dcr' | 'cimd', m: Record<string, unknown>): ClientOAuth {
  return {
    id,
    kind,
    nom: texteCourt(m.client_name) ?? 'Assistant IA',
    hote: kind === 'cimd' ? hoteDe(id) : hoteDe(m.client_uri),
    redirect_uris: (m.redirect_uris as string[]) ?? [],
    logo_uri: typeof m.logo_uri === 'string' ? m.logo_uri : undefined,
  };
}

/** Retrouve un client par son client_id (DCR en base, CIMD en cache ou téléchargé). Null si inconnu. */
export async function trouverClient(env: Env, clientId: string): Promise<ClientOAuth | null> {
  if (!clientId || clientId.length > 500) return null;
  const row = await first<{ kind: 'dcr' | 'cimd'; metadata_json: string; expire_le: number | null }>(env, `SELECT kind, metadata_json, expire_le FROM mcp_oauth_clients WHERE id = ?`, clientId);
  if (row && (row.kind === 'dcr' || (row.expire_le ?? 0) > Date.now())) return versClient(clientId, row.kind, JSON.parse(row.metadata_json));
  const url = urlCimdAcceptable(clientId);
  if (!url) return null;
  return versClient(clientId, 'cimd', await chargerCimd(env, url));
}

/** Noms rassurants pour les assistants connus (affichés à côté de l'hôte, jamais à sa place). */
const CONNUS: Record<string, string> = {
  'claude.ai': 'Claude', 'claude.com': 'Claude', 'chatgpt.com': 'ChatGPT', 'vscode.dev': 'VS Code', 'cursor.com': 'Cursor', 'www.cursor.com': 'Cursor',
  'mistral.ai': 'Le Chat', 'chat.mistral.ai': 'Le Chat', 'perplexity.ai': 'Perplexity', 'www.perplexity.ai': 'Perplexity', 'x.ai': 'Grok', 'grok.com': 'Grok',
};

export function libelleClient(c: ClientOAuth, redirectUri: string): { nom: string; connu: boolean } {
  const hotes = [c.kind === 'cimd' ? c.hote : null, hoteDe(redirectUri)].filter(Boolean) as string[];
  for (const h of hotes) if (CONNUS[h]) return { nom: CONNUS[h], connu: true };
  if (redirectUri.startsWith('cursor://')) return { nom: 'Cursor', connu: true };
  return { nom: c.nom, connu: false };
}

export { hoteDe };
