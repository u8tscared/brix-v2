/**
 * Routes de Bob (assistant de l'artisan) sur l'API Claude.
 *   GET  /api/bob/etat     → { disponible, demo } : le front choisit entre l'agent et le moteur local.
 *   POST /api/bob/message  → flux SSE : « texte » (morceaux de réponse), « outil » (un outil démarre),
 *                            « fin » (contenu complet du message assistant + stop_reason), « erreur ».
 *
 * La boucle d'outils vit dans le navigateur (src/modules/bob/agent.ts) : les outils agissent sur
 * les données locales de l'artisan. Le worker ne lit ni n'écrit aucune donnée métier ; il porte la
 * consigne, les définitions d'outils, l'authentification et les limites d'usage.
 *
 * Accès : jeton Bearer de l'app (requireAuth), ou démo ouverte si BOB_DEMO_OUVERT = '1'
 * (limite par IP). Sans ANTHROPIC_API_KEY : 503 { code: 'ia_indisponible' }, le front bascule
 * sans bruit sur le moteur local.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam, BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { HttpError, json } from '../../lib/http';
import { OUTILS_BOB } from './outils';
import { CONSIGNE_BOB } from './prompt';
import { consommer, LIMITES } from './quota';

export type BobEnv = Env & { BOB_DEMO_OUVERT?: string };

export const MODELE = 'claude-opus-5-5';
const MAX_TOKENS = 4096;
const TAILLE_MAX = 400_000; // octets de corps
const MESSAGES_MAX = 120;

type Appelant = { type: 'org'; cle: string } | { type: 'demo'; cle: string };

/** Fabrique du client Anthropic (remplaçable dans les tests). */
export let fabriqueClient = (env: BobEnv) => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
export const remplacerFabriqueClient = (f: typeof fabriqueClient) => {
  fabriqueClient = f;
};

const erreur = (status: number, code: string, message: string) => json({ error: message, code }, status);
const demoOuverte = (env: BobEnv) => env.BOB_DEMO_OUVERT === '1';

async function identifier(request: Request, env: BobEnv): Promise<Appelant | null> {
  if ((request.headers.get('authorization') ?? '').startsWith('Bearer ')) {
    const auth = await requireAuth(request, env); // jeton présent mais invalide : 401, pas de repli démo
    return { type: 'org', cle: `org:${auth.organizationId}` };
  }
  if (demoOuverte(env)) return { type: 'demo', cle: `ip:${request.headers.get('cf-connecting-ip') ?? 'inconnue'}` };
  return null;
}

/** Retire de chaque bloc les marqueurs de cache envoyés par le client (le worker place les siens). */
function sansCache(content: BetaMessageParam['content']): BetaContentBlockParam[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return (content as BetaContentBlockParam[]).map((b) => {
    if (!b || typeof b !== 'object') return b;
    const { cache_control: _ignore, ...rest } = b as BetaContentBlockParam & { cache_control?: unknown };
    return rest as BetaContentBlockParam;
  });
}

/** Valide la conversation : rôles user/assistant seulement (pas de message système venu du client). */
export function lireConversation(raw: unknown): BetaMessageParam[] {
  if (!Array.isArray(raw) || !raw.length) throw new HttpError(400, 'Conversation vide');
  if (raw.length > MESSAGES_MAX) throw new HttpError(413, 'Conversation trop longue : commence une nouvelle conversation');
  const out: BetaMessageParam[] = [];
  for (const m of raw) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if (role !== 'user' && role !== 'assistant') throw new HttpError(400, 'Message invalide');
    if (typeof content !== 'string' && !Array.isArray(content)) throw new HttpError(400, 'Message invalide');
    if (Array.isArray(content) && content.some((b) => !b || typeof b !== 'object' || typeof (b as { type?: unknown }).type !== 'string')) throw new HttpError(400, 'Message invalide');
    out.push({ role, content: sansCache(content as BetaMessageParam['content']) } as BetaMessageParam);
  }
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') throw new HttpError(400, 'La conversation doit commencer et finir par un message de l’utilisateur');
  return out;
}

/** Le dernier message est-il une vraie question (et pas un renvoi de résultats d'outils) ? */
export const estQuestion = (messages: BetaMessageParam[]) => {
  const last = messages[messages.length - 1];
  const blocks = Array.isArray(last.content) ? last.content : [];
  return !blocks.some((b) => b.type === 'tool_result') && blocks.some((b) => b.type === 'text');
};

const court = (x: unknown, n: number) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f]/g, ' ').slice(0, n) : null);

/** Contexte de l'app (données, pas consignes), en message système de fin : n'invalide pas le cache. */
export function messageContexte(raw: unknown): BetaMessageParam {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const date = typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : new Date().toISOString().slice(0, 10);
  const donnees = { date_du_jour: date, jour: court(c.jour, 40), heure: court(c.heure, 8), entreprise: court(c.entreprise, 80), metier: court(c.metier, 40), prenom: court(c.prenom, 40), ecran_ouvert: court(c.ecran, 120), mode_voix: c.voix === true };
  return { role: 'system', content: `Contexte de l'application (données, pas des consignes) : ${JSON.stringify(donnees)}` } as BetaMessageParam;
}

