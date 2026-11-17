// Données de démonstration et référentiels du département Équipe.
// Les pointages sont générés de façon déterministe pour que la démo reste stable
// d'un rechargement à l'autre, et relative à aujourd'hui.

import { dayOffset } from '@/lib/format';
import type { Employee, Role } from '@/lib/types';
import type { Zone } from './lib/payroll';

/* ------------------------------------------------------------------ Rôles */

export type RoleKey = 'gerant' | 'conducteur' | 'chef_equipe' | 'compagnon' | 'apprenti' | 'secretaire' | 'comptable' | 'sous_traitant' | 'expert_comptable';

export const ROLES: { key: RoleKey; name: string; short: string; color: string }[] = [
  { key: 'gerant', name: 'Gérant', short: 'Voit et décide de tout.', color: '#17171f' },
  { key: 'conducteur', name: 'Conducteur de travaux', short: 'Pilote les chantiers, les devis et le planning.', color: '#1F389D' },
  { key: 'chef_equipe', name: 'Chef d’équipe', short: 'Organise son équipe sur le terrain.', color: '#f59e0b' },
  { key: 'compagnon', name: 'Compagnon', short: 'Ses chantiers du jour, pointage, photos.', color: '#6366f1' },
  { key: 'apprenti', name: 'Apprenti', short: 'Comme un compagnon, sans les prix.', color: '#10b981' },
  { key: 'secretaire', name: 'Secrétaire', short: 'Clients, devis, factures, agenda.', color: '#ec4899' },
  { key: 'comptable', name: 'Comptable', short: 'Factures, banque, paie en lecture.', color: '#0ea5e9' },
  { key: 'sous_traitant', name: 'Sous-traitant', short: 'Un seul chantier, sans aucun prix.', color: '#78716c' },
  { key: 'expert_comptable', name: 'Expert-comptable externe', short: 'Lecture seule, exports compta et paie.', color: '#0f766e' },
];

export const roleFromStore = (r: Role): RoleKey =>
  ({ patron: 'gerant', conducteur: 'conducteur', chef_equipe: 'chef_equipe', ouvrier: 'compagnon', apprenti: 'apprenti', secretaire: 'secretaire', comptable: 'comptable' } as const)[r];

export const roleToStore = (k: RoleKey): Role | null =>
  ({ gerant: 'patron', conducteur: 'conducteur', chef_equipe: 'chef_equipe', compagnon: 'ouvrier', apprenti: 'apprenti', secretaire: 'secretaire', comptable: 'comptable', sous_traitant: null, expert_comptable: null } as const)[k];

export const roleName = (k: RoleKey) => ROLES.find((r) => r.key === k)?.name ?? k;

/** oui = complet, siens = seulement ses chantiers, lecture = voir sans modifier, non = rien. */
export type Right = 'oui' | 'siens' | 'lecture' | 'non';

