import { describe, expect, it } from 'vitest';
import { demoClients, demoCompany, demoFactures } from '@/lib/demo';
import type { Facture } from '@/lib/types';
import { computeTotals, fromFacture, splitCity, unitCode, validateEInvoice, type EInvoiceInput } from './einvoice-input';
import { buildFacturX, esc } from './facturx';
import { amounts, billingFrame, liveStatus } from './model';
import { buildUbl } from './ubl';

const base = (): EInvoiceInput => ({
  number: 'F-2026-301',
  typeCode: '380',
  issueDate: '2026-11-16',
  dueDate: '2026-12-16',
  currency: 'EUR',
  frame: 'S1',
  category: 'services',
  vatOnDebits: false,
  seller: { name: 'BENALI ELECTRICITE SARL', siren: '812457963', vatNumber: 'FR41812457963', line1: '12 rue Francis de Pressensé', postcode: '69100', city: 'Villeurbanne', country: 'FR' },
  buyer: { name: 'SCI Les Tilleuls', siren: '789456123', line1: '9 rue Duguesclin', postcode: '69006', city: 'Lyon', country: 'FR' },
  lines: [
    { id: '1', name: 'Hublot LED 15 W', quantity: 3, unit: 'u', unitPrice: 78.333, vatRate: 10 },
    { id: '2', name: 'Main d’œuvre', quantity: 2.5, unit: 'h', unitPrice: 55, vatRate: 10 },
    { id: '3', name: 'Baie de brassage', quantity: 1, unit: 'u', unitPrice: 690, vatRate: 20 },
  ],
  iban: 'FR7630004000031234567890143',
  paymentTerms: 'Payable à 30 jours',
  notes: ['Pénalités', 'Indemnité 40 €', 'Pas d’escompte'],
});

