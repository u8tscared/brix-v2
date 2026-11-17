import { useMemo } from 'react';
import { todayISO, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { allPayments, useFactures } from '@/modules/factures/store';
import { amounts, liveStatus } from '@/modules/factures/lib/model';

/** Chiffres du cockpit, calculés depuis les données de l'entreprise. */
export function useCockpitData() {
  const s = useBrix();
  const payments = useFactures((x) => x.payments);
  return useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    // Mêmes règles que l'écran Factures : paiements réellement reçus ce mois-ci,
    // reste à payer hors retenue de garantie, retard selon l'échéance.
    const monthPayments = allPayments(s.factures, payments).filter((p) => p.date.startsWith(month));
    const paidThisMonth = monthPayments.reduce((a, p) => a + p.amount, 0);
    // Comparaison honnête avec le mois dernier à la même date (pas de tendance sans historique).
    const prev = new Date(`${month}-01T12:00:00`);
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = prev.toISOString().slice(0, 7);
    const prevPaid = allPayments(s.factures, payments).filter((p) => p.date.startsWith(prevMonth) && p.date.slice(8, 10) <= today.slice(8, 10)).reduce((a, p) => a + p.amount, 0);
    const trend = prevPaid > 0 ? Math.round(((paidThisMonth - prevPaid) / prevPaid) * 100) : null;
    const unpaid = s.factures.map((f) => ({ f, a: amounts(f), st: liveStatus(f, today) })).filter(({ st, a }) => st !== 'payee' && st !== 'annulee' && st !== 'brouillon' && a.remaining > 0);
    const toCollect = unpaid.reduce((a, x) => a + x.a.remaining, 0);
    const late = unpaid.filter(({ st }) => st === 'en_retard');
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
      return monthPayments.filter((p) => p.date.slice(0, 10) <= day).reduce((a, p) => a + p.amount, 0);
    });
    return {
      paidThisMonth,
      trend,
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
  }, [payments, s.factures, s.devis, s.chantiers, s.events, s.employees, s.bank, s.cashBalance]);
}
