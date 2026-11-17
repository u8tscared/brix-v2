// Calculs dérivés d'un chantier : marge prévue / réelle, heures, retard, lots, résumé de Bob.

import { daysBetween, money, todayISO, totals } from '@/lib/format';
import type { Chantier, Devis, Employee, PlanningEvent } from '@/lib/types';

export interface ChantierMetrics {
  plannedMarginRate: number; // marge prévue au devis (%)
  realMarginRate: number; // marge projetée à date (%)
  marginDelta: number; // points
  plannedHours: number;
  spentHours: number;
  plannedCost: number;
  projectedCost: number;
  expectedProgress: number; // avancement attendu à date (%)
  delayDays: number; // > 0 = en retard
  daysLeft: number;
  risk: 'faible' | 'moyen' | 'eleve';
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function chantierMetrics(ch: Chantier, devis?: Devis): ChantierMetrics {
  const t = devis ? totals(devis.lines) : null;
  const sale = t?.ht || ch.budgetHt || 1;
  const plannedCost = t ? (t.cost / (t.ht || 1)) * ch.budgetHt : ch.budgetHt * 0.62;
  const plannedMarginRate = ch.budgetHt ? ((ch.budgetHt - plannedCost) / ch.budgetHt) * 100 : 0;
  const p = ch.progress / 100;
  const projectedCost = ch.status === 'termine' ? ch.costHt : ch.costHt + plannedCost * (1 - p);
  const realMarginRate = ch.budgetHt ? ((ch.budgetHt - projectedCost) / ch.budgetHt) * 100 : 0;

  const plannedHours = devis
    ? devis.lines.filter((l) => l.kind === 'main_oeuvre' || l.unit === 'h').reduce((s, l) => s + l.quantity, 0)
    : Math.round((ch.budgetHt * 0.4) / 55);
  const overrun = clamp(ch.costHt / Math.max(1, plannedCost * p), 0.85, 1.25);
  const spentHours = Math.round(plannedHours * p * overrun);

  const total = Math.max(1, daysBetween(ch.startDate, ch.endDate));
  const elapsed = clamp(daysBetween(ch.startDate, todayISO()), 0, total);
  const expectedProgress = ch.status === 'a_planifier' ? 0 : Math.round((elapsed / total) * 100);
  const gap = expectedProgress - ch.progress; // points de retard
  const delayDays = ch.status === 'termine' ? 0 : Math.max(0, Math.round((gap / 100) * total));
  const daysLeft = daysBetween(todayISO(), ch.endDate);
  const marginDelta = realMarginRate - plannedMarginRate;
  const risk = marginDelta < -15 || delayDays > 4 ? 'eleve' : marginDelta < -6 || delayDays > 1 ? 'moyen' : 'faible';
  void sale;
  return { plannedMarginRate, realMarginRate, marginDelta, plannedHours, spentHours, plannedCost, projectedCost, expectedProgress, delayDays, daysLeft, risk };
}

export interface Lot {
  name: string;
  amount: number;
  progress: number;
}

/** Lots du devis, avec un avancement réparti dans l'ordre (les premiers lots finissent d'abord). */
export function lotsOf(ch: Chantier, devis?: Devis): Lot[] {
  if (!devis) return [{ name: 'Travaux', amount: ch.budgetHt, progress: ch.progress }];
  const lots: Lot[] = [];
  let cur: Lot | null = null;
  for (const l of devis.lines) {
    if (l.kind === 'section') {
      cur = { name: l.designation.replace(/^Lot \d+ · /, ''), amount: 0, progress: 0 };
      lots.push(cur);
    } else if (l.kind !== 'texte') {
      if (!cur) {
        cur = { name: 'Travaux', amount: 0, progress: 0 };
        lots.push(cur);
      }
      cur.amount += l.quantity * l.unitPriceHt;
    }
  }
  const sum = lots.reduce((s, x) => s + x.amount, 0) || 1;
  // Si un seul lot, on le découpe en étapes classiques pour rester parlant.
  if (lots.length === 1) {
    const a = lots[0].amount;
    lots.splice(0, 1, { name: 'Préparation et fournitures', amount: a * 0.25, progress: 0 }, { name: lots[0].name, amount: a * 0.6, progress: 0 }, { name: 'Essais et mise en service', amount: a * 0.15, progress: 0 });
  }
  let left = (ch.progress / 100) * sum;
  for (const lot of lots) {
    const done = Math.min(lot.amount, left);
    lot.progress = Math.round((done / (lot.amount || 1)) * 100);
    left -= done;
  }
  return lots;
}

export const hoursOf = (e: PlanningEvent) => {
  const [a, b] = [e.start, e.end].map((x) => {
    const [h, m] = x.split(':').map(Number);
    return h + m / 60;
  });
  return Math.max(0, b - a);
};

/** Résumé de Bob en deux lignes, généré à partir des données (sans appel externe). */
export function bobSummary(ch: Chantier, m: ChantierMetrics, team: Employee[], rainSoon?: string): [string, string] {
  const who = team.map((e) => e.firstName).join(', ') || "personne d'affecté";
  let l1: string;
  if (ch.status === 'termine') l1 = `Chantier terminé, marge finale ${Math.round(m.realMarginRate)} %.`;
  else if (ch.status === 'a_planifier') l1 = `Pas encore démarré : début prévu ${((n) => (n <= 0 ? "aujourd'hui" : n === 1 ? 'demain' : `dans ${n} jours`))(daysBetween(todayISO(), ch.startDate))} ${team.length ? `avec ${who}` : "et personne n'est encore affecté"}.`;
  else if (m.delayDays > 0) l1 = `${ch.progress} % fait, ${m.delayDays} jour${m.delayDays > 1 ? 's' : ''} de retard sur le prévu (${m.expectedProgress} % attendus).`;
  else l1 = `${ch.progress} % fait, ${ch.progress > m.expectedProgress + 4 ? 'en avance' : 'dans les temps'}, fin prévue dans ${Math.max(0, m.daysLeft)} jours.`;

  let l2: string;
  const step = ch.nextStep.charAt(0).toLowerCase() + ch.nextStep.slice(1).replace(/\.$/, '');
  const marge = Math.round(m.realMarginRate) === Math.round(m.plannedMarginRate) ? `Marge ${Math.round(m.realMarginRate)} %, comme prévu au devis` : `Marge ${Math.round(m.realMarginRate)} % au lieu de ${Math.round(m.plannedMarginRate)} %`;
  if (m.marginDelta < -6) {
    const extraH = Math.max(2, Math.round((m.spentHours - (m.plannedHours * ch.progress) / 100) || 6));
    l2 = `${marge} : propose un avenant de ${extraH} h (${money(extraH * 55, true)}) avant de continuer.`;
  } else if (rainSoon) l2 = `${marge}. Pluie ${rainSoon} : décale les travaux dehors, je peux le faire.`;
  else if (m.marginDelta >= -2) l2 = `${marge}, tout va bien. Prochaine étape : ${step}.`;
  else l2 = `${marge}, à surveiller. Prochaine étape : ${step}.`;
  return [l1, l2];
}

export const RISK_LABEL = { faible: { label: 'Risque faible', tone: 'ok' }, moyen: { label: 'À surveiller', tone: 'warn' }, eleve: { label: 'Risque élevé', tone: 'bad' } } as const;