const tag = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<ram:${name}[^>]*>([^<]*)</ram:${name}>`, 'g'))].map((m) => m[1]);

describe('totaux EN 16931', () => {
  it('arrondit chaque ligne au centime puis ventile la TVA par taux', () => {
    const t = computeTotals(base());
    expect(t.lines.map((l) => l.net)).toEqual([235, 137.5, 690]);
    expect(t.lineTotal).toBe(1062.5);
    expect(t.breakdown).toEqual([
      { rate: 20, category: 'S', basis: 690, tax: 138 },
      { rate: 10, category: 'S', basis: 372.5, tax: 37.25 },
    ]);
    expect(t.taxTotal).toBe(175.25);
    expect(t.grandTotal).toBe(1237.75);
    expect(t.duePayable).toBe(1237.75);
  });

  it('déduit les acomptes déjà versés du montant dû', () => {
    const t = computeTotals({ ...base(), prepaid: 237.75 });
    expect(t.duePayable).toBe(1000);
  });

  it('transforme une déduction (prix négatif) en quantité négative avec un prix positif', () => {
    const t = computeTotals({ ...base(), lines: [...base().lines, { id: '4', name: 'Déduction acompte', quantity: 1, unit: 'forfait', unitPrice: -100, vatRate: 10 }] });
    const d = t.lines[3];
    expect(d.price).toBe(100);
    expect(d.qty).toBe(-1);
    expect(d.net).toBe(-100);
    expect(t.breakdown.find((b) => b.rate === 10)?.basis).toBe(272.5);
  });
});

describe('XML Factur-X (CII)', () => {
  const xml = buildFacturX(base());

  it('déclare le profil EN 16931 et le cadre de facturation', () => {
    expect(xml).toContain('<ram:ID>urn:cen.eu:en16931:2017</ram:ID>');
    expect(xml).toContain('<ram:ID>S1</ram:ID>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('contient les champs obligatoires', () => {
    expect(tag(xml, 'TypeCode')[0]).toBe('380');
    expect(xml).toContain('<udt:DateTimeString format="102">20261116</udt:DateTimeString>');
    expect(xml).toContain('<ram:ID schemeID="0002">812457963</ram:ID>');
    expect(xml).toContain('<ram:ID schemeID="0002">789456123</ram:ID>');
    expect(xml).toContain('<ram:ID schemeID="VA">FR41812457963</ram:ID>');
    expect(xml).toContain('<ram:URIID schemeID="0225">789456123</ram:URIID>');
    expect(xml).toContain('<ram:IBANID>FR7630004000031234567890143</ram:IBANID>');
    expect(xml).toContain('<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>');
    expect(xml).toContain('<udt:DateTimeString format="102">20261216</udt:DateTimeString>');
    expect(tag(xml, 'CountryID')).toEqual(['FR', 'FR']);
  });

  it('écrit des totaux cohérents avec la ventilation', () => {
    expect(tag(xml, 'LineTotalAmount').slice(-1)[0]).toBe('1062.50');
    expect(tag(xml, 'TaxBasisTotalAmount')).toEqual(['1062.50']);
    expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">175.25</ram:TaxTotalAmount>');
    expect(tag(xml, 'GrandTotalAmount')).toEqual(['1237.75']);
    expect(tag(xml, 'DuePayableAmount')).toEqual(['1237.75']);
    expect(tag(xml, 'BasisAmount')).toEqual(['690.00', '372.50']);
    expect(tag(xml, 'CalculatedAmount')).toEqual(['138.00', '37.25']);
    expect(tag(xml, 'BilledQuantity')).toEqual(['3', '2.5', '1']);
    expect(xml).toContain('unitCode="HUR"');
  });

  it('exige la TVA sur les encaissements par défaut et sur les débits si l’option est prise', () => {
    expect(tag(xml, 'DueDateTypeCode')).toEqual(['72', '72']);
    expect(tag(buildFacturX({ ...base(), vatOnDebits: true }), 'DueDateTypeCode')).toEqual(['5', '5']);
  });

  it('référence la facture d’origine pour un avoir', () => {
    const x = buildFacturX({ ...base(), typeCode: '381', precedingInvoice: { number: 'F-2026-199', date: '2026-10-22' } });
    expect(tag(x, 'TypeCode')[0]).toBe('381');
    expect(x).toContain('<ram:IssuerAssignedID>F-2026-199</ram:IssuerAssignedID>');
  });

  it('échappe les caractères spéciaux', () => {
    expect(esc('Martin & Fils <SARL>')).toBe('Martin &amp; Fils &lt;SARL&gt;');
    const x = buildFacturX({ ...base(), buyer: { ...base().buyer, name: 'Martin & Fils' } });
    expect(x).toContain('<ram:Name>Martin &amp; Fils</ram:Name>');
  });
});

describe('UBL', () => {
  it('produit une facture ou un avoir UBL avec les mêmes totaux', () => {
    const inv = buildUbl(base());
    expect(inv).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
    expect(inv).toContain('<cbc:PayableAmount currencyID="EUR">1237.75</cbc:PayableAmount>');
    const cn = buildUbl({ ...base(), typeCode: '381', precedingInvoice: { number: 'F-2026-199' } });
    expect(cn).toContain('<CreditNote');
    expect(cn).toContain('<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>');
  });
});

describe('validation avant transmission', () => {
  it('ne signale rien pour une facture complète', () => {
    expect(validateEInvoice(base())).toEqual([]);
  });
  it('signale le SIREN client manquant en B2B, pas pour un particulier', () => {
    const inv = { ...base(), buyer: { ...base().buyer, siren: undefined } };
    expect(validateEInvoice(inv)).toContain('SIREN du client');
    expect(validateEInvoice(inv, { b2b: false })).not.toContain('SIREN du client');
  });
  it('exige la facture d’origine sur un avoir et la date d’échéance sur une facture', () => {
    expect(validateEInvoice({ ...base(), typeCode: '381' })).toContain("Facture d'origine de l'avoir");
    expect(validateEInvoice({ ...base(), dueDate: undefined })).toContain("Date d'échéance");
  });
});

describe('adaptateur depuis une facture Brix', () => {
  const f = demoFactures.find((x) => x.id === 'f_198') as Facture;
  const client = demoClients.find((c) => c.id === f.clientId);
  const input = fromFacture(f, demoCompany, client, { category: 'services', retenueReleaseDate: '2027-11-30' }, { devisNumber: 'D-2026-110' });

  it('reprend vendeur, acheteur, devis et retenue de garantie', () => {
    expect(input.seller.siren).toBe('812457963');
    expect(input.seller.vatNumber).toBe('FR41812457963');
    expect(input.buyer.siren).toBe('789456123');
    expect(input.buyer.postcode).toBe('69006');
    expect(input.contractRef).toBe('D-2026-110');
    expect(input.retenue?.percent).toBe(5);
    expect(input.notes.some((n) => n.includes('Retenue de garantie de 5 %'))).toBe(true);
    expect(validateEInvoice(input)).toEqual([]);
  });

  it('a les mêmes montants que l’écran', () => {
    const a = amounts(f);
    const t = computeTotals(input);
    expect(t.grandTotal).toBe(a.ttc);
    expect(a.ttc).toBe(2398);
    expect(a.retenue).toBe(119.9);
  });

  it('utilise le code 386 pour un acompte', () => {
    const acompte = demoFactures.find((x) => x.kind === 'acompte') as Facture;
    expect(fromFacture(acompte, demoCompany, undefined).typeCode).toBe('386');
  });
});

describe('outils', () => {
  it('découpe code postal et ville', () => {
    expect(splitCity('69100 Villeurbanne')).toEqual({ postcode: '69100', city: 'Villeurbanne' });
  });
  it('convertit les unités', () => {
    expect(unitCode('m²')).toBe('MTK');
    expect(unitCode('forfait')).toBe('LS');
  });
  it('donne le cadre de facturation', () => {
    expect(billingFrame('services', 'facture')).toBe('S1');
    expect(billingFrame('mixte', 'solde')).toBe('M4');
    expect(billingFrame('biens', 'facture', true)).toBe('B2');
  });
  it('recalcule le statut selon la date et les paiements', () => {
    const f = { ...(demoFactures[6] as Facture), dueDate: '2026-11-01', status: 'envoyee' as const };
    expect(liveStatus(f, '2026-11-16')).toBe('en_retard');
    expect(liveStatus({ ...f, paidAmount: 216 }, '2026-11-16')).toBe('payee');
  });
});

describe('facturation depuis un devis', async () => {
  const { demoDevis } = await import('@/lib/demo');
  const billing = await import('./billing');
  const d = demoDevis.find((x) => x.id === 'q_121')!;

  it('situation : facture l’avancement par lot et déduit l’acompte au prorata', () => {
    const prev = billing.previousProgress(d, demoFactures, {});
    expect(prev.depositNumbers).toEqual(['F-2026-201']);
    const lots = prev.lots.map((l) => ({ ...l, pct: 50 }));
    const plan = billing.planSituation(lots, prev.depositsHt, prev.depositNumbers);
    const devisHt = lots.reduce((s, l) => s + l.totalHt, 0);
    expect(plan.workHt).toBeCloseTo(devisHt / 2, 1);
    expect(plan.deductionHt).toBeCloseTo(prev.depositsHt / 2, 1);
    const xml = buildFacturX(fromFacture(billing.buildSituation(d, 'F-2026-300', 1, plan, 5), demoCompany, demoClients[0]));
    expect(xml).toMatch(/<ram:BilledQuantity unitCode="LS">-1<\/ram:BilledQuantity>/);
  });

  it('solde : reprend le devis moins ce qui a été facturé', () => {
    const solde = billing.buildSolde(d, 'F-2026-301', demoFactures);
    const a = amounts(solde);
    expect(a.ht).toBeCloseTo(amounts({ ...solde, lines: d.lines }).ht - 1508.52, 2);
  });

  it('avoir : type 381 avec la facture d’origine', () => {
    const av = billing.buildAvoir(demoFactures[2], 'F-2026-302');
    const input = fromFacture(av, demoCompany, demoClients[6], {}, { original: demoFactures[2] });
    expect(input.typeCode).toBe('381');
    expect(validateEInvoice(input, { b2b: false })).toEqual([]);
  });
});
