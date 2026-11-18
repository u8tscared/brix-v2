/**
 * Adresses et constantes de Brix AI MCP (serveur MCP + serveur d'autorisation OAuth 2.1).
 * Tout dérive de APP_ORIGIN (https://app.brix-app.fr) : l'émetteur (issuer) et la ressource
 * protégée `${APP_ORIGIN}/api/mcp`, exactement l'adresse que l'artisan colle dans son assistant.
 */
import type { Env } from '../../env';

export const SCOPE_LECTURE = 'brix.lecture';
export const SCOPE_ECRITURE = 'brix.ecriture';
export const SCOPES = [SCOPE_LECTURE, SCOPE_ECRITURE] as const;
/** Portée demandée par défaut (défi 401, scope absent à /authorize). */
export const SCOPE_DEFAUT = `${SCOPE_LECTURE} ${SCOPE_ECRITURE}`;

export const DOC_URL = 'https://brix-app.fr/connecteur-ia';

/** Durées (millisecondes). */
export const DUREE = {
  demande: 10 * 60_000,
  code: 2 * 60_000,
  acces: 60 * 60_000,
  refreshGlissant: 30 * 86_400_000,
  refreshAbsolu: 90 * 86_400_000,
};

export const origine = (env: Pick<Env, 'APP_ORIGIN'>) => (env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/+$/, '');
export const emetteur = origine;
export const ressource = (env: Pick<Env, 'APP_ORIGIN'>) => `${origine(env)}/api/mcp`;
export const urlPrm = (env: Pick<Env, 'APP_ORIGIN'>) => `${origine(env)}/.well-known/oauth-protected-resource/api/mcp`;

/** Normalise une ressource RFC 8707 : hôte en minuscules, sans barre finale ni fragment. */
export function memeRessource(env: Pick<Env, 'APP_ORIGIN'>, r: string | null | undefined): boolean {
  if (!r) return false;
  try {
    const u = new URL(r);
    if (u.hash || u.search) return false;
    const norm = `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
    return norm === ressource(env);
  } catch {
    return false;
  }
}

/** Ne garde que les portées connues, dans l'ordre canonique. Lecture toujours incluse. */
export function normaliserScope(s: string | null | undefined): { scope: string; inconnues: string[] } {
  const demandees = (s ?? '').split(/\s+/).filter(Boolean);
  const inconnues = demandees.filter((x) => !(SCOPES as readonly string[]).includes(x) && x !== 'offline_access');
  const garde = SCOPES.filter((x) => x === SCOPE_LECTURE || demandees.includes(x));
  return { scope: garde.join(' '), inconnues };
}

export const aEcriture = (scope: string) => scope.split(/\s+/).includes(SCOPE_ECRITURE);

export function metadonneesRessource(env: Env) {
  return {
    resource: ressource(env),
    authorization_servers: [emetteur(env)],
    bearer_methods_supported: ['header'],
    scopes_supported: [...SCOPES],
    resource_name: 'Brix AI',
    resource_documentation: DOC_URL,
  };
}

export function metadonneesServeur(env: Env) {
  const o = origine(env);
  return {
    issuer: emetteur(env),
    authorization_endpoint: `${o}/api/mcp/oauth/authorize`,
    token_endpoint: `${o}/api/mcp/oauth/token`,
    registration_endpoint: `${o}/api/mcp/oauth/register`,
    revocation_endpoint: `${o}/api/mcp/oauth/revoke`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    scopes_supported: [...SCOPES],
    service_documentation: DOC_URL,
  };
}

/** CORS ouvert : chaque appel exige un jeton, l'origine du navigateur n'apporte rien (voir README). */
export const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id, mcp-method, mcp-name, accept, last-event-id',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-expose-headers': 'WWW-Authenticate, Mcp-Session-Id',
  'access-control-max-age': '86400',
};

export function jsonCors(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}
