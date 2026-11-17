// Store local du module Factures (zustand persisté) : ce que le type partagé `Facture`
// ne porte pas encore (paiements détaillés, relances, liens de paiement, réglages e-facture,
// boîte de réception fournisseurs). À migrer dans le store global / le worker plus tard.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dayOffset, uid } from '@/lib/format';
import type { Facture } from '@/lib/types';
import type { FactureExtra, Payment, PaymentMethod, Reminder } from './lib/model';

export interface RelanceStep {
  id: string;
  day: number; // jours après l'échéance
  channel: 'email' | 'sms' | 'courrier';
  label: string;
  enabled: boolean;
}

export type RelanceTone = 'cordial' | 'direct' | 'ferme';

export type InboxState = 'a_traiter' | 'approuvee' | 'refusee' | 'payee';

export interface JournalEntry {
  id: string;
  at: string; // ISO date-heure
  number: string;
  direction: 'emise' | 'recue' | 'ereporting';
  event: string;
  platform: string;
  ok: boolean;
}

export interface FacturesLocal {
  extras: Record<string, FactureExtra>;
  payments: Payment[];
  reminders: Reminder[];
  relanceAuto: boolean;
  relanceTone: RelanceTone;
  steps: RelanceStep[];
  platform: 'superpdp' | 'invopop' | null;
  electronicAddress: string;
  inbox: Record<string, { state: InboxState; matchedTx?: string; chantierId?: string }>;
  journal: JournalEntry[];
  tapEnabled: boolean;
  installments: boolean;

  setExtra: (id: string, patch: Partial<FactureExtra>) => void;
  addPayment: (p: Omit<Payment, 'id'>) => Payment;
  removePayment: (id: string) => void;
  addReminder: (r: Omit<Reminder, 'id' | 'at'> & { at?: string }) => void;
  set: (p: Partial<Omit<FacturesLocal, 'set'>>) => void;
  setStep: (id: string, patch: Partial<RelanceStep>) => void;
  setInbox: (id: string, patch: Partial<FacturesLocal['inbox'][string]>) => void;
  log: (e: Omit<JournalEntry, 'id' | 'at'> & { at?: string }) => void;
}

const now = (offsetDays = 0, hm = '09:12') => `${dayOffset(offsetDays)}T${hm}:00`;

export const DEFAULT_STEPS: RelanceStep[] = [
  { id: 's1', day: 1, channel: 'email', label: 'Mail courtois', enabled: true },
  { id: 's2', day: 7, channel: 'sms', label: 'SMS de rappel', enabled: true },
  { id: 's3', day: 15, channel: 'courrier', label: 'Mise en demeure préparée', enabled: true },
];

const demoReminders: Reminder[] = [
  { id: 'r1', factureId: 'f_198', at: now(-11, '02:14'), channel: 'email', level: 1, by: 'bob', text: 'Bonjour M. Roche, petit rappel concernant la situation n°2 du chantier LED (F-2026-198), arrivée à échéance hier. Vous pouvez la régler par virement ou directement par carte avec le lien ci-dessous. Bonne journée, Karim Benali' },
  { id: 'r2', factureId: 'f_199', at: now(-4, '02:14'), channel: 'email', level: 1, by: 'bob', text: "Bonjour M. Roux, j'espère que le nouveau tableau vous donne satisfaction. La facture F-2026-199 de 704,00 € est arrivée à échéance hier : vous pouvez la régler en un clic avec le lien ci-dessous. Merci et bonne journée, Karim" },
];

const demoJournal: JournalEntry[] = [
  { id: 'j1', at: now(-1, '06:00'), number: 'Ventes B2C · 1re décade', direction: 'ereporting', event: 'E-reporting transmis', platform: 'SuperPDP', ok: true },
  { id: 'j2', at: now(-2, '10:41'), number: 'REX-2611-4471', direction: 'recue', event: 'Facture fournisseur reçue', platform: 'SuperPDP', ok: true },
  { id: 'j3', at: now(-7, '18:03'), number: 'F-2026-203', direction: 'emise', event: 'Prise en charge par le client', platform: 'SuperPDP', ok: true },
  { id: 'j4', at: now(-7, '09:20'), number: 'F-2026-203', direction: 'emise', event: 'Déposée et émise', platform: 'SuperPDP', ok: true },
  { id: 'j5', at: now(-9, '14:12'), number: 'CED-98123', direction: 'recue', event: 'Facture fournisseur reçue', platform: 'SuperPDP', ok: true },
  { id: 'j6', at: now(-12, '08:30'), number: 'F-2026-196', direction: 'emise', event: 'Encaissée, statut transmis', platform: 'SuperPDP', ok: true },
  { id: 'j7', at: now(-15, '11:05'), number: 'F-2026-195', direction: 'emise', event: 'Approuvée par le client', platform: 'SuperPDP', ok: true },
  { id: 'j8', at: now(-18, '16:47'), number: 'F-2026-204', direction: 'emise', event: 'Déposée et émise', platform: 'SuperPDP', ok: true },
];

