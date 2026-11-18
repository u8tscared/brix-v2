// Boucle de conversation de Bob sur l'API Claude (via le worker, POST /api/bob/message).
//
// envoi → texte diffusé dans le panneau → blocs tool_use exécutés sur le store local
// (outils/index.ts) → tous les tool_result renvoyés dans UN message utilisateur → on recommence,
// 8 tours au plus. Le worker porte la consigne et les définitions d'outils ; ici, on garde la
// conversation complète (blocs de réflexion compris) et on la renvoie telle quelle.

import type { BetaContentBlock, BetaContentBlockParam, BetaMessageParam, BetaToolResultBlockParam, BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { API_BASE, lireSession } from '@/lib/api';
import { executerOutil, type ResultatOutil } from './outils';

export type MessageIA = BetaMessageParam;
export const TOURS_MAX = 8;

export interface ContexteIA {
  date: string;
  jour?: string;
  heure?: string;
  entreprise?: string;
  metier?: string;
  prenom?: string;
  ecran?: string;
  voix?: boolean;
}

export interface Rappels {
  texte?: (morceau: string) => void;
  outilDemarre?: (nom: string) => void;
  outilFini?: (nom: string, r: ResultatOutil) => void;
  naviguer?: (chemin: string) => void;
}

export type Statut = 'ok' | 'refus' | 'erreur' | 'interrompu' | 'indisponible';

export interface ResultatTour {
  statut: Statut;
  /** Conversation à garder pour la question suivante (finit toujours par un message valide). */
  historique: MessageIA[];
  texte: string;
  erreur?: string;
}

interface Fin {
  content: BetaContentBlock[];
  stop_reason: string | null;
}

class ErreurIA extends Error {
  constructor(public statut: Statut, message: string) {
    super(message);
  }
}

// ── Disponibilité (GET /api/bob/etat, mis en cache) ─────────────────────────────────

let etat: { at: number; v: Promise<{ disponible: boolean; demo: boolean }> } | null = null;
const enTetes = (): Record<string, string> => {
  const s = lireSession();
  return s?.token ? { authorization: `Bearer ${s.token}` } : {};
};

export function etatIA(fetcher: typeof fetch = fetch): Promise<{ disponible: boolean; demo: boolean }> {
  if (!etat || Date.now() - etat.at > 5 * 60_000) {
    const v = fetcher(`${API_BASE}/api/bob/etat`, { headers: { accept: 'application/json', ...enTetes() } })
      .then(async (r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return { disponible: false, demo: false };
        const d = (await r.json()) as { disponible?: unknown; demo?: unknown };
        return { disponible: d.disponible === true, demo: d.demo === true };
      })
      .catch(() => ({ disponible: false, demo: false }));
    etat = { at: Date.now(), v };
  }
  return etat.v;
}

/** Oublie l'état (le serveur a répondu 503/401 : on repasse sur le moteur local). */
export const oublierEtatIA = (indisponible = false) => {
  etat = indisponible ? { at: Date.now(), v: Promise.resolve({ disponible: false, demo: false }) } : null;
};

// ── Bascule de modèle (refus) ───────────────────────────────────────────────────────

/**
 * Après un relais vers un autre modèle (bloc `fallback`), on ne renvoie pas les blocs de réflexion
 * ni les appels d'outils écrits AVANT le dernier relais (consigne de l'API) ; le bloc `fallback`
 * reste à sa place, le texte et tout ce qui suit restent tels quels.
 */
export function assainir(content: BetaContentBlock[]): BetaContentBlock[] {
  let last = -1;
  content.forEach((b, i) => {
    if (b.type === 'fallback') last = i;
  });
  if (last < 0) return content;
  return content.filter((b, i) => i >= last || b.type === 'text');
}

// ── Flux SSE du worker ──────────────────────────────────────────────────────────────

async function lireFlux(res: Response, rappels: Rappels): Promise<Fin> {
  if (!res.body) throw new ErreurIA('erreur', 'Réponse vide');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let tampon = '';
  let fin: Fin | null = null;
  const traiter = (bloc: string) => {
    const ev = bloc.match(/^event: (.+)$/m)?.[1];
    const raw = bloc.match(/^data: (.*)$/m)?.[1];
    if (!ev || raw === undefined) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (ev === 'texte' && typeof data.t === 'string') rappels.texte?.(data.t);
    else if (ev === 'outil' && typeof data.nom === 'string') rappels.outilDemarre?.(data.nom);
    else if (ev === 'fin') fin = { content: (data.content as BetaContentBlock[]) ?? [], stop_reason: (data.stop_reason as string) ?? null };
    else if (ev === 'erreur') throw new ErreurIA(data.code === 'ia_indisponible' ? 'indisponible' : 'erreur', typeof data.message === 'string' ? data.message : 'Bob n’a pas pu répondre.');
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (value) tampon += dec.decode(value, { stream: true });
    let i: number;
    while ((i = tampon.indexOf('\n\n')) >= 0) {
      traiter(tampon.slice(0, i));
      tampon = tampon.slice(i + 2);
    }
    if (done) break;
  }
  if (tampon.trim()) traiter(tampon);
  if (!fin) throw new ErreurIA('erreur', 'La réponse a été coupée. Réessaie.');
  return fin;
}

async function appeler(messages: MessageIA[], contexte: ContexteIA, rappels: Rappels, signal: AbortSignal | undefined, fetcher: typeof fetch): Promise<Fin> {
  let res: Response;
  try {
    res = await fetcher(`${API_BASE}/api/bob/message`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...enTetes() }, body: JSON.stringify({ messages, contexte }), signal });
  } catch (e) {
    if (signal?.aborted) throw new ErreurIA('interrompu', 'Arrêté.');
    throw new ErreurIA('indisponible', 'Pas de connexion.');
  }
  if (res.status === 503 || res.status === 401 || res.status === 404) throw new ErreurIA('indisponible', 'Bob en ligne indisponible.');
  if (!res.ok) {
    let msg = 'Bob n’a pas pu répondre. Réessaie dans un instant.';
    try {
      const d = (await res.json()) as { error?: string };
      if (d.error) msg = d.error;
    } catch {
      /* corps non JSON */
    }
    throw new ErreurIA('erreur', msg);
  }
  if (!(res.headers.get('content-type') ?? '').includes('event-stream')) throw new ErreurIA('indisponible', 'Bob en ligne indisponible.');
  return lireFlux(res, rappels);
}

