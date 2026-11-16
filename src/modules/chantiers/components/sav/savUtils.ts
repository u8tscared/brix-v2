import { daysBetween, todayISO } from '@/lib/format';
import type { Tone } from '@/components/ui/Badge';
import type { Contract, Equipment } from '../../store';

export const EQUIPMENT: Record<Equipment, { label: string; icon: string }> = {
  chaudiere: { label: 'Chaudière', icon: 'Flame' },
  clim: { label: 'Climatisation', icon: 'AirVent' },
  vmc: { label: 'VMC', icon: 'Waves' },
  tableau: { label: 'Tableau électrique', icon: 'LayoutGrid' },
  irve: { label: 'Borne de recharge', icon: 'PlugZap' },
  pac: { label: 'Pompe à chaleur', icon: 'Flame' },
  chauffe_eau: { label: 'Chauffe-eau', icon: 'Container' },
};

export const addMonths = (iso: string, m: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};

export const dueOf = (c: Contract) => addMonths(c.lastVisit, c.frequencyMonths);

export function contractState(c: Contract): { key: 'retard' | 'bientot' | 'planifie' | 'ok'; label: string; tone: Tone; days: number } {
  const due = dueOf(c);
  const days = daysBetween(todayISO(), due);
  if (c.plannedAt && c.plannedAt >= todayISO()) return { key: 'planifie', label: 'Planifié', tone: 'info', days };
  if (days < 0) return { key: 'retard', label: `En retard de ${-days} j`, tone: 'bad', days };
  if (days <= 45) return { key: 'bientot', label: `Dans ${days} j`, tone: 'warn', days };
  return { key: 'ok', label: 'À jour', tone: 'ok', days };
}

export const PRIORITY: Record<'urgente' | 'normale' | 'faible', { label: string; tone: Tone }> = {
  urgente: { label: 'Urgent', tone: 'bad' },
  normale: { label: 'Normal', tone: 'neutral' },
  faible: { label: 'Peut attendre', tone: 'neutral' },
};
