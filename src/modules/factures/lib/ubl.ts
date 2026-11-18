// UBL 2.1 (Invoice / CreditNote), profil EN 16931 : l'autre format accepté par les plateformes agréées.

import { computeTotals, unitCode, type EInvoiceInput, type EParty } from './einvoice-input';
import { esc } from './facturx';

const amt = (n: number) => n.toFixed(2);

function party(tag: 'AccountingSupplierParty' | 'AccountingCustomerParty', p: EParty) {
  const siren = (p.siren || '').replace(/\D/g, '');
  return `
  <cac:${tag}>
    <cac:Party>${siren ? `
      <cbc:EndpointID schemeID="0225">${siren}</cbc:EndpointID>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${esc(p.line1)}</cbc:StreetName>
        <cbc:CityName>${esc(p.city)}</cbc:CityName>
        <cbc:PostalZone>${esc(p.postcode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${esc(p.country || 'FR')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>${p.vatNumber ? `
      <cac:PartyTaxScheme><cbc:CompanyID>${esc(p.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName>${siren ? `<cbc:CompanyID schemeID="0002">${siren}</cbc:CompanyID>` : ''}</cac:PartyLegalEntity>
    </cac:Party>
  </cac:${tag}>`;
}

export function buildUbl(input: EInvoiceInput): string {
  const t = computeTotals(input);
  const credit = input.typeCode === '381';
  const root = credit ? 'CreditNote' : 'Invoice';
  const lineTag = credit ? 'CreditNoteLine' : 'InvoiceLine';
  const qtyTag = credit ? 'CreditedQuantity' : 'InvoicedQuantity';
  const ns = credit ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2' : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
  const cat = (rate: number) => (rate === 0 ? 'E' : 'S');

  return `<?xml version="1.0" encoding="UTF-8"?>
<${root} xmlns="${ns}" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>${esc(input.frame)}</cbc:ProfileID>
  <cbc:ID>${esc(input.number)}</cbc:ID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>${input.dueDate && !credit ? `
  <cbc:DueDate>${input.dueDate}</cbc:DueDate>` : ''}
  <cbc:${credit ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${input.typeCode}</cbc:${credit ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${input.notes.map((n) => `
  <cbc:Note>${esc(n)}</cbc:Note>`).join('')}
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${esc(input.buyer.siren || input.contractRef || input.number)}</cbc:BuyerReference>${input.precedingInvoice ? `
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${esc(input.precedingInvoice.number)}</cbc:ID>${input.precedingInvoice.date ? `<cbc:IssueDate>${input.precedingInvoice.date}</cbc:IssueDate>` : ''}</cac:InvoiceDocumentReference></cac:BillingReference>` : ''}${input.contractRef ? `
  <cac:ContractDocumentReference><cbc:ID>${esc(input.contractRef)}</cbc:ID></cac:ContractDocumentReference>` : ''}${party('AccountingSupplierParty', input.seller)}${party('AccountingCustomerParty', input.buyer)}${input.delivery ? `
  <cac:Delivery><cac:DeliveryLocation><cac:Address><cbc:StreetName>${esc(input.delivery.line1)}</cbc:StreetName><cbc:CityName>${esc(input.delivery.city)}</cbc:CityName><cbc:PostalZone>${esc(input.delivery.postcode)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:Address></cac:DeliveryLocation></cac:Delivery>` : ''}${input.iban ? `
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cbc:PaymentID>${esc(input.number)}</cbc:PaymentID><cac:PayeeFinancialAccount><cbc:ID>${esc(input.iban)}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>` : ''}
  <cac:PaymentTerms><cbc:Note>${esc(input.paymentTerms)}</cbc:Note></cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${amt(t.taxTotal)}</cbc:TaxAmount>${t.breakdown.map((b) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${amt(b.basis)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${amt(b.tax)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>${b.category}</cbc:ID><cbc:Percent>${b.rate}</cbc:Percent>${b.category === 'E' ? '<cbc:TaxExemptionReasonCode>VATEX-FR-FRANCHISE</cbc:TaxExemptionReasonCode>' : ''}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>`).join('')}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${amt(t.lineTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${amt(t.lineTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${amt(t.grandTotal)}</cbc:TaxInclusiveAmount>${t.prepaid ? `
    <cbc:PrepaidAmount currencyID="EUR">${amt(t.prepaid)}</cbc:PrepaidAmount>` : ''}
    <cbc:PayableAmount currencyID="EUR">${amt(t.duePayable)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${t.lines.map((l) => `
  <cac:${lineTag}>
    <cbc:ID>${esc(l.id)}</cbc:ID>
    <cbc:${qtyTag} unitCode="${unitCode(l.unit)}">${l.qty}</cbc:${qtyTag}>
    <cbc:LineExtensionAmount currencyID="EUR">${amt(l.net)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${esc(l.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${cat(l.vatRate)}</cbc:ID><cbc:Percent>${l.vatRate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">${amt(l.price)}</cbc:PriceAmount></cac:Price>
  </cac:${lineTag}>`).join('')}
</${root}>
`;
}