const texteDe = (content: BetaContentBlock[]) => content.filter((b): b is Extract<BetaContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('');

/**
 * Joue une question complète (avec ses tours d'outils). Ne lève jamais : le statut dit ce qui
 * s'est passé. « indisponible » avant tout texte = le panneau bascule sur le moteur local.
 */
export async function tourAgent(
  historique: MessageIA[],
  question: string,
  contexte: ContexteIA,
  rappels: Rappels = {},
  opts: { signal?: AbortSignal; fetcher?: typeof fetch; executer?: typeof executerOutil } = {},
): Promise<ResultatTour> {
  const fetcher = opts.fetcher ?? fetch;
  const executer = opts.executer ?? executerOutil;
  const msgs: MessageIA[] = [...historique, { role: 'user', content: [{ type: 'text', text: question }] }];
  let texte = '';
  const r: Rappels = { ...rappels, texte: (t) => { texte += t; rappels.texte?.(t); } };
  try {
    for (let tour = 0; tour < TOURS_MAX; tour++) {
      if (tour > 0 && texte && !/\s$/.test(texte)) r.texte?.('\n\n');
      const fin = await appeler(msgs, contexte, r, opts.signal, fetcher);
      // Refus : la réponse partielle est jetée, on ne l'ajoute pas à la conversation.
      if (fin.stop_reason === 'refusal') return { statut: 'refus', historique: msgs, texte, erreur: 'Je ne peux pas t’aider sur ce point. Pose-moi plutôt une question sur ton entreprise.' };
      const content = assainir(fin.content);
      const outils = content.filter((b): b is BetaToolUseBlock => b.type === 'tool_use');
      if (fin.stop_reason === 'max_tokens' && outils.length) return { statut: 'erreur', historique: msgs, texte, erreur: 'Ta demande est trop longue pour moi d’un coup. Découpe-la en plusieurs fois.' };
      if (fin.stop_reason === 'pause_turn') {
        msgs.push({ role: 'assistant', content: content as BetaContentBlockParam[] });
        continue;
      }
      if (!outils.length) {
        if (content.length) msgs.push({ role: 'assistant', content: content as BetaContentBlockParam[] });
        return { statut: 'ok', historique: msgs, texte: texte || texteDe(content) };
      }
      // Pas d'attente entre l'ajout du message assistant et celui des résultats : la conversation
      // reste valide même si l'utilisateur arrête pendant le tour suivant.
      const resultats: BetaToolResultBlockParam[] = outils.map((b) => {
        const res = executer(b.name, b.input);
        r.outilFini?.(b.name, res);
        if (res.naviguer) r.naviguer?.(res.naviguer);
        return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(res.contenu), ...(res.erreur ? { is_error: true } : {}) };
      });
      msgs.push({ role: 'assistant', content: content as BetaContentBlockParam[] }, { role: 'user', content: resultats });
    }
    return { statut: 'ok', historique: msgs, texte: texte || 'J’ai fait plusieurs étapes. Dis-moi si je continue.' };
  } catch (e) {
    const statut: Statut = e instanceof ErreurIA ? e.statut : opts.signal?.aborted ? 'interrompu' : 'erreur';
    const erreur = statut === 'interrompu' ? 'Arrêté.' : e instanceof ErreurIA ? e.message : 'Bob n’a pas pu répondre. Réessaie dans un instant.';
    if (statut === 'indisponible') oublierEtatIA(true);
    return { statut, historique: msgs, texte, erreur };
  }
}