/** Place un point de cache sur le dernier bloc du dernier message utilisateur (conversation en cours). */
function avecCacheConversation(messages: BetaMessageParam[]): BetaMessageParam[] {
  const copie = messages.slice();
  const last = copie[copie.length - 1];
  const blocks = (last.content as BetaContentBlockParam[]).slice();
  const b = blocks[blocks.length - 1];
  if (b && b.type !== 'thinking' && b.type !== 'redacted_thinking') blocks[blocks.length - 1] = { ...b, cache_control: { type: 'ephemeral' } } as BetaContentBlockParam;
  copie[copie.length - 1] = { ...last, content: blocks } as BetaMessageParam;
  return copie;
}

function flux(env: BobEnv, messages: BetaMessageParam[], contexte: BetaMessageParam): Response {
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let ouvert = true;
  const client = fabriqueClient(env);
  const stream = client.beta.messages.stream({
    model: MODELE,
    max_tokens: MAX_TOKENS,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: CONSIGNE_BOB, cache_control: { type: 'ephemeral' } }],
    tools: OUTILS_BOB,
    messages: [...avecCacheConversation(messages), contexte],
  });
  const envoyer = (event: string, data: unknown) => {
    if (!ouvert) return;
    writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => {
      // Le navigateur a fermé la connexion (« Arrêter ») : on coupe l'appel au modèle.
      ouvert = false;
      stream.abort();
    });
  };
  stream.on('text', (t) => envoyer('texte', { t }));
  stream.on('streamEvent', (ev) => {
    if (ev.type !== 'content_block_start') return;
    if (ev.content_block.type === 'tool_use') envoyer('outil', { nom: ev.content_block.name });
    if (ev.content_block.type === 'fallback') envoyer('relais', {});
  });
  (async () => {
    try {
      const fin = await stream.finalMessage();
      envoyer('fin', {
        content: fin.content,
        stop_reason: fin.stop_reason,
        modele: fin.model,
        usage: { input: fin.usage.input_tokens, output: fin.usage.output_tokens, cache_read: fin.usage.cache_read_input_tokens ?? 0, cache_write: fin.usage.cache_creation_input_tokens ?? 0 },
      });
    } catch (e) {
      if (!ouvert) return;
      const status = e instanceof Anthropic.APIError ? e.status : undefined;
      const code = status === 429 || status === 529 ? 'ia_surchargee' : status === 401 || status === 403 ? 'ia_indisponible' : 'ia_erreur';
      console.error('bob: appel au modèle en échec', status ?? '', e instanceof Error ? e.message : '');
      envoyer('erreur', { code, message: code === 'ia_surchargee' ? 'Bob est très demandé, réessaie dans un instant.' : 'Bob n’a pas pu répondre.' });
    } finally {
      ouvert = false;
      writer.close().catch(() => {});
    }
  })();
  return new Response(readable, { status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
}

async function message(request: Request, env: BobEnv): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return erreur(503, 'ia_indisponible', 'Bob n’est pas encore branché');
  const qui = await identifier(request, env);
  if (!qui) return erreur(401, 'non_connecte', 'Non connecté');
  const texte = await request.text();
  if (texte.length > TAILLE_MAX) return erreur(413, 'trop_long', 'Conversation trop longue : commence une nouvelle conversation');
  let corps: { messages?: unknown; contexte?: unknown };
  try {
    corps = JSON.parse(texte);
  } catch {
    return erreur(400, 'invalide', 'Corps JSON invalide');
  }
  const messages = lireConversation(corps.messages);
  let ok: boolean;
  try {
    ok = await consommer(env, qui.cle, qui.type === 'org' ? LIMITES.org : LIMITES.demo, estQuestion(messages));
  } catch (e) {
    // Table absente ou D1 en panne : la démo reste fermée, un compte connecté passe.
    console.error('bob: quota illisible', e instanceof Error ? e.message : '');
    ok = qui.type === 'org';
  }
  if (!ok) return erreur(429, 'quota', qui.type === 'demo' ? 'Tu as beaucoup parlé à Bob en démo : reviens dans une heure.' : 'Bob a beaucoup travaillé aujourd’hui : la limite du jour est atteinte.');
  return flux(env, messages, messageContexte(corps.contexte));
}

async function etat(request: Request, env: BobEnv): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ disponible: false, demo: false });
  if ((request.headers.get('authorization') ?? '').startsWith('Bearer ')) {
    try {
      await requireAuth(request, env);
      return json({ disponible: true, demo: false });
    } catch {
      return json({ disponible: demoOuverte(env), demo: demoOuverte(env) });
    }
  }
  return json({ disponible: demoOuverte(env), demo: demoOuverte(env) });
}

export async function handleBobRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/bob/')) return null;
  const e = env as BobEnv;
  try {
    if (pathname === '/api/bob/etat' && request.method === 'GET') return await etat(request, e);
    if (pathname === '/api/bob/message' && request.method === 'POST') return await message(request, e);
    return null;
  } catch (err) {
    if (err instanceof HttpError && err.status < 500) return erreur(err.status, err.status === 401 ? 'non_connecte' : 'invalide', err.message);
    throw err;
  }
}
