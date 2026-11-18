/**
 * Commandes fournisseurs : création (à la main, depuis un devis signé, depuis une demande de prix),
 * envoi (e-mail + lien portail + bon EDI joint, ou webhook API), suivi, livraisons partielles,
 * rapprochement avec la facture fournisseur.
 */

import type { Env } from '../../env';
import { emettre, partenaireDuFournisseur } from '../api-publique/webhooks';
import { extraireBesoins } from './besoins';
import { prixConnu } from './catalogue';
import { canalEffectif } from './connecteurs/registre';
import { genererOrders } from './connecteurs/edifact';
import { comparatifDemande, entierOuNull, jeton, majStatutDemande, urlPortail, type Ctx, type LigneSaisie } from './demandes';
import {
  all,
  commandeOuErreur,
  demandeOuErreur,
  evenements,
  first,
  fournisseurOuErreur,
  journal,
  lignesCommande,
  lignesDemande,
  prochainNumero,
  reponsesDemande,
  run,
} from './depot';
import { statutDepuisLivraisons, transitionAutorisee, LIBELLES_COMMANDE } from './cycle-commande';
import { envoyerEmail, gabaritEmail } from './mailer';
import { lireChantier, lireDevis, lireEntreprise, lireLignesDevis } from './sources';
import type { Acteur, Commande, ModeLivraison, StatutCommande } from './types';
import { DAY_MS, HttpError, formatDate, formatEuros, newId } from './util';

export interface CreerCommandeInput {
  fournisseur_id: string;
  lignes: (LigneSaisie & { prix_unitaire_cents?: number | null; ean?: string | null })[];
  devis_id?: string | null;
  chantier_id?: string | null;
  demande_id?: string | null;
  livraison_prevue?: number | null;
  adresse_livraison?: string | null;
  mode_livraison?: ModeLivraison;
  frais_port_cents?: number | null;
  message?: string | null;
}

export async function creerCommande(env: Env, ctx: Ctx, input: CreerCommandeInput): Promise<Commande> {
  const f = await fournisseurOuErreur(env, ctx.organizationId, input.fournisseur_id);
  const lignes = (Array.isArray(input.lignes) ? input.lignes : []).filter((l) => typeof l?.designation === 'string' && l.designation.trim() && Number(l.quantite) > 0 && Number(l.quantite) <= 1_000_000);
  if (lignes.length === 0) throw new HttpError(400, 'lignes_requises', 'Ajoutez au moins un article');
  if (lignes.length > 300) throw new HttpError(400, 'trop_de_lignes', '300 lignes maximum');
  for (const l of lignes) entierOuNull(l.prix_unitaire_cents, 0, 100_000_000, 'prix_unitaire_cents');
  const port = entierOuNull(input.frais_port_cents, 0, 10_000_000, 'frais_port_cents') ?? 0;
  const mode: ModeLivraison = input.mode_livraison && ['livraison_chantier', 'retrait_agence', 'livraison_depot'].includes(input.mode_livraison) ? input.mode_livraison : 'livraison_chantier';
  for (const [k, table] of [['devis_id', 'devis'], ['chantier_id', 'chantiers'], ['demande_id', 'fournisseurs_demandes']] as const) {
    const v = input[k];
    if (v && !(await first(env, `SELECT id FROM ${table} WHERE id = ? AND organization_id = ?`, v, ctx.organizationId))) throw new HttpError(400, 'reference_invalide', `${k} inconnu`);
  }
  let adresse = input.adresse_livraison ?? null;
  if (!adresse && input.chantier_id) adresse = (await lireChantier(env, ctx.organizationId, input.chantier_id))?.address ?? null;

  const now = Date.now();
  const total = lignes.reduce((s, l) => s + Math.round((l.prix_unitaire_cents ?? 0) * Number(l.quantite)), 0);
  const cmd: Commande = {
    id: newId('bc'),
    organization_id: ctx.organizationId,
    numero: await prochainNumero(env, ctx.organizationId, 'BC'),
    fournisseur_id: f.id,
    demande_id: input.demande_id ?? null,
    devis_id: input.devis_id ?? null,
    chantier_id: input.chantier_id ?? null,
    statut: 'brouillon',
    canal: canalEffectif(f.connecteur),
    token_hash: null,
    total_ht_cents: total,
    frais_port_cents: port,
    livraison_prevue: input.livraison_prevue ?? null,
    adresse_livraison: adresse,
    mode_livraison: mode,
    reference_fournisseur: null,
    suivi_transporteur: null,
    facture_fournisseur_id: null,
    message: input.message?.slice(0, 2000) ?? null,
    created_by: ctx.userId,
    created_at: now,
    updated_at: now,
  };
  const stmts = [
    env.DB.prepare(
      `INSERT INTO fournisseurs_commandes (id, organization_id, numero, fournisseur_id, demande_id, devis_id, chantier_id, statut, canal, total_ht_cents, frais_port_cents, livraison_prevue, adresse_livraison, mode_livraison, message, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      cmd.id, cmd.organization_id, cmd.numero, cmd.fournisseur_id, cmd.demande_id, cmd.devis_id, cmd.chantier_id, cmd.statut, cmd.canal,
      cmd.total_ht_cents, cmd.frais_port_cents, cmd.livraison_prevue, cmd.adresse_livraison, cmd.mode_livraison, cmd.message, cmd.created_by, now, now,
    ),
    ...lignes.map((l, i) =>
      env.DB.prepare(
        `INSERT INTO fournisseurs_commandes_lignes (id, commande_id, position, designation, reference, ean, quantite, unite, prix_unitaire_cents, devis_ligne_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).bind(newId('bcl'), cmd.id, i + 1, l.designation.trim().slice(0, 240), l.reference ?? null, l.ean ?? null, Number(l.quantite), l.unite || 'u', l.prix_unitaire_cents ?? 0, l.devis_ligne_id ?? null),
    ),
  ];
  await env.DB.batch(stmts);
  await journal(env, ctx.organizationId, 'commande', cmd.id, 'creee', 'artisan', { lignes: lignes.length, total_ht_cents: total });
  return cmd;
}

