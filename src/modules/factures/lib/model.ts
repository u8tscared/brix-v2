// Calculs et libellés propres aux factures (montants, reste à payer, statut réel).
// Fonctions pures : réutilisées par les écrans, la génération Factur-X et les tests.

import type { Tone } from '@/components/ui/Badge';
import { daysBetween, todayISO, totals } from '@/lib/format';
import type { Facture, FactureKind, FactureStatus } from '@/lib/types';

export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const KIND_LABEL: Record<FactureKind, string> = {
  facture: 'Facture',
  acompte: 'Acompte',
  situation: 'Situation',
  solde: 'Solde',
  avoir: 'Avoir',
};

export const KIND_TONE: Record<FactureKind, Tone> = {
  facture: 'neutral',
  acompte: 'info',
  situation: 'violet',
  solde: 'ok',
  avoir: 'warn',
};

export type OperationCategory = 'services' | 'biens' | 'mixte';

export const CATEGORY_LABEL: Record<OperationCategory, string> = {
  services: 'Prestation de services',
  biens: 'Livraison de biens',
  mixte: 'Mixte (biens et services)',
};

export type PaymentMethod = 'virement' | 'carte' | 'cheque' | 'especes' | 'prelevement' | 'lien' | 'tap' | 'x3' | 'x4' | 'apple_pay' | 'instantane';

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  virement: 'Virement',
  carte: 'Carte bancaire',
  cheque: 'Chèque',
  especes: 'Espèces',
  prelevement: 'Prélèvement',
  lien: 'Lien de paiement',
  tap: 'Carte sur téléphone',
  x3: 'Paiement en 3 fois',
  x4: 'Paiement en 4 fois',
  apple_pay: 'Apple Pay',
  instantane: 'Virement instantané',
};

export interface Payment {
  id: string;
  factureId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  fee?: number;
  note?: string;
}

export interface SituationLot {
  name: string;
  totalHt: number;
  vatRate: number;
  /** Ventilation HT par taux de TVA quand le lot mélange plusieurs taux. */
  rates?: { rate: number; ht: number }[];
  prevPct: number;
  pct: number;
}

export interface Reminder {
  id: string;
  factureId: string;
  at: string; // ISO date-heure
  channel: 'email' | 'sms' | 'courrier';
  level: 1 | 2 | 3;
  text: string;
  by: 'bob' | 'moi';
}

/** Informations d'une facture qui n'existent pas (encore) dans le type partagé. */
export interface FactureExtra {
  category?: OperationCategory;
  vatOnDebits?: boolean;
  deliveryAddress?: string;
  clientSiren?: string;
  notes?: string;
  creditOf?: string; // id de la facture annulée par cet avoir
  depositPercent?: number;
  situation?: { index: number; lots: SituationLot[] };
  retenueReleaseDate?: string;
  sentAt?: string;
  sentTo?: string;
  paymentLink?: { url: string; createdAt: string; methods: PaymentMethod[]; opened?: number };
}

export interface Amounts {
  ht: number;
  tva: number;
  ttc: number;
  byVat: { rate: number; base: number; tva: number }[];
  retenue: number;
  net: number; // à payer (TTC moins retenue de garantie)
  paid: number;
  remaining: number;
  sign: 1 | -1;
}

/** Montants d'une facture. Pour un avoir, les montants restent positifs et `sign` vaut -1. */
export function amounts(f: Facture): Amounts {
  const t = totals(f.lines);
  // Arrondi par taux, comme dans le XML : la facture et le fichier tombent toujours juste.
  const byVat = t.byVat.map((v) => ({ rate: v.rate, base: round2(v.base), tva: round2((round2(v.base) * v.rate) / 100) }));
  const ht = round2(byVat.reduce((s, v) => s + v.base, 0));
  const tva = round2(byVat.reduce((s, v) => s + v.tva, 0));
  const ttc = round2(ht + tva);
  const retenue = f.retenueGarantie ? round2((ttc * f.retenueGarantie) / 100) : 0;
  const net = round2(ttc - retenue);
  const paid = round2(f.paidAmount || 0);
  const remaining = f.kind === 'avoir' || f.status === 'annulee' ? 0 : Math.max(0, round2(net - paid));
  return { ht, tva, ttc, byVat, retenue, net, paid, remaining, sign: f.kind === 'avoir' ? -1 : 1 };
}