export const useFactures = create<FacturesLocal>()(
  persist(
    (set, get) => ({
      extras: {
        f_198: { category: 'services', retenueReleaseDate: dayOffset(352), situation: { index: 2, lots: [{ name: 'Éclairage communs', totalHt: 6787, vatRate: 10, prevPct: 13, pct: 45 }] } },
        f_203: { category: 'mixte', deliveryAddress: '27 cours Émile Zola, 69100 Villeurbanne' },
        f_205: { paymentLink: { url: 'https://pay.brix.fr/f/7Kq2xD', createdAt: dayOffset(-3), methods: ['carte', 'apple_pay', 'instantane'], opened: 2 } },
        f_199: { paymentLink: { url: 'https://pay.brix.fr/f/R0ux9m', createdAt: dayOffset(-4), methods: ['carte', 'apple_pay', 'instantane', 'x3'], opened: 1 } },
      },
      payments: [],
      reminders: demoReminders,
      relanceAuto: true,
      relanceTone: 'cordial',
      steps: DEFAULT_STEPS,
      platform: 'superpdp',
      electronicAddress: '812457963',
      inbox: {},
      journal: demoJournal,
      tapEnabled: true,
      installments: true,

      setExtra: (id, patch) => set((s) => ({ extras: { ...s.extras, [id]: { ...s.extras[id], ...patch } } })),
      addPayment: (p) => {
        const pay = { ...p, id: uid('p') };
        set((s) => ({ payments: [pay, ...s.payments] }));
        return pay;
      },
      removePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),
      addReminder: (r) => set((s) => ({ reminders: [{ ...r, id: uid('r'), at: r.at ?? new Date().toISOString().slice(0, 19) }, ...s.reminders] })),
      set: (p) => set(p),
      setStep: (id, patch) => set((s) => ({ steps: s.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      setInbox: (id, patch) => set((s) => ({ inbox: { ...s.inbox, [id]: { ...(s.inbox[id] ?? { state: 'a_traiter' as InboxState }), ...patch } } })),
      log: (e) => set((s) => ({ journal: [{ ...e, id: uid('j'), at: e.at ?? new Date().toISOString().slice(0, 19) }, ...s.journal].slice(0, 80) })),
    }),
    {
      name: 'brix-v2-factures',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__tf', '1');
          localStorage.removeItem('__tf');
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
    },
  ),
);

/** Moyen de paiement plausible pour les factures de démo déjà réglées. */
const demoMethod = (f: Facture): PaymentMethod => (f.kind === 'acompte' ? 'carte' : f.clientId === 'c_nguyen' ? 'instantane' : 'virement');

/**
 * Paiements d'une facture : ceux saisis dans Brix, sinon un paiement reconstitué
 * à partir du montant déjà réglé (données de démo ou import).
 */
export function paymentsOf(f: Facture, all: Payment[]): Payment[] {
  const mine = all.filter((p) => p.factureId === f.id);
  const known = mine.reduce((s, p) => s + p.amount, 0);
  const rest = Math.round((f.paidAmount - known) * 100) / 100;
  if (rest > 0.009) {
    const date = f.kind === 'acompte' ? f.issueDate : f.dueDate < f.issueDate ? f.issueDate : f.dueDate > dayOffset(0) ? dayOffset(-1) : f.dueDate;
    const method = demoMethod(f);
    const fee = method === 'carte' ? Math.round((rest * 0.015 + 0.25) * 100) / 100 : method === 'instantane' ? 0.5 : undefined;
    mine.push({ id: `p_auto_${f.id}`, factureId: f.id, date, amount: rest, method, fee });
  }
  return mine.sort((a, b) => b.date.localeCompare(a.date));
}

/** Tous les encaissements, toutes factures confondues. */
export function allPayments(factures: Facture[], all: Payment[]): Payment[] {
  return factures.flatMap((f) => paymentsOf(f, all)).sort((a, b) => b.date.localeCompare(a.date));
}
