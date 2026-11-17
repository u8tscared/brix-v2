// Store local du module Bob (persisté) : mémoire, ton, agent de nuit,
// secrétaire téléphonique, brief et connexion MCP. Ces réglages vivront côté
// worker plus tard ; en preview ils restent dans le navigateur.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type MemoryKind = 'prix' | 'formulation' | 'habitude';
export interface BobMemory {
  id: string;
  kind: MemoryKind;
  label: string;
  value: string;
  learnedFrom: string;
}

export type NightLevel = 'ask' | 'small' | 'auto';
export type McpPerm = 'off' | 'read' | 'write';

export interface BobTone {
  length: 'court' | 'detaille';
  formal: boolean; // vouvoyer les clients dans les mails préparés
  speak: boolean; // lire les réponses à voix haute en mode voix
}

export interface BriefSettings {
  whatsapp: boolean;
  sms: boolean;
  hour: string;
  phone: string;
}

export interface SecretarySettings {
  enabled: boolean;
  greeting: string;
  forwardNumber: string;
  forwardAfter: number; // sonneries
  hours: { days: string; from: string; to: string };
  urgentToSms: boolean;
}

export interface BobLocalState {
  memory: BobMemory[];
  tone: BobTone;
  nightLevel: NightLevel;
  nightTasks: Record<string, boolean>;
  nightDecisions: Record<string, 'validee' | 'annulee'>;
  brief: BriefSettings;
  secretary: SecretarySettings;
  callsDone: Record<string, boolean>;
  mcp: { token: string | null; createdAt: string | null; perms: Record<string, McpPerm>; mcpAddon: boolean };

  addMemory: (m: Omit<BobMemory, 'id'>) => void;
  updateMemory: (id: string, patch: Partial<BobMemory>) => void;
  removeMemory: (id: string) => void;
  setTone: (p: Partial<BobTone>) => void;
  setNightLevel: (l: NightLevel) => void;
  setNightTask: (k: string, on: boolean) => void;
  decideNight: (id: string, d: 'validee' | 'annulee' | null) => void;
  setBrief: (p: Partial<BriefSettings>) => void;
  setSecretary: (p: Partial<SecretarySettings>) => void;
  markCall: (id: string, done: boolean) => void;
  setMcp: (p: Partial<BobLocalState['mcp']>) => void;
  setPerm: (tool: string, p: McpPerm) => void;
}

const rid = () => Math.random().toString(36).slice(2, 9);

export const DEFAULT_MEMORY: BobMemory[] = [
  { id: 'm1', kind: 'prix', label: 'Prise 2P+T posée', value: '24,50 € HT la prise + 0,5 h de pose', learnedFrom: '18 devis' },
  { id: 'm2', kind: 'prix', label: 'Radiateur électrique 1 500 W', value: '389 € HT fourni, 1,5 h de pose', learnedFrom: '6 devis' },
  { id: 'm3', kind: 'prix', label: 'Ton taux horaire', value: '55 € HT (60 € pour les bornes IRVE)', learnedFrom: 'tes réglages' },
  { id: 'm4', kind: 'habitude', label: 'Acompte', value: '30 % à la signature, 40 % pour les pros', learnedFrom: '24 devis' },
  { id: 'm5', kind: 'habitude', label: 'Attestation Consuel', value: 'Ajoutée d’office sur les rénovations complètes', learnedFrom: '9 devis' },
  { id: 'm6', kind: 'formulation', label: 'Relance polie', value: '« Petit rappel amical : la facture … reste à régler. Si c’est déjà fait, merci et ignorez ce message. »', learnedFrom: '12 relances' },
  { id: 'm7', kind: 'formulation', label: 'Fin de mail', value: '« Bien à vous, Karim – Benali Électricité »', learnedFrom: 'tes mails' },
];

