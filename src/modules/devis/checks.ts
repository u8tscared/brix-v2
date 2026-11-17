// Vérification avant envoi d'un devis : ce qu'un client, un contrôleur ou un assureur regarderait.
// Chaque point renvoie vers le champ à corriger (voir focus.ts).

import { totals } from '@/lib/format';
import type { Client, Company, Devis } from '@/lib/types';
import { isPriced } from './logic';

export type CheckState = 'ok' | 'warn' | 'bad';
export type FixTarget = 'client' | 'chantier' | 'vat' | 'lines' | 'deposit' | 'validity' | 'company';

export interface CheckItem {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
  fix?: FixTarget;
  fixLabel?: string;
}

export function checkDevis(d: Devis, client: Client | undefined, company: Company): CheckItem[] {
  const t = totals(d.lines);
  const priced = d.lines.filter(isPriced);
  const items: CheckItem[] = [];

  // Client
  if (!client) items.push({ key: 'client', label: 'Client', state: 'bad', detail: 'Aucun client choisi.', fix: 'client', fixLabel: 'Choisir' });
  else {
    const miss = [!client.email && !client.phone && 'e-mail ou téléphone', !client.address && 'adresse', !client.city && 'ville'].filter(Boolean) as string[];
    items.push(miss.length ? { key: 'client', label: 'Client complet', state: 'warn', detail: `Il manque : ${miss.join(', ')}.`, fix: 'client', fixLabel: 'Compléter' } : { key: 'client', label: 'Client complet', state: 'ok', detail: `${client.name}, ${client.email || client.phone}` });
  }

  // Adresse du chantier
  const addr = client ? [client.address, client.city].filter(Boolean).join(', ') : '';
  items.push(addr ? { key: 'chantier', label: 'Adresse du chantier', state: 'ok', detail: addr } : { key: 'chantier', label: 'Adresse du chantier', state: client ? 'warn' : 'bad', detail: 'Le lieu des travaux doit figurer sur le devis.', fix: client ? 'chantier' : 'client', fixLabel: 'Ajouter' });

  // Lignes
  const empty = priced.filter((l) => !l.designation.trim() || !l.quantity || !l.unitPriceHt);
  if (!priced.length) items.push({ key: 'lines', label: 'Lignes du devis', state: 'bad', detail: 'Le devis est vide.', fix: 'lines', fixLabel: 'Ajouter' });
  else if (empty.length) items.push({ key: 'lines', label: 'Lignes du devis', state: 'warn', detail: `${empty.length} ligne${empty.length > 1 ? 's' : ''} sans désignation, quantité ou prix.`, fix: 'lines', fixLabel: 'Voir' });
  else items.push({ key: 'lines', label: 'Lignes du devis', state: 'ok', detail: `${priced.length} ligne${priced.length > 1 ? 's' : ''}, chacune avec quantité et prix.` });

  // TVA cohérente
  const reduced = t.byVat.some((v) => v.rate === 10 || v.rate === 5.5);
  if (client?.kind === 'pro' && reduced) items.push({ key: 'vat', label: 'TVA cohérente', state: 'warn', detail: 'TVA réduite pour un professionnel : réservée aux logements de plus de 2 ans.', fix: 'vat', fixLabel: 'Vérifier' });
  else if (t.byVat.some((v) => v.rate === 0) && priced.length) items.push({ key: 'vat', label: 'TVA cohérente', state: 'warn', detail: 'Une ligne est à 0 % : mention d’exonération à prévoir.', fix: 'lines', fixLabel: 'Voir' });
  else items.push({ key: 'vat', label: 'TVA cohérente', state: 'ok', detail: reduced ? 'Taux réduit, attestation client jointe au devis.' : t.byVat.length ? `TVA ${t.byVat.map((v) => String(v.rate).replace('.', ',')).join(' et ')} %` : 'À définir avec les lignes.' });

  // Mentions obligatoires
  const missCo = [!company.siret && 'SIRET', !company.vatNumber && 'n° de TVA', !company.address && 'adresse'].filter(Boolean) as string[];
  items.push(missCo.length ? { key: 'mentions', label: 'Mentions obligatoires', state: 'bad', detail: `Votre ${missCo.join(', ')} manque sur le devis.`, fix: 'company', fixLabel: 'Réglages' } : { key: 'mentions', label: 'Mentions obligatoires', state: 'ok', detail: `Date, validité ${d.validityDays} jours, SIRET, rétractation et médiateur.` });

  // Conditions de paiement
  items.push(company.iban ? { key: 'paiement', label: 'Conditions de paiement', state: 'ok', detail: d.depositPercent ? `Acompte ${d.depositPercent} %, solde à réception, carte ou virement.` : 'Paiement à réception des travaux.' } : { key: 'paiement', label: 'Conditions de paiement', state: 'warn', detail: 'Ajoutez votre IBAN pour le virement.', fix: 'company', fixLabel: 'Réglages' });

  // Décennale
  items.push(company.decennale ? { key: 'decennale', label: 'Assurance décennale', state: 'ok', detail: company.decennale } : { key: 'decennale', label: 'Assurance décennale', state: 'bad', detail: 'Obligatoire sur les devis du bâtiment.', fix: 'company', fixLabel: 'Réglages' });

  // Signature et acompte
  if (!d.depositPercent) items.push({ key: 'acompte', label: 'Signature et acompte', state: 'warn', detail: 'Aucun acompte demandé à la signature.', fix: 'deposit', fixLabel: 'Choisir' });
  else if (client?.kind !== 'pro' && d.depositPercent > 40) items.push({ key: 'acompte', label: 'Signature et acompte', state: 'warn', detail: `Acompte de ${d.depositPercent} % : élevé pour un particulier, 30 % rassure davantage.`, fix: 'deposit', fixLabel: 'Ajuster' });
  else items.push({ key: 'acompte', label: 'Signature et acompte', state: 'ok', detail: `Signature en ligne, acompte de ${d.depositPercent} % payable aussitôt.` });

  return items;
}

export const checkScore = (items: CheckItem[]) => ({ ok: items.filter((i) => i.state === 'ok').length, total: items.length, bad: items.filter((i) => i.state === 'bad').length, warn: items.filter((i) => i.state === 'warn').length });
