import { useMemo } from 'react';
import { daysBetween, todayISO, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';

/** Chiffres du cockpit, calculés depuis les données de l'entreprise. */
export function useCockpitData() {
  const s = useBrix();
  return useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    const factTotals = s.factures.map((f) => ({ f, t: totals(f.lines) }));
    const paidThisMonth = factTotals.filter(({ f }) => f.status === 'payee' && f.issueDate.slice(0, 7) === month).reduce((a, { f }) => a + f.paidAmount, 0)
      + s.bank.filter((t) => t.amount > 0 && t.date.slice(0, 7) === month && !t.matchedFactureId).reduce((a, t) => a + t.amount, 0);
    const unpaid = factTotals.filter(({ f }) => !['payee', 'annulee', 'brouillon'].includes(f.status));
    const toCollect = unpaid.reduce((a, { f, t }) => a + (t.ttc - f.paidAmount), 0);
    const late = unpaid.filter(({ f }) => f.status === 'en_retard' || daysBetween(f.dueDate, today) > 0);
    const devisT = s.devis.map((d) => ({ d, t: totals(d.lines) }));
    const pending = devisT.filter(({ d }) => d.status === 'envoye' || d.status === 'vu');
    const signed = devisT.filter(({ d }) => d.status === 'signe');
    const drafts = devisT.filter(({ d }) => d.status === 'brouillon');
    const decided = devisT.filter(({ d }) => d.status === 'signe' || d.status === 'refuse');
    const signRate = decided.length ? (signed.length / decided.length) * 100 : 0;
    const marginRate = signed.length ? signed.reduce((a, { t }) => a + t.margin, 0) / Math.max(1, signed.reduce((a, { t }) => a + t.ht, 0)) * 100 : 0;
    const salaries = s.employees.reduce((a, e) => a + e.grossMonthly * 1.45, 0);
    const cash30 = s.cashBalance + toCollect * 0.7 - salaries * 0.5;
    // Courbe d'encaissement du mois (cumul) pour la sparkline
    const days = Number(today.slice(8, 10));
    const curve = Array.from({ length: Math.max(2, days) }, (_, i) => {
      const day = `${month}-${String(i + 1).padStart(2, '0')}`;
      return s.factures.filter((f) => f.status === 'payee' && f.issueDate <= day && f.issueDate.slice(0, 7) === month).reduce((a, f) => a + f.paidAmount, 0) + i * 30;
    });
    return {
      paidThisMonth,
      toCollect,
      unpaidCount: unpaid.length,
      late,
      pending,
      pendingTotal: pending.reduce((a, x) => a + x.t.ttc, 0),
      signed,
      signedTotal: signed.reduce((a, x) => a + x.t.ttc, 0),
      drafts,
      draftsTotal: drafts.reduce((a, x) => a + x.t.ttc, 0),
      signRate,
      marginRate,
      cash30,
      curve,
      activeChantiers: s.chantiers.filter((c) => c.status === 'en_cours' || c.status === 'a_planifier'),
      todayEvents: s.events.filter((e) => e.date === today),
      goal: 30000,
    };
  }, [s.factures, s.devis, s.chantiers, s.events, s.employees, s.bank, s.cashBalance]);
}
