/**
 * Codes à usage unique pour signer : 6 chiffres, haché (HMAC) en base, valable 10 minutes, 5 essais au maximum.
 * Limitation : 3 envois par lien et par quart d'heure, 10 par IP et par heure.
 */
import { ErreurParcours, cleIp, egalTempsConstant, hmacHex, ipDe, limiter, nouvelId } from '../documents/commun';
import { envoyerSansEchec } from '../documents/emails';
import type { EnvParcours } from '../documents/env';
import { lienPublic } from '../documents/handlers';
import type { Lien } from '../documents/jetons';
import { emetteurDe, journaliser } from '../documents/sources';
import { construireVueDevis } from '../documents/vues';
import { civiliteDe } from '../documents/emails';
import { fournisseurSms, masquerNumero, numeroE164 } from './sms';

export const DUREE_CODE_MS = 10 * 60_000;
export const ESSAIS_MAX = 5;

export interface CodeRow {
  id: string;
  lien_id: string;
  code_hash: string;
  canal: 'email' | 'sms';
  destinataire: string;
  expire_le: number;
  essais: number;
  utilise_le: number | null;
  created_at: number;
}

const secretCodes = (env: EnvParcours) => env.PUBLIC_LINK_SECRET ?? `derive-codes|${env.JWT_SECRET}`;
const hacher = (env: EnvParcours, id: string, code: string) => hmacHex(secretCodes(env), `brix-code-v1|${id}|${code}`);

/** Tirage uniforme de 000000 à 999999 (rejet des valeurs qui biaiseraient le modulo). */
function tirerCode(): string {
  const buf = new Uint32Array(1);
  const limite = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limite);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}

export const masquerEmail = (e: string) => {
  const [u, d] = e.split('@');
  return `${u.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(u.length - 1, 6)))}@${d}`;
};

export async function envoyerCode(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  await limiter(env, `code:${lien.id}`, 3, 15 * 60_000);
  await limiter(env, await cleIp('code', ipDe(request)), 10, 3_600_000);
  const { vue, interne } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut !== 'a_signer') throw new ErreurParcours(409, `deja_${vue.statut}`, vue.statut === 'expire' ? 'Ce devis a expiré. Demandez une nouvelle proposition à votre artisan.' : 'Ce devis ne peut plus être signé.');

  const client = interne.client;
  const sms = fournisseurSms(env);
  const numero = numeroE164(client?.phone);
  const canal: 'email' | 'sms' = body.canal === 'sms' && sms && numero ? 'sms' : 'email';
  const destinataire = canal === 'sms' ? numero! : client?.email?.trim().toLowerCase();
  if (!destinataire) throw new ErreurParcours(409, 'contact_manquant', "Aucune adresse e-mail n'est enregistrée pour vous. Contactez votre artisan pour signer.");

  const maintenant = Date.now();
  // Un nouveau code annule le précédent.
  await env.DB.prepare('UPDATE signature_codes SET expire_le = ? WHERE lien_id = ? AND utilise_le IS NULL AND expire_le > ?').bind(maintenant, lien.id, maintenant).run();
  const id = nouvelId('cod');
  const code = tirerCode();
  await env.DB.prepare(
    'INSERT INTO signature_codes (id, lien_id, organization_id, devis_id, code_hash, canal, destinataire, expire_le, essais, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
  )
    .bind(id, lien.id, lien.organization_id, lien.document_id, await hacher(env, id, code), canal, destinataire, maintenant + DUREE_CODE_MS, maintenant)
    .run();

  let simule = false;
  if (canal === 'sms') {
    const r = await sms!.envoyer(env, destinataire, `${code} est votre code pour signer le devis ${vue.numero} de ${vue.entreprise.nom}. Valable 10 minutes. Ne le communiquez à personne.`);
    if (!r.ok) throw new ErreurParcours(502, 'envoi_impossible', "Le SMS n'a pas pu partir. Réessayez ou choisissez l'e-mail.");
  } else {
    const r = await envoyerSansEchec(env, lien.organization_id, 'code_signature', { emetteur: await emetteurDe(env, lien.organization_id), civilite: civiliteDe(client), code, numero: vue.numero, minutes: 10 }, destinataire, { nomA: client?.name });
    if (!r) throw new ErreurParcours(502, 'envoi_impossible', "L'e-mail n'a pas pu partir. Réessayez dans un instant.");
    simule = r.simule;
  }
  const masque = canal === 'sms' ? masquerNumero(destinataire) : masquerEmail(destinataire);
  await journaliser(env, lien.organization_id, 'devis', lien.document_id, 'code_envoye', { canal, destinataire: masque });
  return {
    ok: true,
    canal,
    destinataire: masque,
    expireLe: maintenant + DUREE_CODE_MS,
    smsPossible: !!(sms && numero),
    // Démo seulement (PARCOURS_DEMO=1 et e-mail simulé) : sans fournisseur d'e-mail, personne ne recevrait le code.
    ...(simule && env.PARCOURS_DEMO === '1' ? { codeDemo: code } : {}),
  };
}

/**
 * Vérifie le code du dernier envoi pour ce lien et le consomme. L'essai est compté AVANT la comparaison
 * (pas de course entre deux requêtes simultanées) ; au 5e échec le code est inutilisable.
 */
export async function verifierEtConsommerCode(env: EnvParcours, lien: Lien, code: string): Promise<CodeRow> {
  const c = await env.DB.prepare('SELECT * FROM signature_codes WHERE lien_id = ? AND utilise_le IS NULL ORDER BY created_at DESC LIMIT 1').bind(lien.id).first<CodeRow>();
  if (!c) throw new ErreurParcours(400, 'code_absent', 'Demandez d’abord un code de signature.');
  if (c.expire_le < Date.now()) throw new ErreurParcours(400, 'code_expire', 'Ce code a expiré. Demandez-en un nouveau.');
  const essai = await env.DB.prepare('UPDATE signature_codes SET essais = essais + 1 WHERE id = ? AND essais < ? RETURNING essais').bind(c.id, ESSAIS_MAX).first<{ essais: number }>();
  if (!essai) throw new ErreurParcours(429, 'code_bloque', 'Trop d’essais. Demandez un nouveau code.');
  if (!egalTempsConstant(await hacher(env, c.id, code), c.code_hash)) {
    const restants = ESSAIS_MAX - essai.essais;
    throw new ErreurParcours(400, restants > 0 ? 'code_incorrect' : 'code_bloque', restants > 0 ? `Code incorrect. Il vous reste ${restants} essai${restants > 1 ? 's' : ''}.` : 'Trop d’essais. Demandez un nouveau code.', {
      essaisRestants: restants,
    });
  }
  const maintenant = Date.now();
  const r = await env.DB.prepare('UPDATE signature_codes SET utilise_le = ? WHERE id = ? AND utilise_le IS NULL').bind(maintenant, c.id).run();
  if ((r.meta?.changes ?? 0) !== 1) throw new ErreurParcours(409, 'code_utilise', 'Ce code a déjà servi.');
  return { ...c, essais: essai.essais, utilise_le: maintenant };
}
