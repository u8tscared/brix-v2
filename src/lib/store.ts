// Store global de l'app (zustand, persisté dans le navigateur).
// En preview il n'y a pas de backend : tout vit ici, avec les données de démo.
// Quand le worker sera branché, src/lib/api.ts prendra le relais module par module.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ModuleKey, Plan, PriorityKey } from './catalog';
import { recommendModules } from './catalog';
import { demoFor } from './demoTrades';
import { uid } from './format';
import type { BankTx, BobAction, Chantier, Client, Company, Devis, Employee, Expense, Facture, Lead, PlanningEvent, TradeKey, User } from './types';

export interface Prefs {
  favorites: string[]; // chemins épinglés dans le menu
  sidebarCollapsed: boolean;
  tourDone: boolean;
  checklistDismissed: boolean;
  voice: boolean;
}

export interface BrixState {
  onboarded: boolean;
  isDemo: boolean;
  /** Entreprise du compte dont ces données sont la copie (synchronisation cloud, src/lib/cloud.ts). Absent : données locales ou démo. */
  compte?: string;
  plan: Plan;
  priorities: PriorityKey[];
  enabled: ModuleKey[];
  company: Company;
  user: User;
  clients: Client[];
  chantiers: Chantier[];
  devis: Devis[];
  factures: Facture[];
  employees: Employee[];
  events: PlanningEvent[];
  leads: Lead[];
  bob: BobAction[];
  expenses: Expense[];
  bank: BankTx[];
  cashBalance: number;
  prefs: Prefs;
  setupTasks: Record<string, boolean>;

  // actions
  /** Charge la démo, adaptée au métier (par défaut : le métier actuel, sinon électricien). */
  loadDemo: (trade?: TradeKey) => void;
  completeOnboarding: (p: { company: Partial<Company>; user: Partial<User>; priorities: PriorityKey[]; enabled: ModuleKey[]; plan?: Plan; withDemoData: boolean }) => void;
  reset: () => void;
  toggleModule: (k: ModuleKey, on?: boolean) => void;
  setPlan: (p: Plan) => void;
  updateCompany: (c: Partial<Company>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  markTask: (key: string, done?: boolean) => void;

  upsertClient: (c: Client) => void;
  removeClient: (id: string) => void;
  upsertChantier: (c: Chantier) => void;
  upsertDevis: (d: Devis) => void;
  removeDevis: (id: string) => void;
  upsertFacture: (f: Facture) => void;
  upsertEmployee: (e: Employee) => void;
  upsertEvent: (e: PlanningEvent) => void;
  removeEvent: (id: string) => void;
  upsertLead: (l: Lead) => void;
  upsertExpense: (x: Expense) => void;
  upsertBank: (t: BankTx) => void;
  pushBob: (a: Omit<BobAction, 'id' | 'at'>) => void;
  updateBob: (id: string, patch: Partial<BobAction>) => void;

  nextNumber: (kind: 'devis' | 'facture') => string;
}

const emptyCompany: Company = {
  name: '', legalName: '', siret: '', vatNumber: '', address: '', city: '', phone: '', email: '',
  trade: 'electricien', secondaryTrades: [], size: 'solo', employees: 1, rge: false, decennale: '', iban: '', hourlyRate: 50, defaultVat: 10, logoInitials: '',
};

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = list.slice();
  copy[i] = item;
  return copy;
};

const demoState = (trade?: string) => {
  const x = demoFor(trade);
  return {
    onboarded: true,
    isDemo: true,
    plan: 'equipe' as Plan,
    priorities: ['devis_rapides', 'argent', 'organisation'] as PriorityKey[],
    enabled: [...new Set(recommendModules(x.company.trade, 'petite', ['devis_rapides', 'argent', 'organisation', 'achats', 'equipe']).concat(['fournisseurs', 'agent_nuit', 'mcp', 'secretaire', 'portail', 'avis', 'rdv', 'leads', 'cotes', 'pv', 'sav', 'frais', 'site', 'reseaux', 'compta', 'paie', 'conges', 'habilitations', 'documents', 'stocks', 'vehicules', 'soustraitants', 'pointage', 'equipe'] as ModuleKey[]))],
    company: x.company,
    user: x.user,
    clients: x.clients,
    chantiers: x.chantiers,
    devis: x.devis,
    factures: x.factures,
    employees: x.employees,
    events: x.events,
    leads: x.leads,
    bob: x.bob,
    expenses: x.expenses,
    bank: x.bank,
    cashBalance: x.cashBalance,
    setupTasks: { profil: true, logo: true, premier_devis: true, banque: false, equipe: true, efacture: false, import: false },
  };
};

const initialPrefs: Prefs = { favorites: [], sidebarCollapsed: false, tourDone: false, checklistDismissed: false, voice: true };

