/**
 * Demandes de prix : création (depuis un devis, un chantier ou à la main), envoi multi-fournisseurs,
 * réception des réponses (portail ou API), comparatif et passage en commande.
 */

import type { Env } from '../../env';
import { emettre, partenaireDuFournisseur } from '../api-publique/webhooks';
import { extraireBesoins } from './besoins';
import { enregistrerPrix } from './catalogue';
import { comparer, type CompOffre } from './comparateur';
import { canalEffectif } from './connecteurs/registre';
import {
  all,
  demandeOuErreur,
  destinatairesDemande,
  evenements,
  first,
  journal,
  lignesDemande,
  prochainNumero,
  reponsesDemande,
  run,
} from './depot';
import { envoyerEmail, gabaritEmail } from './mailer';
import { lireChantier, lireDevis, lireEntreprise, lireLignesDevis } from './sources';
import type { Acteur, Demande, Destinataire, Fournisseur, StatutDemande } from './types';
import { DAY_MS, HttpError, formatDate, newId, randomToken, sha256Hex } from './util';

export interface Ctx {
  organizationId: string;
  userId: string;
}

export interface LigneSaisie {
  designation: string;
  reference?: string | null;
  quantite: number;
  unite?: string | null;
  prix_cible_cents?: number | null;
  devis_ligne_id?: string | null;
}

export interface CreerDemandeInput {
  titre?: string;
  devis_id?: string | null;
  chantier_id?: string | null;
  lignes?: LigneSaisie[];
  fournisseur_ids: string[];
  date_limite?: number | null;
  livraison_souhaitee?: number | null;
  adresse_livraison?: string | null;
  message?: string | null;
}

export async function jeton(): Promise<{ token: string; hash: string }> {
  const token = randomToken();
  return { token, hash: await sha256Hex(token) };
}

export function urlPortail(env: Env, token: string): string {
  const base = (env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/$/, '');
  return `${base}/#/portail-fournisseur/${token}`;
}

