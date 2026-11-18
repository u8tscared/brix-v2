// Événements de suivi reçus par webhook (Brevo, Resend), ramenés à un vocabulaire commun et enregistrés.

import type { Env } from '../../env';

export type TypeEvenement = 'envoye' | 'delivre' | 'ouvert' | 'clic' | 'differe' | 'rebond' | 'plainte' | 'bloque' | 'desinscrit' | 'autre';

export interface Evenement {
  fournisseur: 'brevo' | 'resend' | 'brix';
  messageId: string | null;
  type: TypeEvenement;
  typeBrut: string;
  email: string | null;
  modele: string | null;
  reference: string | null;
  survenuLe: string; // ISO
  brut: unknown;
}

const BREVO: Record<string, TypeEvenement> = {
  request: 'envoye',
  sent: 'envoye',
  delivered: 'delivre',
  opened: 'ouvert',
  unique_opened: 'ouvert',
  proxy_open: 'ouvert',
  unique_proxy_open: 'ouvert',
  click: 'clic',
  deferred: 'differe',
  soft_bounce: 'rebond',
  hard_bounce: 'rebond',
  invalid_email: 'rebond',
  spam: 'plainte',
  complaint: 'plainte',
  blocked: 'bloque',
  error: 'bloque',
  unsubscribed: 'desinscrit',
};

const RESEND: Record<string, TypeEvenement> = {
  'email.sent': 'envoye',
  'email.delivered': 'delivre',
  'email.delivery_delayed': 'differe',
  'email.opened': 'ouvert',
  'email.clicked': 'clic',
  'email.bounced': 'rebond',
  'email.complained': 'plainte',
  'email.failed': 'bloque',
};

const iso = (v: unknown): string => {
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v.slice(0, 320) : null);

/** Tags « cle:valeur » (Brevo, tableau) ou objet { cle: valeur } (Resend). */
function lireTags(tags: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (typeof t === 'string' && t.includes(':')) out[t.slice(0, t.indexOf(':'))] = t.slice(t.indexOf(':') + 1);
      else if (t && typeof t === 'object' && 'name' in t) out[String((t as { name: unknown }).name)] = String((t as { value?: unknown }).value ?? '');
    }
  } else if (tags && typeof tags === 'object') {
    for (const [k, v] of Object.entries(tags)) out[k] = String(v);
  }
  return out;
}

/** Brevo envoie un objet (ou un tableau en mode « batch »). */
export function depuisBrevo(corps: unknown): Evenement[] {
  const liste = Array.isArray(corps) ? corps : [corps];
  return liste
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as { event?: unknown }).event === 'string')
    .map((x) => {
      const tags = lireTags(x.tags ?? (x.tag ? [x.tag] : []));
      const brut = String(x.event);
      return {
        fournisseur: 'brevo' as const,
        messageId: str(x['message-id'] ?? x.messageId),
        type: BREVO[brut] ?? 'autre',
        typeBrut: brut,
        email: str(x.email),
        modele: tags.modele ?? null,
        reference: tags.doc ?? null,
        survenuLe: iso(x.ts_event ?? x.ts_epoch ?? x.date),
        brut: x,
      };
    });
}

export function depuisResend(corps: unknown): Evenement[] {
  if (!corps || typeof corps !== 'object') return [];
  const x = corps as { type?: unknown; created_at?: unknown; data?: Record<string, unknown> };
  if (typeof x.type !== 'string') return [];
  const data = x.data ?? {};
  const tags = lireTags(data.tags);
  const to = Array.isArray(data.to) ? data.to[0] : data.to;
  return [
    {
      fournisseur: 'resend',
      messageId: str(data.email_id),
      type: RESEND[x.type] ?? 'autre',
      typeBrut: x.type,
      email: str(to),
      modele: tags.modele ?? null,
      reference: tags.doc ?? null,
      survenuLe: iso(x.created_at ?? data.created_at),
      brut: corps,
    },
  ];
}

const RANG: Record<TypeEvenement, number> = { autre: 0, envoye: 1, differe: 2, delivre: 3, ouvert: 4, clic: 5, rebond: 6, bloque: 6, plainte: 7, desinscrit: 7 };
const RANG_SQL = `(CASE statut ${Object.entries(RANG)
  .map(([k, v]) => `WHEN '${k}' THEN ${v}`)
  .join(' ')} ELSE 0 END)`;

async function cleDe(ev: Evenement): Promise<string> {
  const s = `${ev.fournisseur}|${ev.messageId}|${ev.typeBrut}|${ev.email}|${ev.survenuLe}`;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

/** Enregistre les événements (rejeux ignorés) et met à jour le statut de l'envoi. Renvoie le nombre de nouveaux. */
export async function enregistrer(env: Env, evs: Evenement[]): Promise<number> {
  let n = 0;
  for (const ev of evs) {
    const cle = await cleDe(ev);
    const brut = JSON.stringify(ev.brut ?? null).slice(0, 8192);
    const r = await env.DB.prepare(
      'INSERT OR IGNORE INTO email_events (id, fournisseur, message_id, type, type_brut, email, modele, reference, survenu_le, cle, brut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(`evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, ev.fournisseur, ev.messageId, ev.type, ev.typeBrut, ev.email, ev.modele, ev.reference, ev.survenuLe, cle, brut)
      .run();
    const nouveau = (r.meta as { changes?: number } | undefined)?.changes !== 0;
    if (nouveau) n++;
    if (nouveau && ev.messageId && ev.type !== 'autre') {
      // Le statut ne recule jamais (un « délivré » reçu après un « ouvert » ne l'écrase pas).
      await env.DB.prepare(`UPDATE email_envois SET statut = ?, maj_le = ? WHERE message_id = ? AND ${RANG_SQL} <= ?`)
        .bind(ev.type, ev.survenuLe, ev.messageId, RANG[ev.type])
        .run();
    }
  }
  return n;
}
