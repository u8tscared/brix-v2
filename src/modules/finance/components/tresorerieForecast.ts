// Prévision de trésorerie à 90 jours, calculée à partir du store (factures, devis signés, équipe)
// et des charges récurrentes de l'entreprise. Côté serveur, la même logique tournera dans le worker.
import { dayOffset, todayISO, totals } from '@/lib/format';
import type { BrixState } from '@/lib/store';

export interface CashEvent { date: string; label: string; amount: number; kind: 'facture' | 'devis' | 'salaires' | 'urssaf' | 'tva' | 'charge' | 'probable'; ref?: string }
export interface ForecastPoint { date: string; balance: number; events: CashEvent[] }

export const RECURRING = [
  { day: 2, label: 'Téléphone et logiciels', amount: 129 },
  { day: 5, label: "Loyer de l'atelier", amount: 950 },
  { day: 8, label: 'Assurance décennale AXA', amount: 214.5 },
  { day: 10, label: 'Leasing camionnette', amount: 489 },
  { day: 10, label: 'Relevé Rexel du mois', amount: 1850 },
];

const lastBusinessDay = (y: number, m: number) => {
  const d = new Date(y, m + 1, 0, 12);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
};
export const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function buildForecast(s: Pick<BrixState, 'factures' | 'devis' | 'chantiers' | 'employees' | 'clients' | 'cashBalance'>, opts: { withProbable: boolean; extraBalance?: number }, horizon = 90) {
  const today = todayISO();
  const end = dayOffset(horizon);
  const events: CashEvent[] = [];
  const clientName = (id: string) => s.clients.find((c) => c.id === id)?.name ?? 'Client';

  // Encaissements attendus : factures non soldées
  for (const f of s.factures) {
    if (['payee', 'annulee', 'brouillon'].includes(f.status)) continue;
    const left = totals(f.lines).ttc - f.paidAmount;
    if (left <= 0) continue;
    const date = f.dueDate > today ? f.dueDate : dayOffset(7);
    events.push({ date, label: `${clientName(f.clientId)} · ${f.number}${f.status === 'en_retard' ? ' (relancée)' : ''}`, amount: left, kind: 'facture', ref: f.id });
  }
  // Devis signés : reste à facturer, encaissé 30 jours après la fin du chantier
  for (const d of s.devis) {
    if (d.status !== 'signe') continue;
    const invoiced = s.factures.filter((f) => f.devisId === d.id && f.status !== 'annulee').reduce((a, f) => a + totals(f.lines).ttc, 0);
    const left = totals(d.lines).ttc - invoiced;
    if (left <= 50) continue;
    const ch = s.chantiers.find((c) => c.id === d.chantierId);
    const base = ch ? ch.endDate : dayOffset(30);
    const date = new Date(base + 'T12:00');
    date.setDate(date.getDate() + 30);
    events.push({ date: iso(date) > today ? iso(date) : dayOffset(20), label: `${clientName(d.clientId)} · solde ${d.number}`, amount: left, kind: 'devis', ref: d.id });
  }
  if (opts.withProbable) {
    for (const d of s.devis.filter((x) => x.status === 'vu' || x.status === 'envoye')) {
      events.push({ date: dayOffset(d.status === 'vu' ? 35 : 50), label: `${clientName(d.clientId)} · ${d.number} (si signé)`, amount: totals(d.lines).ttc * 0.3, kind: 'probable', ref: d.id });
    }
  }

  // Sorties : salaires, URSSAF, TVA, charges fixes
  const payroll = s.employees.reduce((a, e) => a + (e.grossMonthly || 0), 0);
  // TVA sur les encaissements (règle des travaux) des 45 derniers jours, moins la TVA déductible estimée.
  const since = dayOffset(-45);
  const tvaCollected = s.factures.filter((f) => f.issueDate >= since && f.paidAmount > 0).reduce((a, f) => {
    const t = totals(f.lines);
    return a + (t.ttc ? (f.paidAmount * t.tva) / t.ttc : 0);
  }, 0);
  const tvaDue = Math.max(1200, Math.round(tvaCollected * 0.8));

  const cur = new Date();
  cur.setDate(1);
  for (let i = 0; i < 5; i++) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + i;
    const at = (day: number) => iso(new Date(y, m, day, 12));
    RECURRING.forEach((r) => events.push({ date: at(r.day), label: r.label, amount: -r.amount, kind: 'charge' }));
    events.push({ date: at(15), label: 'URSSAF', amount: -Math.round(payroll * 0.31), kind: 'urssaf' });
    events.push({ date: at(15), label: 'TVA du mois', amount: -tvaDue, kind: 'tva' });
    events.push({ date: iso(lastBusinessDay(y, m)), label: 'Salaires', amount: -payroll, kind: 'salaires' });
  }

  const inRange = events.filter((e) => e.date > today && e.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const points: ForecastPoint[] = [];
  let bal = s.cashBalance + (opts.extraBalance ?? 0);
  for (let i = 0; i <= horizon; i++) {
    const date = dayOffset(i);
    const evs = inRange.filter((e) => e.date === date);
    bal += evs.reduce((a, e) => a + e.amount, 0);
    points.push({ date, balance: bal, events: evs });
  }
  const min = points.reduce((a, p) => (p.balance < a.balance ? p : a), points[0]);
  const ins = inRange.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0);
  const outs = inRange.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0);
  const nextTva = points.find((p) => p.events.some((e) => e.kind === 'tva'));
  return { points, events: inRange, min, ins, outs, end: points[points.length - 1].balance, nextTva, tvaDue, payroll };
}
