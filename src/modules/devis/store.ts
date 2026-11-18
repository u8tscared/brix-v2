// État local du module Devis (persisté) : journal des événements, préférences d'envoi,
// variantes proposées, relances et suggestions écartées. Le type Devis global n'a pas ces
// champs : ils vivent ici en attendant les colonnes côté worker (devis_events, devis_send_options).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/format';

export interface JournalEvent {
  id: string;
  at: string; // ISO complet
  text: string;
  by?: string;
  tone?: 'bob' | 'client' | 'me';
}

export type Channel = 'email' | 'sms' | 'whatsapp';
export type VariantKey = 'essentiel' | 'confort' | 'premium';

export interface DevisMeta {
  journal: JournalEvent[];
  channel: Channel;
  variants: Record<VariantKey, boolean>;
  payment: { card: boolean; transfer: boolean; split3: boolean };
  reminders: number;
  lastReminderAt?: string;
  dismissed: string[];
  chosenVariant?: VariantKey;
}

export const defaultMeta = (): DevisMeta => ({
  journal: [],
  channel: 'email',
  variants: { essentiel: false, confort: true, premium: false },
  payment: { card: true, transfer: true, split3: true },
  reminders: 0,
  dismissed: [],
});

interface MetaState {
  meta: Record<string, DevisMeta>;
  patch: (id: string, p: Partial<DevisMeta>) => void;
  log: (id: string, text: string, tone?: JournalEvent['tone'], by?: string) => void;
  dismiss: (id: string, key: string) => void;
}

export const useDevisMeta = create<MetaState>()(
  persist(
    (set) => ({
      meta: {},
      patch: (id, p) => set((s) => ({ meta: { ...s.meta, [id]: { ...defaultMeta(), ...s.meta[id], ...p } } })),
      log: (id, text, tone = 'me', by) =>
        set((s) => {
          const m = { ...defaultMeta(), ...s.meta[id] };
          return { meta: { ...s.meta, [id]: { ...m, journal: [...m.journal, { id: uid('ev'), at: new Date().toISOString(), text, tone, by }] } } };
        }),
      dismiss: (id, key) =>
        set((s) => {
          const m = { ...defaultMeta(), ...s.meta[id] };
          return { meta: { ...s.meta, [id]: { ...m, dismissed: [...m.dismissed, key] } } };
        }),
    }),
    { name: 'brix-v2-devis' },
  ),
);

const EMPTY = defaultMeta();
export const useMeta = (id?: string): DevisMeta => useDevisMeta((s) => (id && s.meta[id]) || EMPTY);
