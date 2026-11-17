/**
 * Jetons des liens publics : opaques, signés HMAC-SHA256, révocables, avec expiration.
 *
 * Format (43 caractères base64url) : id aléatoire 16 octets ‖ HMAC(secret, "brix-lien-v1|<type>|<id>") tronqué à 16 octets.
 * - Opaque : le jeton ne révèle ni l'entreprise, ni le document, ni le type.
 * - Signé : un jeton forgé est rejeté sans requête en base ; le type est lié à la signature
 *   (un lien de devis ne s'ouvre pas sur /f/).
 * - Révocable et expirant : l'id renvoie à documents_liens (revoque_le, expire_le).
 * - Non stocké : on le recalcule depuis l'id, donc une fuite de la base ne donne pas les liens
 *   sans le secret PUBLIC_LINK_SECRET. Changer ce secret invalide tous les liens.
 */
import type { EnvParcours } from './env';
import { ErreurParcours, JOUR_MS, aleatoire, b64url, deB64url, egalTempsConstant, hmacBrut } from './commun';

export type TypeDocument = 'devis' | 'facture' | 'chantier';
export const TYPES_DOCUMENT: TypeDocument[] = ['devis', 'facture', 'chantier'];

/** Durées par défaut (jours). */
export const DUREE_DEFAUT: Record<TypeDocument, number> = { devis: 90, facture: 400, chantier: 730 };
const PREFIXE_URL: Record<TypeDocument, string> = { devis: 'd', facture: 'f', chantier: 'p' };

export interface Lien {
  id: string;
  organization_id: string;
  type: TypeDocument;
  document_id: string;
  expire_le: number;
  revoque_le: number | null;
  cree_par: string | null;
  created_at: number;
}

/**
 * Secret des liens. Sans PUBLIC_LINK_SECRET (préproduction), on dérive une clé de JWT_SECRET :
 * les liens restent infalsifiables, mais changer JWT_SECRET les invaliderait. À configurer avant la mise en ligne.
 */
function secret(env: EnvParcours): string {
  if (env.PUBLIC_LINK_SECRET) return env.PUBLIC_LINK_SECRET;
  if (!env.JWT_SECRET) throw new ErreurParcours(503, 'configuration', 'Service momentanément indisponible.');
  return `derive-liens|${env.JWT_SECRET}`;
}

async function signer(env: EnvParcours, type: TypeDocument, id: Uint8Array): Promise<Uint8Array> {
  return (await hmacBrut(secret(env), `brix-lien-v1|${type}|${b64url(id)}`)).slice(0, 16);
}

export async function jetonDepuisId(env: EnvParcours, type: TypeDocument, id: string): Promise<string> {
  const brut = deB64url(id);
  const sig = await signer(env, type, brut);
  const tout = new Uint8Array(32);
  tout.set(brut, 0);
  tout.set(sig, 16);
  return b64url(tout);
}

export function urlPublique(env: EnvParcours, type: TypeDocument, jeton: string): string {
  const base = (env.PUBLIC_BASE_URL ?? env.APP_ORIGIN ?? 'https://brix-app.fr').replace(/\/+$/, '');
  // L'app utilise HashRouter : /#/d/<jeton>. Pour des liens sans « # », ajouter dans index.ts une
  // redirection /d/:jeton → /#/d/:jeton (voir docs/parcours/README.md).
  return `${base}/#/${PREFIXE_URL[type]}/${jeton}`;
}

export const urlApp = (env: EnvParcours, chemin: string) => `${(env.APP_ORIGIN ?? '').replace(/\/+$/, '')}/#/app/${chemin.replace(/^\/+/, '')}`;

export async function creerLien(
  env: EnvParcours,
  o: { organizationId: string; type: TypeDocument; documentId: string; expireJours?: number; creePar?: string },
): Promise<{ lien: Lien; jeton: string; url: string }> {
  const jours = Math.min(Math.max(Math.trunc(o.expireJours ?? DUREE_DEFAUT[o.type]), 1), 1095);
  const maintenant = Date.now();
  const lien: Lien = {
    id: b64url(aleatoire(16)),
    organization_id: o.organizationId,
    type: o.type,
    document_id: o.documentId,
    expire_le: maintenant + jours * JOUR_MS,
    revoque_le: null,
    cree_par: o.creePar ?? null,
    created_at: maintenant,
  };
  await env.DB.prepare(
    'INSERT INTO documents_liens (id, organization_id, type, document_id, expire_le, revoque_le, cree_par, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
  )
    .bind(lien.id, lien.organization_id, lien.type, lien.document_id, lien.expire_le, lien.cree_par, lien.created_at)
    .run();
  const jeton = await jetonDepuisId(env, o.type, lien.id);
  return { lien, jeton, url: urlPublique(env, o.type, jeton) };
}

const INVALIDE = () => new ErreurParcours(404, 'lien_invalide', "Ce lien n'est pas valide. Vérifiez qu'il est complet ou demandez-en un nouveau à votre artisan.");

/** Vérifie un jeton pour un type attendu. Lève 404 (invalide), 410 (expiré ou révoqué). */
export async function verifierJeton(env: EnvParcours, type: TypeDocument, jeton: string): Promise<Lien> {
  if (typeof jeton !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(jeton)) throw INVALIDE();
  const brut = deB64url(jeton);
  if (brut.length !== 32) throw INVALIDE();
  const id = brut.slice(0, 16);
  const attendu = b64url(await signer(env, type, id));
  if (!egalTempsConstant(attendu, b64url(brut.slice(16)))) throw INVALIDE();
  const lien = await env.DB.prepare('SELECT * FROM documents_liens WHERE id = ? AND type = ?').bind(b64url(id), type).first<Lien>();
  if (!lien) throw INVALIDE();
  if (lien.revoque_le) throw new ErreurParcours(410, 'lien_revoque', "Ce lien a été désactivé par l'entreprise. Demandez-lui le lien à jour.");
  if (lien.expire_le < Date.now()) throw new ErreurParcours(410, 'lien_expire', 'Ce lien a expiré. Demandez à votre artisan de vous le renvoyer.');
  return lien;
}

export async function revoquerLien(env: EnvParcours, organizationId: string, lienId: string): Promise<boolean> {
  const r = await env.DB.prepare('UPDATE documents_liens SET revoque_le = ? WHERE id = ? AND organization_id = ? AND revoque_le IS NULL')
    .bind(Date.now(), lienId, organizationId)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function listerLiens(env: EnvParcours, organizationId: string, type: TypeDocument, documentId: string) {
  const res = await env.DB.prepare('SELECT * FROM documents_liens WHERE organization_id = ? AND type = ? AND document_id = ? ORDER BY created_at DESC')
    .bind(organizationId, type, documentId)
    .all<Lien>();
  const out = [];
  for (const l of res.results ?? []) {
    const jeton = await jetonDepuisId(env, l.type, l.id);
    const actif = !l.revoque_le && l.expire_le > Date.now();
    out.push({ id: l.id, url: actif ? urlPublique(env, l.type, jeton) : null, expireLe: l.expire_le, revoqueLe: l.revoque_le, creeLe: l.created_at, actif });
  }
  return out;
}
