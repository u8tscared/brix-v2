// Services du module Devis. En preview tout est simulé (délais et réponses réalistes).
// Pour brancher le vrai backend, remplacer le corps de chaque fonction par l'appel indiqué.

import type { Client, Devis } from '@/lib/types';
import type { Channel, VariantKey } from './store';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * 250));

export const IS_DEMO_SERVICE = true;

export interface SendOptions {
  channel: Channel;
  to: string;
  message: string;
  variants: VariantKey[];
  payment: { card: boolean; transfer: boolean; split3: boolean };
}

/** Envoi pour signature électronique. Brancher : POST /api/devis/:id/send (worker invoicing, Brevo + lien de signature). */
export async function sendForSignature(devis: Devis, opts: SendOptions): Promise<{ link: string; sentAt: string }> {
  await wait(900);
  void opts;
  return { link: `https://app.brix.fr/s/${devis.number.toLowerCase()}`, sentAt: new Date().toISOString() };
}

/** Relance du client. Brancher : POST /api/devis/:id/remind (e-mail ou SMS selon le canal). */
export async function remindClient(devis: Devis, client: Client | undefined, channel: Channel): Promise<{ ok: true; to: string }> {
  await wait(600);
  void devis;
  return { ok: true, to: channel === 'email' ? client?.email ?? '' : client?.phone ?? '' };
}

/** Lien de paiement de l'acompte (carte, virement, 3 fois). Brancher : Stripe Payment Link via /api/payments/link. */
export async function createDepositLink(devis: Devis, amount: number): Promise<{ url: string }> {
  await wait(300);
  return { url: `https://pay.brix.fr/${devis.number.toLowerCase()}?m=${Math.round(amount * 100)}` };
}

/** Question libre à Bob. Brancher : POST /api/bob/devis (Claude avec le contexte du devis). */
export async function askBob(): Promise<void> {
  await wait(650);
}

/** Simulations de la démo : évènements client (ouverture, signature). En réel : webhooks du portail client. */
export async function simulateClientEvent(): Promise<void> {
  await wait(500);
}
