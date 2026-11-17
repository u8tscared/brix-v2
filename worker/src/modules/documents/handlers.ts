/**
 * Service documents :
 * - côté artisan (connecté) : créer, lister, révoquer les liens ; compléments d'affichage ; suivi ; PDF ;
 * - côté client (lien public) : ouvrir un devis, une facture, un chantier ; refuser ; poser une question.
 */
import { moyensDisponibles } from '../paiements/moyens';
import { notifier } from '../notifications/notifier';
import { ErreurParcours, cleIp, ipDe, ipTronquee, limiter, nouvelId, texte, texteOptionnel, uaDe } from './commun';
import type { EnvParcours } from './env';
import { TYPES_DOCUMENT, creerLien, listerLiens, revoquerLien, verifierJeton, type Lien, type TypeDocument } from './jetons';
import { documentExiste, ecrireComplements, journaliser, lireChantier, lireClient, lireComplements, lireOrganisation } from './sources';
import { construireVueDevis, construireVueFacture, nettoyerComplements } from './vues';

const TRENTE_MIN = 30 * 60_000;
const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export function typeDocument(v: unknown): TypeDocument {
  if (typeof v === 'string' && (TYPES_DOCUMENT as string[]).includes(v)) return v as TypeDocument;
  throw new ErreurParcours(400, 'type_invalide', 'Type de document inconnu (devis, facture ou chantier).');
}

const idDocument = (v: unknown) => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new ErreurParcours(400, 'champ_invalide', 'Identifiant de document invalide.');
  return v;
};

// ---------- Artisan ----------

export class DocumentsService {
  constructor(private env: EnvParcours, private ctx: { organizationId: string; userId: string }) {}

  async creerLien(body: Record<string, unknown>) {
    const type = typeDocument(body.type);
    const documentId = idDocument(body.documentId);
    if (!(await documentExiste(this.env, this.ctx.organizationId, type, documentId))) throw new ErreurParcours(404, 'document_introuvable', 'Document introuvable.');
    if (body.complements && typeof body.complements === 'object') await this.majComplements(type, documentId, body.complements as Record<string, unknown>);
    if (body.remplacer === true) {
      await this.env.DB.prepare('UPDATE documents_liens SET revoque_le = ? WHERE organization_id = ? AND type = ? AND document_id = ? AND revoque_le IS NULL')
        .bind(Date.now(), this.ctx.organizationId, type, documentId)
        .run();
    }
    const expireJours = typeof body.expireJours === 'number' ? body.expireJours : undefined;
    const { lien, jeton, url } = await creerLien(this.env, { organizationId: this.ctx.organizationId, type, documentId, expireJours, creePar: this.ctx.userId });
    return { id: lien.id, jeton, url, expireLe: lien.expire_le };
  }

  listerLiens(type: unknown, documentId: unknown) {
    return listerLiens(this.env, this.ctx.organizationId, typeDocument(type), idDocument(documentId)).then((liens) => ({ liens }));
  }

  async revoquer(lienId: string) {
    if (!(await revoquerLien(this.env, this.ctx.organizationId, lienId))) throw new ErreurParcours(404, 'lien_introuvable', 'Lien introuvable ou déjà désactivé.');
    return { ok: true };
  }

  async majComplements(type: TypeDocument, documentId: string, body: Record<string, unknown>) {
    idDocument(documentId);
    if (!(await documentExiste(this.env, this.ctx.organizationId, type, documentId))) throw new ErreurParcours(404, 'document_introuvable', 'Document introuvable.');
    if (type === 'devis') {
      const signe = await this.env.DB.prepare("SELECT status FROM devis WHERE id = ? AND organization_id = ?").bind(documentId, this.ctx.organizationId).first<{ status: string }>();
      if (signe?.status === 'signe') throw new ErreurParcours(409, 'deja_signe', 'Un devis signé ne se modifie plus : faites un avenant.');
    }
    const c = nettoyerComplements(body);
    await ecrireComplements(this.env, this.ctx.organizationId, type, documentId, c as Record<string, unknown>);
    const { version } = await lireComplements(this.env, this.ctx.organizationId, type, documentId);
    return { version, complements: c };
  }