export const MCP_TOOLS: { key: string; name: string; desc: string; write: boolean }[] = [
  { key: 'list_clients', name: 'Lister les clients', desc: 'Nom, ville, contact, historique', write: false },
  { key: 'get_client', name: 'Fiche client', desc: 'Devis, factures et chantiers d’un client', write: false },
  { key: 'create_client', name: 'Créer un client', desc: 'Ajoute un client au carnet', write: true },
  { key: 'list_devis', name: 'Lister les devis', desc: 'Statut, montant, date de signature', write: false },
  { key: 'create_devis', name: 'Créer un devis', desc: 'Toujours en brouillon, jamais envoyé seul', write: true },
  { key: 'invoice_status', name: 'Statut des factures', desc: 'Payées, en attente, en retard', write: false },
  { key: 'send_reminder', name: 'Relancer une facture', desc: 'Envoie la relance polie au client', write: true },
  { key: 'planning', name: 'Planning', desc: 'Qui est où, cette semaine', write: false },
  { key: 'add_event', name: 'Ajouter au planning', desc: 'Place un compagnon sur un chantier', write: true },
  { key: 'chantier_status', name: 'Point chantier', desc: 'Avancement, marge, prochaine étape', write: false },
  { key: 'cash', name: 'Trésorerie', desc: 'Solde et encaissements du mois', write: false },
];

export const useBobLocal = create<BobLocalState>()(
  persist(
    (set) => ({
      memory: DEFAULT_MEMORY,
      tone: { length: 'court', formal: true, speak: true },
      nightLevel: 'small',
      nightTasks: { relances: true, devis: true, banque: true, commandes: true, planning: false },
      nightDecisions: {},
      brief: { whatsapp: true, sms: false, hour: '07:00', phone: '06 12 45 78 90' },
      secretary: {
        enabled: true,
        greeting: 'Bonjour, vous êtes bien chez Benali Électricité. Karim est sur un chantier, je suis Bob, son assistant. Dites-moi ce dont vous avez besoin, je lui transmets tout de suite.',
        forwardNumber: '',
        forwardAfter: 4,
        hours: { days: 'Du lundi au vendredi', from: '07:30', to: '18:30' },
        urgentToSms: true,
      },
      callsDone: {},
      mcp: {
        token: null,
        createdAt: null,
        perms: Object.fromEntries(MCP_TOOLS.map((t) => [t.key, t.write ? 'off' : 'read'])) as Record<string, McpPerm>,
        mcpAddon: false,
      },

      addMemory: (m) => set((s) => ({ memory: [{ ...m, id: 'm_' + rid() }, ...s.memory] })),
      updateMemory: (id, patch) => set((s) => ({ memory: s.memory.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMemory: (id) => set((s) => ({ memory: s.memory.filter((m) => m.id !== id) })),
      setTone: (p) => set((s) => ({ tone: { ...s.tone, ...p } })),
      setNightLevel: (nightLevel) => set({ nightLevel }),
      setNightTask: (k, on) => set((s) => ({ nightTasks: { ...s.nightTasks, [k]: on } })),
      decideNight: (id, d) =>
        set((s) => {
          const next = { ...s.nightDecisions };
          if (d) next[id] = d;
          else delete next[id];
          return { nightDecisions: next };
        }),
      setBrief: (p) => set((s) => ({ brief: { ...s.brief, ...p } })),
      setSecretary: (p) => set((s) => ({ secretary: { ...s.secretary, ...p } })),
      markCall: (id, done) => set((s) => ({ callsDone: { ...s.callsDone, [id]: done } })),
      setMcp: (p) => set((s) => ({ mcp: { ...s.mcp, ...p } })),
      setPerm: (tool, p) => set((s) => ({ mcp: { ...s.mcp, perms: { ...s.mcp.perms, [tool]: p } } })),
    }),
    {
      name: 'brix-v2-bob',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__tb', '1');
          localStorage.removeItem('__tb');
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
    },
  ),
);