/** Statut réel, recalculé selon la date du jour et les paiements. */
export function liveStatus(f: Facture, today = todayISO()): FactureStatus {
  if (f.status === 'brouillon' || f.status === 'annulee') return f.status;
  if (f.kind === 'avoir') return 'emise';
  const a = amounts(f);
  if (a.net > 0 && a.paid >= a.net - 0.01) return 'payee';
  if (f.dueDate < today) return 'en_retard';
  if (a.paid > 0) return 'partielle';
  return f.status === 'en_retard' || f.status === 'payee' || f.status === 'partielle' ? 'envoyee' : f.status;
}

export const daysLate = (f: Facture, today = todayISO()) => Math.max(0, daysBetween(f.dueDate, today));

/** « dans 12 jours », « en retard de 5 jours », « aujourd'hui ». */
export function dueLabel(f: Facture, today = todayISO()): { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } {
  const st = liveStatus(f, today);
  if (st === 'payee') return { text: 'Réglée', tone: 'ok' };
  if (st === 'brouillon') return { text: 'Pas encore émise', tone: 'muted' };
  if (f.kind === 'avoir') return { text: 'Avoir', tone: 'muted' };
  const d = daysBetween(today, f.dueDate);
  if (d === 0) return { text: "Échéance aujourd'hui", tone: 'warn' };
  if (d === 1) return { text: 'Échéance demain', tone: 'warn' };
  if (d > 1) return { text: `Dans ${d} jours`, tone: d <= 5 ? 'warn' : 'muted' };
  return { text: `En retard de ${-d} jour${d === -1 ? '' : 's'}`, tone: 'bad' };
}

/** SIREN (9 chiffres) à partir d'un SIRET ou d'un SIREN saisi avec espaces. */
export const sirenOf = (siretOrSiren?: string) => (siretOrSiren || '').replace(/\D/g, '').slice(0, 9);

/** Code « cadre de facturation » de la réforme (S1, B1, M1…), repris dans le XML. */
export function billingFrame(category: OperationCategory, kind: FactureKind, alreadyPaid = false): string {
  const letter = category === 'biens' ? 'B' : category === 'mixte' ? 'M' : 'S';
  if (kind === 'solde') return `${letter}4`;
  if (alreadyPaid) return `${letter}2`;
  return `${letter}1`;
}

/** Lots d'un devis : regroupement des lignes par section. */
export function lotsOf(lines: Facture['lines']): { name: string; totalHt: number; vatRate: number; rates: { rate: number; ht: number }[] }[] {
  const lots: { name: string; totalHt: number; rates: Map<number, number> }[] = [];
  let cur: (typeof lots)[number] | null = null;
  for (const l of lines) {
    if (l.kind === 'section') {
      cur = { name: l.designation, totalHt: 0, rates: new Map() };
      lots.push(cur);
      continue;
    }
    if (l.kind === 'texte') continue;
    if (!cur) {
      cur = { name: 'Travaux', totalHt: 0, rates: new Map() };
      lots.push(cur);
    }
    const v = l.quantity * l.unitPriceHt;
    cur.totalHt += v;
    cur.rates.set(l.vatRate, (cur.rates.get(l.vatRate) || 0) + v);
  }
  return lots
    .filter((l) => l.totalHt > 0)
    .map((l) => ({ name: l.name, totalHt: round2(l.totalHt), vatRate: [...l.rates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10, rates: [...l.rates.entries()].filter(([, ht]) => ht !== 0).map(([rate, ht]) => ({ rate, ht: round2(ht) })) }));
}
