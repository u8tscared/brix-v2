/**
 * Signature d'un devis : vérification, dossier de preuve, passage en « signé », copies, e-mails, notification.
 * Fournisseur 'brix' : signature sur la page publique. Fournisseur 'yousign' : redirection + webhook.
 */
import { ErreurParcours, JOUR_MS, cleIp, ipDe, ipTronquee, isoMs, limiter, nouvelId, sha256Hex, texte, texteOptionnel, uaDe } from '../documents/commun';
import { donneesDocument, envoyerSansEchec } from '../documents/emails';
import type { EnvParcours } from '../documents/env';
import { clePdf, lienPublic } from '../documents/handlers';
import { jetonDepuisId, urlApp, urlPublique, type Lien } from '../documents/jetons';
import { emailArtisan, journaliser } from '../documents/sources';
import { construireVueDevis, documentCanonique, empreinte } from '../documents/vues';
import { notifier } from '../notifications/notifier';
import { verifierEtConsommerCode, type CodeRow } from './codes';
import { choisirFournisseur, yousign } from './fournisseurs';
import { certificatHtml, clesR2, construireDossier, sceller, type DonneesPreuve } from './preuve';

const IMAGE_MAX = 400_000; // octets décodés

/** Image de signature : PNG en data URL uniquement (dessinée ou tapée puis rendue côté client). */
function validerImage(v: unknown): Uint8Array {
  if (typeof v !== 'string' || !v.startsWith('data:image/png;base64,')) throw new ErreurParcours(400, 'signature_invalide', 'Signature manquante : dessinez ou tapez votre nom.');
  const b64 = v.slice('data:image/png;base64,'.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length > Math.ceil((IMAGE_MAX * 4) / 3) + 4) throw new ErreurParcours(400, 'signature_invalide', 'Image de signature invalide ou trop lourde.');
  const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (octets.length < 60 || png.some((b, i) => octets[i] !== b)) throw new ErreurParcours(400, 'signature_invalide', 'Image de signature invalide.');
  return octets;
}

interface Finalisation {
  lien: Lien;
  signataire: string;
  formule: string;
  varianteId: string;
  consentements: { bonPourAccord: boolean; cgv: boolean; demarrageAnticipe: boolean };
  image: Uint8Array | null;
  code: CodeRow | null;
  methode: 'code_email' | 'code_sms' | 'yousign_otp';
  ip: string;
  ua: string;
  preuveId?: string; // fourni par le flux Yousign (preuve « en_attente »)
  fournisseur: { nom: 'brix' | 'yousign'; reference: string | null };
  pdfSigne?: Uint8Array | null;
}

