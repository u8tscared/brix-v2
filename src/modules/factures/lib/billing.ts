// Création des factures à partir d'un devis signé : acompte, situation de travaux, solde, avoir.
// Logique reprise de l'ancienne app (facture-billing-strategy.ts), simplifiée.

import { dayOffset, todayISO, uid } from '@/lib/format';
import type { Devis, DevisLigne, Facture } from '@/lib/types';
import { amounts, lotsOf, round2, type FactureExtra, type SituationLot } from './model';

const line = (designation: string, priceHt: number, vatRate: number, detail?: string): DevisLigne => ({
  id: uid('l'),
  kind: 'ouvrage',
  designation,
  detail,
  quantity: 1,
  unit: 'forfait',
  unitPriceHt: round2(priceHt),
  unitCostHt: 0,
  vatRate,
  source: 'manuel',
});

const emptyEinvoice = (): Facture['einvoice'] => ({ status: 'non_transmise', history: [] });

const base = (devis: Devis, number: string, kind: Facture['kind'], title: string, lines: DevisLigne[], dueInDays = 30): Facture => ({
  id: uid('f'),
  number,
  kind,
  clientId: devis.clientId,
  chantierId: devis.chantierId,
  devisId: devis.id,
  title,
  status: 'brouillon',
  issueDate: todayISO(),
  dueDate: dayOffset(dueInDays),
  lines,
  paidAmount: 0,
  einvoice: emptyEinvoice(),
  remindersSent: 0,
});

/** Factures déjà émises sur ce devis (hors brouillons et avoirs). */
export const billedFor = (devisId: string, factures: Facture[]) => factures.filter((f) => f.devisId === devisId && f.status !== 'brouillon' && f.status !== 'annulee' && f.kind !== 'avoir');

/** Acompte : un pourcentage du devis, ventilé par taux de TVA. */
export function buildAcompte(devis: Devis, number: string, percent: number): Facture {
  const byRate = new Map<number, number>();
  for (const l of devis.lines) if (l.kind !== 'section' && l.kind !== 'texte') byRate.set(l.vatRate, (byRate.get(l.vatRate) || 0) + l.quantity * l.unitPriceHt);
  const lines = [...byRate.entries()].map(([rate, ht]) => line(`Acompte ${percent} % sur devis ${devis.number}${byRate.size > 1 ? ` (TVA ${rate} %)` : ''}`, (ht * percent) / 100, rate, devis.title));
  return { ...base(devis, number, 'acompte', `Acompte ${percent} % · ${devis.title}`, lines, 0) };
}

/** Avancement déjà facturé par lot (dernière situation), sinon avancement global. */
export function previousProgress(devis: Devis, factures: Facture[], extras: Record<string, FactureExtra>): { index: number; lots: SituationLot[]; depositsHt: number; depositsByRate: { rate: number; ht: number }[]; depositNumbers: string[] } {
  const lots = lotsOf(devis.lines);
  const billed = billedFor(devis.id, factures);
  const situations = billed.filter((f) => f.kind === 'situation').sort((a, b) => a.issueDate.localeCompare(b.issueDate));
  const last = situations[situations.length - 1];
  const lastLots = last ? extras[last.id]?.situation?.lots : undefined;
  const devisHt = lots.reduce((s, l) => s + l.totalHt, 0);
  const billedHt = situations.reduce((s, f) => s + amounts(f).ht + depositDeductionOf(f), 0);
  const globalPrev = devisHt ? Math.min(100, Math.round((billedHt / devisHt) * 100)) : 0;
  const acomptes = billed.filter((f) => f.kind === 'acompte');
  return {
    index: situations.length + 1,
    lots: lots.map((l) => {
      const prev = lastLots?.find((x) => x.name === l.name)?.pct ?? (lastLots ? 0 : globalPrev);
      return { ...l, prevPct: prev, pct: prev };
    }),
    depositsHt: round2(acomptes.reduce((s, f) => s + amounts(f).ht, 0)),
    depositsByRate: [...acomptes.flatMap((f) => amounts(f).byVat).reduce((m, v) => m.set(v.rate, (m.get(v.rate) || 0) + v.base), new Map<number, number>())].map(([rate, ht]) => ({ rate, ht: round2(ht) })),
    depositNumbers: acomptes.map((f) => f.number),
  };
}

/** Montant HT de déduction d'acompte présent sur une situation (lignes négatives). */
const depositDeductionOf = (f: Facture) => -f.lines.filter((l) => l.unitPriceHt < 0).reduce((s, l) => s + l.quantity * l.unitPriceHt, 0);

