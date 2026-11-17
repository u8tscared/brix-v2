// Feuilles d'heures : fusion des pointages de démo, des corrections et du pointage en direct.

import { todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { addDays, CHANTIER_GEO, demoPunch, fromMin, mondayOf, toMin, weekDays, workedHours, type DayPunch } from '../data';
import type { LivePunch } from '../store';
import { round2, splitWeek, type Zone } from './payroll';

export interface ResolvedPunch extends DayPunch {
  hours: number;
  inProgress?: boolean;
  edited?: boolean;
}

export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const pauseMinutes = (l: LivePunch, now: string) =>
  l.pauses.reduce((s, p) => s + Math.max(0, toMin(p.to ?? now) - toMin(p.from)), 0);

export function punchFor(emp: Employee, date: string, edits: Record<string, Partial<DayPunch>>, live: LivePunch[]): ResolvedPunch | null {
  const today = todayISO();
  if (date > today) return null;
  const key = `${emp.id}|${date}`;
  let p: DayPunch | null = null;
  let inProgress = false;
  if (date === today) {
    const l = live.find((x) => x.employeeId === emp.id && x.date === date);
    const now = nowHHMM();
    if (l) {
      inProgress = !l.end;
      p = { date, employeeId: emp.id, start: l.start, end: l.end ?? now, pauseMin: pauseMinutes(l, l.end ?? now), chantierId: l.chantierId, kind: 'chantier', panier: true, zone: CHANTIER_GEO[l.chantierId ?? '']?.zone ?? 1 };
    } else if (emp.clockedInAt) {
      const demo = demoPunch({ ...emp, role: emp.role === 'patron' ? 'ouvrier' : emp.role }, date);
      inProgress = true;
      const pause = toMin(now) > 13 * 60 ? 60 : toMin(now) > 12 * 60 ? toMin(now) - 12 * 60 : 0;
      p = { date, employeeId: emp.id, start: emp.clockedInAt, end: now, pauseMin: pause, chantierId: demo?.chantierId, kind: 'chantier', panier: true, zone: demo?.zone ?? 1 };
    } else return null;
  } else {
    p = demoPunch(emp, date);
  }
  const e = edits[key];
  if (!p && !e) return null;
  const merged = { ...(p ?? { date, employeeId: emp.id, start: '08:00', end: '16:00', pauseMin: 60, kind: 'chantier' as const, panier: true, zone: 1 as Zone }), ...e } as DayPunch;
  return { ...merged, hours: workedHours(merged), inProgress, edited: !!e };
}

export interface WeekSummary {
  monday: string;
  days: (ResolvedPunch | null)[];
  total: number;
  normal: number;
  ot25: number;
  ot50: number;
  paniers: number;
  zoneDays: Partial<Record<Zone, number>>;
  absences: number;
}

export function weekSummary(emp: Employee, monday: string, edits: Record<string, Partial<DayPunch>>, live: LivePunch[], filter?: (date: string) => boolean): WeekSummary {
  const days = weekDays(monday, 5).map((d) => (filter && !filter(d) ? null : punchFor(emp, d, edits, live)));
  const worked = days.filter((d): d is ResolvedPunch => !!d);
  const total = round2(worked.reduce((s, d) => s + d.hours, 0));
  const workedDays = filter ? weekDays(monday, 5).filter(filter).length : 5;
  // Le seuil de 35 h est proratisé quand la semaine est coupée par un changement de mois.
  const threshold = (35 * workedDays) / 5;
  const absences = worked.filter((d) => d.kind === 'conge').length;
  const split = emp.contract === 'Apprenti' ? { normal: total, ot25: 0, ot50: 0 } : splitWeek(total, threshold - absences * 7);
  const zoneDays: Partial<Record<Zone, number>> = {};
  worked.forEach((d) => {
    if (d.kind === 'chantier' && d.zone) zoneDays[d.zone] = (zoneDays[d.zone] ?? 0) + 1;
  });
  return { monday, days, total, ...split, paniers: worked.filter((d) => d.kind === 'chantier' && d.panier).length, zoneDays, absences };
}

export function monthSummary(emp: Employee, year: number, month: number, edits: Record<string, Partial<DayPunch>>, live: LivePunch[]) {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const inMonth = (d: string) => d.slice(0, 7) === first.slice(0, 7);
  let monday = mondayOf(first);
  const weeks: WeekSummary[] = [];
  while (monday.slice(0, 7) <= first.slice(0, 7)) {
    weeks.push(weekSummary(emp, monday, edits, live, inMonth));
    monday = addDays(monday, 7);
  }
  const sum = (k: 'total' | 'normal' | 'ot25' | 'ot50' | 'paniers' | 'absences') => round2(weeks.reduce((s, w) => s + w[k], 0));
  const zoneDays: Partial<Record<Zone, number>> = {};
  weeks.forEach((w) => Object.entries(w.zoneDays).forEach(([z, n]) => (zoneDays[Number(z) as Zone] = (zoneDays[Number(z) as Zone] ?? 0) + (n ?? 0))));
  return { weeks, total: sum('total'), normal: sum('normal'), ot25: sum('ot25'), ot50: sum('ot50'), paniers: sum('paniers'), absences: sum('absences'), zoneDays };
}

/** Distance à vol d'oiseau en km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const fmtTime = (hhmm: string) => hhmm.replace(':', ' h ');
export { fromMin };
