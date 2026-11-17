// Envoi d'un e-mail transactionnel depuis le worker. PROVISOIRE : contrat seulement.
import type { Env } from '../../env';
import type { DonneesEmail, ModeleEmail } from '../../../../src/emails/types';
import { rendreEmail } from '../../../../src/emails/index';

export interface EnvoiEmail<M extends ModeleEmail = ModeleEmail> {
  modele: M;
  donnees: DonneesEmail[M];
  a: string; // adresse du destinataire
  nomA?: string;
  repondreA?: string; // adresse de l'artisan, pour que le client réponde directement
  deNom?: string; // « Karim Benali · Benali Électricité »
}

export async function envoyerEmail<M extends ModeleEmail>(env: Env, e: EnvoiEmail<M>): Promise<{ id: string; simule: boolean }> {
  const r = rendreEmail(e.modele, e.donnees);
  void env;
  console.log('[email simulé]', e.a, r.sujet);
  return { id: `sim_${Date.now()}`, simule: true };
}
