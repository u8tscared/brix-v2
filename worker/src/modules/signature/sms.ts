/**
 * Envoi de SMS (code de signature) : adaptateurs Brevo et Twilio, choisis par SMS_PROVIDER.
 * Sans configuration : SMS indisponible (le code part par e-mail).
 */
import type { EnvParcours } from '../documents/env';

export interface FournisseurSms {
  nom: 'brevo' | 'twilio';
  envoyer(env: EnvParcours, numero: string, texte: string): Promise<{ ok: boolean; id?: string }>;
}

/** Numéro français ou international → E.164 (+33…). null si illisible. */
export function numeroE164(brut: string | null | undefined): string | null {
  if (!brut) return null;
  let s = brut.replace(/[\s.()-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(s)) s = `+33${s.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

export const masquerNumero = (e164: string) => `${e164.slice(0, 3)} •• •• •• ${e164.slice(-2)}`;

const brevo: FournisseurSms = {
  nom: 'brevo',
  async envoyer(env, numero, texte) {
    // API Brevo « transactionalSMS » : le numéro sans « + », expéditeur alphanumérique de 11 caractères max.
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY ?? '', 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: (env.SMS_SENDER ?? 'Brix').slice(0, 11), recipient: numero.replace(/^\+/, ''), content: texte, type: 'transactional' }),
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json().catch(() => ({}))) as { messageId?: number | string };
    return { ok: true, id: j.messageId != null ? String(j.messageId) : undefined };
  },
};

const twilio: FournisseurSms = {
  nom: 'twilio',
  async envoyer(env, numero, texte) {
    const sid = env.TWILIO_ACCOUNT_SID ?? '';
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: { authorization: `Basic ${btoa(`${sid}:${env.TWILIO_AUTH_TOKEN ?? ''}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: numero, From: env.TWILIO_FROM ?? env.SMS_SENDER ?? '', Body: texte }),
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, id: j.sid };
  },
};

export function fournisseurSms(env: EnvParcours): FournisseurSms | null {
  if (env.SMS_PROVIDER === 'brevo' && env.BREVO_API_KEY) return brevo;
  if (env.SMS_PROVIDER === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM || env.SMS_SENDER)) return twilio;
  return null;
}