  async suivi(type: TypeDocument, documentId: string) {
    const org = this.ctx.organizationId;
    const ouvertures =
      (
        await this.env.DB.prepare('SELECT ouvert_le, ip_tronquee, user_agent FROM documents_ouvertures WHERE organization_id = ? AND type = ? AND document_id = ? ORDER BY ouvert_le DESC LIMIT 100')
          .bind(org, type, documentId)
          .all<{ ouvert_le: number; ip_tronquee: string; user_agent: string }>()
      ).results ?? [];
    const evenements =
      (
        await this.env.DB.prepare('SELECT evenement, donnees, created_at FROM documents_evenements WHERE organization_id = ? AND type = ? AND document_id = ? ORDER BY created_at DESC LIMIT 100')
          .bind(org, type, documentId)
          .all<{ evenement: string; donnees: string; created_at: number }>()
      ).results ?? [];
    const total = await this.env.DB.prepare('SELECT COUNT(*) AS n FROM documents_ouvertures WHERE organization_id = ? AND type = ? AND document_id = ?').bind(org, type, documentId).first<{ n: number }>();
    return {
      nbOuvertures: total?.n ?? 0,
      ouvertures: ouvertures.map((o) => ({ le: o.ouvert_le, ip: o.ip_tronquee, appareil: appareil(o.user_agent) })),
      evenements: evenements.map((e) => ({ evenement: e.evenement, le: e.created_at, donnees: JSON.parse(e.donnees) })),
      liens: await listerLiens(this.env, org, type, documentId),
    };
  }

  /** PDF du devis (généré par l'app), nécessaire pour la signature avancée Yousign. */
  async deposerPdf(type: TypeDocument, documentId: string, request: Request) {
    if (!this.env.FILES) throw new ErreurParcours(503, 'stockage_indisponible', 'Stockage des fichiers non configuré.');
    if (!(await documentExiste(this.env, this.ctx.organizationId, type, documentId))) throw new ErreurParcours(404, 'document_introuvable', 'Document introuvable.');
    const octets = new Uint8Array(await request.arrayBuffer());
    if (octets.length > 10_000_000) throw new ErreurParcours(413, 'trop_gros', 'PDF trop volumineux (10 Mo maximum).');
    if (String.fromCharCode(...octets.slice(0, 5)) !== '%PDF-') throw new ErreurParcours(400, 'pdf_invalide', "Ce fichier n'est pas un PDF.");
    await this.env.FILES.put(clePdf(this.ctx.organizationId, type, documentId), octets, { httpMetadata: { contentType: 'application/pdf' } });
    return { ok: true, taille: octets.length };
  }
}

export const clePdf = (orgId: string, type: TypeDocument, id: string) => `documents/${orgId}/${type}/${id}.pdf`;

function appareil(ua: string): string {
  if (/iPhone|iPad/.test(ua)) return 'iPhone / iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  return ua ? 'Navigateur' : 'Inconnu';
}

// ---------- Client (lien public) ----------

/** Journalise l'ouverture et dit s'il faut prévenir l'artisan (pas plus d'une fois par 30 min et par document). */
async function journaliserOuverture(env: EnvParcours, lien: Lien, request: Request) {
  const derniere = await env.DB.prepare('SELECT MAX(ouvert_le) AS t FROM documents_ouvertures WHERE organization_id = ? AND type = ? AND document_id = ?')
    .bind(lien.organization_id, lien.type, lien.document_id)
    .first<{ t: number | null }>();
  await env.DB.prepare('INSERT INTO documents_ouvertures (id, lien_id, organization_id, type, document_id, ip_tronquee, user_agent, ouvert_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(nouvelId('ouv'), lien.id, lien.organization_id, lien.type, lien.document_id, ipTronquee(ipDe(request)), uaDe(request), Date.now())
    .run();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM documents_ouvertures WHERE organization_id = ? AND type = ? AND document_id = ?')
    .bind(lien.organization_id, lien.type, lien.document_id)
    .first<{ n: number }>();
  return { prevenir: !derniere?.t || derniere.t < Date.now() - TRENTE_MIN, rang: n?.n ?? 1 };
}

export async function lienPublic(env: EnvParcours, type: TypeDocument, jeton: string, request: Request) {
  await limiter(env, await cleIp('public', ipDe(request)), 120, 60_000);
  return verifierJeton(env, type, jeton);
}

export async function ouvrirDevis(env: EnvParcours, jeton: string, request: Request) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  const { vue, interne } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  const o = await journaliserOuverture(env, lien, request);
  if (interne.devis.status === 'envoye') {
    await env.DB.prepare("UPDATE devis SET status = 'vu' WHERE id = ? AND organization_id = ? AND status = 'envoye'").bind(lien.document_id, lien.organization_id).run();
  }
  if (o.prevenir && vue.statut === 'a_signer') {
    await notifier(env, {
      entrepriseId: lien.organization_id,
      type: 'devis_ouvert',
      titre: `${vue.client?.nom ?? 'Votre client'} consulte votre devis`,
      texte: `Devis ${vue.numero} · ${euros(vue.totaux.ttc)} TTC${o.rang > 1 ? ` · ${o.rang}e ouverture` : ''}`,
      vers: `devis/${lien.document_id}`,
      montant: vue.totaux.ttc,
      documentType: 'devis',
      documentId: lien.document_id,
    });
  }
  return vue;
}

