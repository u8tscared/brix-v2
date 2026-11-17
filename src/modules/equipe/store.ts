// Store local du département Équipe (zustand persisté), en attendant le worker.
// Il complète le store global (employees) avec ce qui n'y est pas : pointages en
// cours, validations de semaine, congés, invitations, habilitations, bulletins.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset, uid } from '@/lib/format';
import type { DayPunch, RoleKey } from './data';

export type LeaveType = 'cp' | 'recup' | 'maladie' | 'sans_solde' | 'formation' | 'familial';
export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  status: 'en_attente' | 'validee' | 'refusee';
  note?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  name: string;
  phone?: string;
  role: RoleKey;
  via: 'lien' | 'sms' | 'qr';
  at: string;
  status: 'envoyee' | 'acceptee';
}

export interface LivePunch {
  employeeId: string;
  date: string;
  start: string;
  end?: string;
  pauses: { from: string; to?: string }[];
  chantierId?: string;
  where?: string;
  lat?: number;
  lng?: number;
}

export interface HabRecord {
  id: string;
  employeeId: string;
  type: string; // clé de HAB_TYPES
  obtained: string;
  expires: string;
  organisme: string;
}

export interface TrainingPlan {
  id: string;
  employeeId: string;
  type: string;
  date: string;
  organisme: string;
  cost: number;
  funded: boolean;
  status: 'a_planifier' | 'inscrit' | 'fait';
}

interface EquipeState {
  live: LivePunch[];
  edits: Record<string, Partial<DayPunch>>; // clé employeeId|date
  validatedWeeks: string[]; // lundi ISO
  leaves: LeaveRequest[];
  invitations: Invitation[];
  habs: HabRecord[];
  trainings: TrainingPlan[];
  validatedPayslips: string[]; // employeeId|YYYY-MM
  payslipOverrides: Record<string, { pasRate?: number | null; bonus?: number }>;