/** Cœur commun aux deux fournisseurs. */
async function finaliser(env: EnvParcours, f: Finalisation) {
  const { lien } = f;
  const { vue, interne } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut === 'signe') throw new ErreurParcours(409, 'deja_signe', 'Ce devis est déjà signé.');
  const canonique = documentCanonique(vue, f.varianteId);
  const { json, sha256 } = await empreinte(canonique);
  const signeLe = Date.now();
  const preuveId = f.preuveId ?? nouvelId('prv');
  const retractation = vue.retractation.applicable;
  const retractationFin = retractation ? signeLe + 14 * JOUR_MS : null;
  const cles = clesR2(lien.organization_id, lien.document_id, preuveId);
  const ouvertures =
    (
      await env.DB.prepare('SELECT ouvert_le, ip_tronquee FROM documents_ouvertures WHERE organization_id = ? AND type = ? AND document_id = ? ORDER BY ouvert_le LIMIT 200')
        .bind(lien.organization_id, 'devis', lien.document_id)
        .all<{ ouvert_le: number; ip_tronquee: string | null }>()
    ).results ?? [];

  const donnees: DonneesPreuve = {
    preuveId,
    devisId: lien.document_id,
    organizationId: lien.organization_id,
    document: canonique,
    documentJson: json,
    empreinte: sha256,
    signataire: { nom: f.signataire, contact: f.code?.destinataire ?? interne.client?.email ?? null },
    formule: f.formule,
    authentification: { methode: f.methode, canal: f.code?.canal ?? null, destinataire: f.code?.destinataire ?? null, codeEnvoyeLe: f.code?.created_at ?? null, codeVerifieLe: f.code?.utilise_le ?? null, essais: f.code?.essais ?? null },
    consentements: f.consentements,
    textesAffiches: vue.mentions,
    contexte: { ip: f.ip, userAgent: f.ua, lienId: lien.id },
    signeLe,
    retractation: { applicable: retractation, fin: retractationFin },
    image: { cle: f.image ? cles.image : null, sha256: f.image ? await sha256Hex(f.image) : null },
    fournisseur: f.fournisseur,
    ouvertures: ouvertures.map((o) => ({ le: o.ouvert_le, ip: o.ip_tronquee })),
  };
  const dossier = construireDossier(donnees);
  const scelle = await sceller(env, dossier);
  const dataUrl = f.image ? `data:image/png;base64,${btoa(String.fromCharCode(...f.image))}` : null;

  if (env.FILES) {
    if (f.image) await env.FILES.put(cles.image, f.image, { httpMetadata: { contentType: 'image/png' } });
    await env.FILES.put(cles.dossier, JSON.stringify({ ...dossier, scellement: scelle }, null, 2), { httpMetadata: { contentType: 'application/json' } });
    await env.FILES.put(cles.certificat, certificatHtml(donnees, scelle, dataUrl), { httpMetadata: { contentType: 'text/html; charset=utf-8' } });
    if (f.pdfSigne) await env.FILES.put(cles.pdf, f.pdfSigne, { httpMetadata: { contentType: 'application/pdf' } });
  }

  const champs: Record<string, unknown> = {
    organization_id: lien.organization_id,
    devis_id: lien.document_id,
    lien_id: lien.id,
    statut: 'signe',
    fournisseur: f.fournisseur.nom,
    fournisseur_ref: f.fournisseur.reference,
    methode_auth: f.methode,
    code_id: f.code?.id ?? null,
    signataire_nom: f.signataire,
    signataire_contact: donnees.signataire.contact,
    formule: f.formule,
    variante_id: f.varianteId,
    version_document: vue.version,
    mentions: JSON.stringify({ consentements: f.consentements, textes: vue.mentions }),
    hors_etablissement: retractation ? 1 : 0,
    retractation_fin: retractationFin,
    demarrage_anticipe: f.consentements.demarrageAnticipe ? 1 : 0,
    empreinte_sha256: sha256,
    document_canonique: json,
    dossier_sha256: scelle.dossierSha256,
    sceau: scelle.sceau,
    ip: f.ip,
    user_agent: f.ua,
    signe_le: signeLe,
    cle_dossier: env.FILES ? cles.dossier : null,
    cle_certificat: env.FILES ? cles.certificat : null,
    cle_image: f.image && env.FILES ? cles.image : null,
    cle_pdf_signe: f.pdfSigne && env.FILES ? cles.pdf : null,
  };
  const cols = Object.keys(champs);
  const enregistrer = f.preuveId
    ? env.DB.prepare(`UPDATE signature_preuves SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND statut = 'en_attente'`).bind(...Object.values(champs), preuveId)
    : env.DB.prepare(`INSERT INTO signature_preuves (id, created_at, ${cols.join(', ')}) VALUES (?, ?, ${cols.map(() => '?').join(', ')})`).bind(preuveId, signeLe, ...Object.values(champs));
  await env.DB.batch([
    enregistrer,
    env.DB.prepare("UPDATE devis SET status = 'signe', signed_at = ? WHERE id = ? AND organization_id = ?").bind(isoMs(signeLe).replace('T', ' ').slice(0, 19), lien.document_id, lien.organization_id),
  ]);
  await journaliser(env, lien.organization_id, 'devis', lien.document_id, 'signature', { preuveId, empreinte: sha256, ip: ipTronquee(f.ip), demarrageAnticipe: f.consentements.demarrageAnticipe });

  // E-mails et notification (jamais bloquants)
  const variante = canonique.varianteChoisie;
  const jeton = await jetonDepuisId(env, 'devis', lien.id);
  const base = await donneesDocument(env, lien.organization_id, {
    client: interne.client,
    numero: vue.numero,
    titre: vue.titre,
    montantTtc: variante.totaux.ttc,
    lien: urlPublique(env, 'devis', jeton),
    lignes: variante.lignes,
    acomptePourcent: vue.acompte.pourcent,
    acompteMontant: canonique.acompte.montant,
  });
  const signeIso = isoMs(signeLe);
  await envoyerSansEchec(env, lien.organization_id, 'devis_signe_client', { ...base, signeLe: signeIso, signataire: f.signataire, formule: f.formule, empreinte: sha256 }, interne.client?.email, { nomA: interne.client?.name });
  await envoyerSansEchec(
    env,
    lien.organization_id,
    'devis_signe_artisan',
    { ...base, signeLe: signeIso, signataire: f.signataire, formule: f.formule, lienApp: urlApp(env, `devis/${lien.document_id}`) },
    await emailArtisan(env, lien.organization_id),
    { versArtisan: true },
  );
  await notifier(env, {
    entrepriseId: lien.organization_id,
    type: 'devis_signe',
    titre: `${f.signataire} a signé le devis ${vue.numero}`,
    texte: `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(variante.totaux.ttc)} TTC${retractation ? (f.consentements.demarrageAnticipe ? ' · démarrage anticipé demandé' : ' · rétractation possible 14 jours') : ''}`,
    vers: `devis/${lien.document_id}`,
    montant: variante.totaux.ttc,
    documentType: 'devis',
    documentId: lien.document_id,
  });

  return {
    ok: true,
    statut: 'signe' as const,
    preuveId,
    signeLe,
    empreinte: sha256,
    certificat: `/api/p/devis/${jeton}/certificat`,
    retractation: retractation ? { fin: retractationFin, demarrageAnticipe: f.consentements.demarrageAnticipe } : null,
    acompte:
      vue.acompte.pourcent > 0
        ? { pourcent: vue.acompte.pourcent, montant: canonique.acompte.montant, disponibleLe: retractation ? signeLe + 7 * JOUR_MS : signeLe }
        : null,
  };
}

