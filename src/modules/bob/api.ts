// Branchement du vrai modèle de Bob.
//
// En démo, BOB_MODE vaut 'demo' : le panneau utilise uniquement le moteur local
// (engine.ts) et askModel n'est jamais appelée.
//
// En production, le worker expose POST /api/bob/ask (module worker/src/modules/bob,
// à créer). Il appelle l'API Anthropic avec le SDK officiel (@anthropic-ai/sdk,
// modèle claude-opus-5-5, thinking adaptatif) et des outils qui correspondent
// aux intentions du moteur local : create_devis, list_late_invoices,
// send_reminders, get_agenda, chantier_status, add_event, create_client,
// get_margin, get_cash. Le worker exécute les outils sur D1 puis renvoie un
// BobReply (texte + cartes + suggestions), la même forme que le moteur local.
// La clé ANTHROPIC_API_KEY reste un secret Cloudflare : jamais côté navigateur.

import { API_BASE } from './apiBase';
import type { BobReply } from './engine';

export const BOB_MODE: 'demo' | 'live' = 'demo';

export interface AskModelInput {
  message: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  pathname: string;
  voice: boolean;
}

/** Envoie la question au modèle via le worker. Non appelée en démo. */
export async function askModel(input: AskModelInput, signal?: AbortSignal): Promise<BobReply> {
  const res = await fetch(`${API_BASE}/api/bob/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw new Error(`Bob indisponible (${res.status})`);
  const data = (await res.json()) as BobReply;
  return { text: data.text ?? '', cards: data.cards ?? [], suggestions: data.suggestions ?? [] };
}

/** Transcription d'une note vocale côté worker (secours si la reconnaissance du navigateur manque). */
export async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch(`${API_BASE}/api/bob/transcribe`, { method: 'POST', body: audio, credentials: 'include' });
  if (!res.ok) throw new Error('Transcription impossible');
  return ((await res.json()) as { text: string }).text;
}