  clockIn: (p: LivePunch) => void;
  clockOut: (employeeId: string, at: string) => void;
  togglePause: (employeeId: string, at: string) => void;
  editPunch: (key: string, patch: Partial<DayPunch>) => void;
  validateWeek: (monday: string, on?: boolean) => void;
  addLeave: (l: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => void;
  setLeaveStatus: (id: string, status: LeaveRequest['status']) => void;
  invite: (i: Omit<Invitation, 'id' | 'at' | 'status'>) => void;
  upsertHab: (h: HabRecord) => void;
  upsertTraining: (t: TrainingPlan) => void;
  validatePayslip: (key: string, on?: boolean) => void;
  overridePayslip: (key: string, patch: { pasRate?: number | null; bonus?: number }) => void;
  resetDemo: () => void;
}

const d = dayOffset;

export const demoLeaves = (): LeaveRequest[] => [
  { id: 'lv1', employeeId: 'e_yanis', type: 'cp', from: d(35), to: d(46), days: 9, status: 'en_attente', note: 'Fêtes en famille au Portugal', createdAt: d(-1) },
  { id: 'lv2', employeeId: 'e_mehdi', type: 'cp', from: d(11), to: d(12), days: 2, status: 'en_attente', note: 'Déménagement', createdAt: d(0) },
  { id: 'lv3', employeeId: 'e_lucas', type: 'formation', from: d(16), to: d(18), days: 3, status: 'validee', note: 'Semaine au CFA', createdAt: d(-10) },
  { id: 'lv4', employeeId: 'e_mehdi', type: 'cp', from: d(-24), to: d(-23), days: 2, status: 'validee', createdAt: d(-40) },
  { id: 'lv5', employeeId: 'e_yanis', type: 'recup', from: d(4), to: d(4), days: 1, status: 'validee', note: 'Récupération samedi Tilleuls', createdAt: d(-5) },
  { id: 'lv6', employeeId: 'e_lucas', type: 'cp', from: d(37), to: d(41), days: 5, status: 'en_attente', createdAt: d(-2) },
];

export const demoHabs = (): HabRecord[] => [
  { id: 'h1', employeeId: 'e_karim', type: 'elec_br', obtained: d(-675), expires: d(420), organisme: 'APAVE Lyon' },
  { id: 'h2', employeeId: 'e_karim', type: 'sst', obtained: d(-500), expires: d(230), organisme: 'Croix-Rouge' },
  { id: 'h3', employeeId: 'e_yanis', type: 'elec_bc', obtained: d(-1072), expires: d(23), organisme: 'APAVE Lyon' },
  { id: 'h4', employeeId: 'e_yanis', type: 'hauteur', obtained: d(-885), expires: d(210), organisme: 'AFPA Vénissieux' },
  { id: 'h5', employeeId: 'e_yanis', type: 'caces_r486', obtained: d(-1100), expires: d(725), organisme: 'Bureau Veritas' },
  { id: 'h6', employeeId: 'e_yanis', type: 'sst', obtained: d(-690), expires: d(41), organisme: 'Croix-Rouge' },
  { id: 'h7', employeeId: 'e_mehdi', type: 'elec_b1v', obtained: d(-935), expires: d(160), organisme: 'APAVE Lyon' },
  { id: 'h8', employeeId: 'e_mehdi', type: 'caces_r486', obtained: d(-1830), expires: d(-5), organisme: 'Bureau Veritas' },
  { id: 'h9', employeeId: 'e_mehdi', type: 'amiante_ss4', obtained: d(-700), expires: d(395), organisme: 'Ginger CEBTP' },
  { id: 'h10', employeeId: 'e_lucas', type: 'elec_b0', obtained: d(-60), expires: d(300), organisme: 'CFA BTP Dardilly' },
  { id: 'h11', employeeId: 'e_lucas', type: 'hauteur', obtained: d(-60), expires: d(1035), organisme: 'CFA BTP Dardilly' },
];

const demoTrainings = (): TrainingPlan[] => [
  { id: 't1', employeeId: 'e_mehdi', type: 'caces_r486', date: d(9), organisme: 'Bureau Veritas Lyon', cost: 690, funded: true, status: 'a_planifier' },
  { id: 't2', employeeId: 'e_yanis', type: 'elec_bc', date: d(14), organisme: 'APAVE Lyon', cost: 520, funded: true, status: 'inscrit' },
  { id: 't3', employeeId: 'e_lucas', type: 'sst', date: d(52), organisme: 'Croix-Rouge Villeurbanne', cost: 260, funded: true, status: 'a_planifier' },
];

const initial = () => ({
  live: [] as LivePunch[],
  edits: {},
  validatedWeeks: [] as string[],
  leaves: demoLeaves(),
  invitations: [] as Invitation[],
  habs: demoHabs(),
  trainings: demoTrainings(),
  validatedPayslips: [] as string[],
  payslipOverrides: {},
});

export const useEquipe = create<EquipeState>()(
  persist(
    (set) => ({
      ...initial(),
      clockIn: (p) => set((s) => ({ live: [...s.live.filter((x) => !(x.employeeId === p.employeeId && x.date === p.date)), p] })),
      clockOut: (id, at) =>
        set((s) => ({
          live: s.live.map((x) => (x.employeeId === id && !x.end ? { ...x, end: at, pauses: x.pauses.map((p) => (p.to ? p : { ...p, to: at })) } : x)),
        })),
      togglePause: (id, at) =>
        set((s) => ({
          live: s.live.map((x) => {
            if (x.employeeId !== id || x.end) return x;
            const open = x.pauses.find((p) => !p.to);
            return { ...x, pauses: open ? x.pauses.map((p) => (p === open ? { ...p, to: at } : p)) : [...x.pauses, { from: at }] };
          }),
        })),
      editPunch: (key, patch) => set((s) => ({ edits: { ...s.edits, [key]: { ...s.edits[key], ...patch } } })),
      validateWeek: (monday, on = true) => set((s) => ({ validatedWeeks: on ? [...new Set([...s.validatedWeeks, monday])] : s.validatedWeeks.filter((w) => w !== monday) })),
      addLeave: (l) => set((s) => ({ leaves: [{ ...l, id: uid('lv'), status: 'en_attente', createdAt: dayOffset(0) }, ...s.leaves] })),
      setLeaveStatus: (id, status) => set((s) => ({ leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) })),
      invite: (i) => set((s) => ({ invitations: [{ ...i, id: uid('inv'), at: new Date().toISOString(), status: 'envoyee' }, ...s.invitations] })),
      upsertHab: (h) => set((s) => ({ habs: s.habs.some((x) => x.id === h.id) ? s.habs.map((x) => (x.id === h.id ? h : x)) : [...s.habs, h] })),
      upsertTraining: (t) => set((s) => ({ trainings: s.trainings.some((x) => x.id === t.id) ? s.trainings.map((x) => (x.id === t.id ? t : x)) : [...s.trainings, t] })),
      validatePayslip: (key, on = true) => set((s) => ({ validatedPayslips: on ? [...new Set([...s.validatedPayslips, key])] : s.validatedPayslips.filter((k) => k !== key) })),
      overridePayslip: (key, patch) => set((s) => ({ payslipOverrides: { ...s.payslipOverrides, [key]: { ...s.payslipOverrides[key], ...patch } } })),
      resetDemo: () => set(initial()),
    }),
    { name: 'brix-v2-equipe', version: 1 },
  ),
);