export async function creerDemande(env: Env, ctx: Ctx, input: CreerDemandeInput): Promise<Demande> {
  const ids = [...new Set(input.fournisseur_ids ?? [])];
  if (ids.length === 0) throw new HttpError(400, 'fournisseurs_requis', 'Choisissez au moins un fournisseur');
  if (ids.length > 15) throw new HttpError(400, 'trop_de_fournisseurs', '15 fournisseurs maximum par demande');

  const fournisseurs = await all<Fournisseur>(
    env,
    `SELECT * FROM fournisseurs_annuaire WHERE organization_id = ? AND archive = 0 AND id IN (${ids.map(() => '?').join(',')})`,
    ctx.organizationId,
    ...ids,
  );
  if (fournisseurs.length !== ids.length) throw new HttpError(400, 'fournisseur_inconnu', 'Un des fournisseurs est introuvable');

  let lignes: LigneSaisie[] = input.lignes ?? [];
  let chantierId = input.chantier_id ?? null;
  let titre = input.titre?.trim() || '';
  let adresse = input.adresse_livraison ?? null;

  if (input.devis_id) {
    const devis = await lireDevis(env, ctx.organizationId, input.devis_id);
    if (!devis) throw new HttpError(404, 'devis_introuvable', 'Devis introuvable');
    chantierId = chantierId ?? devis.chantier_id;
    if (!titre) titre = `Matériaux ${devis.number ?? ''} ${devis.title ?? ''}`.replace(/\s+/g, ' ').trim();
    if (lignes.length === 0) {
      lignes = extraireBesoins(await lireLignesDevis(env, ctx.organizationId, input.devis_id)).map((b) => ({
        designation: b.designation,
        reference: b.reference,
        quantite: b.quantite,
        unite: b.unite,
        prix_cible_cents: b.prix_cible_cents,
        devis_ligne_id: b.devis_ligne_ids[0] ?? null,
      }));
    }
  }
  if (chantierId && (!adresse || !titre)) {
    const ch = await lireChantier(env, ctx.organizationId, chantierId);
    if (ch) {
      adresse = adresse ?? ch.address;
      if (!titre) titre = `Matériaux chantier ${ch.name}`;
    }
  }
  lignes = lignes.filter((l) => l.designation?.trim() && Number(l.quantite) > 0);
  if (lignes.length === 0) throw new HttpError(400, 'lignes_requises', 'Ajoutez au moins un article à demander');
  if (lignes.length > 300) throw new HttpError(400, 'trop_de_lignes', '300 lignes maximum');

  const now = Date.now();
  const demande: Demande = {
    id: newId('dp'),
    organization_id: ctx.organizationId,
    numero: await prochainNumero(env, ctx.organizationId, 'DP'),
    titre: (titre || 'Demande de prix').slice(0, 160),
    devis_id: input.devis_id ?? null,
    chantier_id: chantierId,
    statut: 'brouillon',
    date_limite: input.date_limite ?? now + 2 * DAY_MS,
    livraison_souhaitee: input.livraison_souhaitee ?? null,
    adresse_livraison: adresse,
    message: input.message?.slice(0, 2000) ?? null,
    created_by: ctx.userId,
    created_at: now,
    updated_at: now,
  };
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO fournisseurs_demandes (id, organization_id, numero, titre, devis_id, chantier_id, statut, date_limite, livraison_souhaitee, adresse_livraison, message, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      demande.id, demande.organization_id, demande.numero, demande.titre, demande.devis_id, demande.chantier_id, demande.statut,
      demande.date_limite, demande.livraison_souhaitee, demande.adresse_livraison, demande.message, demande.created_by, now, now,
    ),
  ];
  lignes.forEach((l, i) =>
    stmts.push(
      env.DB.prepare(
        `INSERT INTO fournisseurs_demandes_lignes (id, demande_id, position, designation, reference, quantite, unite, devis_ligne_id, prix_cible_cents) VALUES (?,?,?,?,?,?,?,?,?)`,
      ).bind(newId('dpl'), demande.id, i + 1, l.designation.trim().slice(0, 240), l.reference ?? null, Number(l.quantite), l.unite || 'u', l.devis_ligne_id ?? null, l.prix_cible_cents ?? null),
    ),
  );
  for (const f of fournisseurs) {
    const { hash } = await jeton();
    stmts.push(
      env.DB.prepare(
        `INSERT INTO fournisseurs_demandes_destinataires (id, demande_id, fournisseur_id, token_hash, canal, statut, expire_le) VALUES (?,?,?,?,?,?,?)`,
      ).bind(newId('dpd'), demande.id, f.id, hash, canalEffectif(f.connecteur), 'a_envoyer', now + 30 * DAY_MS),
    );
  }
  await env.DB.batch(stmts);
  await journal(env, ctx.organizationId, 'demande', demande.id, 'creee', 'artisan', { lignes: lignes.length, fournisseurs: fournisseurs.length });
  return demande;
}

export interface ResultatEnvoiDemande {
  envoyes: number;
  simules: { fournisseur: string; email: string | null; lien: string }[];
  erreurs: { fournisseur: string; erreur: string }[];
}

