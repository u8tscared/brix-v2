// Boucle de l'agent avec un worker simulé (flux SSE) : texte diffusé, outils exécutés sur le store
// local, résultats renvoyés dans un seul message, repli, refus, arrêt, relais de modèle.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { useBrix } from '@/lib/store';
import { assainir, tourAgent, TOURS_MAX, type MessageIA } from './agent';

const sse = (...evs: [string, unknown][]) =>
  new Response(evs.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } });

const CTX = { date: '2026-11-18', ecran: '/app' };
type Corps = { messages: MessageIA[]; contexte: unknown };

function faux(...reponses: (() => Response)[]) {
  const corps: Corps[] = [];
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    corps.push(JSON.parse(String(init?.body)));
    const r = reponses[Math.min(corps.length - 1, reponses.length - 1)];
    return r();
  });
  return { fetcher: fetcher as unknown as typeof fetch, corps };
}

beforeEach(() => useBrix.getState().loadDemo('electricien'));

describe('tourAgent', () => {
  it('diffuse le texte et garde la conversation', async () => {
    const { fetcher, corps } = faux(() => sse(['texte', { t: 'Salut ' }], ['texte', { t: 'Karim !' }], ['fin', { content: [{ type: 'text', text: 'Salut Karim !' }], stop_reason: 'end_turn' }]));
    const morceaux: string[] = [];
    const r = await tourAgent([], 'Salut', CTX, { texte: (t) => morceaux.push(t) }, { fetcher });
    expect(r.statut).toBe('ok');
    expect(morceaux.join('')).toBe('Salut Karim !');
    expect(r.texte).toBe('Salut Karim !');
    expect(r.historique.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(corps[0].contexte).toEqual(CTX);
  });

  it('exécute les outils et renvoie tous les résultats dans un seul message', async () => {
    const assistant = [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: 'Je regarde.' },
      { type: 'tool_use', id: 't1', name: 'lister_impayes', input: {} },
      { type: 'tool_use', id: 't2', name: 'relancer_factures', input: { factures: null } },
    ];
    const { fetcher, corps } = faux(
      () => sse(['texte', { t: 'Je regarde.' }], ['outil', { nom: 'lister_impayes' }], ['fin', { content: assistant, stop_reason: 'tool_use' }]),
      () => sse(['texte', { t: 'Deux relances sont prêtes, confirme.' }], ['fin', { content: [{ type: 'text', text: 'Deux relances sont prêtes, confirme.' }], stop_reason: 'end_turn' }]),
    );
    const demarres: string[] = [];
    const finis: string[] = [];
    const avant = useBrix.getState().factures.map((f) => f.remindersSent);
    const r = await tourAgent([], 'Relance les retards', CTX, { outilDemarre: (n) => demarres.push(n), outilFini: (n, res) => finis.push(`${n}:${res.activite.label}`) }, { fetcher });
    expect(r.statut).toBe('ok');
    expect(demarres).toEqual(['lister_impayes']);
    expect(finis).toEqual(['lister_impayes:2 factures en retard', 'relancer_factures:2 relances à confirmer']);
    // Rien n'est parti : la relance attend le clic sur la carte.
    expect(useBrix.getState().factures.map((f) => f.remindersSent)).toEqual(avant);

    expect(corps).toHaveLength(2);
    const second = corps[1].messages;
    expect(second.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(second[1].content).toEqual(assistant); // blocs complets, réflexion comprise
    const resultats = second[2].content as { type: string; tool_use_id: string; content: string }[];
    expect(resultats.map((b) => [b.type, b.tool_use_id])).toEqual([['tool_result', 't1'], ['tool_result', 't2']]);
    expect(JSON.parse(resultats[1].content)).toMatchObject({ etat: 'en_attente_de_confirmation' });
    expect(r.texte).toBe('Je regarde.\n\nDeux relances sont prêtes, confirme.');
    expect(r.historique).toHaveLength(4);
  });

  it('un outil en erreur part en is_error', async () => {
    const { fetcher, corps } = faux(
      () => sse(['fin', { content: [{ type: 'tool_use', id: 't1', name: 'statut_chantier', input: { chantier: 'Inconnu' } }, { type: 'tool_use', id: 't2', name: 'planifier', input: { employe: 'Gérard', chantier: 'x', date: '2026-11-19', creneau: 'matin' } }], stop_reason: 'tool_use' }]),
      () => sse(['fin', { content: [{ type: 'text', text: 'Je ne trouve pas.' }], stop_reason: 'end_turn' }]),
    );
    await tourAgent([], 'Mets Gérard sur x', CTX, {}, { fetcher });
    const res = corps[1].messages[2].content as { is_error?: boolean }[];
    expect(res[1].is_error).toBe(true);
  });

  it('worker absent (503) : indisponible, pour basculer sur le moteur local', async () => {
    const { fetcher } = faux(() => new Response(JSON.stringify({ code: 'ia_indisponible' }), { status: 503, headers: { 'content-type': 'application/json' } }));
    const r = await tourAgent([], 'Salut', CTX, {}, { fetcher });
    expect(r.statut).toBe('indisponible');
    expect(r.texte).toBe('');
  });

  it('preview statique (page HTML) : indisponible aussi', async () => {
    const { fetcher } = faux(() => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    expect((await tourAgent([], 'Salut', CTX, {}, { fetcher })).statut).toBe('indisponible');
  });

  it('quota atteint : message du serveur en français', async () => {
    const { fetcher } = faux(() => new Response(JSON.stringify({ error: 'La limite du jour est atteinte.', code: 'quota' }), { status: 429, headers: { 'content-type': 'application/json' } }));
    const r = await tourAgent([], 'Salut', CTX, {}, { fetcher });
    expect(r).toMatchObject({ statut: 'erreur', erreur: 'La limite du jour est atteinte.' });
  });

  it('refus : la réponse partielle n’est pas gardée', async () => {
    const { fetcher } = faux(() => sse(['texte', { t: 'Voi' }], ['fin', { content: [{ type: 'text', text: 'Voi' }], stop_reason: 'refusal' }]));
    const r = await tourAgent([], '???', CTX, {}, { fetcher });
    expect(r.statut).toBe('refus');
    expect(r.historique.map((m) => m.role)).toEqual(['user']);
    expect(r.erreur).toMatch(/Je ne peux pas/);
  });

  it('erreur dans le flux : statut erreur avec le message du worker', async () => {
    const { fetcher } = faux(() => sse(['erreur', { code: 'ia_surchargee', message: 'Bob est très demandé, réessaie dans un instant.' }]));
    expect(await tourAgent([], 'Salut', CTX, {}, { fetcher })).toMatchObject({ statut: 'erreur', erreur: 'Bob est très demandé, réessaie dans un instant.' });
  });

  it('arrêt par l’utilisateur : interrompu, conversation valide', async () => {
    const ctrl = new AbortController();
    const fetcher = vi.fn(async (_u: unknown, init?: RequestInit) => {
      ctrl.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError', signal: init?.signal });
    }) as unknown as typeof fetch;
    const r = await tourAgent([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }], 'Salut', CTX, {}, { fetcher, signal: ctrl.signal });
    expect(r.statut).toBe('interrompu');
    expect(r.historique[r.historique.length - 1].role).toBe('user');
  });

  it(`s'arrête après ${TOURS_MAX} tours d'outils`, async () => {
    let i = 0;
    const { fetcher, corps } = faux(() => sse(['fin', { content: [{ type: 'tool_use', id: `t${i++}`, name: 'lire_resume', input: { periode: 'mois' } }], stop_reason: 'tool_use' }]));
    const r = await tourAgent([], 'Boucle', CTX, {}, { fetcher });
    expect(corps).toHaveLength(TOURS_MAX);
    expect(r.statut).toBe('ok');
    expect(r.historique[r.historique.length - 1].role).toBe('user');
  });

  it('assainir : retire réflexion et appels d’outils avant le dernier relais de modèle', () => {
    const c = [
      { type: 'thinking', thinking: '', signature: 's' },
      { type: 'text', text: 'Début' },
      { type: 'tool_use', id: 'x', name: 'rechercher', input: {} },
      { type: 'fallback', from: { model: 'claude-opus-5-5' }, to: { model: 'claude-opus-4-8' } },
      { type: 'thinking', thinking: '', signature: 't' },
      { type: 'text', text: 'Suite' },
    ] as unknown as BetaContentBlock[];
    expect(assainir(c).map((b) => b.type)).toEqual(['text', 'fallback', 'thinking', 'text']);
    const sans = [{ type: 'text', text: 'a' }] as BetaContentBlock[];
    expect(assainir(sans)).toBe(sans);
  });
});
