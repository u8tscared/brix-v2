/**
 * Données de démonstration : un plombier-chauffagiste lyonnais avec ses fournisseurs habituels.
 * Toutes les adresses e-mail sont en @exemple.fr (rien ne part chez un vrai fournisseur).
 */

import type { Env } from '../../env';
import { creerFournisseur } from './annuaire';
import { enregistrerPrix } from './catalogue';
import { creerCommande, majStatutCommande } from './commandes';
import { creerDemande, enregistrerReponse, envoyerDemande, type Ctx } from './demandes';
import { all, first, lignesDemande, run } from './depot';
import { DAY_MS } from './util';

export async function demoActive(env: Env, orgId: string): Promise<boolean> {
  const r = await first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM fournisseurs_annuaire WHERE organization_id = ? AND email LIKE '%@exemple.fr'`, orgId);
  return (r?.n ?? 0) > 0;
}

const FOURNISSEURS = [
  { nom: 'Point.P Lyon 7', enseigne: 'point_p', agence: 'Lyon 7 – Gerland', contact_nom: 'Karim B.', email: 'comptoir.lyon7@exemple.fr', metiers: ['plomberie', 'gros_oeuvre'], franco: 300, delai_jours: 2, favori: true },
  { nom: 'Cedeo Villeurbanne', enseigne: 'cedeo', agence: 'Villeurbanne', contact_nom: 'Sophie M.', email: 'cedeo.villeurbanne@exemple.fr', metiers: ['plomberie', 'chauffage'], franco: 250, delai_jours: 1, favori: true },
  { nom: 'Richardson Vénissieux', enseigne: 'richardson', agence: 'Vénissieux', contact_nom: 'Thomas L.', email: 'venissieux@exemple.fr', metiers: ['plomberie', 'chauffage'], franco: 400, delai_jours: 3 },
  { nom: 'Rexel Lyon Est', enseigne: 'rexel', agence: 'Lyon Est', contact_nom: 'Julie R.', email: 'rexel.lyonest@exemple.fr', metiers: ['electricite'], franco: 200, delai_jours: 1 },
  { nom: 'Würth (commercial)', enseigne: 'wurth', agence: null, contact_nom: 'Marc D.', email: 'marc.d@exemple.fr', metiers: [], franco: 150, delai_jours: 2 },
];

const ARTICLES: [string, string, string, string, number][] = [
  // ref, ean, désignation, unité, prix net €
  ['PER16-100', '3245060000011', 'Tube PER nu Ø16 couronne 100 m', 'u', 54.9],
  ['PER20-50', '3245060000028', 'Tube PER gainé Ø20 couronne 50 m', 'u', 61.2],
  ['MULTI16-4', '3245060000035', 'Tube multicouche Ø16 barre 4 m', 'u', 7.4],
  ['RACC-16-15', '3245060000042', 'Raccord à sertir multicouche Ø16 mâle 15/21', 'u', 4.15],
  ['BALLON-200', '3245060000059', 'Chauffe-eau électrique 200 L vertical stéatite', 'u', 389],
  ['GR-SEC-7', '3245060000066', 'Groupe de sécurité 7 bars 3/4', 'u', 18.6],
  ['WC-SUSP-PACK', '3245060000073', 'Pack WC suspendu bâti-support + cuvette sans bride', 'u', 279],
  ['TEFLON-12', '3245060000080', 'Ruban PTFE 12 mm x 12 m', 'u', 0.85],
];

export async function chargerDemo(env: Env, ctx: Ctx) {
  const frs = [];
  for (const f of FOURNISSEURS) frs.push(await creerFournisseur(env, ctx, f));
  const [pointP, cedeo, richardson] = frs;

  // Tarifs : mêmes EAN chez 3 négoces, prix légèrement différents
  const ecarts = [1, 0.96, 1.04];
  for (const [i, f] of [pointP, cedeo, richardson].entries()) {
    for (const [ref, ean, des, unite, prix] of ARTICLES) {
      await enregistrerPrix(env, ctx.organizationId, f.id, {
        reference: `${f.enseigne?.toUpperCase().slice(0, 3)}-${ref}`,
        ean,
        designation: des,
        unite,
        prix_net_cents: Math.round(prix * ecarts[i] * 100),
        source: 'import_csv',
      });
    }
  }
  // Une hausse récente chez Point.P pour montrer l'alerte
  const art = await first<{ id: string }>(env, `SELECT id FROM fournisseurs_catalogue WHERE organization_id = ? AND fournisseur_id = ? AND ean = ?`, ctx.organizationId, pointP.id, '3245060000059');
  if (art) {
    await run(env, `UPDATE fournisseurs_prix_historique SET releve_le = ? WHERE catalogue_id = ?`, Date.now() - 120 * DAY_MS, art.id);
    await enregistrerPrix(env, ctx.organizationId, pointP.id, { reference: 'POI-BALLON-200', ean: '3245060000059', designation: 'Chauffe-eau électrique 200 L vertical stéatite', unite: 'u', prix_net_cents: 42_400, source: 'import_csv' });
  }

  // Demande de prix envoyée à 3 négoces, 2 ont répondu
  const demande = await creerDemande(env, ctx, {
    titre: 'Rénovation salle de bains – Mme Martin',
    fournisseur_ids: [pointP.id, cedeo.id, richardson.id],
    adresse_livraison: '12 rue Paul Bert, 69003 Lyon',
    livraison_souhaitee: Date.now() + 5 * DAY_MS,
    lignes: [
      { designation: 'Pack WC suspendu bâti-support + cuvette sans bride', quantite: 1, prix_cible_cents: 29_000 },
      { designation: 'Chauffe-eau électrique 200 L vertical stéatite', quantite: 1, prix_cible_cents: 40_000 },
      { designation: 'Groupe de sécurité 7 bars 3/4', quantite: 1, prix_cible_cents: 2_000 },
      { designation: 'Tube multicouche Ø16 barre 4 m', quantite: 10, unite: 'u', prix_cible_cents: 800 },
      { designation: 'Raccord à sertir multicouche Ø16 mâle 15/21', quantite: 12, prix_cible_cents: 450 },
    ],
  });
  await envoyerDemande(env, ctx, demande.id);
  const lignes = await lignesDemande(env, demande.id);
  const dests = await all<{ id: string; fournisseur_id: string }>(env, `SELECT id, fournisseur_id FROM fournisseurs_demandes_destinataires WHERE demande_id = ?`, demande.id);
  const prixBase = [27_900, 38_900, 1_860, 740, 415];
  for (const [fid, coef, port, delai] of [
    [pointP.id, 1.02, 2_500, 2],
    [cedeo.id, 0.97, 0, 1],
  ] as const) {
    const dest = dests.find((d) => d.fournisseur_id === fid)!;
    await enregistrerReponse(
      env,
      dest.id,
      {
        lignes: lignes.map((l, i) => ({ ligne_id: l.id, prix_unitaire_cents: Math.round(prixBase[i] * coef) })),
        frais_port_cents: port,
        delai_livraison_jours: delai,
        validite_jours: 30,
        commentaire: fid === cedeo.id ? 'Chauffe-eau en stock à Villeurbanne, livraison demain possible.' : null,
      },
      'fournisseur',
    );
  }

  // Une commande déjà expédiée (livraison demain)
  const cmd = await creerCommande(env, ctx, {
    fournisseur_id: cedeo.id,
    adresse_livraison: '4 impasse des Lilas, 69100 Villeurbanne',
    livraison_prevue: Date.now() + DAY_MS,
    lignes: [
      { designation: 'Tube PER gainé Ø20 couronne 50 m', reference: 'CED-PER20-50', quantite: 2, prix_unitaire_cents: 5_875 },
      { designation: 'Ruban PTFE 12 mm x 12 m', reference: 'CED-TEFLON-12', quantite: 10, prix_unitaire_cents: 82 },
    ],
  });
  await run(env, `UPDATE fournisseurs_commandes SET statut = 'envoyee' WHERE id = ?`, cmd.id);
  await majStatutCommande(env, ctx.organizationId, cmd.id, { statut: 'confirmee', reference_fournisseur: 'ARC-558120' }, 'fournisseur');
  await majStatutCommande(env, ctx.organizationId, cmd.id, { statut: 'expediee', suivi_transporteur: 'Livraison camion Cedeo, créneau 7h-9h' }, 'fournisseur');

  return { fournisseurs: frs.length, demande: demande.numero, commande: cmd.numero };
}