/** Envoie (ou renvoie) la demande aux destinataires qui n'ont pas répondu. */
export async function envoyerDemande(env: Env, ctx: Ctx, demandeId: string, relance = false): Promise<ResultatEnvoiDemande> {
  const d = await demandeOuErreur(env, ctx.organizationId, demandeId);
  if (d.statut === 'annulee' || d.statut === 'commandee') throw new HttpError(409, 'demande_close', 'Cette demande est close');
  const lignes = await lignesDemande(env, d.id);
  const dests = (await destinatairesDemande(env, d.id)).filter((x) =>
    relance ? ['envoyee', 'vue'].includes(x.statut) : x.statut === 'a_envoyer',
  );
  const entreprise = await lireEntreprise(env, ctx.organizationId);
  const out: ResultatEnvoiDemande = { envoyes: 0, simules: [], erreurs: [] };

  for (const dest of dests) {
    const { token, hash } = await jeton();
    const lien = urlPortail(env, token);
    await run(env, `UPDATE fournisseurs_demandes_destinataires SET token_hash = ?, expire_le = ? WHERE id = ?`, hash, Date.now() + 30 * DAY_MS, dest.id);

    const partenaire = await partenaireDuFournisseur(env, ctx.organizationId, dest.fournisseur_id);
    if (partenaire && !relance) {
      await emettre(env, partenaire, 'demande.creee', { demande_id: d.id, destinataire_id: dest.id, numero: d.numero });
    }
    if (!dest.fournisseur_email) {
      if (!partenaire) out.erreurs.push({ fournisseur: dest.fournisseur_nom, erreur: "Pas d'adresse e-mail sur la fiche" });
      else out.envoyes++;
      if (partenaire) await marquerEnvoye(env, ctx, d, dest, 'api');
      continue;
    }
    const { html, text } = gabaritEmail({
      titre: `${relance ? 'Relance : ' : ''}Demande de prix ${d.numero} de ${entreprise.nom}`,
      intro: [
        `Bonjour,`,
        `${entreprise.nom} vous demande vos meilleurs prix pour ${lignes.length} article${lignes.length > 1 ? 's' : ''}${d.date_limite ? `, réponse souhaitée avant le ${formatDate(d.date_limite)}` : ''}.`,
        d.livraison_souhaitee ? `Livraison souhaitée le ${formatDate(d.livraison_souhaitee)}${d.adresse_livraison ? ` au ${d.adresse_livraison}` : ''}.` : '',
        d.message ?? '',
      ].filter(Boolean).join('\n'),
      lignes: lignes.slice(0, 12).map((l) => ({ designation: l.designation, quantite: `${l.quantite} ${l.unite}` })),
      bouton: { libelle: 'Répondre en 2 minutes', url: lien },
      pied: lignes.length > 12 ? `… et ${lignes.length - 12} autres articles, visibles dans le lien.` : 'Vous pouvez aussi répondre directement à cet e-mail avec votre devis en pièce jointe.',
    });
    const res = await envoyerEmail(env, {
      to: dest.fournisseur_email,
      replyTo: entreprise.email,
      subject: `${relance ? 'Relance – ' : ''}Demande de prix ${d.numero} – ${entreprise.nom}`,
      html,
      text,
    });
    if (res.erreur) {
      out.erreurs.push({ fournisseur: dest.fournisseur_nom, erreur: res.erreur });
      continue;
    }
    if (res.simule) out.simules.push({ fournisseur: dest.fournisseur_nom, email: dest.fournisseur_email, lien });
    out.envoyes++;
    await marquerEnvoye(env, ctx, d, dest, res.simule ? 'email_simule' : 'email', relance);
  }
  if (d.statut === 'brouillon' && out.envoyes > 0) await majStatutDemande(env, d.id, 'envoyee');
  return out;
}

async function marquerEnvoye(env: Env, ctx: Ctx, d: Demande, dest: Destinataire & { fournisseur_nom: string }, canal: string, relance = false) {
  await run(
    env,
    `UPDATE fournisseurs_demandes_destinataires SET statut = CASE WHEN statut = 'a_envoyer' THEN 'envoyee' ELSE statut END, envoye_le = ? WHERE id = ?`,
    Date.now(),
    dest.id,
  );
  await journal(env, ctx.organizationId, 'demande', d.id, relance ? 'relancee' : 'envoyee', 'systeme', { fournisseur: dest.fournisseur_nom, canal });
}

async function majStatutDemande(env: Env, id: string, statut: StatutDemande) {
  await run(env, `UPDATE fournisseurs_demandes SET statut = ?, updated_at = ? WHERE id = ?`, statut, Date.now(), id);
}

/** Recalcule le statut d'une demande à partir de ses destinataires. */
export async function recalculerStatut(env: Env, demandeId: string): Promise<void> {
  const d = await first<Demande>(env, `SELECT * FROM fournisseurs_demandes WHERE id = ?`, demandeId);
  if (!d || ['brouillon', 'commandee', 'annulee'].includes(d.statut)) return;
  const dests = await all<{ statut: string }>(env, `SELECT statut FROM fournisseurs_demandes_destinataires WHERE demande_id = ?`, demandeId);
  const finis = dests.filter((x) => x.statut === 'repondue' || x.statut === 'declinee').length;
  const repondus = dests.filter((x) => x.statut === 'repondue').length;
  const statut: StatutDemande = finis === dests.length && repondus > 0 ? 'complete' : repondus > 0 ? 'reponses_partielles' : 'envoyee';
  if (statut !== d.statut) await majStatutDemande(env, demandeId, statut);
}

export interface ReponseInput {
  lignes: {
    ligne_id: string;
    prix_unitaire_cents?: number | null;
    disponible?: boolean;
    reference_proposee?: string | null;
    designation_proposee?: string | null;
    commentaire?: string | null;
  }[];
  delai_livraison_jours?: number | null;
  frais_port_cents?: number | null;
  validite_jours?: number | null;
  commentaire?: string | null;
}