/** Devis signé → bon de commande prérempli avec les prix connus du catalogue de ce fournisseur. */
export async function commandeDepuisDevis(env: Env, ctx: Ctx, devisId: string, fournisseurId: string): Promise<Commande> {
  const devis = await lireDevis(env, ctx.organizationId, devisId);
  if (!devis) throw new HttpError(404, 'devis_introuvable', 'Devis introuvable');
  const besoins = extraireBesoins(await lireLignesDevis(env, ctx.organizationId, devisId));
  if (besoins.length === 0) throw new HttpError(400, 'aucune_fourniture', "Ce devis n'a pas de ligne de fourniture à commander");
  const lignes = [];
  for (const b of besoins) {
    const art = await prixConnu(env, ctx.organizationId, fournisseurId, b.reference, b.designation);
    lignes.push({
      designation: art?.designation ?? b.designation,
      reference: art?.reference ?? b.reference,
      ean: art?.ean ?? null,
      quantite: b.quantite,
      unite: art?.unite ?? b.unite,
      prix_unitaire_cents: art?.prix_net_cents ?? b.prix_cible_cents ?? 0,
      devis_ligne_id: b.devis_ligne_ids[0] ?? null,
    });
  }
  return creerCommande(env, ctx, { fournisseur_id: fournisseurId, lignes, devis_id: devisId, chantier_id: devis.chantier_id });
}

/**
 * Demande de prix → une commande par fournisseur retenu.
 * Sans destinataire précisé, suit la recommandation du comparatif (fournisseur unique ou panier optimisé).
 */
