// Factur-X : XML CII (UN/CEFACT Cross Industry Invoice D16B), profil EN 16931.
// Ce XML est celui qu'on embarque dans le PDF/A-3 et qu'on dépose sur la plateforme agréée.
// L'ordre des éléments suit le schéma XSD (il compte pour les validateurs).

import { computeTotals, unitCode, type EInvoiceInput, type EParty } from './einvoice-input';

export const FACTURX_PROFILE = 'urn:cen.eu:en16931:2017';

export function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const d102 = (iso: string) => iso.replace(/-/g, '').slice(0, 8);
const amt = (n: number) => n.toFixed(2);
const qtyStr = (n: number) => String(Math.round(n * 10000) / 10000);
const rateStr = (n: number) => (Number.isInteger(n) ? n.toFixed(2) : String(n));

function address(p: { line1: string; postcode: string; city: string; country: string }) {
  return [
    '<ram:PostalTradeAddress>',
    p.postcode ? `<ram:PostcodeCode>${esc(p.postcode)}</ram:PostcodeCode>` : '',
    p.line1 ? `<ram:LineOne>${esc(p.line1)}</ram:LineOne>` : '',
    p.city ? `<ram:CityName>${esc(p.city)}</ram:CityName>` : '',
    `<ram:CountryID>${esc(p.country || 'FR')}</ram:CountryID>`,
    '</ram:PostalTradeAddress>',
  ].join('');
}

function party(tag: 'SellerTradeParty' | 'BuyerTradeParty', p: EParty) {
  const siren = (p.siren || '').replace(/\D/g, '');
  const parts = [`<ram:${tag}>`, `<ram:Name>${esc(p.name)}</ram:Name>`];
  if (siren) parts.push(`<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${siren}</ram:ID></ram:SpecifiedLegalOrganization>`);
  parts.push(address(p));
  // Adresse de facturation électronique (annuaire) : SIREN, schéma 0225.
  if (siren) parts.push(`<ram:URIUniversalCommunication><ram:URIID schemeID="0225">${siren}</ram:URIID></ram:URIUniversalCommunication>`);
  else if (p.email) parts.push(`<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(p.email)}</ram:URIID></ram:URIUniversalCommunication>`);
  if (p.vatNumber) parts.push(`<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(p.vatNumber)}</ram:ID></ram:SpecifiedTaxRegistration>`);
  parts.push(`</ram:${tag}>`);
  return parts.join('');
}

/** Construit le XML CII Factur-X (profil EN 16931) d'une facture. */
export function buildFacturX(input: EInvoiceInput): string {
  const t = computeTotals(input);
  const exemption = 'TVA non applicable, art. 293 B du CGI';

  const lines = t.lines
    .map(
      (l) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${esc(l.id)}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(l.name)}</ram:Name>${l.description ? `<ram:Description>${esc(l.description)}</ram:Description>` : ''}</ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${amt(l.price)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(l.unit)}">${qtyStr(l.qty)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${l.vatRate === 0 ? 'E' : 'S'}</ram:CategoryCode><ram:RateApplicablePercent>${rateStr(l.vatRate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amt(l.net)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join('');

  // BT-8 : 5 = TVA exigible à la facturation (option débits), 72 = à l'encaissement (services par défaut).
  const dueDateType = input.vatOnDebits || input.category === 'biens' ? '5' : '72';
  const taxes = t.breakdown
    .map(
      (b) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amt(b.tax)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${b.category === 'E' ? `
        <ram:ExemptionReason>${esc(exemption)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${amt(b.basis)}</ram:BasisAmount>
        <ram:CategoryCode>${b.category}</ram:CategoryCode>${b.category === 'E' ? `
        <ram:ExemptionReasonCode>VATEX-FR-FRANCHISE</ram:ExemptionReasonCode>` : `
        <ram:DueDateTypeCode>${dueDateType}</ram:DueDateTypeCode>`}
        <ram:RateApplicablePercent>${rateStr(b.rate)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`,
    )
    .join('');

  const notes = input.notes.map((n, i) => `
    <ram:IncludedNote><ram:Content>${esc(n)}</ram:Content><ram:SubjectCode>${['PMD', 'PMT', 'AAB'][i] ?? 'AAI'}</ram:SubjectCode></ram:IncludedNote>`).join('');

  const buyerRef = input.buyer.siren || input.contractRef || input.number;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${esc(input.frame)}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${FACTURX_PROFILE}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(input.number)}</ram:ID>
    <ram:TypeCode>${input.typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${d102(input.issueDate)}</udt:DateTimeString></ram:IssueDateTime>${notes}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lines}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${esc(buyerRef)}</ram:BuyerReference>
      ${party('SellerTradeParty', input.seller)}
      ${party('BuyerTradeParty', input.buyer)}${input.contractRef ? `
      <ram:ContractReferencedDocument><ram:IssuerAssignedID>${esc(input.contractRef)}</ram:IssuerAssignedID></ram:ContractReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>${input.delivery ? `
      <ram:ShipToTradeParty><ram:Name>${esc(input.buyer.name)}</ram:Name>${address(input.delivery)}</ram:ShipToTradeParty>` : ''}
      <ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${d102(input.issueDate)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(input.number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${input.currency}</ram:InvoiceCurrencyCode>${input.iban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${esc(input.iban)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}${taxes}
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${esc(input.paymentTerms)}</ram:Description>${input.dueDate ? `
        <ram:DueDateDateTime><udt:DateTimeString format="102">${d102(input.dueDate)}</udt:DateTimeString></ram:DueDateDateTime>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amt(t.lineTotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${amt(t.lineTotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${input.currency}">${amt(t.taxTotal)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amt(t.grandTotal)}</ram:GrandTotalAmount>${t.prepaid ? `
        <ram:TotalPrepaidAmount>${amt(t.prepaid)}</ram:TotalPrepaidAmount>` : ''}
        <ram:DuePayableAmount>${amt(t.duePayable)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>${input.precedingInvoice ? `
      <ram:InvoiceReferencedDocument>
        <ram:IssuerAssignedID>${esc(input.precedingInvoice.number)}</ram:IssuerAssignedID>${input.precedingInvoice.date ? `
        <ram:FormattedIssueDateTime><qdt:DateTimeString format="102">${d102(input.precedingInvoice.date)}</qdt:DateTimeString></ram:FormattedIssueDateTime>` : ''}
      </ram:InvoiceReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

/** Fait télécharger un texte (XML) par le navigateur. */
export function downloadText(filename: string, content: string, type = 'application/xml') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
