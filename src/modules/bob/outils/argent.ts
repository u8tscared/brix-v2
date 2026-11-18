// Outils « argent » partagés par le moteur local (nlu/money.ts) et l'agent (agent.ts) :
// encaissements, impayés, relances, marge, trésorerie, devis en attente.
// Fonctions pures sur un instantané du store ; seules `envoyerRelances` et
// `annulerRelances` écrivent (via les actions du store).

import { daysBetween, money, monthName, pct, todayISO, totals } from '@/lib/format';
import type { BrixState } from '@/lib/store';
import type { Facture } from '@/lib/types';
import type { BobCard } from '../nlu/types';
import { useFactures } from '@/modules/factures/store';
import { encaisseEntre } from '@/modules/factures/lib/encaisse';

export type Etat = BrixState;

export const nomClient = (s: Etat, id: string) => s.clients.find((c) => c.id === id)?.name ?? 'Client';
export const resteDu = (f: Facture) => Math.max(0, totals(f.lines).ttc - f.paidAmount);
const ouverte = (f: Facture) => !['payee', 'annulee', 'brouillon'].includes(f.status);
export const aEncaisser = (s: Etat) => s.factures.filter(ouverte).reduce((x, f) => x + resteDu(f), 0);

/** Factures échues et non réglées, de la plus ancienne à la plus récente. */
export function impayes(s: Etat, today = todayISO()): Facture[] {
  return s.factures
    .filter((f) => ouverte(f) && resteDu(f) > 0.5 && (f.status === 'en_retard' || f.dueDate < today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export type Periode = 'mois' | 'semaine' | 'annee';

export function encaissements(s: Etat, periode: Periode = 'mois', today = todayISO()) {
  let from = today.slice(0, 8) + '01';
  let label = `en ${monthName()}`;
  if (periode === 'semaine') {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    from = d.toISOString().slice(0, 10);
    label = 'ces 7 derniers jours';
  } else if (periode === 'annee') {
    from = today.slice(0, 4) + '-01-01';
    label = 'depuis janvier';
  }
  // Même source que l'accueil : les paiements reçus sur les factures (src/modules/factures/lib/encaisse.ts).
  const { paiements: ins, total } = encaisseEntre(s.factures, useFactures.getState().payments, from, today);
  // Virements reçus sur le compte mais pas encore rattachés à une facture : signalés à part, hors total.
  const orphelins = s.bank.filter((t) => t.amount > 0 && !t.matchedFactureId && t.date >= from && t.date <= today);
  const unmatched = orphelins.length;
  const horsFacture = orphelins.reduce((x, t) => x + t.amount, 0);
  const facture = (id: string) => s.factures.find((f) => f.id === id);
  const card: BobCard = {
    kind: 'money', icon: 'Wallet', title: `Encaissé ${label}`, figure: money(total, true), figureLabel: `${ins.length} paiement${ins.length > 1 ? 's' : ''} reçu${ins.length > 1 ? 's' : ''}`,
    rows: [
      ...ins.slice(0, 5).map((p) => {
        const f = facture(p.factureId);
        return { label: f ? nomClient(s, f.clientId) : 'Paiement', sub: f ? f.number : 'Facture', value: money(p.amount), tone: 'ok' as const };
      }),
      ...(unmatched ? [{ label: `${unmatched} virement${unmatched > 1 ? 's' : ''} sans facture`, sub: 'À associer, non compté ci-dessus', value: money(horsFacture), tone: 'warn' as const }] : []),
    ],
    actions: [{ label: 'Voir la trésorerie', to: '/app/tresorerie', variant: 'secondary' }, ...(unmatched ? [{ label: `Associer ${unmatched} paiement${unmatched > 1 ? 's' : ''}`, to: '/app/tresorerie', variant: 'ghost' as const }] : [])],
  };
  return { label, from, total, paiements: ins, sansFacture: unmatched, aEncaisser: aEncaisser(s), card };
}

/** Une ligne lisible par le modèle pour une facture en retard. */
export function ligneImpaye(s: Etat, f: Facture, today = todayISO()) {
  return { id: f.id, numero: f.number, client: nomClient(s, f.clientId), reste_du_ttc: Math.round(resteDu(f) * 100) / 100, echeance: f.dueDate, jours_de_retard: Math.max(0, daysBetween(f.dueDate, today)), relances_deja_envoyees: f.remindersSent };
}

export function carteImpayes(s: Etat, list: Facture[], withActions = true): BobCard {
  const total = list.reduce((x, f) => x + resteDu(f), 0);
  return {
    kind: 'list', icon: 'BellRing', title: 'Retards de paiement', figure: money(total, true), figureLabel: 'à récupérer',
    rows: list.map((f) => {
      const days = daysBetween(f.dueDate, todayISO());
      return { label: nomClient(s, f.clientId), sub: `${f.number} · ${days > 0 ? `${days} jours de retard` : 'échue aujourd’hui'} · ${f.remindersSent ? `${f.remindersSent} relance${f.remindersSent > 1 ? 's' : ''}` : 'jamais relancé'}`, value: money(resteDu(f)), tone: days > 10 ? 'bad' : 'warn', to: `/app/factures/${f.id}` };
    }),
    actions: withActions ? [
      { label: 'Relance-les', ask: 'Relance-les', variant: 'primary', icon: 'Send' },
      { label: 'Voir les relances', to: '/app/relances', variant: 'secondary' },
    ] : [{ label: 'Voir les relances', to: '/app/relances', variant: 'secondary' }],
  };
}

/** Factures relançables parmi `ids` (toutes les factures en retard si absent). */
export function aRelancer(s: Etat, ids?: string[]): Facture[] {
  const pool = ids?.length ? ids : impayes(s).map((f) => f.id);
  return s.factures.filter((f) => pool.includes(f.id) && resteDu(f) > 0.5 && f.status !== 'payee' && f.status !== 'annulee');
}

/** Envoie les relances (logique locale existante). Renvoie l'état d'avant, pour annuler. */
export function envoyerRelances(s: Etat, list: Facture[]): Facture[] {
  const before = list.map((f) => ({ ...f }));
  list.forEach((f) => s.upsertFacture({ ...f, remindersSent: f.remindersSent + 1 }));
  const total = list.reduce((x, f) => x + resteDu(f), 0);
  const names = list.map((f) => nomClient(s, f.clientId));
  s.pushBob({ icon: 'Send', text: `J'ai relancé ${list.length} client${list.length > 1 ? 's' : ''}`, detail: `${names.join(', ')} · ${money(total, true)}`, cta: 'Voir', to: '/app/relances', done: true });
  return before;
}

export const annulerRelances = (s: Etat, before: Facture[]) => before.forEach((f) => s.upsertFacture(f));

export function carteRelancesEnvoyees(s: Etat, list: Facture[], annuler: () => string): BobCard {
  return {
    kind: 'done', icon: 'Send', title: `${list.length} relance${list.length > 1 ? 's' : ''} envoyée${list.length > 1 ? 's' : ''}`, subtitle: 'Par e-mail, avec le lien de paiement',
    rows: list.map((f) => ({ label: nomClient(s, f.clientId), sub: `${f.number} · relance n° ${f.remindersSent + 1}`, value: money(resteDu(f)) })),
    actions: [{ label: 'Voir les relances', to: '/app/relances', variant: 'secondary' }, { label: 'Annuler', variant: 'ghost', run: annuler }],
  };
}

export function margeDevisSignes(s: Etat) {
  const signed = s.devis.filter((d) => d.status === 'signe');
  const t = signed.map((d) => ({ d, t: totals(d.lines) }));
  const ht = t.reduce((x, y) => x + y.t.ht, 0);
  const m = t.reduce((x, y) => x + y.t.margin, 0);
  const rate = ht ? (m / ht) * 100 : 0;
  const card: BobCard = {
    kind: 'money', icon: 'FileText', title: 'Marge sur les devis signés', figure: pct(rate), figureLabel: `${money(m, true)} de marge sur ${money(ht, true)} HT`,
    rows: t.map(({ d, t: x }) => ({ label: d.title, sub: `${d.number} · ${nomClient(s, d.clientId)}`, value: pct(x.marginRate), tone: x.marginRate < 25 ? 'warn' : 'ok', to: `/app/devis/${d.id}` })),
    actions: [{ label: 'Voir les devis', to: '/app/devis', variant: 'secondary' }],
  };
  return { nombre: signed.length, ht, marge: m, taux: rate, detail: t.map(({ d, t: x }) => ({ numero: d.number, titre: d.title, client: nomClient(s, d.clientId), ht: Math.round(x.ht), taux_marge: Math.round(x.marginRate * 10) / 10 })), card };
}

const margePrevue = (c: { budgetHt: number; costHt: number; progress: number }) => {
  const proj = c.costHt * (100 / Math.max(c.progress, 1));
  return c.budgetHt ? ((c.budgetHt - proj) / c.budgetHt) * 100 : 0;
};

export function margeChantiers(s: Etat) {
  const list = s.chantiers.filter((c) => c.status !== 'termine');
  const budget = list.reduce((x, c) => x + c.budgetHt, 0);
  const cost = list.reduce((x, c) => x + c.costHt * (100 / Math.max(c.progress, 1)), 0);
  const rate = budget ? ((budget - cost) / budget) * 100 : 0;
  const card: BobCard = {
    kind: 'money', icon: 'HardHat', title: 'Marge prévue sur les chantiers en cours', figure: pct(rate), figureLabel: `sur ${money(budget, true)} HT`,
    rows: list.map((c) => {
      const r = margePrevue(c);
      return { label: c.name, sub: `${c.progress} % fait · ${money(c.costHt, true)} dépensés`, value: pct(r), tone: r < 15 ? 'bad' : r < 25 ? 'warn' : 'ok', to: `/app/chantiers/${c.id}` };
    }),
    actions: [{ label: 'Voir les chantiers', to: '/app/chantiers', variant: 'secondary' }],
  };
  return { budget, taux: rate, detail: list.map((c) => ({ chantier: c.name, avancement: c.progress, budget_ht: c.budgetHt, depense: c.costHt, marge_prevue: Math.round(margePrevue(c) * 10) / 10 })), card };
}

export { margePrevue };

export function tresorerie(s: Etat) {
  const waiting = aEncaisser(s);
  const retards = impayes(s).reduce((x, f) => x + resteDu(f), 0);
  const card: BobCard = { kind: 'money', icon: 'Landmark', title: 'Trésorerie', figure: money(s.cashBalance, true), figureLabel: 'solde du compte pro', rows: [{ label: 'À encaisser', value: money(waiting, true) }, { label: 'Retards', value: money(retards, true), tone: 'warn' }], actions: [{ label: 'Ouvrir la trésorerie', to: '/app/tresorerie', variant: 'secondary' }] };
  return { solde: s.cashBalance, aEncaisser: waiting, retards, card };
}

export function devisEnAttente(s: Etat) {
  const list = s.devis.filter((d) => ['envoye', 'vu'].includes(d.status));
  const total = list.reduce((x, d) => x + totals(d.lines).ht, 0);
  const card: BobCard | undefined = list.length ? {
    kind: 'list', icon: 'FileText', title: 'Devis à signer', figure: money(total, true), figureLabel: 'HT en attente',
    rows: list.map((d) => ({ label: nomClient(s, d.clientId), sub: `${d.number} · ${d.status === 'vu' ? `vu ${d.views ?? 1} fois` : 'envoyé, pas encore ouvert'}`, value: money(totals(d.lines).ht, true), tone: d.status === 'vu' ? 'violet' : 'neutral', to: `/app/devis/${d.id}` })),
    actions: [{ label: 'Voir les devis', to: '/app/devis', variant: 'secondary' }],
  } : undefined;
  return { list, total, card };
}
