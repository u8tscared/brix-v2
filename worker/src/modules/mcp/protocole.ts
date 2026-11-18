/**
 * Protocole MCP (JSON-RPC 2.0 sur HTTP, réponses JSON, sans flux SSE), compatible deux époques :
 *  - « classique » (2024-11-05 → 2025-11-25) : initialize, sessions ignorées, en-tête MCP-Protocol-Version ;
 *  - « sans état » (2026-07-28) : server/discover, version portée par _meta, en-têtes Mcp-Method / Mcp-Name,
 *    resultType, ttlMs et cacheScope sur tools/list.
 */
import type { Env } from '../../env';
import { SCOPE_DEFAUT, urlPrm } from './config';
import { peutEcrire, type McpCtx } from './jetons';
import { descripteur, executerOutil, outilsVisibles, trouverOutil } from './outils';

export const VERSION_MODERNE = '2026-07-28';
export const VERSIONS_CLASSIQUES = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export const VERSIONS = [VERSION_MODERNE, ...VERSIONS_CLASSIQUES];
const META_VERSION = 'io.modelcontextprotocol/protocolVersion';

export const SERVER_INFO = { name: 'brix-ai', title: 'Brix AI', version: '2.0.0', websiteUrl: 'https://brix-app.fr/connecteur-ia' };

const INSTRUCTIONS =
  'Brix AI donne accès aux données de gestion d’une entreprise artisanale du bâtiment : devis, factures, impayés, chantiers, clients, planning, demandes entrantes et achats fournisseurs. ' +
  'Montants en euros, HT sauf mention TTC. Chaque réponse porte « donnees_du », la date de dernière mise à jour des données, et « vide: true » quand il n’y a rien. ' +
  'Selon l’autorisation donnée, des outils d’écriture créent des brouillons ou des notes ; ils n’envoient jamais rien aux clients et ne déplacent pas d’argent.';

export type RpcReq = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };
export interface EnTetes { version: string | null; methode: string | null; nom: string | null }
/** Réponse d'un message : corps (null = notification), statut HTTP et en-têtes éventuels. */
export interface Sortie { body: unknown | null; status: number; headers?: Record<string, string> }

const rpcOk = (id: RpcReq['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
export const rpcErr = (id: RpcReq['id'], code: number, message: string, data?: unknown) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } });

export function defiPortee(env: Env) {
  return `Bearer error="insufficient_scope", scope="${SCOPE_DEFAUT}", resource_metadata="${urlPrm(env)}", error_description="Cet accès est en lecture seule"`;
}

export async function traiterRpc(env: Env, ctx: McpCtx, msg: RpcReq, h: EnTetes, enLot = false): Promise<Sortie> {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return { body: rpcErr(null, -32600, 'Requête JSON-RPC invalide'), status: 400 };
  const versionMeta = msg.params?._meta?.[META_VERSION];
  const moderne = versionMeta !== undefined || h.version === VERSION_MODERNE;
  if (versionMeta !== undefined && !VERSIONS.includes(String(versionMeta))) {
    return { body: rpcErr(msg.id, -32022, 'Version du protocole non prise en charge', { supported: VERSIONS, requested: versionMeta }), status: 400 };
  }
  if (!enLot && h.methode && h.methode !== msg.method) return { body: rpcErr(msg.id, -32020, 'En-tête Mcp-Method différent du corps'), status: 400 };
  if (!enLot && h.nom && msg.method === 'tools/call' && h.nom !== msg.params?.name) return { body: rpcErr(msg.id, -32020, 'En-tête Mcp-Name différent du corps'), status: 400 };

  const notification = msg.id === undefined || msg.id === null;
  if (notification) return { body: null, status: 202 };

  const ok = (result: Record<string, unknown>): Sortie => ({
    body: rpcOk(msg.id, moderne ? { ...result, resultType: 'complete', _meta: { ...(result._meta as object), 'io.modelcontextprotocol/serverInfo': SERVER_INFO } } : result),
    status: 200,
  });
  const capacites = { tools: { listChanged: false } };

  switch (msg.method) {
    case 'initialize': {
      const demandee = String(msg.params?.protocolVersion ?? '');
      return ok({ protocolVersion: VERSIONS_CLASSIQUES.includes(demandee) ? demandee : VERSIONS_CLASSIQUES[0], capabilities: capacites, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case 'server/discover':
      return ok({ supportedVersions: VERSIONS, capabilities: capacites, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    case 'ping':
      return ok({});
    case 'tools/list': {
      const tools = outilsVisibles(ctx).map(descripteur);
      return ok(moderne ? { tools, ttlMs: 3_600_000, cacheScope: 'private' } : { tools });
    }
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const outil = trouverOutil(name);
      if (!outil) return { body: rpcErr(msg.id, -32602, `Outil inconnu : ${name}`), status: 200 };
      if (outil.ecriture && !peutEcrire(ctx)) {
        const corps = rpcErr(msg.id, -32003, 'Cet accès est en lecture seule : autorisez « Lecture et actions » dans Brix pour utiliser cet outil.');
        return enLot ? { body: corps, status: 200 } : { body: corps, status: 403, headers: { 'www-authenticate': defiPortee(env) } };
      }
      const args = msg.params?.arguments;
      const r = await executerOutil(env, ctx, outil, args && typeof args === 'object' && !Array.isArray(args) ? args : {});
      if (!r.ok) return ok({ content: [{ type: 'text', text: r.message }], isError: true });
      return ok({ content: [{ type: 'text', text: JSON.stringify(r.data) }], structuredContent: r.data, isError: false });
    }
    case 'resources/list':
      return ok({ resources: [] });
    case 'resources/templates/list':
      return ok({ resourceTemplates: [] });
    case 'prompts/list':
      return ok({ prompts: [] });
    default:
      if (msg.method.startsWith('notifications/')) return { body: null, status: 202 };
      return { body: rpcErr(msg.id, -32601, `Méthode inconnue : ${msg.method}`), status: moderne ? 404 : 200 };
  }
}