export async function ouvrirFacture(env: EnvParcours, jeton: string, request: Request) {
  const lien = await lienPublic(env, 'facture', jeton, request);
  const { vue, interne } = await construireVueFacture(env, lien.organization_id, lien.document_id);
  const o = await journaliserOuverture(env, lien, request);
  if (o.prevenir && vue.statut !== 'payee' && vue.statut !== 'annulee') {
    await notifier(env, {
      entrepriseId: lien.organization_id,
      type: 'facture_ouverte',
      titre: `${vue.client?.nom ?? 'Votre client'} consulte votre facture`,
      texte: `Facture ${vue.numero} · reste ${euros(vue.reste)}`,
      vers: `factures/${lien.document_id}`,
      montant: vue.reste,
      documentType: 'facture',
      documentId: lien.document_id,
    });
  }
  return { ...vue, moyens: await moyensDisponibles(env, lien.organization_id, interne.resteCents, interne.complements) };
}

export async function ouvrirChantier(env: EnvParcours, jeton: string, request: Request) {
  const lien = await lienPublic(env, 'chantier', jeton, request);
  const ch = await lireChantier(env, lien.organization_id, lien.document_id);
  if (!ch) throw new ErreurParcours(404, 'document_introuvable', "Ce chantier n'est plus disponible.");
  await journaliserOuverture(env, lien, request);
  const [org, client, comp] = await Promise.all([lireOrganisation(env, lien.organization_id), lireClient(env, lien.organization_id, ch.client_id), lireComplements(env, lien.organization_id, 'chantier', ch.id)]);
  const c = nettoyerComplements(comp.donnees);
  return {
    type: 'chantier' as const,
    nom: ch.name,
    ville: ch.city,
    statut: ch.status,
    avancement: ch.progress,
    debut: ch.start_date,
    fin: ch.end_date,
    etapes: c.etapes ?? [],
    message: c.message ?? null,
    entreprise: { nom: org.nom, telephone: org.telephone, email: org.email },
    client: client ? { nom: client.name } : null,
  };
}

async function devisModifiable(env: EnvParcours, jeton: string, request: Request) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  const { vue } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut === 'signe') throw new ErreurParcours(409, 'deja_signe', 'Ce devis est déjà signé.');
  if (vue.statut === 'refuse') throw new ErreurParcours(409, 'deja_refuse', 'Ce devis a déjà été refusé.');
  return { lien, vue };
}

export async function refuserDevis(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const { lien, vue } = await devisModifiable(env, jeton, request);
  const motif = texteOptionnel(body.motif, 'motif', 1000);
  await env.DB.prepare("UPDATE devis SET status = 'refuse' WHERE id = ? AND organization_id = ?").bind(lien.document_id, lien.organization_id).run();
  await journaliser(env, lien.organization_id, 'devis', lien.document_id, 'refus', { motif, ip: ipTronquee(ipDe(request)) });
  await notifier(env, {
    entrepriseId: lien.organization_id,
    type: 'devis_refuse',
    titre: `${vue.client?.nom ?? 'Votre client'} a refusé le devis ${vue.numero}`,
    texte: motif ? `« ${motif.slice(0, 200)} »` : 'Sans motif précisé. Un appel peut aider à comprendre.',
    vers: `devis/${lien.document_id}`,
    montant: vue.totaux.ttc,
    documentType: 'devis',
    documentId: lien.document_id,
  });
  return { ok: true, statut: 'refuse' };
}

export async function questionDevis(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  await limiter(env, `question:${lien.id}`, 5, 3_600_000);
  const question = texte(body.texte, 'texte', 3, 2000);
  const { vue } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  await journaliser(env, lien.organization_id, 'devis', lien.document_id, 'question', { texte: question });
  await notifier(env, {
    entrepriseId: lien.organization_id,
    type: 'devis_question',
    titre: `Question de ${vue.client?.nom ?? 'votre client'} sur le devis ${vue.numero}`,
    texte: question.slice(0, 300),
    vers: `devis/${lien.document_id}`,
    documentType: 'devis',
    documentId: lien.document_id,
  });
  return { ok: true, message: `Votre question a été transmise à ${vue.entreprise.nom}.` };
}
