import type { Tone } from '@/components/ui';
import type { LeaveType } from '../store';

export const LEAVE_TYPES: Record<LeaveType, { label: string; tone: Tone; paidBy: string }> = {
  cp: { label: 'Congés payés', tone: 'info', paidBy: 'Payés par la caisse CIBTP' },
  recup: { label: 'Récupération', tone: 'neutral', paidBy: 'Payée par l’entreprise' },
  maladie: { label: 'Arrêt maladie', tone: 'warn', paidBy: 'Indemnités CPAM + PRO BTP' },
  sans_solde: { label: 'Sans solde', tone: 'neutral', paidBy: 'Non payé' },
  formation: { label: 'Formation ou CFA', tone: 'violet', paidBy: 'Payée par l’entreprise' },
  familial: { label: 'Événement familial', tone: 'neutral', paidBy: 'Payé par l’entreprise' },
};

/** Nombre de jours ouvrés (lundi au vendredi) entre deux dates incluses. */
export function workingDays(from: string, to: string) {
  if (!from || !to || to < from) return 0;
  let n = 0;
  const d = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  while (d <= end) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
