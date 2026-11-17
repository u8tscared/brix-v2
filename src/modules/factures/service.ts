// Services du module Factures. En preview, tout est simulé (délais et réponses réalistes).
// Pour brancher le vrai backend, remplacer le corps de chaque fonction par un appel au worker :
//   transmitToPlatform  → POST /api/invoicing/factures/:id/einvoice   (worker/src/modules/invoicing/einvoicing/submit.ts, SuperPDP / Invopop)
//   lookupDirectory     → GET  /api/invoicing/annuaire?siren=…         (annuaire PPF via la plateforme agréée)
//   createPaymentLink   → POST /api/invoicing/factures/:id/payment-link (stripe-payment-link.ts)
//   sendInvoice         → POST /api/invoicing/factures/:id/send          (Brevo)
//   sendReminder        → POST /api/invoicing/factures/:id/remind        (Brevo mail / SMS)
//   draftReminder       → POST /api/bob/draft                            (IA)

import { money } from '@/lib/format';
import type { Client, Company, EInvoiceStatus, Facture } from '@/lib/types';
import { amounts, daysLate, type PaymentMethod } from './lib/model';
import type { RelanceTone } from './store';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const PLATFORMS = {
  superpdp: { name: 'SuperPDP', note: 'Plateforme agréée par la DGFiP, partenaire de Brix. Incluse dans votre offre.' },
  invopop: { name: 'Invopop', note: 'Plateforme agréée européenne, utile si vous facturez hors de France.' },
} as const;

/** Étapes du cycle de vie qu'une facture traverse après dépôt (simulation). */
export const LIFECYCLE: EInvoiceStatus[] = ['deposee', 'emise', 'recue', 'mise_a_disposition', 'prise_en_charge', 'approuvee', 'paiement_transmis', 'encaissee'];

/**
 * Dépose la facture sur la plateforme agréée puis suit les premiers statuts.
 * `onStatus` est appelé à chaque nouveau statut reçu.
 */
export async function transmitToPlatform(_f: Facture, onStatus: (s: EInvoiceStatus, note?: string) => void) {
  await wait(900);
  onStatus('deposee', 'Format Factur-X contrôlé : conforme EN 16931');
  await wait(1200);
  onStatus('emise', 'Transmise à la plateforme du client');
  await wait(1400);
  onStatus('recue', 'Reçue par la plateforme du client');
  await wait(1500);
  onStatus('mise_a_disposition', 'Le client peut la consulter');
}

export interface DirectoryResult {
  siren: string;
  name: string;
  city: string;
  reachable: boolean;
  platform?: string;
  address?: string;
}

const DIRECTORY: Record<string, Omit<DirectoryResult, 'siren'>> = {
  '501234567': { name: 'BOULANGERIE MARTIN', city: 'Villeurbanne', reachable: true, platform: 'Pennylane', address: '501234567_FACTURES' },
  '789456123': { name: 'SCI LES TILLEULS', city: 'Lyon', reachable: true, platform: 'Docoon', address: '789456123' },
  '832111456': { name: 'CABINET DR NGUYEN', city: 'Lyon', reachable: true, platform: 'Libeo', address: '832111456' },
  '552081317': { name: 'ELECTRICITE DE FRANCE', city: 'Paris', reachable: true, platform: 'Generix', address: '552081317_AP' },
  '542065479': { name: 'REXEL FRANCE', city: 'Paris', reachable: true, platform: 'Esker', address: '542065479' },
};

/** Recherche un SIREN dans l'annuaire de la facturation électronique. */
export async function lookupDirectory(raw: string): Promise<DirectoryResult | null> {
  const siren = raw.replace(/\D/g, '').slice(0, 9);
  await wait(700 + Math.random() * 500);
  if (siren.length !== 9) return null;
  const hit = DIRECTORY[siren];
  if (hit) return { siren, ...hit };
  // Toute entreprise française a une adresse depuis le 1er septembre 2026 ; quelques-unes n'ont pas encore choisi.
  const n = Number(siren.slice(-2));
  return { siren, name: `ENTREPRISE ${siren.slice(0, 3)} ${siren.slice(3, 6)}`, city: 'France', reachable: n % 5 !== 0, platform: n % 5 !== 0 ? ['Pennylane', 'Sage', 'Cegid', 'Qonto'][n % 4] : undefined, address: n % 5 !== 0 ? siren : undefined };
}

export const METHOD_FEES: Record<string, { label: string; fee: (amount: number) => number; text: string }> = {
  carte: { label: 'Carte bancaire', fee: (a) => a * 0.015 + 0.25, text: '1,5 % + 0,25 €' },
  apple_pay: { label: 'Apple Pay / Google Pay', fee: (a) => a * 0.015 + 0.25, text: '1,5 % + 0,25 €' },
  instantane: { label: 'Virement instantané', fee: () => 0.5, text: '0,50 € par paiement' },
  x3: { label: 'Paiement en 3 fois', fee: (a) => a * 0.029, text: '2,9 %' },
  x4: { label: 'Paiement en 4 fois', fee: (a) => a * 0.039, text: '3,9 %' },
  tap: { label: 'Carte sur téléphone', fee: (a) => a * 0.012 + 0.1, text: '1,2 % + 0,10 €' },
  virement: { label: 'Virement classique', fee: () => 0, text: 'Gratuit' },
};

