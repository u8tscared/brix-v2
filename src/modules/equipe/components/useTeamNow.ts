import { useMemo } from 'react';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { toMin } from '../data';
import { useEquipe } from '../store';
import { nowHHMM } from '../lib/timesheet';

export type NowStatus = 'chantier' | 'pause' | 'parti' | 'absent' | 'formation' | 'pas_pointe' | 'bureau';

export interface TeamNow {
  emp: Employee;
  status: NowStatus;
  since?: string;
  place?: string;
  chantierId?: string;
  planned?: string;
}

/** Qui est où maintenant : pointage du jour + planning + congés. */
export function useTeamNow(): TeamNow[] {
  const employees = useBrix((s) => s.employees);
  const events = useBrix((s) => s.events);
  const chantiers = useBrix((s) => s.chantiers);
  const live = useEquipe((s) => s.live);
  const leaves = useEquipe((s) => s.leaves);
  return useMemo(() => {
    const today = todayISO();
    const now = toMin(nowHHMM());
    const chName = (id?: string) => chantiers.find((c) => c.id === id)?.name;
    return employees.map((emp) => {
      const todays = events.filter((e) => e.employeeId === emp.id && e.date === today).sort((a, b) => a.start.localeCompare(b.start));
      const current = todays.find((e) => toMin(e.start) <= now && now < toMin(e.end)) ?? todays.find((e) => toMin(e.start) > now) ?? todays[todays.length - 1];
      const planned = current ? `${current.title} · ${current.start.replace(':', ' h ')}` : undefined;
      const onLeave = leaves.find((l) => l.employeeId === emp.id && l.status === 'validee' && l.from <= today && l.to >= today);
      if (onLeave) return { emp, status: onLeave.type === 'formation' ? 'formation' : 'absent', place: onLeave.type === 'formation' ? 'En formation' : 'En congé', planned };
      const l = live.find((x) => x.employeeId === emp.id && x.date === today);
      if (l) {
        const paused = l.pauses.some((p) => !p.to);
        return { emp, status: l.end ? 'parti' : paused ? 'pause' : 'chantier', since: l.end ?? l.start, chantierId: l.chantierId, place: chName(l.chantierId) ?? l.where, planned };
      }
      if (emp.clockedInAt) {
        if (current?.kind === 'formation') return { emp, status: 'formation', since: emp.clockedInAt, place: current.title, planned };
        const chId = current?.chantierId;
        const pause = now >= 12 * 60 && now < 13 * 60;
        return { emp, status: chId ? (pause ? 'pause' : 'chantier') : 'bureau', since: emp.clockedInAt, chantierId: chId, place: chName(chId) ?? current?.title ?? 'Au dépôt', planned };
      }
      if (current?.kind === 'formation') return { emp, status: 'formation', place: current.title, planned };
      return { emp, status: 'pas_pointe', planned, chantierId: current?.chantierId };
    });
  }, [employees, events, chantiers, live, leaves]);
}

export const NOW_LABEL: Record<NowStatus, { label: string; tone: 'ok' | 'warn' | 'neutral' | 'info' | 'violet' | 'bad' }> = {
  chantier: { label: 'Sur chantier', tone: 'ok' },
  bureau: { label: 'Pointé', tone: 'ok' },
  pause: { label: 'En pause', tone: 'info' },
  parti: { label: 'Journée finie', tone: 'neutral' },
  absent: { label: 'En congé', tone: 'neutral' },
  formation: { label: 'Formation', tone: 'violet' },
  pas_pointe: { label: 'Pas pointé', tone: 'warn' },
};