function lireConsentements(body: Record<string, unknown>, vue: { cgv: unknown; retractation: { applicable: boolean } }) {
  const m = (body.mentions ?? {}) as Record<string, unknown>;
  if (m.bonPourAccord !== true) throw new ErreurParcours(400, 'mention_manquante', 'Cochez « Bon pour accord » pour signer.', { champ: 'bonPourAccord' });
  if (vue.cgv && m.cgv !== true) throw new ErreurParcours(400, 'mention_manquante', 'Acceptez les conditions générales pour signer.', { champ: 'cgv' });
  return { bonPourAccord: true, cgv: m.cgv === true, demarrageAnticipe: vue.retractation.applicable && m.demarrageAnticipe === true };
}

export async function signer(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  await limiter(env, await cleIp('signer', ipDe(request)), 30, 3_600_000);
  if (choisirFournisseur(env).externe) throw new ErreurParcours(409, 'signature_externe', 'Ce devis se signe chez notre prestataire : utilisez le bouton « Signer ».');
  const code = typeof body.code === 'string' ? body.code.replace(/\s+/g, '') : '';
  if (!/^\d{6}$/.test(code)) throw new ErreurParcours(400, 'code_invalide', 'Le code comporte 6 chiffres.');
  const nom = texte(body.nom, 'nom', 2, 120);
  const formule = texteOptionnel(body.formule, 'formule', 200) ?? 'Bon pour accord';
  const varianteId = typeof body.varianteId === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(body.varianteId) ? body.varianteId : 'base';
  const image = validerImage(body.signatureImage);
  const { vue } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut !== 'a_signer') throw new ErreurParcours(409, `deja_${vue.statut}`, 'Ce devis ne peut plus être signé.');
  if (!vue.variantes.some((v) => v.id === varianteId)) throw new ErreurParcours(400, 'variante_inconnue', "Cette proposition n'existe pas.");
  const consentements = lireConsentements(body, vue);
  const c = await verifierEtConsommerCode(env, lien, code);
  return finaliser(env, { lien, signataire: nom, formule, varianteId, consentements, image, code: c, methode: c.canal === 'sms' ? 'code_sms' : 'code_email', ip: ipDe(request), ua: uaDe(request), fournisseur: { nom: 'brix', reference: null } });
}

/** Fournisseur Yousign : prépare la preuve « en attente » et renvoie l'URL de signature du prestataire. */
export async function signatureAvancee(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  await limiter(env, `avancee:${lien.id}`, 5, 3_600_000);
  const f = choisirFournisseur(env);
  if (!f.externe || !f.demarrer) throw new ErreurParcours(409, 'signature_simple', 'Ce devis se signe directement sur cette page avec un code.');
  const { vue, interne } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut !== 'a_signer') throw new ErreurParcours(409, `deja_${vue.statut}`, 'Ce devis ne peut plus être signé.');
  const email = interne.client?.email;
  if (!email) throw new ErreurParcours(409, 'contact_manquant', "Aucune adresse e-mail n'est enregistrée pour vous.");
  const pdf = await env.FILES?.get(clePdf(lien.organization_id, 'devis', lien.document_id));
  if (!pdf) throw new ErreurParcours(409, 'pdf_manquant', "Le document n'est pas encore prêt pour la signature. Réessayez dans un instant.");
  const consentements = lireConsentements(body, vue);
  const varianteId = typeof body.varianteId === 'string' && vue.variantes.some((v) => v.id === body.varianteId) ? body.varianteId : 'base';
  const nom = texte(body.nom ?? interne.client?.name, 'nom', 2, 120);
  const [prenom, ...reste] = nom.split(/\s+/);
  const preuveId = nouvelId('prv');
  const d = await f.demarrer(env, { preuveId, titre: `Devis ${vue.numero} · ${vue.entreprise.nom}`, pdf: new Uint8Array(await pdf.arrayBuffer()), signataire: { prenom, nom: reste.join(' ') || prenom, email, telephone: interne.client?.phone } });
  await env.DB.prepare(
    `INSERT INTO signature_preuves (id, organization_id, devis_id, lien_id, statut, fournisseur, fournisseur_ref, methode_auth, signataire_nom, signataire_contact, variante_id, version_document, mentions, empreinte_sha256, document_canonique, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, 'en_attente', 'yousign', ?, 'yousign_otp', ?, ?, ?, ?, ?, '', '', ?, ?, ?)`,
  )
    .bind(preuveId, lien.organization_id, lien.document_id, lien.id, d.reference, nom, email, varianteId, vue.version, JSON.stringify({ consentements, textes: vue.mentions }), ipDe(request), uaDe(request), Date.now())
    .run();
  return { mode: 'redirection', url: d.url };
}

