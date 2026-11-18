/**
 * Annuaire des fournisseurs de l'entreprise + tableau de bord Achats.
 */

import type { Env } from '../../env';
import { haussesRecentes } from './catalogue';
import { connecteur } from './connecteurs/registre';
import { all, first, fournisseurOuErreur, run } from './depot';
import type { Ctx } from './demandes';
import type { Fournisseur } from './types';
import { DAY_MS, HttpError, newId, parseEurosToCents } from './util';

export interface FournisseurInput {
  nom?: string;
  enseigne?: string | null;
  agence?: string | null;
  contact_nom?: string | null;
  email?: string | null;
  telephone?: string | null;
  siret?: string | null;
  numero_compte_client?: string | null;
  metiers?: string[];
  remise_pct?: number | null;
  franco?: number | string | null; // euros
  delai_jours?: number | null;
  connecteur?: string;
  favori?: boolean;
  note?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valider(input: FournisseurInput, creation: boolean) {
  if (creation && !input.nom?.trim()) throw new HttpError(400, 'nom_requis', 'Le nom du fournisseur est obligatoire');
  if (input.email && !EMAIL_RE.test(input.email.trim())) throw new HttpError(400, 'email_invalide', 'Adresse e-mail invalide');
  if (input.siret && !/^\d{14}$/.test(input.siret.replace(/\s/g, ''))) throw new HttpError(400, 'siret_invalide', 'Le SIRET doit faire 14 chiffres');
  if (input.connecteur && !connecteur(input.connecteur)) throw new HttpError(400, 'connecteur_inconnu', 'Connecteur inconnu');
  if (input.remise_pct != null && (input.remise_pct < 0 || input.remise_pct >= 100)) throw new HttpError(400, 'remise_invalide', 'Remise entre 0 et 99 %');
}

export async function creerFournisseur(env: Env, ctx: Ctx, input: FournisseurInput): Promise<Fournisseur> {
  valider(input, true);
  const now = Date.now();
  const f: Fournisseur = {
    id: newId('frn'),
    organization_id: ctx.organizationId,
    nom: input.nom!.trim().slice(0, 120),
    enseigne: input.enseigne ?? null,
    agence: input.agence?.trim() || null,
    contact_nom: input.contact_nom?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    telephone: input.telephone?.trim() || null,
    siret: input.siret?.replace(/\s/g, '') || null,
    numero_compte_client: input.numero_compte_client?.trim() || null,
    metiers: JSON.stringify(input.metiers ?? []),
    remise_pct: input.remise_pct ?? null,
    franco_cents: input.franco != null ? parseEurosToCents(input.franco) : null,
    delai_jours: input.delai_jours ?? null,
    connecteur: input.connecteur ?? (input.enseigne && connecteur(input.enseigne) ? input.enseigne : 'email'),
    favori: input.favori ? 1 : 0,
    note: input.note ?? null,
    archive: 0,
    created_at: now,
    updated_at: now,
  };
  await run(
    env,
    `INSERT INTO fournisseurs_annuaire (id, organization_id, nom, enseigne, agence, contact_nom, email, telephone, siret, numero_compte_client, metiers, remise_pct, franco_cents, delai_jours, connecteur, favori, note, archive, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    f.id, f.organization_id, f.nom, f.enseigne, f.agence, f.contact_nom, f.email, f.telephone, f.siret, f.numero_compte_client, f.metiers,
    f.remise_pct, f.franco_cents, f.delai_jours, f.connecteur, f.favori, f.note, 0, now, now,
  );
  return f;
}

export async function modifierFournisseur(env: Env, ctx: Ctx, id: string, input: FournisseurInput): Promise<Fournisseur> {
  valider(input, false);
  const f = await fournisseurOuErreur(env, ctx.organizationId, id);
  const champs: Record<string, unknown> = {};
  if (input.nom !== undefined) champs.nom = input.nom.trim().slice(0, 120);
  if (input.enseigne !== undefined) champs.enseigne = input.enseigne;
  if (input.agence !== undefined) champs.agence = input.agence;
  if (input.contact_nom !== undefined) champs.contact_nom = input.contact_nom;
  if (input.email !== undefined) champs.email = input.email?.trim().toLowerCase() || null;
  if (input.telephone !== undefined) champs.telephone = input.telephone;
  if (input.siret !== undefined) champs.siret = input.siret?.replace(/\s/g, '') || null;
  if (input.numero_compte_client !== undefined) champs.numero_compte_client = input.numero_compte_client;
  if (input.metiers !== undefined) champs.metiers = JSON.stringify(input.metiers);
  if (input.remise_pct !== undefined) champs.remise_pct = input.remise_pct;
  if (input.franco !== undefined) champs.franco_cents = input.franco != null ? parseEurosToCents(input.franco) : null;
  if (input.delai_jours !== undefined) champs.delai_jours = input.delai_jours;
  if (input.connecteur !== undefined) champs.connecteur = input.connecteur;
  if (input.favori !== undefined) champs.favori = input.favori ? 1 : 0;
  if (input.note !== undefined) champs.note = input.note;
  const cles = Object.keys(champs);
  if (cles.length === 0) return f;
  await run(
    env,
    `UPDATE fournisseurs_annuaire SET ${cles.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND organization_id = ?`,
    ...cles.map((k) => champs[k]),
    Date.now(),
    id,
    ctx.organizationId,
  );
  return fournisseurOuErreur(env, ctx.organizationId, id);
}

export async function archiverFournisseur(env: Env, ctx: Ctx, id: string): Promise<void> {
  await fournisseurOuErreur(env, ctx.organizationId, id);
  await run(env, `UPDATE fournisseurs_annuaire SET archive = 1, updated_at = ? WHERE id = ? AND organization_id = ?`, Date.now(), id, ctx.organizationId);
}

export async function listerFournisseurs(env: Env, ctx: Ctx, opts: { metier?: string; q?: string } = {}) {
  const rows = await all<Fournisseur & { nb_articles: number; commandes_12m_cents: number | null }>(
    env,
    `SELECT f.*,
       (SELECT COUNT(*) FROM fournisseurs_catalogue c WHERE c.fournisseur_id = f.id) AS nb_articles,
       (SELECT SUM(total_ht_cents) FROM fournisseurs_commandes c WHERE c.fournisseur_id = f.id AND c.statut NOT IN ('brouillon','annulee') AND c.created_at > ?) AS commandes_12m_cents
     FROM fournisseurs_annuaire f WHERE f.organization_id = ? AND f.archive = 0 ORDER BY f.favori DESC, f.nom`,
    Date.now() - 365 * DAY_MS,
    ctx.organizationId,
  );
  const q = opts.q?.toLowerCase().trim();
  return rows.filter(
    (f) =>
      (!opts.metier || JSON.parse(f.metiers || '[]').includes(opts.metier)) &&
      (!q || `${f.nom} ${f.agence ?? ''} ${f.contact_nom ?? ''}`.toLowerCase().includes(q)),
  );
}

/** Tableau de bord Achats : ce que l'artisan doit voir en ouvrant l'onglet. */
export async function tableauDeBord(env: Env, ctx: Ctx) {
  const org = ctx.organizationId;
  const now = Date.now();
  const debutJour = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const [enCours, livraisons, demandes, depenses, hausses, sansReponse] = await Promise.all([
    first<{ n: number; total: number | null }>(env, `SELECT COUNT(*) AS n, SUM(total_ht_cents) AS total FROM fournisseurs_commandes WHERE organization_id = ? AND statut IN ('envoyee','confirmee','expediee','livree_partiel')`, org),
    all<{ id: string; numero: string; fournisseur_nom: string; livraison_prevue: number; statut: string; adresse_livraison: string | null }>(
      env,
      `SELECT c.id, c.numero, f.nom AS fournisseur_nom, c.livraison_prevue, c.statut, c.adresse_livraison FROM fournisseurs_commandes c
       JOIN fournisseurs_annuaire f ON f.id = c.fournisseur_id
       WHERE c.organization_id = ? AND c.statut IN ('envoyee','confirmee','expediee','livree_partiel') AND c.livraison_prevue IS NOT NULL AND c.livraison_prevue < ?
       ORDER BY c.livraison_prevue LIMIT 20`,
      org,
      debutJour + 8 * DAY_MS,
    ),
    all<{ id: string; numero: string; titre: string; statut: string; nb_reponses: number; nb_destinataires: number; date_limite: number | null }>(
      env,
      `SELECT d.id, d.numero, d.titre, d.statut, d.date_limite,
         (SELECT COUNT(*) FROM fournisseurs_demandes_destinataires x WHERE x.demande_id = d.id AND x.statut = 'repondue') AS nb_reponses,
         (SELECT COUNT(*) FROM fournisseurs_demandes_destinataires x WHERE x.demande_id = d.id) AS nb_destinataires
       FROM fournisseurs_demandes d WHERE d.organization_id = ? AND d.statut IN ('envoyee','reponses_partielles','complete') ORDER BY d.created_at DESC LIMIT 10`,
      org,
    ),
    first<{ mois: number | null }>(env, `SELECT SUM(total_ht_cents + frais_port_cents) AS mois FROM fournisseurs_commandes WHERE organization_id = ? AND statut NOT IN ('brouillon','annulee') AND created_at >= ?`, org, now - 30 * DAY_MS),
    haussesRecentes(env, org, 60, 5),
    first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM fournisseurs_demandes_destinataires x JOIN fournisseurs_demandes d ON d.id = x.demande_id WHERE d.organization_id = ? AND x.statut IN ('envoyee','vue') AND d.date_limite < ? AND d.statut NOT IN ('annulee','commandee')`, org, now),
  ]);
  const retard = livraisons.filter((l) => l.livraison_prevue < debutJour);
  return {
    commandes_en_cours: { nombre: enCours?.n ?? 0, total_ht_cents: enCours?.total ?? 0 },
    livraisons_a_venir: livraisons.filter((l) => l.livraison_prevue >= debutJour),
    livraisons_en_retard: retard,
    demandes_ouvertes: demandes,
    depenses_30j_cents: depenses?.mois ?? 0,
    hausses_prix: hausses.slice(0, 10),
    a_faire: [
      ...demandes.filter((d) => d.statut === 'complete').map((d) => ({ type: 'comparer', texte: `Toutes les réponses sont arrivées pour ${d.numero} : choisissez votre fournisseur.`, lien: `demandes/${d.id}` })),
      ...retard.map((l) => ({ type: 'relancer', texte: `${l.fournisseur_nom} : livraison ${l.numero} en retard.`, lien: `commandes/${l.id}` })),
      ...((sansReponse?.n ?? 0) > 0 ? [{ type: 'relancer', texte: `${sansReponse!.n} fournisseur(s) n'ont pas répondu dans les temps.`, lien: 'demandes' }] : []),
    ],
  };
}
