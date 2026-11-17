/**
 * Préparation des données d'e-mails (contrat src/emails/types.ts) et envoi via envoyerEmail
 * (worker/src/modules/emails/envoi.ts). Un échec d'e-mail ne fait jamais échouer le parcours :
 * il est journalisé et l'action du client reste acquise.
 */
import type { DonneesDocument, DonneesEmail, ModeleEmail } from '../../../../src/emails/types';
import { envoyerEmail } from '../emails/envoi';
import type { EnvParcours } from './env';
import type { ClientRow } from './sources';
import { emetteurDe, lireOrganisation } from './sources';

export function civiliteDe(client: ClientRow | null): string {
  if (!client) return '';
  if (client.kind === 'pro') return client.contact?.trim() || client.name;
  return client.name.trim().split(/\s+/)[0] ?? client.name;
}

export async function donneesDocument(
  env: EnvParcours,
  orgId: string,
  o: {
    client: ClientRow | null;
    numero: string;
    titre: string;
    montantTtc: number;
    lien: string;
    lignes?: { designation: string; totalHt: number; tva: number; type: string }[];
    echeance?: number | null;
    acomptePourcent?: number;
    acompteMontant?: number;
    message?: string | null;
  },
): Promise<DonneesDocument> {
  const lignes = (o.lignes ?? [])
    .filter((l) => l.type !== 'section' && l.type !== 'texte')
    .sort((a, b) => b.totalHt - a.totalHt)
    .slice(0, 5)
    .map((l) => ({ libelle: l.designation, montant: Math.round(l.totalHt * (1 + l.tva / 100) * 100) / 100 }));
  return {
    emetteur: await emetteurDe(env, orgId),
    destinataire: o.client?.name ?? '',
    civilite: civiliteDe(o.client),
    numero: o.numero,
    titre: o.titre,
    montantTtc: o.montantTtc,
    lien: o.lien,
    message: o.message ?? undefined,
    lignes: lignes.length ? lignes : undefined,
    echeance: o.echeance ? new Date(o.echeance).toISOString() : undefined,
    acomptePourcent: o.acomptePourcent,
    acompteMontant: o.acompteMontant,
  };
}

/** Envoie sans jamais lever : renvoie null en cas d'échec. */
export async function envoyerSansEchec<M extends ModeleEmail>(
  env: EnvParcours,
  orgId: string,
  modele: M,
  donnees: DonneesEmail[M],
  a: string | null | undefined,
  o: { nomA?: string; versArtisan?: boolean } = {},
): Promise<{ id: string; simule: boolean } | null> {
  if (!a) return null;
  try {
    const org = await lireOrganisation(env, orgId);
    const e = await emetteurDe(env, orgId);
    return await envoyerEmail(env, {
      modele,
      donnees,
      a,
      nomA: o.nomA,
      // Le client répond directement à l'artisan ; l'artisan, lui, reçoit des e-mails de Brix.
      repondreA: o.versArtisan ? undefined : (org.email ?? undefined),
      deNom: o.versArtisan ? 'Brix' : [`${e.prenom} ${e.nom}`.trim(), org.nom].filter(Boolean).join(' · '),
    });
  } catch (err) {
    console.error('[parcours] e-mail', modele, err);
    return null;
  }
}
