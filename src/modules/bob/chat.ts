// Conversation en cours avec Bob (non persistée : les cartes contiennent des actions).

import { create } from 'zustand';
import { respond, type BobReply, type EngineContext } from './engine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bob';
  text: string;
  reply?: BobReply;
  /** Résultat d'une action déjà jouée sur une carte (clé : index carte + libellé). */
  done?: Record<string, string>;
}

interface ChatState {
  messages: ChatMessage[];
  thinking: boolean;
  memo: EngineContext['memo'];
  send: (text: string, pathname: string) => Promise<BobReply>;
  markDone: (msgId: string, key: string, result: string) => void;
  clear: () => void;
}

let n = 0;
const id = () => `m${Date.now().toString(36)}${n++}`;

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  thinking: false,
  memo: {},
  send: async (text, pathname) => {
    set((s) => ({ messages: [...s.messages, { id: id(), role: 'user', text }], thinking: true }));
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
  },
  markDone: (msgId, key, result) => set((s) => ({ messages: s.messages.map((m) => (m.id === msgId ? { ...m, done: { ...m.done, [key]: result } } : m)) })),
  clear: () => set({ messages: [], memo: {} }),
}));
