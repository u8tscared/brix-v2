// Point d'appel UNIQUE pour envoyer un devis au client.
// Aujourd'hui : envoi simulé (service.ts). Demain : rebrancher ici `envoyerDevis()` de `src/emails/`
// (e-mail avec lien de signature), sans rien toucher d'autre dans l'interface.


import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { envoyerDevis } from '@/parcours/signature';
import { sendForSignature, type SendOptions } from './service';
import { useDevisMeta, type Channel } from './store';

export interface SendDevisInput {
  channel: Channel;
  to: string;
  subject?: string;
  message: string;
}

export interface SendDevisResult {
  link: string;
  sentAt: string;
}

const channelLabel = (c: Channel) => (c === 'email' ? 'e-mail' : c === 'sms' ? 'SMS' : 'WhatsApp');

/** Envoie le devis, le passe à « Envoyé » et l'inscrit dans l'historique. */
export async function sendDevis(devisId: string, input: SendDevisInput): Promise<SendDevisResult> {
  const d = useBrix.getState().devis.find((x) => x.id === devisId);
  if (!d) throw new Error('Devis introuvable');
  const meta = useDevisMeta.getState().meta[devisId];
  const variants = meta ? (Object.keys(meta.variants) as SendOptions['variants']).filter((k) => meta.variants[k]) : (['confort'] as SendOptions['variants']);
  const payment = meta?.payment ?? { card: true, transfer: true, split3: true };

  // ── À rebrancher : `await envoyerDevis({ devis: d, to: input.to, subject, message, pdf })` ──
  const res = await sendForSignature(d, { channel: input.channel, to: input.to, message: input.message, variants, payment });
  // Parcours client réel : e-mail dans la boîte de démo (#/boite) et lien public de signature (#/d/<id>).
  const envoi = envoyerDevis(devisId, { a: input.to, message: input.message, canal: input.channel });
  if (envoi?.lien) res.link = envoi.lien;

  const cur = useBrix.getState().devis.find((x) => x.id === devisId) ?? d;
  const status: Devis['status'] = cur.status === 'brouillon' || cur.status === 'refuse' || cur.status === 'expire' ? 'envoye' : cur.status;
  useBrix.getState().upsertDevis({ ...cur, status, sentAt: res.sentAt });
  const client = useBrix.getState().clients.find((c) => c.id === cur.clientId);
  useDevisMeta.getState().patch(devisId, { channel: input.channel });
  useDevisMeta.getState().log(devisId, `Envoyé à ${client?.name ?? 'le client'} par ${channelLabel(input.channel)} (${input.to})`, 'me');
  return res;
}
