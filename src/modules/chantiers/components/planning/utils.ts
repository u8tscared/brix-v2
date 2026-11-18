import { dayOffset, todayISO } from '@/lib/format';
import type { PlanningEvent } from '@/lib/types';

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Lundi de la semaine contenant la date (ISO), décalé de `weeks` semaines. */
export function mondayOf(weeks = 0, base = todayISO()) {
  const d = new Date(base + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export const addDays = (iso: string, n: number) => dayOffset(n, new Date(iso + 'T12:00:00'));

export function weekDays(monday: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(monday, i));
}

export const overlaps = (a: PlanningEvent, b: PlanningEvent) => a.id !== b.id && a.employeeId === b.employeeId && a.date === b.date && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

/** Ensemble des créneaux en conflit (même personne, même jour, horaires qui se chevauchent). */
export function conflictsOf(events: PlanningEvent[]): Set<string> {
  const out = new Set<string>();
  const byKey = new Map<string, PlanningEvent[]>();
  events.forEach((e) => {
    const k = e.employeeId + e.date;
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  });
  byKey.forEach((list) => {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (overlaps(list[i], list[j])) {
          out.add(list[i].id);
          out.add(list[j].id);
        }
  });
  return out;
}

export const sortByStart = (a: PlanningEvent, b: PlanningEvent) => a.start.localeCompare(b.start);

/** Prochain créneau libre de la journée pour une personne (par défaut 8 h - 12 h). */
export function freeSlot(events: PlanningEvent[], employeeId: string, date: string): [string, string] {
  const day = events.filter((e) => e.employeeId === employeeId && e.date === date).sort(sortByStart);
  const candidates: [number, number][] = [[480, 720], [810, 1020], [1020, 1080]];
  for (const [s, e] of candidates) if (!day.some((x) => toMin(x.start) < e && s < toMin(x.end))) return [fromMin(s), fromMin(e)];
  return ['08:00', '12:00'];
}
