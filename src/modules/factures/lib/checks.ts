// Vérification avant émission d'une facture : mentions obligatoires, client, paiement, e-facture.

import type { Client, Company, Facture } from '@/lib/types';
import type { CheckItem } from '@/modules/devis/checks';
import { sirenOf, type FactureExtra } from './model';

export function checkFacture(f: Facture, client: Client | undefined, company: Company, extra: FactureExtra, missing: string[]): CheckItem[] {
  const pro = client?.kind === 'pro';
  const priced = f.lines.filter((l) => l.kind !== 'section' && l.kind !== 'texte');
  const items: CheckItem[] = [];

  if (!client) items.push({ key: 'client', label: 'Client', state: 'bad', detail: 'Aucun client choisi.', fix: 'client', fixLabel: 'Choisir' });
  else if (!client.email) items.push({ key: 'client', label: 'Client', state: 'warn', detail: 'Pas d’adresse e-mail pour envoyer la facture.', fix: 'client', fixLabel: 'Compléter' });
  else items.push({ key: 'client', label: 'Client', state: 'ok', detail: `${client.name}, ${client.email}` });

  if (pro) {
    const siren = sirenOf(extra.clientSiren || client?.siret);
    items.push(siren.length === 9 ? { key: 'siren', label: 'SIREN du client', state: 'ok', detail: siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') } : { key: 'siren', label: 'SIREN du client', state: 'bad', detail: 'Obligatoire sur une facture entre professionnels.', fix: 'chantier', fixLabel: 'Ajouter' });
  }

  const addr = extra.deliveryAddress || (client ? [client.address, client.city].filter(Boolean).join(', ') : '');
  items.push(addr ? { key: 'adresse', label: 'Adresse du chantier', state: 'ok', detail: addr } : { key: 'adresse', label: 'Adresse du chantier', state: 'warn', detail: 'Mention obligatoire depuis la réforme 2026.', fix: 'chantier', fixLabel: 'Ajouter' });

  if (!priced.length) items.push({ key: 'lines', label: 'Lignes', state: 'bad', detail: 'La facture est vide.', fix: 'lines', fixLabel: 'Ajouter' });
  else if (priced.some((l) => !l.designation.trim())) items.push({ key: 'lines', label: 'Lignes', state: 'warn', detail: 'Une ligne n’a pas de désignation.', fix: 'lines', fixLabel: 'Voir' });
  else items.push({ key: 'lines', label: 'Lignes', state: 'ok', detail: `${priced.length} ligne${priced.length > 1 ? 's' : ''} avec désignation, quantité et TVA.` });

  const missCo = [!company.siret && 'SIRET', !company.vatNumber && 'n° de TVA', !company.address && 'adresse'].filter(Boolean) as string[];
  items.push(missCo.length ? { key: 'mentions', label: 'Mentions obligatoires', state: 'bad', detail: `Votre ${missCo.join(', ')} manque.`, fix: 'company', fixLabel: 'Réglages' } : { key: 'mentions', label: 'Mentions obligatoires', state: 'ok', detail: 'Numéro, dates, SIRET, TVA, pénalités de retard.' });

  if (f.kind !== 'avoir') {
    const late = f.dueDate < f.issueDate;
    items.push(late ? { key: 'echeance', label: 'Échéance', state: 'bad', detail: 'L’échéance est avant la date d’émission.', fix: 'validity', fixLabel: 'Corriger' } : { key: 'echeance', label: 'Conditions de paiement', state: company.iban ? 'ok' : 'warn', detail: company.iban ? 'Échéance, IBAN et lien de paiement indiqués.' : 'Ajoutez votre IBAN pour le virement.', fix: company.iban ? undefined : 'company', fixLabel: 'Réglages' });
  }

  items.push(company.decennale ? { key: 'decennale', label: 'Assurance décennale', state: 'ok', detail: company.decennale } : { key: 'decennale', label: 'Assurance décennale', state: 'warn', detail: 'Recommandée sur les factures de travaux.', fix: 'company', fixLabel: 'Réglages' });

  if (pro) {
    const rest = missing.filter((m) => !/SIREN du client|Nom du client|Au moins une ligne|Désignation/.test(m));
    items.push(rest.length ? { key: 'efacture', label: 'Facture électronique', state: 'bad', detail: `Il manque : ${rest.join(', ')}.`, fix: 'company', fixLabel: 'Réglages' } : { key: 'efacture', label: 'Facture électronique', state: 'ok', detail: 'Conforme Factur-X, prête pour la plateforme agréée.' });
  }
  return items;
}