export async function commandesDepuisDemande(env: Env, ctx: Ctx, demandeId: string, choix: { destinataire_id?: string; repartition?: 'recommandation' | 'optimise' | 'unique' } = {}) {
  const d = await demandeOuErreur(env, ctx.organizationId, demandeId);
  if (d.statut === 'commandee') throw new HttpError(409, 'deja_commandee', 'Cette demande a déjà été commandée');
  if (d.statut === 'annulee') throw new HttpError(409, 'demande_annulee', 'Cette demande a été annulée');
  const [lignes, reps, comp] = await Promise.all([lignesDemande(env, demandeId), reponsesDemande(env, demandeId), comparatifDemande(env, demandeId)]);
  const dests = await all<{ id: string; fournisseur_id: string; frais_port_cents: number | null; delai_livraison_jours: number | null }>(
    env,
    `SELECT id, fournisseur_id, frais_port_cents, delai_livraison_jours FROM fournisseurs_demandes_destinataires WHERE demande_id = ? AND statut = 'repondue'`,
    demandeId,
  );
  let repartition: { destinataire_id: string; ligne_ids: string[]; total_cents?: number }[];
  if (choix.destinataire_id) {
    if (!dests.some((x) => x.id === choix.destinataire_id)) throw new HttpError(400, 'offre_inconnue', "Ce fournisseur n'a pas répondu");
    repartition = [{ destinataire_id: choix.destinataire_id, ligne_ids: lignes.map((l) => l.id) }];
  } else {
    const reco =
      choix.repartition === 'optimise'
        ? [comp.recommandation, comp.alternative].find((r) => r?.type === 'optimise')
        : choix.repartition === 'unique'
          ? [comp.recommandation, comp.alternative].find((r) => r?.type === 'unique')
          : comp.recommandation;
    if (!reco) throw new HttpError(409, 'pas_de_recommandation', 'Pas assez de réponses pour commander automatiquement');
    repartition = reco.repartition;
  }
  // Réservation atomique : deux clics simultanés ne créent pas deux jeux de commandes
  const res = await env.DB.prepare(`UPDATE fournisseurs_demandes SET statut = 'commandee', updated_at = ? WHERE id = ? AND statut NOT IN ('commandee','annulee')`)
    .bind(Date.now(), d.id)
    .run();
  if (res.meta && typeof res.meta.changes === 'number' && res.meta.changes === 0) throw new HttpError(409, 'deja_commandee', 'Cette demande a déjà été commandée');
  const commandes: Commande[] = [];
  for (const r of repartition) {
    const dest = dests.find((x) => x.id === r.destinataire_id)!;
    const lignesCmd = r.ligne_ids
      .map((id) => {
        const l = lignes.find((x) => x.id === id)!;
        const rep = reps.find((x) => x.destinataire_id === r.destinataire_id && x.ligne_id === id);
        if (!rep || !rep.disponible) return null;
        return {
          designation: rep.designation_proposee || l.designation,
          reference: rep.reference_proposee || l.reference,
          quantite: l.quantite,
          unite: l.unite,
          prix_unitaire_cents: rep.prix_unitaire_cents,
          devis_ligne_id: l.devis_ligne_id,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (lignesCmd.length === 0) continue;
    commandes.push(
      await creerCommande(env, ctx, {
        fournisseur_id: dest.fournisseur_id,
        lignes: lignesCmd,
        demande_id: d.id,
        devis_id: d.devis_id,
        chantier_id: d.chantier_id,
        adresse_livraison: d.adresse_livraison,
        livraison_prevue: d.livraison_souhaitee ?? (dest.delai_livraison_jours != null ? Date.now() + dest.delai_livraison_jours * DAY_MS : null),
        // Port du sous-panier réellement commandé (franco apprécié sur ce sous-total), pas de l'offre complète
        frais_port_cents:
          r.total_cents != null
            ? Math.max(0, r.total_cents - lignesCmd.reduce((s, l) => s + Math.round((l.prix_unitaire_cents ?? 0) * l.quantite), 0))
            : comp.totaux.find((t) => t.destinataire_id === dest.id)?.port_cents ?? dest.frais_port_cents ?? 0,
      }),
    );
  }
  if (commandes.length === 0) {
    await majStatutDemande(env, d.id, d.statut);
  } else {
    await journal(env, ctx.organizationId, 'demande', d.id, 'commandee', 'artisan', { commandes: commandes.map((c) => c.numero) });
  }
  return commandes;
}

export async function envoyerCommande(env: Env, ctx: Ctx, id: string) {
  const c = await commandeOuErreur(env, ctx.organizationId, id);
  if (c.statut !== 'brouillon' && c.statut !== 'envoyee') throw new HttpError(409, 'deja_traitee', 'Commande déjà prise en charge par le fournisseur');
  const f = await fournisseurOuErreur(env, ctx.organizationId, c.fournisseur_id);
  const lignes = await lignesCommande(env, id);
  const entreprise = await lireEntreprise(env, ctx.organizationId);
  const { token, hash } = await jeton();
  const lien = urlPortail(env, token);
  const chantier = c.chantier_id ? await lireChantier(env, ctx.organizationId, c.chantier_id) : null;

  const edi = genererOrders(
    {
      numero: c.numero,
      date: new Date(),
      livraison_souhaitee: c.livraison_prevue ? new Date(c.livraison_prevue) : null,
      acheteur: { nom: entreprise.nom, adresse: entreprise.adresse },
      fournisseur: { nom: f.nom },
      livraison: c.adresse_livraison ? { nom: chantier?.name ?? entreprise.nom, adresse: c.adresse_livraison } : null,
      numero_compte_client: f.numero_compte_client,
      reference_chantier: chantier?.name ?? null,
      lignes: lignes.map((l) => ({ ean: l.ean, reference: l.reference, designation: l.designation, quantite: l.quantite, unite: l.unite, prix_unitaire_cents: l.prix_unitaire_cents })),
    },
    c.numero.replace(/\D/g, '').slice(-10),
  );

  let canal = 'email';
  let simule = false;
  const partenaire = await partenaireDuFournisseur(env, ctx.organizationId, f.id);
  const premierEnvoi = c.statut === 'brouillon';
  if (partenaire) canal = 'api';
  if (f.email) {
    const { html, text } = gabaritEmail({
      titre: `Commande ${c.numero} de ${entreprise.nom}`,
      intro: [
        'Bonjour,',
        `Voici une commande de ${entreprise.nom}${f.numero_compte_client ? ` (compte client ${f.numero_compte_client})` : ''} pour un montant de ${formatEuros(c.total_ht_cents)} HT.`,
        c.mode_livraison === 'retrait_agence'
          ? 'Retrait en agence.'
          : `Livraison ${c.livraison_prevue ? `souhaitée le ${formatDate(c.livraison_prevue)}` : 'dès que possible'}${c.adresse_livraison ? ` : ${c.adresse_livraison}` : ''}.`,
        c.message ?? '',
        'Merci de confirmer la commande avec le bouton ci-dessous (un clic suffit).',
      ].filter(Boolean).join('\n'),
      lignes: lignes.slice(0, 15).map((l) => ({ designation: `${l.reference ? `[${l.reference}] ` : ''}${l.designation}`, quantite: `${l.quantite} ${l.unite}` })),
      bouton: { libelle: 'Confirmer la commande', url: lien },
      pied: 'Le bon de commande au format EDI (EDIFACT ORDERS) est joint pour votre système.',
    });
    const res = await envoyerEmail(env, {
      to: f.email,
      replyTo: entreprise.email,
      subject: `Commande ${c.numero} – ${entreprise.nom}`,
      html,
      text,
      attachments: [{ filename: `${c.numero}.edi`, content: edi, contentType: 'application/edifact' }],
    });
    if (res.erreur) throw new HttpError(502, 'envoi_echoue', `L'e-mail n'est pas parti : ${res.erreur}`);
    simule = res.simule;
    canal = partenaire ? 'api+email' : res.simule ? 'email_simule' : 'email';
  } else if (!partenaire) {
    throw new HttpError(400, 'email_manquant', "Ajoutez l'adresse e-mail du fournisseur sur sa fiche");
  }
  await run(env, `UPDATE fournisseurs_commandes SET statut = 'envoyee', token_hash = ?, updated_at = ? WHERE id = ?`, hash, Date.now(), id);
  // Le webhook ne part qu'une fois l'e-mail parti, et seulement au premier envoi (pas de doublon dans l'ERP)
  if (partenaire && premierEnvoi) await emettre(env, partenaire, 'commande.creee', { commande_id: c.id, numero: c.numero });
  await journal(env, ctx.organizationId, 'commande', id, 'envoyee', 'systeme', { canal, fournisseur: f.nom });
  return { envoyee: true, canal, simule, lien_portail: simule ? lien : undefined, edi };
}

export interface MajStatutInput {
  statut: StatutCommande;
  reference_fournisseur?: string | null;
  livraison_prevue?: number | null;
  suivi_transporteur?: string | null;
  commentaire?: string | null;
}

/** Changement de statut par l'artisan, le fournisseur (portail) ou un partenaire (API). */
export async function majStatutCommande(env: Env, orgId: string, id: string, input: MajStatutInput, acteur: Acteur): Promise<Commande> {
  const c = await commandeOuErreur(env, orgId, id);
  if (c.statut === input.statut && input.statut !== 'livree_partiel') {
    // Idempotent : on met juste à jour les infos complémentaires
  } else if (!transitionAutorisee(c.statut, input.statut, acteur)) {
    throw new HttpError(409, 'transition_interdite', `Impossible de passer de « ${LIBELLES_COMMANDE[c.statut]} » à « ${LIBELLES_COMMANDE[input.statut]} »`);
  }
  await run(
    env,
    `UPDATE fournisseurs_commandes SET statut = ?, reference_fournisseur = COALESCE(?, reference_fournisseur), livraison_prevue = COALESCE(?, livraison_prevue),
       suivi_transporteur = COALESCE(?, suivi_transporteur), updated_at = ? WHERE id = ?`,
    input.statut,
    input.reference_fournisseur?.slice(0, 60) ?? null,
    input.livraison_prevue ?? null,
    input.suivi_transporteur?.slice(0, 300) ?? null,
    Date.now(),
    id,
  );
  if (input.statut === 'livree' && acteur === 'artisan') {
    await run(env, `UPDATE fournisseurs_commandes_lignes SET quantite_livree = quantite WHERE commande_id = ? AND quantite_livree < quantite`, id);
  }
  await journal(env, orgId, 'commande', id, input.statut, acteur, {
    reference_fournisseur: input.reference_fournisseur,
    livraison_prevue: input.livraison_prevue,
    suivi: input.suivi_transporteur,
    commentaire: input.commentaire,
  });
  if (input.statut === 'annulee') {
    const p = await partenaireDuFournisseur(env, orgId, c.fournisseur_id);
    if (p) await emettre(env, p, 'commande.annulee', { commande_id: c.id, numero: c.numero });
  }
  return (await commandeOuErreur(env, orgId, id))!;
}

/** Réception (bon de livraison) : quantités reçues par ligne. Statut calculé automatiquement. */
export async function enregistrerLivraison(env: Env, orgId: string, id: string, recu: { ligne_id: string; quantite_recue: number }[], acteur: Acteur) {
  const c = await commandeOuErreur(env, orgId, id);
  if (['brouillon', 'annulee', 'facturee'].includes(c.statut)) throw new HttpError(409, 'statut_incompatible', 'Cette commande ne peut pas recevoir de livraison');
  const lignes = await lignesCommande(env, id);
  const parLigne = new Map<string, number>();
  for (const r of Array.isArray(recu) ? recu : []) {
    const q = Number(r?.quantite_recue);
    if (lignes.some((x) => x.id === r?.ligne_id) && Number.isFinite(q) && q >= 0) parLigne.set(r.ligne_id, q);
  }
  if (acteur !== 'artisan') {
    // Bon de livraison déclaré par le fournisseur : on le note, mais seules les quantités pointées par l'artisan font foi
    const declare = lignes.map((l) => ({ designation: l.designation, declare: parLigne.get(l.id) ?? 0, commande: l.quantite }));
    const toutes = declare.every((x) => x.declare >= x.commande);
    const cible = toutes ? 'livree' : 'livree_partiel';
    if (c.statut !== cible && transitionAutorisee(c.statut, cible, acteur)) {
      await run(env, `UPDATE fournisseurs_commandes SET statut = ?, updated_at = ? WHERE id = ?`, cible, Date.now(), id);
    }
    await journal(env, orgId, 'commande', id, 'bon_livraison', acteur, { lignes: declare });
    const apres = await commandeOuErreur(env, orgId, id);
    return { statut: apres.statut, manquants: declare.filter((x) => x.declare < x.commande).map((x) => ({ designation: x.designation, manque: x.commande - x.declare })) };
  }
  for (const l of lignes) {
    if (!parLigne.has(l.id)) continue;
    l.quantite_livree = Math.min(l.quantite * 2, parLigne.get(l.id)!);
    await run(env, `UPDATE fournisseurs_commandes_lignes SET quantite_livree = ? WHERE id = ?`, l.quantite_livree, l.id);
  }
  const statut = statutDepuisLivraisons(lignes);
  if (statut && statut !== c.statut) {
    await run(env, `UPDATE fournisseurs_commandes SET statut = ?, updated_at = ? WHERE id = ?`, statut, Date.now(), id);
  }
  const manquants = lignes.filter((l) => l.quantite_livree < l.quantite).map((l) => ({ designation: l.designation, manque: Math.round((l.quantite - l.quantite_livree) * 1000) / 1000, unite: l.unite }));
  await journal(env, orgId, 'commande', id, 'livraison', acteur, { manquants });
  return { statut: statut ?? c.statut, manquants };
}

/** Rapprochement facture fournisseur ↔ commande : écart de montant signalé. */
export async function lierFacture(env: Env, ctx: Ctx, id: string, facture: { facture_id: string; montant_ht_cents?: number | null }) {
  const c = await commandeOuErreur(env, ctx.organizationId, id);
  if (c.statut === 'annulee') throw new HttpError(409, 'annulee', 'Commande annulée');
  const attendu = c.total_ht_cents + c.frais_port_cents;
  const montant = entierOuNull(facture.montant_ht_cents, 0, 1_000_000_000, 'montant_ht_cents');
  if (typeof facture.facture_id !== 'string' || !facture.facture_id) throw new HttpError(400, 'facture_requise', 'facture_id requis');
  const ecart = montant != null ? montant - attendu : null;
  await run(env, `UPDATE fournisseurs_commandes SET facture_fournisseur_id = ?, statut = CASE WHEN statut = 'livree' THEN 'facturee' ELSE statut END, updated_at = ? WHERE id = ?`, facture.facture_id, Date.now(), id);
  await journal(env, ctx.organizationId, 'commande', id, 'facture_liee', 'artisan', { facture_id: facture.facture_id, ecart_cents: ecart });
  return { attendu_ht_cents: attendu, ecart_cents: ecart, alerte: ecart != null && Math.abs(ecart) > Math.max(100, attendu * 0.01) };
}

export async function detailCommande(env: Env, ctx: Ctx, id: string) {
  const c = await commandeOuErreur(env, ctx.organizationId, id);
  const [lignes, journalEvts, fournisseur] = await Promise.all([
    lignesCommande(env, id),
    evenements(env, ctx.organizationId, 'commande', id),
    first<{ id: string; nom: string; email: string | null; telephone: string | null }>(env, `SELECT id, nom, email, telephone FROM fournisseurs_annuaire WHERE id = ?`, c.fournisseur_id),
  ]);
  const { token_hash: _t, ...commande } = c;
  return { commande, lignes, fournisseur, journal: journalEvts };
}

export async function listerCommandes(env: Env, ctx: Ctx, filtre: { statut?: string; chantier_id?: string; fournisseur_id?: string; en_cours?: boolean } = {}) {
  const where = ['c.organization_id = ?'];
  const binds: unknown[] = [ctx.organizationId];
  if (filtre.statut) (where.push('c.statut = ?'), binds.push(filtre.statut));
  if (filtre.chantier_id) (where.push('c.chantier_id = ?'), binds.push(filtre.chantier_id));
  if (filtre.fournisseur_id) (where.push('c.fournisseur_id = ?'), binds.push(filtre.fournisseur_id));
  if (filtre.en_cours) where.push(`c.statut IN ('envoyee','confirmee','expediee','livree_partiel')`);
  return all<Omit<Commande, 'token_hash'> & { fournisseur_nom: string; nb_lignes: number }>(
    env,
    `SELECT c.id, c.organization_id, c.numero, c.fournisseur_id, c.demande_id, c.devis_id, c.chantier_id, c.statut, c.canal, c.total_ht_cents,
       c.frais_port_cents, c.livraison_prevue, c.adresse_livraison, c.mode_livraison, c.reference_fournisseur, c.suivi_transporteur,
       c.facture_fournisseur_id, c.message, c.created_by, c.created_at, c.updated_at, f.nom AS fournisseur_nom,
       (SELECT COUNT(*) FROM fournisseurs_commandes_lignes l WHERE l.commande_id = c.id) AS nb_lignes
     FROM fournisseurs_commandes c JOIN fournisseurs_annuaire f ON f.id = c.fournisseur_id
     WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC LIMIT 200`,
    ...binds,
  );
}