/** Webhook Yousign : signature_request.done → finalisation avec le PDF signé du prestataire. */
export async function webhookYousign(env: EnvParcours, request: Request) {
  const corps = await request.text();
  if (corps.length > 1_000_000) throw new ErreurParcours(413, 'trop_gros', 'Requête trop volumineuse.');
  if (!(await yousign.verifierWebhook!(env, corps, request.headers))) throw new ErreurParcours(400, 'signature_invalide', 'Signature invalide.');
  const evt = JSON.parse(corps) as { event_id?: string; event_name?: string; data?: { signature_request?: { id?: string } } };
  const ref = evt.data?.signature_request?.id;
  if (evt.event_name !== 'signature_request.done' || !ref) return { recu: true, ignore: true };
  const p = await env.DB.prepare("SELECT * FROM signature_preuves WHERE fournisseur = 'yousign' AND fournisseur_ref = ? AND statut = 'en_attente'").bind(ref).first<Record<string, string>>();
  if (!p) return { recu: true, doublon: true };
  const lien = await env.DB.prepare('SELECT * FROM documents_liens WHERE id = ?').bind(p.lien_id).first<Lien>();
  if (!lien) return { recu: true, ignore: true };
  const m = JSON.parse(p.mentions) as { consentements: Finalisation['consentements'] };
  const pdfSigne = await yousign.telechargerSigne!(env, ref).catch(() => null);
  const r = await finaliser(env, {
    lien, signataire: p.signataire_nom, formule: 'Signé via Yousign', varianteId: p.variante_id, consentements: m.consentements, image: null, code: null, methode: 'yousign_otp',
    ip: p.ip, ua: p.user_agent, preuveId: p.id, fournisseur: { nom: 'yousign', reference: ref }, pdfSigne,
  });
  return { recu: true, preuveId: r.preuveId };
}

export async function certificat(env: EnvParcours, jeton: string, request: Request) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  const p = await env.DB.prepare("SELECT cle_certificat FROM signature_preuves WHERE lien_id = ? AND statut = 'signe' ORDER BY signe_le DESC LIMIT 1").bind(lien.id).first<{ cle_certificat: string | null }>();
  const obj = p?.cle_certificat ? await env.FILES?.get(p.cle_certificat) : null;
  if (!obj) throw new ErreurParcours(404, 'introuvable', 'Certificat introuvable.');
  return obj.text();
}

/** Artisan : preuves d'un devis (sans le code ni l'image). */
export async function preuvesDevis(env: EnvParcours, orgId: string, devisId: string) {
  const rows = (await env.DB.prepare("SELECT id, statut, fournisseur, methode_auth, signataire_nom, formule, variante_id, version_document, empreinte_sha256, dossier_sha256, sceau, signe_le, retractation_fin, demarrage_anticipe, hors_etablissement, ip FROM signature_preuves WHERE organization_id = ? AND devis_id = ? ORDER BY created_at DESC").bind(orgId, devisId).all<Record<string, unknown>>()).results ?? [];
  return { preuves: rows.map((r) => ({ ...r, ip: typeof r.ip === 'string' ? ipTronquee(r.ip) : null, demarrage_anticipe: !!r.demarrage_anticipe, hors_etablissement: !!r.hors_etablissement })) };
}

export async function dossierPreuve(env: EnvParcours, orgId: string, preuveId: string) {
  const p = await env.DB.prepare('SELECT cle_dossier FROM signature_preuves WHERE id = ? AND organization_id = ?').bind(preuveId, orgId).first<{ cle_dossier: string | null }>();
  const obj = p?.cle_dossier ? await env.FILES?.get(p.cle_dossier) : null;
  if (!obj) throw new ErreurParcours(404, 'introuvable', 'Dossier introuvable.');
  return obj.text();
}

