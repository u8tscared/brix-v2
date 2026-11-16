// Données normalisées d'une facture électronique, communes à Factur-X (CII) et UBL.
// L'adaptateur `fromFacture` traduit une facture Brix ; `validateEInvoice` liste ce qui manque
// avant transmission à la plateforme agréée (règles EN 16931 et réforme française 2026).

import type { Client, Company, Facture } from '@/lib/types';
import { amounts, billingFrame, round2, sirenOf, type FactureExtra, type OperationCategory } from './model';

export interface EParty {
  name: string;
  siren?: string;
  siret?: string;
  vatNumber?: string;
  line1: string;
  postcode: string;
  city: string;
  country: string;
  email?: string;
}

export interface ELine {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
}

export interface EInvoiceInput {
  number: string;
  /** 380 facture, 381 avoir, 386 facture d'acompte. */
  typeCode: '380' | '381' | '386';
  issueDate: string;
  dueDate?: string;
  currency: 'EUR';
  /** Cadre de facturation (BT-23) : S1, B1, M1, S4… */
  frame: string;
  category: OperationCategory;
  vatOnDebits: boolean;
  seller: EParty;
  buyer: EParty;
  delivery?: { line1: string; postcode: string; city: string; country: string };
  lines: ELine[];
  iban?: string;
  paymentTerms: string;
  notes: string[];
  contractRef?: string;
  precedingInvoice?: { number: string; date?: string };
  prepaid?: number;
  retenue?: { percent: number; amount: number; releaseDate?: string };
}

export interface ComputedLine extends ELine {
  qty: number;
  price: number;
  net: number;
}

export interface ComputedTotals {
  lines: ComputedLine[];
  breakdown: { rate: number; category: 'S' | 'E'; basis: number; tax: number }[];
  lineTotal: number;
  taxTotal: number;
  grandTotal: number;
  prepaid: number;
  duePayable: number;
}

/** Totaux conformes EN 16931 : prix nets positifs, ventilation par taux, arrondis au centime. */
export function computeTotals(input: EInvoiceInput): ComputedTotals {
  const lines = input.lines.map((l) => {
    // BR-27 : le prix net d'un article ne peut pas être négatif. Une déduction passe en quantité négative.
    const neg = l.unitPrice < 0;
    const qty = neg ? -l.quantity : l.quantity;
    const price = Math.abs(l.unitPrice);
    return { ...l, qty, price, net: round2(qty * price) };
  });
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.vatRate, round2((map.get(l.vatRate) || 0) + l.net));
  const breakdown = [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, basis]) => ({ rate, category: (rate === 0 ? 'E' : 'S') as 'S' | 'E', basis: round2(basis), tax: round2((basis * rate) / 100) }));
  const lineTotal = round2(lines.reduce((s, l) => s + l.net, 0));
  const taxTotal = round2(breakdown.reduce((s, b) => s + b.tax, 0));
  const grandTotal = round2(lineTotal + taxTotal);
  const prepaid = round2(input.prepaid || 0);
  return { lines, breakdown, lineTotal, taxTotal, grandTotal, prepaid, duePayable: round2(grandTotal - prepaid) };
}

/** Code d'unité UN/ECE (recommandation 20). */
export function unitCode(unit: string): string {
  const u = unit.trim().toLowerCase();
  const map: Record<string, string> = { u: 'C62', unite: 'C62', pce: 'C62', h: 'HUR', heure: 'HUR', j: 'DAY', jour: 'DAY', m: 'MTR', ml: 'MTR', 'm²': 'MTK', m2: 'MTK', 'm³': 'MTQ', m3: 'MTQ', kg: 'KGM', t: 'TNE', l: 'LTR', forfait: 'LS', ens: 'SET' };
  return map[u] ?? 'C62';
}

/** « 69100 Villeurbanne » → code postal et ville. */
export function splitCity(city: string): { postcode: string; city: string } {
  const m = city.trim().match(/^(\d{5})\s+(.*)$/);
  return m ? { postcode: m[1], city: m[2] } : { postcode: '', city: city.trim() };
}

