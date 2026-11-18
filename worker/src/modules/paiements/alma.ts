/**
 * Adaptateur Alma (paiement en 3 fois). Désactivé sans ALMA_API_KEY.
 * À vérifier avec la documentation Alma au branchement réel (https://docs.almapay.com) :
 * format exact de l'IPN (appel GET ?pid=… sur ipn_callback_url) et états d'un paiement accepté.
 * Important : la clé Alma est celle d'un compte marchand. Pour que l'argent aille à l'artisan et non à Brix,
 * chaque artisan doit avoir son propre compte Alma (clé par entreprise) : voir docs/parcours/README.md.
 */
import type { EnvParcours } from '../documents/env';

const base = (env: EnvParcours) => (env.ALMA_BASE_URL ?? 'https://api.getalma.eu').replace(/\/+$/, '');

export interface PaiementAlma {
  id: string;
  url: string;
  state: string;
  purchase_amount: number;
  custom_data?: Record<string, string> | null;
}

async function alma<T>(env: EnvParcours, methode: 'GET' | 'POST', chemin: string, corps?: unknown): Promise<T> {
  const res = await fetch(`${base(env)}${chemin}`, {
    method: methode,
    headers: { authorization: `Alma-Auth ${env.ALMA_API_KEY}`, 'content-type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (!res.ok) throw new Error(`Alma ${res.status}`);
  return (await res.json()) as T;
}

export function creerPaiementAlma(
  env: EnvParcours,
  o: { montantCents: number; sessionId: string; retour: string; annulation: string; ipn: string; client: { email?: string | null; nom?: string | null } },
) {
  const [prenom, ...reste] = (o.client.nom ?? '').split(/\s+/);
  return alma<PaiementAlma>(env, 'POST', '/v1/payments', {
    payment: {
      purchase_amount: o.montantCents,
      installments_count: 3,
      return_url: o.retour,
      customer_cancel_url: o.annulation,
      ipn_callback_url: o.ipn,
      custom_data: { brix_session: o.sessionId },
      locale: 'fr',
    },
    customer: { email: o.client.email ?? undefined, first_name: prenom || undefined, last_name: reste.join(' ') || undefined },
  });
}

/** On ne fait jamais confiance au contenu de l'IPN : on relit le paiement chez Alma avec notre clé. */
export const lirePaiementAlma = (env: EnvParcours, id: string) => alma<PaiementAlma>(env, 'GET', `/v1/payments/${encodeURIComponent(id)}`);

export const ETATS_ALMA_PAYES = ['in_progress', 'paid'];
