// Intentions « argent » : encaissements, retards, relances, marge, trésorerie.

import { useBrix } from '@/lib/store';
import { daysBetween, money, monthName, pct, todayISO, totals } from '@/lib/format';
import type { Facture } from '@/lib/types';
import type { BobReply, EngineContext } from './types';

const S = () => useBrix.getState();
const clientName = (id: string) => S().clients.find((c) => c.id === id)?.name ?? 'Client';

export const due = (f: Facture) => Math.max(0, totals(f.lines).ttc - f.paidAmount);

export function lateInvoices() {
  const today = todayISO();
  return S()
    .factures.filter((f) => f.status !== 'payee' && f.status !== 'annulee' && f.status !== 'brouillon' && due(f) > 0.5 && (f.status === 'en_retard' || f.dueDate < today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function cashIn(n: string): BobReply {
  const s = S();
  const today = todayISO();
  let from = today.slice(0, 8) + '01';
  let label = `en ${monthName()}`;
  if (/semaine|7 jours|sept jours/.test(n)) {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    from = d.toISOString().slice(0, 10);
    label = 'ces 7 derniers jours';
  } else if (/annee|an\b/.test(n)) {
    from = today.slice(0, 4) + '-01-01';
    label = `depuis janvier`;
  }
  const ins = s.bank.filter((t) => t.amount > 0 && t.date >= from && t.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const total = ins.reduce((x, t) => x + t.amount, 0);
  const waiting = s.factures.filter((f) => !['payee', 'annulee', 'brouillon'].includes(f.status)).reduce((x, f) => x + due(f), 0);
  const unmatched = ins.filter((t) => !t.matchedFactureId).length;
  return {
    text: total
      ? `Tu as encaissé ${money(total, true)} ${label}. Il reste ${money(waiting, true)} à rentrer.`
      : `Rien d'encaissé ${label} pour l'instant. Il reste ${money(waiting, true)} à rentrer.`,
    cards: [
      {
        kind: 'money', icon: 'Wallet', title: `Encaissé ${label}`, figure: money(total, true), figureLabel: `${ins.length} paiement${ins.length > 1 ? 's' : ''} reçu${ins.length > 1 ? 's' : ''}`,
        rows: ins.slice(0, 5).map((t) => ({ label: t.label.replace(/^VIR\s+/, ''), sub: t.matchedFactureId ? 'Associé à une facture' : 'Sans facture associée', value: money(t.amount), tone: t.matchedFactureId ? 'ok' : 'warn' })),
        actions: [{ label: 'Voir la trésorerie', to: '/app/tresorerie', variant: 'secondary' }, ...(unmatched ? [{ label: `Associer ${unmatched} paiement${unmatched > 1 ? 's' : ''}`, to: '/app/tresorerie', variant: 'ghost' as const }] : [])],
      },
    ],
    suggestions: ['Qui est en retard de paiement ?', 'Quelle est ma marge sur les devis signés ?'],
  };
}

export function late(ctx: EngineContext): BobReply {
  const list = lateInvoices();
  ctx.memo.late = list.map((f) => f.id);
  if (!list.length) return { text: 'Personne n’est en retard. Tout le monde a payé à temps.', suggestions: ['Combien j’ai encaissé ce mois ?'] };
  const total = list.reduce((x, f) => x + due(f), 0);
  return {
    text: `${list.length} client${list.length > 1 ? 's sont' : ' est'} en retard, pour ${money(total, true)} au total.`,
    cards: [
      {
        kind: 'list', icon: 'BellRing', title: 'Retards de paiement', figure: money(total, true), figureLabel: 'à récupérer',
        rows: list.map((f) => {
          const days = daysBetween(f.dueDate, todayISO());
          return { label: clientName(f.clientId), sub: `${f.number} · ${days > 0 ? `${days} jours de retard` : 'échue aujourd’hui'} · ${f.remindersSent ? `${f.remindersSent} relance${f.remindersSent > 1 ? 's' : ''}` : 'jamais relancé'}`, value: money(due(f)), tone: days > 10 ? 'bad' : 'warn', to: `/app/factures/${f.id}` };
        }),
        actions: [
          { label: 'Relance-les', ask: 'Relance-les', variant: 'primary', icon: 'Send' },
          { label: 'Voir les relances', to: '/app/relances', variant: 'secondary' },
        ],
      },
    ],
  };
}

export function remind(ctx: EngineContext): BobReply {
  const ids = (ctx.memo.late as string[] | undefined) ?? lateInvoices().map((f) => f.id);
  const s = S();
  const list = s.factures.filter((f) => ids.includes(f.id) && due(f) > 0.5);
  if (!list.length) return { text: 'Il n’y a personne à relancer pour le moment.' };
  const before = list.map((f) => ({ ...f }));
  list.forEach((f) => s.upsertFacture({ ...f, remindersSent: f.remindersSent + 1 }));
  const total = list.reduce((x, f) => x + due(f), 0);
  const names = list.map((f) => clientName(f.clientId));
  s.pushBob({ icon: 'Send', text: `J'ai relancé ${list.length} client${list.length > 1 ? 's' : ''}`, detail: `${names.join(', ')} · ${money(total, true)}`, cta: 'Voir', to: '/app/relances', done: true });
  return {
    text: `C’est fait. J’ai envoyé une relance polie à ${names.join(' et ')}.`,
    cards: [
      {
        kind: 'done', icon: 'Send', title: `${list.length} relance${list.length > 1 ? 's' : ''} envoyée${list.length > 1 ? 's' : ''}`, subtitle: 'Par e-mail, avec le lien de paiement',
        rows: list.map((f) => ({ label: clientName(f.clientId), sub: `${f.number} · relance n° ${f.remindersSent + 1}`, value: money(due(f)) })),
        actions: [
          { label: 'Voir les relances', to: '/app/relances', variant: 'secondary' },
          {
            label: 'Annuler', variant: 'ghost',
            run: () => {
              before.forEach((f) => useBrix.getState().upsertFacture(f));
              return 'Relances annulées, rien n’est parti.';
            },
          },
        ],
      },
    ],
    suggestions: ['Combien j’ai encaissé ce mois ?'],
  };
}

export function margin(n: string): BobReply {
  const s = S();
  if (/chantier/.test(n)) {
    const list = s.chantiers.filter((c) => c.status !== 'termine');
    const budget = list.reduce((x, c) => x + c.budgetHt, 0);
    const cost = list.reduce((x, c) => x + c.costHt * (100 / Math.max(c.progress, 1)), 0);
    const rate = budget ? ((budget - cost) / budget) * 100 : 0;
    return {
      text: `Sur tes chantiers en cours, la marge prévue à la fin est de ${pct(rate)} si le rythme actuel continue.`,
      cards: [{
        kind: 'money', icon: 'HardHat', title: 'Marge prévue sur les chantiers en cours', figure: pct(rate), figureLabel: `sur ${money(budget, true)} HT`,
        rows: list.map((c) => {
          const proj = c.costHt * (100 / Math.max(c.progress, 1));
          const r = c.budgetHt ? ((c.budgetHt - proj) / c.budgetHt) * 100 : 0;
          return { label: c.name, sub: `${c.progress} % fait · ${money(c.costHt, true)} dépensés`, value: pct(r), tone: r < 15 ? 'bad' : r < 25 ? 'warn' : 'ok', to: `/app/chantiers/${c.id}` };
        }),
        actions: [{ label: 'Voir les chantiers', to: '/app/chantiers', variant: 'secondary' }],
      }],
    };
  }
  const signed = s.devis.filter((d) => d.status === 'signe');
  const t = signed.map((d) => ({ d, t: totals(d.lines) }));
  const ht = t.reduce((x, y) => x + y.t.ht, 0);
  const m = t.reduce((x, y) => x + y.t.margin, 0);
  const rate = ht ? (m / ht) * 100 : 0;
  if (!signed.length) return { text: 'Tu n’as pas encore de devis signé. Dès le premier, je calcule ta marge.' };
  return {
    text: `Sur tes ${signed.length} devis signés, tu gagnes ${money(m, true)} pour ${money(ht, true)} HT, soit ${pct(rate)} de marge.`,
    cards: [{
      kind: 'money', icon: 'FileText', title: 'Marge sur les devis signés', figure: pct(rate), figureLabel: `${money(m, true)} de marge sur ${money(ht, true)} HT`,
      rows: t.map(({ d, t: x }) => ({ label: d.title, sub: `${d.number} · ${clientName(d.clientId)}`, value: pct(x.marginRate), tone: x.marginRate < 25 ? 'warn' : 'ok', to: `/app/devis/${d.id}` })),
      actions: [{ label: 'Voir les devis', to: '/app/devis', variant: 'secondary' }],
    }],
    suggestions: ['Et sur les chantiers en cours ?'],
  };
}

export function cash(): BobReply {
  const s = S();
  const waiting = s.factures.filter((f) => !['payee', 'annulee', 'brouillon'].includes(f.status)).reduce((x, f) => x + due(f), 0);
  return {
    text: `Tu as ${money(s.cashBalance, true)} sur le compte, et ${money(waiting, true)} de factures à encaisser.`,
    cards: [{ kind: 'money', icon: 'Landmark', title: 'Trésorerie', figure: money(s.cashBalance, true), figureLabel: 'solde du compte pro', rows: [{ label: 'À encaisser', value: money(waiting, true) }, { label: 'Retards', value: money(lateInvoices().reduce((x, f) => x + due(f), 0), true), tone: 'warn' }], actions: [{ label: 'Ouvrir la trésorerie', to: '/app/tresorerie', variant: 'secondary' }] }],
  };
}

export function pendingQuotes(): BobReply {
  const s = S();
  const list = s.devis.filter((d) => ['envoye', 'vu'].includes(d.status));
  const total = list.reduce((x, d) => x + totals(d.lines).ht, 0);
  return {
    text: list.length ? `${list.length} devis attendent une signature, pour ${money(total, true)} HT.` : 'Aucun devis en attente de signature.',
    cards: list.length ? [{
      kind: 'list', icon: 'FileText', title: 'Devis à signer', figure: money(total, true), figureLabel: 'HT en attente',
      rows: list.map((d) => ({ label: clientName(d.clientId), sub: `${d.number} · ${d.status === 'vu' ? `vu ${d.views ?? 1} fois` : 'envoyé, pas encore ouvert'}`, value: money(totals(d.lines).ht, true), tone: d.status === 'vu' ? 'violet' : 'neutral', to: `/app/devis/${d.id}` })),
      actions: [{ label: 'Voir les devis', to: '/app/devis', variant: 'secondary' }],
    }] : undefined,
  };
}