export const useBrix = create<BrixState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      isDemo: false,
      plan: 'pro',
      priorities: [],
      enabled: [],
      company: emptyCompany,
      user: { id: 'u_me', firstName: '', lastName: '', email: '', role: 'patron' },
      clients: [],
      chantiers: [],
      devis: [],
      factures: [],
      employees: [],
      events: [],
      leads: [],
      bob: [],
      expenses: [],
      bank: [],
      cashBalance: 0,
      prefs: initialPrefs,
      setupTasks: {},

      loadDemo: (trade) => {
        const t = typeof trade === 'string' ? trade : get().onboarded ? get().company.trade : undefined;
        set({ ...demoState(t), compte: undefined, prefs: { ...initialPrefs, tourDone: true } });
      },

      completeOnboarding: ({ company, user, priorities, enabled, plan, withDemoData }) => {
        const base = withDemoData ? demoState(company.trade) : {};
        const meId = 'e_me';
        const fullUser = { ...get().user, ...user } as User;
        const me: Employee = {
          id: meId, firstName: fullUser.firstName || 'Moi', lastName: fullUser.lastName || '', initials: `${(fullUser.firstName || 'M')[0]}${(fullUser.lastName || '')[0] || ''}`.toUpperCase(),
          role: 'patron', color: '#17171f', phone: company.phone || '', email: fullUser.email, hourlyCost: 0, contract: 'Gérant', grossMonthly: 0, hireDate: new Date().toISOString().slice(0, 10), habilitations: [], leaveBalance: 0,
        };
        const soloDemo = withDemoData && company.size === 'solo';
        set({
          ...base,
          ...(soloDemo ? { events: (base as ReturnType<typeof demoState>).events.filter((e) => e.employeeId === 'e_karim').map((e) => ({ ...e, employeeId: meId })) } : {}),
          onboarded: true,
          isDemo: withDemoData,
          priorities,
          enabled,
          plan: plan ?? 'pro',
          company: { ...(withDemoData ? (base as ReturnType<typeof demoState>).company : emptyCompany), ...company } as Company,
          user: fullUser,
          employees: withDemoData && !soloDemo ? (base as ReturnType<typeof demoState>).employees.map((e) => (e.id === 'e_karim' ? { ...e, firstName: me.firstName, lastName: me.lastName, initials: me.initials, email: me.email } : e)) : [me],
          prefs: { ...initialPrefs },
          setupTasks: { profil: true },
        });
      },

      reset: () => {
        set({ onboarded: false, isDemo: false, compte: undefined, enabled: [], priorities: [], company: emptyCompany, clients: [], chantiers: [], devis: [], factures: [], employees: [], events: [], leads: [], bob: [], expenses: [], bank: [], cashBalance: 0, prefs: initialPrefs, setupTasks: {} });
      },

      toggleModule: (k, on) => set((s) => {
        const has = s.enabled.includes(k);
        const want = on ?? !has;
        if (want === has) return s;
        return { enabled: want ? [...s.enabled, k] : s.enabled.filter((x) => x !== k) };
      }),
      setPlan: (plan) => set({ plan }),
      updateCompany: (c) => set((s) => ({ company: { ...s.company, ...c } })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      markTask: (key, done = true) => set((s) => ({ setupTasks: { ...s.setupTasks, [key]: done } })),

      upsertClient: (c) => set((s) => ({ clients: upsert(s.clients, c) })),
      removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      upsertChantier: (c) => set((s) => ({ chantiers: upsert(s.chantiers, c) })),
      upsertDevis: (d) => set((s) => ({ devis: upsert(s.devis, d) })),
      removeDevis: (id) => set((s) => ({ devis: s.devis.filter((d) => d.id !== id) })),
      upsertFacture: (f) => set((s) => ({ factures: upsert(s.factures, f) })),
      upsertEmployee: (e) => set((s) => ({ employees: upsert(s.employees, e) })),
      upsertEvent: (e) => set((s) => ({ events: upsert(s.events, e) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      upsertLead: (l) => set((s) => ({ leads: upsert(s.leads, l) })),
      upsertExpense: (x) => set((s) => ({ expenses: upsert(s.expenses, x) })),
      upsertBank: (t) => set((s) => ({ bank: upsert(s.bank, t) })),
      pushBob: (a) => set((s) => ({ bob: [{ ...a, id: uid('b'), at: new Date().toTimeString().slice(0, 5) }, ...s.bob] })),
      updateBob: (id, patch) => set((s) => ({ bob: s.bob.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      nextNumber: (kind) => {
        const year = new Date().getFullYear();
        const list = kind === 'devis' ? get().devis : get().factures;
        const prefix = kind === 'devis' ? 'D' : 'F';
        const max = list.reduce((m, x) => {
          const k = Number(x.number.split('-').pop());
          return Number.isFinite(k) ? Math.max(m, k) : m;
        }, kind === 'devis' ? 100 : 200);
        return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
      },
    }),
    {
      name: 'brix-v2',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__t', '1');
          localStorage.removeItem('__t');
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
    },
  ),
);

// Sélecteurs pratiques
export const useClient = (id?: string) => useBrix((s) => s.clients.find((c) => c.id === id));
export const useModuleOn = (k: ModuleKey) => useBrix((s) => s.enabled.includes(k));
