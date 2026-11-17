// Store local du département Chantiers (photos, journal, avenants, PV, SAV, prise de cotes).
// Ces données n'existent pas encore dans le store global : elles vivent ici, persistées
// dans le navigateur. Quand le worker sera branché, service.ts prendra le relais.

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useBrix } from '@/lib/store';
import type { ID } from '@/lib/types';
import { seedChantiers } from './data/seed';

export type Phase = 'avant' | 'pendant' | 'apres';
export type ArtKind = 'tableau' | 'prise' | 'spots' | 'saignee' | 'baie' | 'hublot' | 'mur' | 'borne' | 'four' | 'clim';

export interface ChantierPhoto {
  id: ID;
  chantierId: ID;
  room: string;
  phase: Phase;
  caption: string;
  at: string; // ISO date-heure
  by: ID; // employé
  art: ArtKind;
  tag?: string; // repère du contrôle qualité (ex. « tableau-ouvert »)
  src?: string; // image réelle réduite (data URL) quand prise depuis l'appareil
}

export type JournalKind = 'vocal' | 'note' | 'evenement' | 'photo' | 'rapport' | 'avenant' | 'achat';

export interface JournalEntry {
  id: ID;
  chantierId: ID;
  at: string; // ISO date-heure
  kind: JournalKind;
  author: ID | 'bob' | 'client';
  text: string;
  duration?: number; // secondes, pour les notes vocales
}

export interface Reserve {
  id: ID;
  text: string;
  location: string;
  photo?: string;
  done: boolean;
}

export interface Pv {
  id: ID;
  chantierId: ID;
  date: string; // date de réception
  withReserves: boolean;
  reserves: Reserve[];
  clientName: string;
  signatures: { client?: string; artisan?: string };
  signedAt?: string;
  sentAt?: string;
}

export type Equipment = 'chaudiere' | 'clim' | 'vmc' | 'tableau' | 'irve' | 'pac' | 'chauffe_eau';

export interface Contract {
  id: ID;
  clientId: ID;
  equipment: Equipment;
  label: string;
  brand?: string;
  installedAt: string;
  lastVisit: string;
  frequencyMonths: number;
  priceHt: number;
  reminder: boolean;
  plannedAt?: string; // visite planifiée
  eventId?: ID;
}

export interface SavVisit {
  id: ID;
  clientId: ID;
  contractId?: ID;
  date: string;
  kind: 'entretien' | 'depannage';
  employeeId: ID;
  notes: string;
}

export interface Intervention {
  id: ID;
  clientId: ID;
  title: string;
  description: string;
  priority: 'urgente' | 'normale' | 'faible';
  status: 'nouvelle' | 'planifiee' | 'terminee';
  createdAt: string;
  plannedAt?: string;
  employeeId?: ID;
  eventId?: ID;
  underWarranty?: boolean;
}

interface ChantiersLocal {
  seeded: 'demo' | 'empty' | null;
  photos: ChantierPhoto[];
  journal: JournalEntry[];
  pvs: Pv[];
  contracts: Contract[];
  visits: SavVisit[];
  interventions: Intervention[];
  seed: () => void;
  clear: () => void;
  addPhoto: (p: ChantierPhoto) => void;
  removePhoto: (id: ID) => void;
  addJournal: (j: JournalEntry) => void;
  upsertPv: (p: Pv) => void;
  upsertContract: (c: Contract) => void;
  addVisit: (v: SavVisit) => void;
  upsertIntervention: (i: Intervention) => void;
}

const up = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const c = list.slice();
  c[i] = item;
  return c;
};

export const useChantiersLocal = create<ChantiersLocal>()(
  persist(
    (set) => ({
      seeded: null,
      photos: [],
      journal: [],
      pvs: [],
      contracts: [],
      visits: [],
      interventions: [],
      seed: () => set({ ...seedChantiers(), seeded: 'demo' }),
      clear: () => set({ seeded: 'empty', photos: [], journal: [], pvs: [], contracts: [], visits: [], interventions: [] }),
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
      addJournal: (j) => set((s) => ({ journal: [j, ...s.journal] })),
      upsertPv: (p) => set((s) => ({ pvs: up(s.pvs, p) })),
      upsertContract: (c) => set((s) => ({ contracts: up(s.contracts, c) })),
      addVisit: (v) => set((s) => ({ visits: [v, ...s.visits] })),
      upsertIntervention: (i) => set((s) => ({ interventions: up(s.interventions, i) })),
    }),
    {
      name: 'brix-v2-chantiers',
      version: 2,
      migrate: () => ({ seeded: null }) as never,
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__c', '1');
          localStorage.removeItem('__c');
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
    },
  ),
);

/** Charge les données de démo du département la première fois (seulement en mode démo). */
export function useChantiersSeed() {
  const isDemo = useBrix((s) => s.isDemo);
  const seeded = useChantiersLocal((s) => s.seeded);
  const hasDemoChantier = useBrix((s) => s.chantiers.some((c) => c.id === 'ch_lefevre'));
  useEffect(() => {
    if (isDemo && hasDemoChantier && seeded !== 'demo') useChantiersLocal.getState().seed();
    if (!isDemo && seeded === 'demo') useChantiersLocal.getState().clear();
  }, [seeded, isDemo, hasDemoChantier]);
}
