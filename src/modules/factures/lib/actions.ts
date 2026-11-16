// Actions métier partagées par les écrans (facture, paiements, relances, e-facture).
// Elles écrivent dans le store global (factures) et dans le store local du module.

import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import type { EInvoiceStatus, Facture } from '@/lib/types';
import { transmitToPlatform, PLATFORMS } from '../service';
import { useFactures } from '../store';
import { amounts, liveStatus, round2, type PaymentMethod } from './model';

const getF = (id: string) => useBrix.getState().factures.find((f) => f.id === id);

export const isB2B = (f: Facture) => useBrix.getState().clients.find((c) => c.id === f.clientId)?.kind === 'pro';

export function saveFacture(f: Facture) {
  useBrix.getState().upsertFacture(f);
}

/** Ajoute un statut au cycle de vie e-facture. */
export function pushEinvoice(id: string, status: EInvoiceStatus, note?: string) {
  const f = getF(id);
  if (!f) return;
  const platform = PLATFORMS[useFactures.getState().platform ?? 'superpdp'].name;
  const at = new Date().toISOString().slice(0, 16);
  useBrix.getState().upsertFacture({ ...f, einvoice: { ...f.einvoice, status, platform, format: f.einvoice.format ?? 'factur-x', history: [...f.einvoice.history, { at, status, note }] } });
  useFactures.getState().log({ number: f.number, direction: 'emise', event: note ? `${labelOf(status)} · ${note}` : labelOf(status), platform, ok: status !== 'refusee' });
}

const labelOf = (s: EInvoiceStatus) =>
  ({ non_transmise: 'Non transmise', deposee: 'Déposée', emise: 'Émise', recue: 'Reçue', mise_a_disposition: 'Mise à disposition', prise_en_charge: 'Prise en charge', approuvee: 'Approuvée', refusee: 'Refusée', litige: 'En litige', paiement_transmis: 'Paiement transmis', encaissee: 'Encaissée' })[s];

/** Enregistre un paiement (partiel ou total) et met à jour le statut. */
export function recordPayment(id: string, amount: number, method: PaymentMethod, date = todayISO(), fee?: number) {
  const f = getF(id);
  if (!f) return;
  useFactures.getState().addPayment({ factureId: id, amount: round2(amount), method, date, fee });
  const next = { ...f, paidAmount: round2(f.paidAmount + amount) };
  next.status = liveStatus({ ...next, status: f.status === 'brouillon' ? 'emise' : f.status });
  useBrix.getState().upsertFacture(next);
  // Facture B2B transmise et soldée : le statut « encaissée » est envoyé au fisc (prestations de services).
  if (next.status === 'payee' && f.einvoice.status !== 'non_transmise' && f.einvoice.status !== 'encaissee') pushEinvoice(id, 'encaissee', `${amounts(next).paid.toFixed(2).replace('.', ',')} € reçus`);
}

/** Émet la facture : elle n'est plus modifiable (correction par avoir). */
export function issueFacture(id: string) {
  const f = getF(id);
  if (!f || f.status !== 'brouillon') return;
  useBrix.getState().upsertFacture({ ...f, status: 'emise', issueDate: todayISO() < f.issueDate ? f.issueDate : todayISO() });
}

export function markSent(id: string, to: string) {
  const f = getF(id);
  if (!f) return;
  useBrix.getState().upsertFacture({ ...f, status: f.status === 'brouillon' || f.status === 'emise' ? 'envoyee' : f.status });
  useFactures.getState().setExtra(id, { sentAt: new Date().toISOString().slice(0, 16), sentTo: to });
}

/** Dépose la facture sur la plateforme agréée et suit son cycle de vie (simulé). */
export async function transmit(id: string) {
  const f = getF(id);
  if (!f) return;
  if (f.status === 'brouillon') issueFacture(id);
  await transmitToPlatform(f, (s, note) => pushEinvoice(id, s, note));
}

/** En démo : fait avancer la facture d'un statut côté client. */
export function advanceDemo(id: string) {
  const f = getF(id);
  if (!f) return;
  const order: EInvoiceStatus[] = ['deposee', 'emise', 'recue', 'mise_a_disposition', 'prise_en_charge', 'approuvee', 'paiement_transmis', 'encaissee'];
  const i = order.indexOf(f.einvoice.status);
  const next = order[Math.min(order.length - 1, i + 1)];
  if (next === 'encaissee') {
    const a = amounts(f);
    if (a.remaining > 0) recordPayment(id, a.remaining, 'virement');
    else pushEinvoice(id, 'encaissee');
    return;
  }
  pushEinvoice(id, next, next === 'paiement_transmis' ? 'Le client annonce un virement' : undefined);
}