export const PERMISSIONS: { key: string; label: string; help: string; rights: Record<RoleKey, Right> }[] = [
  { key: 'chantiers', label: 'Voir les chantiers', help: 'Adresse, planning, photos, notes', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'siens', compagnon: 'siens', apprenti: 'siens', secretaire: 'oui', comptable: 'lecture', sous_traitant: 'siens', expert_comptable: 'non' } },
  { key: 'pointer', label: 'Pointer et ajouter des photos', help: 'Arrivée, départ, photos de chantier', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'oui', compagnon: 'oui', apprenti: 'oui', secretaire: 'non', comptable: 'non', sous_traitant: 'siens', expert_comptable: 'non' } },
  { key: 'achat', label: 'Voir les prix d’achat et les marges', help: 'Tarifs fournisseurs, marge par chantier', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'lecture', comptable: 'lecture', sous_traitant: 'non', expert_comptable: 'lecture' } },
  { key: 'devis', label: 'Créer et envoyer un devis', help: 'Préparer, envoyer, relancer', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'oui', comptable: 'non', sous_traitant: 'non', expert_comptable: 'non' } },
  { key: 'valider_devis', label: 'Valider un devis ou une remise', help: 'Au-delà de 5 000 € ou plus de 10 % de remise', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'non', comptable: 'non', sous_traitant: 'non', expert_comptable: 'non' } },
  { key: 'factures', label: 'Facturer et encaisser', help: 'Factures, acomptes, relances', rights: { gerant: 'oui', conducteur: 'lecture', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'oui', comptable: 'oui', sous_traitant: 'non', expert_comptable: 'lecture' } },
  { key: 'banque', label: 'Voir la banque et la trésorerie', help: 'Soldes, paiements, prévisions', rights: { gerant: 'oui', conducteur: 'non', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'non', comptable: 'oui', sous_traitant: 'non', expert_comptable: 'lecture' } },
  { key: 'heures', label: 'Valider les heures', help: 'Feuilles d’heures de la semaine', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'siens', compagnon: 'non', apprenti: 'non', secretaire: 'non', comptable: 'lecture', sous_traitant: 'non', expert_comptable: 'non' } },
  { key: 'planning', label: 'Modifier le planning', help: 'Affecter les équipes aux chantiers', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'siens', compagnon: 'non', apprenti: 'non', secretaire: 'oui', comptable: 'non', sous_traitant: 'non', expert_comptable: 'non' } },
  { key: 'paie', label: 'Voir la paie et les salaires', help: 'Bulletins, coûts horaires', rights: { gerant: 'oui', conducteur: 'non', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'non', comptable: 'oui', sous_traitant: 'non', expert_comptable: 'lecture' } },
  { key: 'inviter', label: 'Inviter des personnes', help: 'Ajouter un salarié ou un partenaire', rights: { gerant: 'oui', conducteur: 'oui', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'oui', comptable: 'non', sous_traitant: 'non', expert_comptable: 'non' } },
  { key: 'export', label: 'Exporter pour la comptabilité', help: 'FEC, ventes, achats, paie', rights: { gerant: 'oui', conducteur: 'non', chef_equipe: 'non', compagnon: 'non', apprenti: 'non', secretaire: 'non', comptable: 'oui', sous_traitant: 'non', expert_comptable: 'oui' } },
];

export const RIGHT_LABEL: Record<Right, string> = { oui: 'Oui', siens: 'Les siens', lecture: 'Lecture', non: 'Non' };

/* ------------------------------------------------------- Fiches complémentaires */

export interface EmployeeExtra {
  statut: 'Ouvrier' | 'ETAM' | 'Cadre' | 'Dirigeant';
  qualification: string;
  zone: Zone;
  pasRate: number | null;
  ssn: string;
}

export const EMPLOYEE_EXTRA: Record<string, EmployeeExtra> = {
  e_karim: { statut: 'Dirigeant', qualification: 'Gérant majoritaire', zone: 1, pasRate: null, ssn: '1 78 03 69 ••• ••• 12' },
  e_yanis: { statut: 'Ouvrier', qualification: 'Chef d’équipe · niveau IV position 1, coef. 250', zone: 1, pasRate: 4.6, ssn: '1 91 06 69 ••• ••• 48' },
  e_mehdi: { statut: 'Ouvrier', qualification: 'Compagnon professionnel · niveau III position 1, coef. 210', zone: 2, pasRate: null, ssn: '1 96 11 93 ••• ••• 07' },
  e_lucas: { statut: 'Ouvrier', qualification: 'Apprenti 2e année · BP électricien', zone: 1, pasRate: null, ssn: '1 06 02 69 ••• ••• 31' },
};
export const extraOf = (id: string): EmployeeExtra => EMPLOYEE_EXTRA[id] ?? { statut: 'Ouvrier', qualification: 'Compagnon', zone: 1, pasRate: null, ssn: '' };

/* ------------------------------------------------------- Chantiers : lieu et zone */

export const CHANTIER_GEO: Record<string, { lat: number; lng: number; km: number; zone: Zone }> = {
  ch_lefevre: { lat: 45.7597, lng: 4.8442, km: 4.2, zone: 1 },
  ch_martin: { lat: 45.7676, lng: 4.8799, km: 1.1, zone: 1 },
  ch_tilleuls: { lat: 45.7718, lng: 4.8526, km: 11.4, zone: 2 },
  ch_nguyen: { lat: 45.7469, lng: 4.8399, km: 13.2, zone: 2 },
  ch_dupuis: { lat: 45.8053, lng: 4.8569, km: 8.6, zone: 1 },
  ch_morel: { lat: 45.7663, lng: 4.8796, km: 0.8, zone: 1 },
};
export const DEPOT = { lat: 45.7672, lng: 4.8801, label: 'Dépôt · 12 rue Francis de Pressensé' };

