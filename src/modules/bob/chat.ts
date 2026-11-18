// Conversation en cours avec Bob (en mémoire : les cartes contiennent des actions).
// Bob en ligne (agent.ts, API Claude via le worker) quand le worker le propose ;
// sinon, et sans rien afficher, le moteur local (engine.ts).

import { create } from 'zustand';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import { etatIA, tourAgent, type ContexteIA, type MessageIA } from './agent';
import { respond, type BobReply, type EngineContext } from './engine';
import { EN_COURS } from './outils';

export interface Activite {
  label: string;
  to?: string;
  ton?: 'ok' | 'warn';
  enCours?: boolean;
  outil?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bob';
  text: string;
  reply?: BobReply;
  /** Résultat d'une action déjà jouée sur une carte (clé : index carte + libellé). */
  done?: Record<string, string>;
  /** Réponse de Bob en ligne : texte diffusé au fil de l'eau (pas d'effet machine à écrire). */
  flux?: boolean;
  enCours?: boolean;
  activites?: Activite[];
  /** Message d'erreur ou d'arrêt, affiché discrètement sous le texte. */
  note?: string;
}

interface ChatState {
  messages: ChatMessage[];
  thinking: boolean;
  memo: EngineContext['memo'];
  /** Conversation au format de l'API (blocs complets), pour Bob en ligne. */
  historique: MessageIA[];
  enLigne: boolean;
  send: (text: string, pathname: string, voix?: boolean) => Promise<BobReply>;
  stop: () => void;
  markDone: (msgId: string, key: string, result: string) => void;
  clear: () => void;
}

let n = 0;
const id = () => `m${Date.now().toString(36)}${n++}`;
let controleur: AbortController | null = null;
let navigateur: ((chemin: string) => void) | null = null;
/** Le panneau donne sa fonction de navigation (outil ouvrir_ecran). */
export const brancherNavigation = (f: ((chemin: string) => void) | null) => {
  navigateur = f;
};

function contexte(pathname: string, voix: boolean): ContexteIA {
  const s = useBrix.getState();
  const now = new Date();
  return {
    date: todayISO(),
    jour: now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    heure: now.toTimeString().slice(0, 5),
    entreprise: s.company.name,
    metier: s.company.trade,
    prenom: s.user.firstName,
    ecran: pathname,
    voix,
  };
}

export const useChat = create<ChatState>((set, get) => {
  const patch = (msgId: string, f: (m: ChatMessage) => Partial<ChatMessage>) => set((s) => ({ messages: s.messages.map((m) => (m.id === msgId ? { ...m, ...f(m) } : m)) }));

  const local = async (text: string, pathname: string): Promise<BobReply> => {
    // Petit délai réaliste : Bob « réfléchit ».
    await new Promise((r) => setTimeout(r, 450 + Math.min(700, text.length * 12)));
    let reply: BobReply;
    try {
      reply = respond(text, { pathname, memo: get().memo });
    } catch {
      reply = { text: 'Oups, je me suis emmêlé. Tu peux reformuler ?' };
    }
    set((s) => ({ messages: [...s.messages, { id: id(), role: 'bob', text: reply.text, reply }], thinking: false }));
    return reply;
  };

  return {
    messages: [],
    thinking: false,
    memo: {},
    historique: [],
    enLigne: false,
    send: async (text, pathname, voix = false) => {
      set((s) => ({ messages: [...s.messages, { id: id(), role: 'user', text }], thinking: true }));
      const ia = await etatIA();
      set({ enLigne: ia.disponible });
      if (!ia.disponible) return local(text, pathname);

      const msgId = id();
      set((s) => ({ messages: [...s.messages, { id: msgId, role: 'bob', text: '', flux: true, enCours: true, activites: [], reply: { text: '', cards: [] } }] }));
      controleur?.abort();
      const ctrl = new AbortController();
      controleur = ctrl;
      const r = await tourAgent(get().historique, text, contexte(pathname, voix), {
        texte: (t) => patch(msgId, (m) => ({ text: m.text + t })),
        outilDemarre: (nom) => patch(msgId, (m) => ({ activites: [...(m.activites ?? []), { label: EN_COURS[nom] ?? 'Je regarde…', enCours: true, outil: nom }] })),
        outilFini: (nom, res) =>
          patch(msgId, (m) => {
            const list = [...(m.activites ?? [])];
            const i = list.findIndex((a) => a.enCours && a.outil === nom);
            const fait: Activite = { ...res.activite, outil: nom };
            if (i >= 0) list[i] = fait;
            else list.push(fait);
            const cards = res.carte ? [...(m.reply?.cards ?? []), res.carte] : m.reply?.cards;
            return { activites: list, reply: { text: m.text, cards } };
          }),
        naviguer: (chemin) => navigateur?.(chemin),
      }, { signal: ctrl.signal });
      if (controleur === ctrl) controleur = null;

      // Worker absent ou refus d'accès avant tout texte : moteur local, sans message d'erreur.
      if (r.statut === 'indisponible' && !r.texte) {
        set((s) => ({ messages: s.messages.filter((m) => m.id !== msgId), enLigne: false }));
        return local(text, pathname);
      }
      const finalText = r.statut === 'refus' ? r.erreur ?? '' : r.texte || (r.statut === 'ok' ? 'C’est fait.' : '');
      const note = r.statut === 'ok' || r.statut === 'refus' ? undefined : r.erreur;
      patch(msgId, (m) => ({ text: finalText, enCours: false, note, activites: (m.activites ?? []).map((a) => (a.enCours ? { ...a, enCours: false, label: a.label.replace(/…$/, '') } : a)), reply: { text: finalText, cards: m.reply?.cards } }));
      set({ historique: r.historique, thinking: false });
      return { text: r.statut === 'ok' || r.statut === 'refus' ? finalText : '' };
    },
    stop: () => {
      controleur?.abort();
      controleur = null;
    },
    markDone: (msgId, key, result) => patch(msgId, (m) => ({ done: { ...m.done, [key]: result } })),
    clear: () => {
      controleur?.abort();
      controleur = null;
      set({ messages: [], memo: {}, historique: [], thinking: false });
    },
  };
});
