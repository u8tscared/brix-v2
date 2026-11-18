/**
 * Portail fournisseur : le fournisseur ouvre le lien reçu par e-mail et répond sans compte.
 * Le jeton (256 bits) n'est jamais stocké en clair : on compare son SHA-256.
 * Un jeton donne accès à UNE demande ou UNE commande, rien d'autre.
 */

import type { Env } from '../../env';
import { declinerDemande, enregistrerReponse, type ReponseInput } from './demandes';
import { majStatutCommande, type MajStatutInput } from './commandes';
import { all, first, journal, lignesCommande, lignesDemande, run } from './depot';
import { lireEntreprise } from './sources';
import type { Commande, Demande, Destinataire, ReponseLigne } from './types';
import { HttpError, sha256Hex } from './util';

type Cible =
  | { type: 'demande'; dest: Destinataire; demande: Demande }
  | { type: 'commande'; commande: Commande };

async function resoudre(env: Env, token: string): Promise<Cible> {
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) throw new HttpError(404, 'lien_invalide', 'Ce lien est invalide');
  const hash = await sha256Hex(token);
  const dest =
    (await first<Destinataire>(env, `SELECT * FROM fournisseurs_demandes_destinataires WHERE token_hash = ?`, hash)) ??
    (await first<Destinataire>(
      env,
      `SELECT dd.* FROM fournisseurs_jetons_anciens j JOIN fournisseurs_demandes_destinataires dd ON dd.id = j.destinataire_id WHERE j.token_hash = ?`,
      hash,
    ));
  if (dest) {
    if (dest.expire_le < Date.now()) throw new HttpError(410, 'lien_expire', 'Ce lien a expiré. Demandez à votre client de vous renvoyer la demande.');
    const demande = await first<Demande>(env, `SELECT * FROM fournisseurs_demandes WHERE id = ?`, dest.demande_id);
    if (!demande) throw new HttpError(404, 'lien_invalide', 'Ce lien est invalide');
    return { type: 'demande', dest, demande };
  }
  const commande = await first<Commande>(env, `SELECT * FROM fournisseurs_commandes WHERE token_hash = ?`, hash);
  if (commande) {
    if (commande.created_at < Date.now() - 180 * 86_400_000) throw new HttpError(410, 'lien_expire', 'Ce lien a expiré.');
    return { type: 'commande', commande };
  }
  throw new HttpError(404, 'lien_invalide', 'Ce lien est invalide ou a été remplacé par un plus récent');
}

export async function lirePortail(env: Env, token: string) {
  const cible = await resoudre(env, token);
  if (cible.type === 'demande') {
    const { dest, demande } = cible;
    const entreprise = await lireEntreprise(env, demande.organization_id);
    if (!dest.vu_le) {
      await run(env, `UPDATE fournisseurs_demandes_destinataires SET vu_le = ?, statut = CASE WHEN statut IN ('a_envoyer','envoyee') THEN 'vue' ELSE statut END WHERE id = ?`, Date.now(), dest.id);
      const f = await first<{ nom: string }>(env, `SELECT nom FROM fournisseurs_annuaire WHERE id = ?`, dest.fournisseur_id);
      await journal(env, demande.organization_id, 'demande', demande.id, 'vue', 'fournisseur', { fournisseur: f?.nom });
    }
    const lignes = await lignesDemande(env, demande.id);
    const reps = await all<ReponseLigne>(env, `SELECT * FROM fournisseurs_reponses_lignes WHERE destinataire_id = ?`, dest.id);
    return {
      type: 'demande' as const,
      entreprise: { nom: entreprise.nom, telephone: entreprise.telephone, email: entreprise.email },
      demande: {
        numero: demande.numero,
        titre: demande.titre,
        statut: demande.statut,
        date_limite: demande.date_limite,
        livraison_souhaitee: demande.livraison_souhaitee,
        adresse_livraison: demande.adresse_livraison,
        message: demande.message,
        ouverte: !['annulee', 'commandee'].includes(demande.statut),
      },
      lignes: lignes.map((l) => ({ id: l.id, position: l.position, designation: l.designation, reference: l.reference, quantite: l.quantite, unite: l.unite })),
      ma_reponse: {
        statut: dest.statut,
        delai_livraison_jours: dest.delai_livraison_jours,
        frais_port_cents: dest.frais_port_cents,
        validite_jours: dest.validite_jours,
        commentaire: dest.commentaire,
        lignes: reps.map((r) => ({ ligne_id: r.ligne_id, prix_unitaire_cents: r.prix_unitaire_cents, disponible: !!r.disponible, reference_proposee: r.reference_proposee, designation_proposee: r.designation_proposee, commentaire: r.commentaire })),
      },
    };
  }
  const c = cible.commande;
  const entreprise = await lireEntreprise(env, c.organization_id);
  const lignes = await lignesCommande(env, c.id);
  return {
    type: 'commande' as const,
    entreprise: { nom: entreprise.nom, telephone: entreprise.telephone, email: entreprise.email },
    commande: {
      numero: c.numero,
      statut: c.statut,
      total_ht_cents: c.total_ht_cents,
      frais_port_cents: c.frais_port_cents,
      livraison_prevue: c.livraison_prevue,
      adresse_livraison: c.adresse_livraison,
      mode_livraison: c.mode_livraison,
      reference_fournisseur: c.reference_fournisseur,
      suivi_transporteur: c.suivi_transporteur,
      message: c.message,
    },
    lignes: lignes.map((l) => ({ id: l.id, designation: l.designation, reference: l.reference, quantite: l.quantite, unite: l.unite, prix_unitaire_cents: l.prix_unitaire_cents })),
  };
}

export async function repondrePortail(env: Env, token: string, input: ReponseInput) {
  const cible = await resoudre(env, token);
  if (cible.type !== 'demande') throw new HttpError(400, 'mauvais_lien', "Ce lien concerne une commande, pas une demande de prix");
  await enregistrerReponse(env, cible.demande.organization_id, cible.dest.id, input, 'fournisseur');
  return { ok: true, message: 'Merci, votre réponse a bien été transmise.' };
}

export async function declinerPortail(env: Env, token: string, motif: string | null) {
  const cible = await resoudre(env, token);
  if (cible.type !== 'demande') throw new HttpError(400, 'mauvais_lien', 'Ce lien concerne une commande');
  await declinerDemande(env, cible.demande.organization_id, cible.dest.id, motif, 'fournisseur');
  return { ok: true };
}

export async function statutPortail(env: Env, token: string, input: MajStatutInput) {
  const cible = await resoudre(env, token);
  if (cible.type !== 'commande') throw new HttpError(400, 'mauvais_lien', 'Ce lien concerne une demande de prix');
  if (!['confirmee', 'expediee', 'livree'].includes(input.statut)) throw new HttpError(400, 'statut_invalide', 'Statut non autorisé');
  const c = await majStatutCommande(env, cible.commande.organization_id, cible.commande.id, input, 'fournisseur');
  return { ok: true, statut: c.statut };
}