/** Champs obligatoires manquants, en français simple. Liste vide = prête à transmettre. */
export function validateEInvoice(input: EInvoiceInput, opts: { b2b?: boolean } = {}): string[] {
  const miss: string[] = [];
  const b2b = opts.b2b ?? true;
  if (!input.number) miss.push('Numéro de facture');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)) miss.push("Date d'émission");
  if (!input.seller.name) miss.push('Nom de votre entreprise');
  if (sirenOf(input.seller.siren || input.seller.siret).length !== 9) miss.push('SIREN de votre entreprise');
  if (!input.seller.vatNumber && input.lines.some((l) => l.vatRate > 0)) miss.push('Numéro de TVA de votre entreprise');
  if (!input.seller.postcode || !input.seller.city) miss.push('Adresse de votre entreprise');
  if (!input.buyer.name) miss.push('Nom du client');
  if (b2b && sirenOf(input.buyer.siren || input.buyer.siret).length !== 9) miss.push('SIREN du client');
  if (!input.buyer.postcode || !input.buyer.city) miss.push('Adresse du client');
  if (!input.lines.length) miss.push('Au moins une ligne');
  if (input.lines.some((l) => !l.name.trim())) miss.push('Désignation de chaque ligne');
  if (input.typeCode === '381' && !input.precedingInvoice) miss.push("Facture d'origine de l'avoir");
  if (!input.dueDate && input.typeCode !== '381') miss.push("Date d'échéance");
  return miss;
}

const stripSpaces = (s?: string) => (s || '').replace(/\s/g, '').toUpperCase();

/** Traduit une facture Brix en données de facture électronique. */
export function fromFacture(f: Facture, company: Company, client: Client | undefined, extra: FactureExtra = {}, opts: { devisNumber?: string; original?: Facture } = {}): EInvoiceInput {
  const sc = splitCity(company.city);
  const bc = splitCity(client?.city || '');
  const category = extra.category ?? 'services';
  const lines: ELine[] = f.lines
    .filter((l) => l.kind !== 'section' && l.kind !== 'texte')
    .map((l, i) => ({ id: String(i + 1), name: l.designation, description: l.detail, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPriceHt, vatRate: l.vatRate }));
  const typeCode = f.kind === 'avoir' ? '381' : f.kind === 'acompte' ? '386' : '380';
  const notes = [
    'En cas de retard de paiement, pénalités au taux de 3 fois le taux d’intérêt légal, exigibles dès le lendemain de l’échéance.',
    'Indemnité forfaitaire pour frais de recouvrement : 40 € (art. D. 441-5 du code de commerce).',
    'Pas d’escompte pour paiement anticipé.',
  ];
  if (extra.vatOnDebits) notes.push('Option pour le paiement de la taxe d’après les débits.');
  if (company.decennale) notes.push(`Assurance décennale : ${company.decennale}.`);
  const sirenSeller = sirenOf(company.siret);
  const buyerSiren = sirenOf(extra.clientSiren || client?.siret);
  let retenue: EInvoiceInput['retenue'];
  if (f.retenueGarantie) {
    retenue = { percent: f.retenueGarantie, amount: amounts(f).retenue, releaseDate: extra.retenueReleaseDate };
    notes.push(`Retenue de garantie de ${f.retenueGarantie} % (loi n° 71-584), libérable${extra.retenueReleaseDate ? ` le ${extra.retenueReleaseDate.split('-').reverse().join('/')}` : ' un an après la réception'}.`);
  }
  const del = extra.deliveryAddress ? parseAddress(extra.deliveryAddress) : undefined;
  return {
    number: f.number,
    typeCode,
    issueDate: f.issueDate,
    dueDate: f.kind === 'avoir' ? undefined : f.dueDate,
    currency: 'EUR',
    frame: billingFrame(category, f.kind, f.kind !== 'avoir' && f.paidAmount > 0 && f.status === 'brouillon'),
    category,
    vatOnDebits: !!extra.vatOnDebits,
    seller: { name: company.legalName || company.name, siren: sirenSeller, siret: stripSpaces(company.siret), vatNumber: stripSpaces(company.vatNumber), line1: company.address, postcode: sc.postcode, city: sc.city, country: 'FR', email: company.email },
    buyer: { name: client?.name || '', siren: buyerSiren || undefined, siret: client?.siret ? stripSpaces(client.siret) : undefined, line1: client?.address || '', postcode: bc.postcode, city: bc.city, country: 'FR', email: client?.email },
    delivery: del,
    lines,
    iban: stripSpaces(company.iban) || undefined,
    paymentTerms: f.kind === 'acompte' ? 'Payable à réception' : `Payable au plus tard le ${f.dueDate.split('-').reverse().join('/')}`,
    notes,
    contractRef: opts.devisNumber,
    precedingInvoice: opts.original ? { number: opts.original.number, date: opts.original.issueDate } : undefined,
    retenue,
  };
}

/** « 18 rue Paul Bert, 69003 Lyon » → adresse structurée. */
export function parseAddress(s: string): { line1: string; postcode: string; city: string; country: string } {
  const m = s.match(/^(.*?)[,\s]+(\d{5})\s+(.+)$/);
  if (m) return { line1: m[1].trim(), postcode: m[2], city: m[3].trim(), country: 'FR' };
  return { line1: s.trim(), postcode: '', city: '', country: 'FR' };
}
