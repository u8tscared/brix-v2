/**
 * Fournisseurs de signature, derrière une interface commune, choisis par SIGNATURE_PROVIDER :
 * - 'brix' (défaut) : signature électronique simple (eIDAS art. 25) réalisée sur la page publique,
 *   authentifiée par code à usage unique, avec dossier de preuve scellé par Brix ;
 * - 'yousign' : signature avancée ou qualifiée déléguée à Yousign (prestataire de confiance), API v3.
 *
 * Yousign, à vérifier au branchement réel (https://developers.yousign.com) :
 * - le PDF doit contenir l'ancre « {{s1|signature|180|60}} » à l'endroit de la signature (parse_anchors) ;
 * - en-tête du webhook : X-Yousign-Signature-256 = "sha256=" + HMAC-SHA256(secret, corps brut) en hexadécimal.
 */
import { egalTempsConstant, hmacHex } from '../documents/commun';
import type { EnvParcours } from '../documents/env';

export interface DemandeSignatureExterne {
  preuveId: string;
  titre: string;
  pdf: Uint8Array;
  signataire: { prenom: string; nom: string; email: string; telephone?: string | null };
}

export interface FournisseurSignature {
  nom: 'brix' | 'yousign';
  /** Faut-il rediriger le client vers le prestataire ? */
  externe: boolean;
  demarrer?(env: EnvParcours, d: DemandeSignatureExterne): Promise<{ reference: string; url: string }>;
  verifierWebhook?(env: EnvParcours, corps: string, entetes: Headers): Promise<boolean>;
  telechargerSigne?(env: EnvParcours, reference: string): Promise<Uint8Array>;
}

export const brix: FournisseurSignature = { nom: 'brix', externe: false };

const baseYousign = (env: EnvParcours) => (env.YOUSIGN_BASE_URL ?? 'https://api-sandbox.yousign.app/v3').replace(/\/+$/, '');

async function ys<T>(env: EnvParcours, methode: string, chemin: string, corps?: BodyInit, json = true): Promise<T> {
  const headers: Record<string, string> = { authorization: `Bearer ${env.YOUSIGN_API_KEY}` };
  // Corps texte : JSON. FormData : fetch pose lui-même l'en-tête multipart et sa frontière.
  if (typeof corps === 'string') headers['content-type'] = 'application/json';
  const res = await fetch(`${baseYousign(env)}${chemin}`, { method: methode, headers, body: corps });
  if (!res.ok) throw new Error(`Yousign ${res.status}`);
  return (json ? res.json() : res.arrayBuffer()) as Promise<T>;
}

export const yousign: FournisseurSignature = {
  nom: 'yousign',
  externe: true,
  async demarrer(env, d) {
    const sr = await ys<{ id: string }>(env, 'POST', '/signature_requests', JSON.stringify({ name: d.titre.slice(0, 120), delivery_mode: 'none', timezone: 'Europe/Paris', external_id: d.preuveId }));
    const form = new FormData();
    form.append('file', new Blob([d.pdf], { type: 'application/pdf' }), 'devis.pdf');
    form.append('nature', 'signable_document');
    form.append('parse_anchors', 'true');
    await ys(env, 'POST', `/signature_requests/${sr.id}/documents`, form);
    await ys(
      env,
      'POST',
      `/signature_requests/${sr.id}/signers`,
      JSON.stringify({
        info: { first_name: d.signataire.prenom || d.signataire.nom, last_name: d.signataire.nom, email: d.signataire.email, phone_number: d.signataire.telephone ?? undefined, locale: 'fr' },
        signature_level: env.YOUSIGN_SIGNATURE_LEVEL ?? 'electronic_signature',
        signature_authentication_mode: d.signataire.telephone ? 'otp_sms' : 'otp_email',
      }),
    );
    const act = await ys<{ signers?: { signature_link?: string }[] }>(env, 'POST', `/signature_requests/${sr.id}/activate`);
    const url = act.signers?.[0]?.signature_link;
    if (!url) throw new Error('Yousign : lien de signature absent');
    return { reference: sr.id, url };
  },
  async verifierWebhook(env, corps, entetes) {
    const recu = entetes.get('x-yousign-signature-256') ?? '';
    if (!env.YOUSIGN_WEBHOOK_SECRET || !recu.startsWith('sha256=')) return false;
    return egalTempsConstant(await hmacHex(env.YOUSIGN_WEBHOOK_SECRET, corps), recu.slice(7));
  },
  async telechargerSigne(env, reference) {
    return new Uint8Array(await ys<ArrayBuffer>(env, 'GET', `/signature_requests/${encodeURIComponent(reference)}/documents/download`, undefined, false));
  },
};

export function choisirFournisseur(env: EnvParcours): FournisseurSignature {
  return env.SIGNATURE_PROVIDER === 'yousign' && env.YOUSIGN_API_KEY ? yousign : brix;
}