export interface SituationPlan {
  lines: DevisLigne[];
  workHt: number;
  deductionHt: number;
}

/** Lignes d'une situation : avancement de chaque lot (une ligne par taux de TVA si le lot en mélange plusieurs), moins l'acompte au prorata, ventilé par taux. */
export function planSituation(lots: SituationLot[], depositsHt: number, depositNumbers: string[], depositsByRate?: { rate: number; ht: number }[]): SituationPlan {
  const devisHt = lots.reduce((s, l) => s + l.totalHt, 0);
  const lines: DevisLigne[] = [];
  let workHt = 0;
  let deltaShare = 0;
  for (const l of lots) {
    const delta = Math.max(0, l.pct - l.prevPct);
    if (!delta) continue;
    const rates = l.rates?.length ? l.rates : [{ rate: l.vatRate, ht: l.totalHt }];
    for (const r of rates) {
      const v = round2((r.ht * delta) / 100);
      workHt += v;
      lines.push(line(`${l.name} · ${l.pct} % cumulés${rates.length > 1 ? ` (TVA ${String(r.rate).replace('.', ',')} %)` : ''}`, v, r.rate, `Avancement précédent ${l.prevPct} %, ce mois-ci +${delta} %`));
    }
    deltaShare += (l.totalHt * delta) / 100;
  }
  const ratio = devisHt ? deltaShare / devisHt : 0;
  const deductionHt = round2(depositsHt * ratio);
  if (deductionHt > 0) {
    const parts = depositsByRate?.length ? depositsByRate : [{ rate: lots[0]?.vatRate ?? 10, ht: depositsHt }];
    for (const p of parts) {
      const d = round2(p.ht * ratio);
      if (d > 0) lines.push(line(`Déduction acompte ${depositNumbers.join(', ')} au prorata${parts.length > 1 ? ` (TVA ${String(p.rate).replace('.', ',')} %)` : ''}`, -d, p.rate, `${Math.round(ratio * 1000) / 10} % de l'acompte`));
    }
  }
  return { lines, workHt: round2(workHt), deductionHt };
}

export function buildSituation(devis: Devis, number: string, index: number, plan: SituationPlan, retenue: number): Facture {
  const f = base(devis, number, 'situation', `Situation n°${index} · ${devis.title}`, plan.lines);
  if (retenue > 0) f.retenueGarantie = retenue;
  return f;
}

/** Solde : tout le devis, moins ce qui a déjà été facturé. */
export function buildSolde(devis: Devis, number: string, factures: Facture[]): Facture {
  const billed = billedFor(devis.id, factures);
  const lines: DevisLigne[] = devis.lines.map((l) => ({ ...l, id: uid('l') }));
  for (const f of billed) {
    for (const v of amounts(f).byVat) {
      if (v.base > 0) lines.push(line(`Déjà facturé : ${f.number}`, -v.base, v.rate, f.title));
    }
  }
  const f = base(devis, number, 'solde', `Facture de solde · ${devis.title}`, lines);
  const withRetenue = billed.find((x) => x.retenueGarantie);
  if (withRetenue) f.retenueGarantie = withRetenue.retenueGarantie;
  return f;
}

/** Avoir : reprend les lignes d'une facture, à annuler totalement. */
export function buildAvoir(original: Facture, number: string): Facture {
  return {
    ...original,
    id: uid('f'),
    number,
    kind: 'avoir',
    title: `Avoir sur ${original.number} · ${original.title}`,
    status: 'brouillon',
    issueDate: todayISO(),
    dueDate: todayISO(),
    lines: original.lines.map((l) => ({ ...l, id: uid('l') })),
    paidAmount: 0,
    retenueGarantie: undefined,
    einvoice: emptyEinvoice(),
    remindersSent: 0,
  };
}

/** Brouillon vierge. */
export function blankFacture(number: string, clientId: string, vatRate: number): Facture {
  return {
    id: uid('f'),
    number,
    kind: 'facture',
    clientId,
    title: '',
    status: 'brouillon',
    issueDate: todayISO(),
    dueDate: dayOffset(30),
    lines: [{ id: uid('l'), kind: 'ouvrage', designation: '', quantity: 1, unit: 'forfait', unitPriceHt: 0, unitCostHt: 0, vatRate, source: 'manuel' }],
    paidAmount: 0,
    einvoice: emptyEinvoice(),
    remindersSent: 0,
  };
}