/** Enregistre la réponse d'un fournisseur (portail ou API). Remplace une réponse précédente. */
export async function enregistrerReponse(env: Env, destinataireId: string, input: ReponseInput, acteur: Acteur): Promise<void> {
  const dest = await first<Destinataire & { organization_id: string; demande_statut: string; fournisseur_nom: string }>(
    env,
    `SELECT dd.*, d.organization_id, d.statut AS demande_statut, f.nom AS fournisseur_nom
     FROM fournisseurs_demandes_destinataires dd
     JOIN fournisseurs_demandes d ON d.id = dd.demande_id
     JOIN fournisseurs_annuaire f ON f.id = dd.fournisseur_id WHERE dd.id = ?`,
    destinataireId,
  );
  if (!dest) throw new HttpError(404, 'destinataire_introuvable', 'Demande introuvable');
  if (['annulee', 'commandee'].includes(dest.demande_statut)) throw new HttpError(409, 'demande_close', 'Cette demande est close, merci.');
  const lignes = await lignesDemande(env, dest.demande_id);
  const valides = new Map(lignes.map((l) => [l.id, l]));
  const saisies = (input.lignes ?? []).filter((l) => valides.has(l.ligne_id));
  if (saisies.length === 0) throw new HttpError(400, 'reponse_vide', 'Indiquez au moins un prix');
  for (const s of saisies) {
    if (s.prix_unitaire_cents != null && (!Number.isInteger(s.prix_unitaire_cents) || s.prix_unitaire_cents < 0 || s.prix_unitaire_cents > 100_000_000)) {
      throw new HttpError(400, 'prix_invalide', 'Un prix est invalide');
    }
  }

  const stmts = [env.DB.prepare(`DELETE FROM fournisseurs_reponses_lignes WHERE destinataire_id = ?`).bind(destinataireId)];
  for (const s of saisies) {
    const dispo = s.disponible !== false && s.prix_unitaire_cents != null;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO fournisseurs_reponses_lignes (id, destinataire_id, ligne_id, prix_unitaire_cents, disponible, reference_proposee, designation_proposee, commentaire) VALUES (?,?,?,?,?,?,?,?)`,
      ).bind(
        newId('rep'), destinataireId, s.ligne_id, dispo ? s.prix_unitaire_cents : null, dispo ? 1 : 0,
        s.reference_proposee?.slice(0, 60) ?? null, s.designation_proposee?.slice(0, 240) ?? null, s.commentaire?.slice(0, 500) ?? null,
      ),
    );
  }
  stmts.push(
    env.DB.prepare(
      `UPDATE fournisseurs_demandes_destinataires SET statut = 'repondue', repondu_le = ?, delai_livraison_jours = ?, frais_port_cents = ?, validite_jours = ?, commentaire = ? WHERE id = ?`,
    ).bind(Date.now(), input.delai_livraison_jours ?? null, input.frais_port_cents ?? null, input.validite_jours ?? 30, input.commentaire?.slice(0, 1000) ?? null, destinataireId),
  );
  await env.DB.batch(stmts);

  // Chaque réponse enrichit le catalogue de prix de l'artisan
  for (const s of saisies) {
    const l = valides.get(s.ligne_id)!;
    if (s.prix_unitaire_cents == null || s.disponible === false) continue;
    await enregistrerPrix(env, dest.organization_id, dest.fournisseur_id, {
      reference: s.reference_proposee || l.reference || `DP-${l.id}`,
      designation: s.designation_proposee || l.designation,
      unite: l.unite,
      prix_net_cents: s.prix_unitaire_cents,
      source: 'reponse_demande',
    });
  }
  await journal(env, dest.organization_id, 'demande', dest.demande_id, 'reponse', acteur, { fournisseur: dest.fournisseur_nom, lignes: saisies.length });
  await recalculerStatut(env, dest.demande_id);
}

export async function declinerDemande(env: Env, destinataireId: string, motif: string | null, acteur: Acteur): Promise<void> {
  const dest = await first<{ demande_id: string; organization_id: string; fournisseur_nom: string }>(
    env,
    `SELECT dd.demande_id, d.organization_id, f.nom AS fournisseur_nom FROM fournisseurs_demandes_destinataires dd
     JOIN fournisseurs_demandes d ON d.id = dd.demande_id JOIN fournisseurs_annuaire f ON f.id = dd.fournisseur_id WHERE dd.id = ?`,
    destinataireId,
  );
  if (!dest) throw new HttpError(404, 'destinataire_introuvable', 'Demande introuvable');
  await run(env, `UPDATE fournisseurs_demandes_destinataires SET statut = 'declinee', repondu_le = ?, commentaire = ? WHERE id = ?`, Date.now(), motif?.slice(0, 500) ?? null, destinataireId);
  await journal(env, dest.organization_id, 'demande', dest.demande_id, 'declinee', acteur, { fournisseur: dest.fournisseur_nom, motif });
  await recalculerStatut(env, dest.demande_id);
}

export async function comparatifDemande(env: Env, demandeId: string) {
  const [lignes, dests, reps] = await Promise.all([lignesDemande(env, demandeId), destinatairesDemande(env, demandeId), reponsesDemande(env, demandeId)]);
  const offres: CompOffre[] = dests.map((d) => ({
    destinataire_id: d.id,
    fournisseur_id: d.fournisseur_id,
    fournisseur_nom: d.fournisseur_nom,
    repondu: d.statut === 'repondue',
    frais_port_cents: d.frais_port_cents,
    franco_cents: d.franco_cents,
    delai_livraison_jours: d.delai_livraison_jours,
    prix: Object.fromEntries(reps.filter((r) => r.destinataire_id === d.id).map((r) => [r.ligne_id, r.disponible ? r.prix_unitaire_cents : null])),
  }));
  return comparer(
    lignes.map((l) => ({ id: l.id, designation: l.designation, quantite: l.quantite, prix_cible_cents: l.prix_cible_cents })),
    offres,
  );
}

export async function detailDemande(env: Env, ctx: Ctx, id: string) {
  const d = await demandeOuErreur(env, ctx.organizationId, id);
  const [lignes, dests, reponses, comparatif, journalEvts] = await Promise.all([
    lignesDemande(env, id),
    destinatairesDemande(env, id),
    reponsesDemande(env, id),
    comparatifDemande(env, id),
    evenements(env, ctx.organizationId, 'demande', id),
  ]);
  return {
    demande: d,
    lignes,
    destinataires: dests.map(({ token_hash: _t, ...rest }) => rest),
    reponses,
    comparatif,
    journal: journalEvts,
  };
}

export async function listerDemandes(env: Env, ctx: Ctx, filtre: { statut?: string; chantier_id?: string; devis_id?: string } = {}) {
  const where = ['d.organization_id = ?'];
  const binds: unknown[] = [ctx.organizationId];
  if (filtre.statut) (where.push('d.statut = ?'), binds.push(filtre.statut));
  if (filtre.chantier_id) (where.push('d.chantier_id = ?'), binds.push(filtre.chantier_id));
  if (filtre.devis_id) (where.push('d.devis_id = ?'), binds.push(filtre.devis_id));
  return all<Demande & { nb_lignes: number; nb_destinataires: number; nb_reponses: number }>(
    env,
    `SELECT d.*,
      (SELECT COUNT(*) FROM fournisseurs_demandes_lignes l WHERE l.demande_id = d.id) AS nb_lignes,
      (SELECT COUNT(*) FROM fournisseurs_demandes_destinataires x WHERE x.demande_id = d.id) AS nb_destinataires,
      (SELECT COUNT(*) FROM fournisseurs_demandes_destinataires x WHERE x.demande_id = d.id AND x.statut = 'repondue') AS nb_reponses
     FROM fournisseurs_demandes d WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC LIMIT 200`,
    ...binds,
  );
}

export async function annulerDemande(env: Env, ctx: Ctx, id: string): Promise<void> {
  const d = await demandeOuErreur(env, ctx.organizationId, id);
  if (d.statut === 'commandee') throw new HttpError(409, 'deja_commandee', 'Déjà passée en commande');
  await majStatutDemande(env, id, 'annulee');
  await journal(env, ctx.organizationId, 'demande', id, 'annulee', 'artisan');
  const dests = await all<{ fournisseur_id: string }>(env, `SELECT fournisseur_id FROM fournisseurs_demandes_destinataires WHERE demande_id = ?`, id);
  for (const x of dests) {
    const p = await partenaireDuFournisseur(env, ctx.organizationId, x.fournisseur_id);
    if (p) await emettre(env, p, 'demande.annulee', { demande_id: id, numero: d.numero });
  }
}

export { majStatutDemande };
