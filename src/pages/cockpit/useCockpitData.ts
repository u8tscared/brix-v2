import { useMemo } from 'react';
import { daysBetween, localISO, todayISO, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { allPayments, useFactures } from '@/modules/factures/store';
import { amounts, liveStatus } from '@/modules/factures/lib/model';
import { encaisseDuMois } from '@/modules/factures/lib/encaisse';

const monthLong = (iso: string) => new Date(iso + '-15T12:00:00').toLocaleDateString('fr-FR', { month: 'long' });

/** Chiffres de l'accueil, calculés depuis les données de l'entreprise. */
export function useCockpitData() {
  const s = useBrix();
  const payments = useFactures((x) => x.payments);
  return useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    // Mêmes règles que l'écran Factures : paiements réellement reçus ce mois-ci,
    // reste à payer hors retenue de garantie, retard selon l'échéance.
    const all = allPayments(s.factures, payments);
    // Même calcul que Bob (« Combien j'ai encaissé ce mois-ci ? ») : src/modules/factures/lib/encaisse.ts.
    const { paiements: monthPayments, total: paidThisMonth } = encaisseDuMois(s.factures, payments, today);
    const prev = new Date(`${month}-01T12:00:00`);
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = localISO(prev).slice(0, 7);
    const dayNum = Number(today.slice(8, 10));
    const prevPaid = all.filter((p) => p.date.startsWith(prevMonth) && Number(p.date.slice(8, 10)) <= dayNum).reduce((a, p) => a + p.amount, 0);
    const diff = paidThisMonth - prevPaid;
    const trend = prevPaid > 0 ? Math.round((diff / prevPaid) * 100) : null;

    const unpaid = s.factures.map((f) => ({ f, a: amounts(f), st: liveStatus(f, today) })).filter(({ st, a }) => st !== 'payee' && st !== 'annulee' && st !== 'brouillon' && a.remaining > 0);
    const toCollect = unpaid.reduce((a, x) => a + x.a.remaining, 0);
    const late = unpaid.filter(({ st }) => st === 'en_retard').sort((a, b) => a.f.dueDate.localeCompare(b.f.dueDate));
    const lateTotal = late.reduce((a, x) => a + x.a.remaining, 0);

    const devisT = s.devis.map((d) => ({ d, t: totals(d.lines) }));
    const sent = devisT.filter(({ d }) => d.status === 'envoye');
    const seen = devisT.filter(({ d }) => d.status === 'vu');
    const pending = [...seen, ...sent];
    const signed = devisT.filter(({ d }) => d.status === 'signe');
    const drafts = devisT.filter(({ d }) => d.status === 'brouillon');
    const decided = devisT.filter(({ d }) => d.status === 'signe' || d.status === 'refuse');
    const signRate = decided.length ? (signed.length / decided.length) * 100 : 0;
    const marginRate = signed.length ? (signed.reduce((a, { t }) => a + t.margin, 0) / Math.max(1, signed.reduce((a, { t }) => a + t.ht, 0))) * 100 : 0;
    const sum = (l: typeof devisT) => l.reduce((a, x) => a + x.t.ttc, 0);

    const salaries = s.employees.reduce((a, e) => a + e.grossMonthly * 1.45, 0);
    const cash30 = s.cashBalance + toCollect * 0.7 - salaries * 0.5;

    // Courbes cumulées du mois en cours et du mois précédent (même nombre de jours affichés).
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const cumul = (m: string, upto: number) =>
      Array.from({ length: upto }, (_, i) => {
        const day = `${m}-${String(i + 1).padStart(2, '0')}`;
        return all.filter((p) => p.date.startsWith(m) && p.date.slice(0, 10) <= day).reduce((a, p) => a + p.amount, 0);
      });
    const curve = cumul(month, Math.max(2, dayNum));
    const prevCurve = cumul(prevMonth, daysInMonth);

    const goal = Math.max(30000, Math.ceil((prevPaid * 1.1) / 1000) * 1000);
    // Meilleur mois de l'année ? On compare aux mois précédents de la même année.
    const year = month.slice(0, 4);
    const byMonth = new Map<string, number>();
    all.filter((p) => p.date.startsWith(year) && !p.date.startsWith(month)).forEach((p) => byMonth.set(p.date.slice(0, 7), (byMonth.get(p.date.slice(0, 7)) ?? 0) + p.amount));
    const bestOfYear = paidThisMonth > 0 && byMonth.size > 0 && [...byMonth.values()].every((v) => paidThisMonth >= v);
    // Agenda du jour : les rendez-vous du patron (ou de toute l'équipe s'il n'en a pas).
    const me = s.employees.find((e) => e.firstName === s.user.firstName && e.lastName === s.user.lastName) ?? s.employees.find((e) => e.role === 'patron');
    const todayAll = s.events.filter((e) => e.date === today).sort((a, b) => a.start.localeCompare(b.start));
    const mine = me ? todayAll.filter((e) => e.employeeId === me.id) : [];
    const agenda = (mine.length ? mine : todayAll).filter((e) => e.kind !== 'absence');
    const habAlerts = s.employees.flatMap((e) => e.habilitations.map((h) => ({ e, h, left: daysBetween(today, h.expires) }))).filter((x) => x.left <= 30).sort((a, b) => a.left - b.left);

    return {
      today,
      monthLabel: monthLong(month),
      prevMonthLabel: monthLong(prevMonth),
      daysInMonth,
      paidThisMonth,
      prevPaid,
      diff,
      trend,
      toCollect,
      unpaidCount: unpaid.length,
      late,
      lateTotal,
      pending,
      pendingTotal: sum(pending),
      sent,
      sentTotal: sum(sent),
      seen,
      seenTotal: sum(seen),
      signed,
      signedTotal: sum(signed),
      drafts,
      draftsTotal: sum(drafts),
      signRate,
      marginRate,
      cash30,
      curve,
      prevCurve,
      goal,
      habAlerts,
      remaining: Math.max(0, goal - paidThisMonth),
      bestOfYear,
      agenda,
      hotSeen: [...seen].sort((a, b) => (b.d.views ?? 0) - (a.d.views ?? 0))[0],
      activeChantiers: s.chantiers.filter((c) => c.status === 'en_cours' || c.status === 'a_planifier'),
      todayEvents: s.events.filter((e) => e.date === today),
      newLeads: s.leads.filter((l) => l.status === 'nouveau').sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    };
  }, [payments, s.factures, s.devis, s.chantiers, s.events, s.employees, s.leads, s.cashBalance, s.user]);
}

export type CockpitData = ReturnType<typeof useCockpitData>;
