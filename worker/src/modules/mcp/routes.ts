/**
 * Serveur MCP « Brix AI » (Model Context Protocol, transport Streamable HTTP, JSON-RPC 2.0).
 *
 *   POST /api/mcp            avec Authorization: Bearer brx_mcp_…
 *   POST /api/mcp/k/<jeton>  même chose, jeton dans l'URL (pour les apps qui ne demandent qu'une URL)
 *
 * Réponses JSON simples (pas de flux SSE) : suffisant pour des outils en lecture seule.
 * Gestion des jetons par l'artisan connecté : GET/POST /api/mcp/jetons, DELETE /api/mcp/jetons/:id.
 */

import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { json } from '../../lib/http';
import { erreurEnReponse } from '../fournisseurs/routes';
import { creerJeton, listerJetons, revoquerJeton, verifierJeton, type McpCtx } from './jetons';
import { executerOutil, OUTILS } from './outils';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  "Tu es relié à Brix, le logiciel de gestion de l'artisan (devis, factures, chantiers, clients, achats fournisseurs). " +
  "Ces outils lisent ses vraies données, en lecture seule : rien ne peut être modifié ni envoyé. Commence par l'outil « entreprise ». " +
  'Appuie chaque conseil sur les chiffres lus et cite-les. Montants en euros (HT sauf mention TTC). ' +
  "Si un outil répond « vide », dis ce qu'il manque dans Brix plutôt que d'inventer. Parle simplement : l'artisan n'est pas comptable.";

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
};

type RpcReq = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };

const rpcOk = (id: RpcReq['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const rpcErr = (id: RpcReq['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function reponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS, ...extra } });
}

export async function traiterRpc(env: Env, ctx: McpCtx, msg: RpcReq): Promise<unknown | null> {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcErr(null, -32600, 'Requête JSON-RPC invalide');
  const notification = msg.id === undefined || msg.id === null;
  // JSON-RPC : on ne répond jamais à une notification (pas d'id).
  if (notification) return null;
  switch (msg.method) {
    case 'initialize': {
      const demandee = msg.params?.protocolVersion;
      return rpcOk(msg.id, {
        protocolVersion: VERSIONS.includes(demandee) ? demandee : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'brix-ai', title: 'Brix AI', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcOk(msg.id, {});
    case 'tools/list':
      return rpcOk(msg.id, {
        tools: OUTILS.map((o) => ({ name: o.name, title: o.title, description: o.description, inputSchema: o.inputSchema, annotations: { readOnlyHint: true, openWorldHint: false, title: o.title } })),
      });
    case 'tools/call': {
      const name = msg.params?.name;
      try {
        const data = await executerOutil(env, ctx, String(name), msg.params?.arguments ?? {});
        if (!data) return rpcErr(msg.id, -32602, `Outil inconnu : ${name}`);
        return rpcOk(msg.id, { content: [{ type: 'text', text: JSON.stringify(data, null, 1) }], structuredContent: data, isError: false });
      } catch (e) {
        console.error('[mcp]', name, e);
        return rpcOk(msg.id, { content: [{ type: 'text', text: "Erreur en lisant les données Brix. Réessaie dans un instant." }], isError: true });
      }
    }
    case 'resources/list':
      return rpcOk(msg.id, { resources: [] });
    case 'prompts/list':
      return rpcOk(msg.id, { prompts: [] });
    default:
      if (notification || msg.method.startsWith('notifications/')) return null;
      return rpcErr(msg.id, -32601, `Méthode inconnue : ${msg.method}`);
  }
}

export async function handleMcpRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/mcp')) return null;

  // ---- Gestion des jetons (artisan connecté à l'app) ----
  if (pathname.startsWith('/api/mcp/jetons')) {
    try {
      const auth = await requireAuth(request, env);
      const m = pathname.match(/^\/api\/mcp\/jetons(?:\/([A-Za-z0-9_-]+))?$/);
      if (!m) return null;
      if (!m[1] && request.method === 'GET') return json(await listerJetons(env, auth.organizationId));
      if (!m[1] && request.method === 'POST') {
        const b = (await request.json().catch(() => ({}))) as { nom?: string };
        const j = await creerJeton(env, auth.organizationId, auth.userId, b.nom ?? 'Assistant IA');
        const base = (env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/$/, '');
        return json({ ...j, url_serveur: `${base}/api/mcp`, url_avec_jeton: `${base}/api/mcp/k/${j.jeton}` }, 201);
      }
      if (m[1] && request.method === 'DELETE') return (await revoquerJeton(env, auth.organizationId, m[1]), json({ ok: true }));
      return null;
    } catch (e) {
      return erreurEnReponse(e);
    }
  }

  const m = pathname.match(/^\/api\/mcp(?:\/k\/([A-Za-z0-9_-]+))?\/?$/);
  if (!m) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method === 'GET' || request.method === 'DELETE') return reponse({ error: 'Utilisez POST (transport Streamable HTTP sans flux)' }, 405, { allow: 'POST' });
  if (request.method !== 'POST') return null;

  const h = request.headers.get('authorization') ?? '';
  const jeton = m[1] ?? (h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  const ctx = jeton ? await verifierJeton(env, jeton) : null;
  if (!ctx) {
    return reponse(rpcErr(null, -32001, 'Jeton Brix AI manquant ou révoqué. Créez-en un dans Brix › Bob › Connecter une IA.'), 401, {
      'www-authenticate': 'Bearer realm="brix-ai"',
    });
  }

  let payload: RpcReq | RpcReq[];
  try {
    payload = (await request.json()) as RpcReq | RpcReq[];
  } catch {
    return reponse(rpcErr(null, -32700, 'JSON invalide'), 400);
  }
  if (Array.isArray(payload)) {
    if (payload.length === 0) return reponse(rpcErr(null, -32600, 'Lot vide'), 400);
    const out = (await Promise.all(payload.slice(0, 20).map((p) => traiterRpc(env, ctx, p)))).filter((x) => x !== null);
    return out.length ? reponse(out) : reponse(null, 202);
  }
  const out = await traiterRpc(env, ctx, payload);
  return out === null ? reponse(null, 202) : reponse(out);
}
