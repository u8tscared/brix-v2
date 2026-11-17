/**
 * Moyens de paiement proposés au client, selon les clés configurées et le compte de l'artisan.
 * - carte (Apple Pay / Google Pay inclus) : Stripe + compte Connect actif ; sans clé Stripe : simulation ;
 * - virement : Stripe (virement SEPA vers un IBAN dédié) ou, à défaut, RIB de l'artisan ;
 * - 3x : Alma, uniquement si ALMA_API_KEY est configurée.
 */
import type { EnvParcours } from '../documents/env';
import type { Complements } from '../documents/vues';
import { lireOrganisation } from '../documents/sources';

export interface CompteConnect {
  stripe_account_id: string | null;
  charges_actives: number;
}

export async function compteConnect(env: EnvParcours, orgId: string): Promise<CompteConnect | null> {
  return env.DB.prepare('SELECT stripe_account_id, charges_actives FROM paiements_comptes WHERE organization_id = ?').bind(orgId).first<CompteConnect>();
}

/** RIB de l'artisan : celui saisi sur le document, sinon celui des réglages de l'entreprise. */
export async function ribArtisan(env: EnvParcours, orgId: string, c: Complements) {
  const org = await lireOrganisation(env, orgId);
  const iban = c.iban ?? (typeof org.reglages.iban === 'string' ? org.reglages.iban.replace(/\s+/g, '') : null);
  if (!iban) return null;
  return { iban, bic: c.bic ?? (typeof org.reglages.bic === 'string' ? org.reglages.bic : null), titulaire: c.titulaire ?? org.raisonSociale ?? org.nom };
}

export async function moyensDisponibles(env: EnvParcours, orgId: string, resteCents: number, c: Complements) {
  const aPayer = resteCents > 0;
  const stripe = !!env.STRIPE_SECRET_KEY;
  const compte = stripe ? await compteConnect(env, orgId) : null;
  const carteActive = stripe ? !!compte?.stripe_account_id && !!compte.charges_actives : true;
  const rib = await ribArtisan(env, orgId, c);
  return {
    carte: { disponible: aPayer && carteActive, simulation: !stripe },
    virement: { disponible: aPayer && ((stripe && carteActive) || !!rib), mode: stripe && carteActive ? ('stripe' as const) : ('rib' as const) },
    troisFois: { disponible: aPayer && !!env.ALMA_API_KEY },
  };
}