export const feeFor = (method: PaymentMethod | string, amount: number) => Math.round((METHOD_FEES[method]?.fee(amount) ?? 0) * 100) / 100;

/** Crée un lien de paiement (Stripe en production). */
export async function createPaymentLink(f: Facture, methods: PaymentMethod[]) {
  await wait(900);
  const code = Math.random().toString(36).slice(2, 8);
  return { url: `https://pay.brix.fr/f/${code}`, createdAt: new Date().toISOString().slice(0, 10), methods, amount: amounts(f).remaining };
}

/** Envoie la facture par e-mail au client (avec le lien de paiement s'il existe). */
export async function sendInvoice(_f: Facture, to: string) {
  await wait(1000);
  return { ok: true, to };
}

/** Envoie une relance (mail, SMS ou courrier recommandé préparé). */
export async function sendReminder(_f: Facture, channel: 'email' | 'sms' | 'courrier') {
  await wait(channel === 'courrier' ? 1200 : 800);
  return { ok: true, channel };
}

const civ = (c?: Client) => {
  if (!c) return 'Bonjour';
  if (c.kind === 'pro') return `Bonjour ${c.contact ?? ''}`.trim();
  return `Bonjour ${c.name.split(' ')[0]}`;
};

/**
 * Bob rédige une relance dans le ton de l'artisan.
 * Niveau 1 : mail courtois. Niveau 2 : SMS court. Niveau 3 : mise en demeure.
 */
export async function draftReminder(f: Facture, client: Client | undefined, company: Company, level: 1 | 2 | 3, tone: RelanceTone = 'cordial', userFirstName = 'Karim') {
  await wait(650);
  return reminderText(f, client, company, level, tone, userFirstName);
}

export function reminderText(f: Facture, client: Client | undefined, company: Company, level: 1 | 2 | 3, tone: RelanceTone = 'cordial', userFirstName = 'Karim') {
  const a = amounts(f);
  const late = daysLate(f);
  const due = new Date(f.dueDate + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const sum = money(a.remaining);
  const hello = civ(client);
  if (level === 2) {
    if (tone === 'ferme') return `${company.name} : la facture ${f.number} (${sum}) est impayée depuis ${late} jours. Merci de la régler sous 48 h : lien de paiement ci-joint. ${userFirstName}`;
    if (tone === 'direct') return `${hello}, la facture ${f.number} de ${sum} attend toujours son règlement. Vous pouvez payer ici en 1 minute : [lien]. Merci ! ${userFirstName}, ${company.name}`;
    return `${hello}, c'est ${userFirstName} de ${company.name}. Petit rappel pour la facture ${f.number} (${sum}) : vous pouvez la régler ici par carte ou virement : [lien]. Bonne journée !`;
  }
  if (level === 3) {
    return `Objet : mise en demeure de payer, facture ${f.number}

${client?.kind === 'pro' ? 'Madame, Monsieur' : `${client?.name ?? 'Madame, Monsieur'}`},

Malgré nos relances, la facture ${f.number} du ${new Date(f.issueDate + 'T12:00').toLocaleDateString('fr-FR')} d'un montant de ${sum}, échue le ${due}, reste impayée à ce jour.

Nous vous mettons en demeure de régler cette somme sous 8 jours à réception de ce courrier. À défaut, nous engagerons une procédure de recouvrement (injonction de payer), sans autre avis.

${client?.kind === 'pro' ? 'Conformément à l’article L. 441-10 du code de commerce, des pénalités de retard et une indemnité forfaitaire de 40 € pour frais de recouvrement sont dues.' : 'Des intérêts de retard au taux légal courent à compter de la présente mise en demeure.'}

Règlement par virement : ${company.iban}

${userFirstName}, ${company.name}`;
  }
  // Niveau 1 : mail
  const intro =
    tone === 'ferme'
      ? `Sauf erreur de notre part, la facture ${f.number} de ${sum}, échue le ${due}, n'est toujours pas réglée.`
      : tone === 'direct'
        ? `La facture ${f.number} de ${sum} est arrivée à échéance le ${due} et je n'ai pas encore reçu le règlement.`
        : `J'espère que tout va bien${f.chantierId ? ' depuis les travaux' : ''}. Je me permets un petit rappel : la facture ${f.number} de ${sum} est arrivée à échéance le ${due}.`;
  const outro =
    tone === 'ferme'
      ? 'Merci de procéder au paiement sous 8 jours.'
      : tone === 'direct'
        ? "Vous pouvez la régler en une minute avec le lien ci-dessous (carte, virement instantané ou en 3 fois)."
        : "C'est sûrement un simple oubli : vous pouvez la régler en une minute avec le lien ci-dessous, par carte, virement instantané ou en 3 fois sans frais pour vous.";
  return `${hello},

${intro}
${outro}

[Payer ${sum}]

Si le paiement est déjà parti, ne tenez pas compte de ce message.

Bonne journée,
${userFirstName}
${company.name} · ${company.phone}`;
}