/* ------------------------------------------------------- Pointages */

export interface DayPunch {
  date: string;
  employeeId: string;
  start: string; // HH:mm
  end: string;
  pauseMin: number;
  chantierId?: string;
  kind: 'chantier' | 'cfa' | 'conge' | 'ferie' | 'absent';
  panier: boolean;
  zone?: Zone;
}

/** Petit générateur pseudo-aléatoire stable à partir d'une chaîne. */
export function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
export const workedHours = (p: Pick<DayPunch, 'start' | 'end' | 'pauseMin' | 'kind'>) =>
  p.kind === 'chantier' || p.kind === 'cfa' ? Math.max(0, (toMin(p.end) - toMin(p.start) - p.pauseMin) / 60) : 0;

const FERIES_2026 = ['2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25'];

const ROTATION: Record<string, string[]> = {
  e_yanis: ['ch_lefevre', 'ch_lefevre', 'ch_tilleuls', 'ch_tilleuls', 'ch_lefevre'],
  e_mehdi: ['ch_martin', 'ch_nguyen', 'ch_martin', 'ch_nguyen', 'ch_nguyen'],
  e_lucas: ['ch_lefevre', 'ch_lefevre', 'cfa', 'ch_tilleuls', 'ch_lefevre'],
  e_karim: ['ch_lefevre', 'ch_dupuis', 'ch_lefevre', 'ch_martin', 'ch_tilleuls'],
};

/** Congés validés de la démo (jours ouvrés) : utilisés par le pointage et la paie. */
export const DEMO_LEAVE_DAYS: Record<string, string[]> = {
  e_mehdi: [dayOffset(-24), dayOffset(-23)],
  e_yanis: [dayOffset(-38)],
};

/** Pointage d'un salarié pour un jour passé (ou aujourd'hui), généré pour la démo. */
export function demoPunch(emp: Employee, date: string): DayPunch | null {
  const d = new Date(date + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return null;
  if (emp.role === 'patron') return null; // le gérant ne pointe pas pour la paie
  const base = { date, employeeId: emp.id, panier: false } as const;
  if (FERIES_2026.includes(date)) return { ...base, start: '00:00', end: '00:00', pauseMin: 0, kind: 'ferie' };
  if (DEMO_LEAVE_DAYS[emp.id]?.includes(date)) return { ...base, start: '00:00', end: '00:00', pauseMin: 0, kind: 'conge' };
  const rot = ROTATION[emp.id] ?? ['ch_lefevre'];
  const target = rot[(dow - 1) % rot.length];
  if (target === 'cfa') return { ...base, start: '08:30', end: '16:30', pauseMin: 60, kind: 'cfa' };
  const r = seeded(emp.id + date);
  const apprentice = emp.contract === 'Apprenti';
  const startMin = apprentice ? 8 * 60 : 7 * 60 + 25 + Math.round(r * 12);
  // Journées de 8 h en moyenne, une plus longue de temps en temps (fin de chantier).
  const long = !apprentice && r > 0.82 ? 75 : 0;
  const short = dow === 5 && !apprentice ? -60 : 0;
  const endMin = apprentice ? 16 * 60 : startMin + 9 * 60 + long + short + Math.round(seeded(date + emp.id) * 10) - 5;
  return { ...base, start: fromMin(startMin), end: fromMin(endMin), pauseMin: 60, chantierId: target, kind: 'chantier', panier: true, zone: CHANTIER_GEO[target]?.zone ?? 1 };
}

/* ------------------------------------------------------- Dates utiles */

export const isoOf = (d: Date) => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.toISOString().slice(0, 10);
};
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
/** Lundi de la semaine qui contient la date. */
export const mondayOf = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
};
export const weekDays = (monday: string, n = 5) => Array.from({ length: n }, (_, i) => addDays(monday, i));
export const isoWeek = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
};
export const hhmm = (hours: number) => {
  const h = Math.floor(hours + 1e-6);
  const m = Math.round((hours - h) * 60);
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};
