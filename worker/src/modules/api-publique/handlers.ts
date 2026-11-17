/**
 * API publique Brix Fournisseurs v1 — logique métier côté partenaire.
 * Un partenaire ne voit QUE les demandes et commandes des artisans qui l'ont relié (api_liaisons).
 */

import type { Env } from '../../env';
import { enregistrerPrix } from '../fournisseurs/catalogue';
import { enregistrerLivraison, majStatutCommande, type MajStatutInput } from '../fournisseurs/commandes';
import { declinerDemande, enregistrerReponse, type ReponseInput } from '../fournisseurs/demandes';
import { all, first, fournisseurOuErreur, journal, lignesCommande, lignesDemande, run } from '../fournisseurs/depot';
import { lireEntreprise } from '../fournisseurs/sources';
import type { Commande } from '../fournisseurs/types';
import { HttpError, newId, parseJsonArray, randomToken } from '../fournisseurs/util';
import { creerCle, genererCodePartenaire, TOUS_SCOPES, type PartenaireCtx, type Scope } from './auth';
import { emettre, urlWebhookAutorisee, EVENEMENTS_WEBHOOK, type EvenementWebhook } from './webhooks';

/** Inscription libre d'un fournisseur : crée le compte partenaire et une première clé. */
export async function inscrirePartenaire(env: Env, input: { nom?: string; email_technique?: string; siret?: string }) {
  const nom = input.nom?.trim();
  if (!nom || nom.length < 2) throw new HttpError(400, 'nom_requis', "Nom de l'entreprise requis");
  if (!input.email_technique || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email_technique)) throw new HttpError(400, 'email_requis', 'E-mail technique requis');
  const id = newId('ptn');
  const code = genererCodePartenaire();
  await run(env, `INSERT INTO api_partenaires (id, nom, code, email_technique, siret, actif, created_at) VALUES (?,?,?,?,?,1,?)`, id, nom.slice(0, 120), code, input.email_technique, input.siret ?? null, Date.now());
  const cle = await creerCle(env, id, 'Clé principale', TOUS_SCOPES, 'live');
  return {
    partenaire: { id, nom, code },
    cle,
    prochaine_etape: `Donnez le code ${code} à vos clients artisans : ils le saisissent sur votre fiche dans Brix (Achats › Fournisseurs) pour vous relier.`,
  };
}

/** Côté artisan : relie une fiche fournisseur à un partenaire API via son code. */
export async function relierPartenaire(env: Env, orgId: string, fournisseurId: string, code: string) {
  const f = await fournisseurOuErreur(env, orgId, fournisseurId);
  const p = await first<{ id: string; nom: string }>(env, `SELECT id, nom FROM api_partenaires WHERE code = ? AND actif = 1`, code.trim().toUpperCase());
  if (!p) throw new HttpError(404, 'code_inconnu', 'Code partenaire inconnu. Vérifiez-le auprès de votre fournisseur.');
  const id = newId('lia');
  await run(
    env,
    `INSERT INTO api_liaisons (id, partenaire_id, organization_id, fournisseur_id, numero_compte_client, statut, created_at) VALUES (?,?,?,?,?, 'active', ?)
     ON CONFLICT (partenaire_id, organization_id, fournisseur_id) DO UPDATE SET statut = 'active'`,
    id, p.id, orgId, fournisseurId, f.numero_compte_client, Date.now(),
  );
  await run(env, `UPDATE fournisseurs_annuaire SET connecteur = 'api_brix', updated_at = ? WHERE id = ?`, Date.now(), fournisseurId);
  const liaison = await first<{ id: string }>(env, `SELECT id FROM api_liaisons WHERE partenaire_id = ? AND organization_id = ? AND fournisseur_id = ?`, p.id, orgId, fournisseurId);
  const ent = await lireEntreprise(env, orgId);
  await emettre(env, p.id, 'liaison.creee', { client_id: liaison!.id, entreprise: ent.nom, numero_compte_client: f.numero_compte_client });
  await journal(env, orgId, 'connexion', fournisseurId, 'reliee_api', 'artisan', { partenaire: p.nom });
  return { ok: true, partenaire: p.nom };
}

export class ApiFournisseursService {
  constructor(
    private env: Env,
    private ctx: PartenaireCtx,
  ) {}

  async moi() {
    const p = await first<{ id: string; nom: string; code: string; email_technique: string | null }>(this.env, `SELECT id, nom, code, email_technique FROM api_partenaires WHERE id = ?`, this.ctx.partenaireId);
    return { ...p, cle: { id: this.ctx.cleId, scopes: this.ctx.scopes, mode: this.ctx.mode } };
  }

  /** Les artisans qui vous ont relié (vos « clients » dans Brix). */
  async clients() {
    const rows = await all<{ id: string; organization_id: string; numero_compte_client: string | null; created_at: number; statut: string }>(
      this.env,
      `SELECT id, organization_id, numero_compte_client, created_at, statut FROM api_liaisons WHERE partenaire_id = ? ORDER BY created_at DESC`,
      this.ctx.partenaireId,
    );
    const out = [];
    for (const r of rows) {
      const e = await lireEntreprise(this.env, r.organization_id);
      out.push({ client_id: r.id, entreprise: e.nom, siret: e.siret, numero_compte_client: r.numero_compte_client, statut: r.statut, relie_le: new Date(r.created_at).toISOString() });
    }
    return { data: out };
  }

  private async liaison(clientId: string) {
    const l = await first<{ organization_id: string; fournisseur_id: string }>(
      this.env,
      `SELECT organization_id, fournisseur_id FROM api_liaisons WHERE id = ? AND partenaire_id = ? AND statut = 'active'`,
      clientId,
      this.ctx.partenaireId,
    );
    if (!l) throw new HttpError(404, 'client_introuvable', 'Client introuvable');
    return l;
  }

  async demandes(statut?: string) {
    const rows = await all<{ id: string; statut: string; numero: string; titre: string; date_limite: number | null; livraison_souhaitee: number | null; created_at: number; client_id: string; demande_statut: string }>(
      this.env,
      `SELECT dd.id, dd.statut, d.numero, d.titre, d.date_limite, d.livraison_souhaitee, d.created_at, l.id AS client_id, d.statut AS demande_statut
       FROM fournisseurs_demandes_destinataires dd
       JOIN fournisseurs_demandes d ON d.id = dd.demande_id
       JOIN api_liaisons l ON l.organization_id = d.organization_id AND l.fournisseur_id = dd.fournisseur_id
       WHERE l.partenaire_id = ? AND l.statut = 'active' AND dd.statut != 'a_envoyer' ${statut ? 'AND dd.statut = ?' : ''}
       ORDER BY d.created_at DESC LIMIT 200`,
      ...(statut ? [this.ctx.partenaireId, statut] : [this.ctx.partenaireId]),
    );
    return { data: rows.map((r) => ({ ...r, ouverte: !['annulee', 'commandee'].includes(r.demande_statut) })) };
  }

  private async destinataire(id: string) {
    const r = await first<{ id: string; demande_id: string; organization_id: string; statut: string }>(
      this.env,
      `SELECT dd.id, dd.demande_id, d.organization_id, dd.statut FROM fournisseurs_demandes_destinataires dd
       JOIN fournisseurs_demandes d ON d.id = dd.demande_id
       JOIN api_liaisons l ON l.organization_id = d.organization_id AND l.fournisseur_id = dd.fournisseur_id
       WHERE dd.id = ? AND l.partenaire_id = ? AND l.statut = 'active'`,
      id,
      this.ctx.partenaireId,
    );
    if (!r) throw new HttpError(404, 'demande_introuvable', 'Demande introuvable');
    if (r.statut === 'a_envoyer') throw new HttpError(404, 'demande_introuvable', 'Demande introuvable');
    return r;
  }

  async demande(id: string) {
    const r = await this.destinataire(id);
    const d = await first<{ numero: string; titre: string; statut: string; date_limite: number | null; livraison_souhaitee: number | null; adresse_livraison: string | null; message: string | null }>(
      this.env,
      `SELECT numero, titre, statut, date_limite, livraison_souhaitee, adresse_livraison, message FROM fournisseurs_demandes WHERE id = ?`,
      r.demande_id,
    );
    const ent = await lireEntreprise(this.env, r.organization_id);
    const lignes = await lignesDemande(this.env, r.demande_id);
    return {
      ...d,
      demande_statut: d?.statut,
      id: r.id,
      statut: r.statut,
      client: { entreprise: ent.nom },
      lignes: lignes.map((l) => ({ ligne_id: l.id, position: l.position, designation: l.designation, reference: l.reference, quantite: l.quantite, unite: l.unite })),
    };
  }

  async repondre(id: string, input: ReponseInput) {
    const r = await this.destinataire(id);
    await enregistrerReponse(this.env, r.organization_id, id, input, 'api');
    return { ok: true };
  }

  async decliner(id: string, motif: string | null) {
    const r = await this.destinataire(id);
    await declinerDemande(this.env, r.organization_id, id, motif, 'api');
    return { ok: true };
  }

  async commandes(statut?: string) {
    const rows = await all<Omit<Commande, 'token_hash'> & { client_id: string }>(
      this.env,
      `SELECT c.id, c.numero, c.statut, c.total_ht_cents, c.frais_port_cents, c.livraison_prevue, c.adresse_livraison, c.mode_livraison,
         c.reference_fournisseur, c.suivi_transporteur, c.created_at, c.updated_at, l.id AS client_id
       FROM fournisseurs_commandes c JOIN api_liaisons l ON l.organization_id = c.organization_id AND l.fournisseur_id = c.fournisseur_id
       WHERE l.partenaire_id = ? AND l.statut = 'active' AND c.statut != 'brouillon' ${statut ? 'AND c.statut = ?' : ''}
       ORDER BY c.created_at DESC LIMIT 200`,
      ...(statut ? [this.ctx.partenaireId, statut] : [this.ctx.partenaireId]),
    );
    return { data: rows };
  }

  private async commandeAutorisee(id: string) {
    const c = await first<Commande & { client_id: string; numero_compte_client: string | null }>(
      this.env,
      `SELECT c.*, l.id AS client_id, l.numero_compte_client FROM fournisseurs_commandes c
       JOIN api_liaisons l ON l.organization_id = c.organization_id AND l.fournisseur_id = c.fournisseur_id
       WHERE c.id = ? AND l.partenaire_id = ? AND l.statut = 'active' AND c.statut != 'brouillon'`,
      id,
      this.ctx.partenaireId,
    );
    if (!c) throw new HttpError(404, 'commande_introuvable', 'Commande introuvable');
    return c;
  }

  async commande(id: string) {
    const c = await this.commandeAutorisee(id);
    const lignes = await lignesCommande(this.env, id);
    const ent = await lireEntreprise(this.env, c.organization_id);
    const { token_hash: _t, organization_id: _o, created_by: _c, fournisseur_id: _f, devis_id: _d, chantier_id: _ch, facture_fournisseur_id: _ff, ...pub } = c;
    return {
      ...pub,
      client: { entreprise: ent.nom, numero_compte_client: c.numero_compte_client },
      lignes: lignes.map((l) => ({ ligne_id: l.id, designation: l.designation, reference: l.reference, ean: l.ean, quantite: l.quantite, quantite_livree: l.quantite_livree, unite: l.unite, prix_unitaire_cents: l.prix_unitaire_cents })),
    };
  }

  async statutCommande(id: string, input: MajStatutInput) {
    const c = await this.commandeAutorisee(id);
    const r = await majStatutCommande(this.env, c.organization_id, id, input, 'api');
    return { id: r.id, statut: r.statut };
  }

  async livraisonCommande(id: string, lignes: { ligne_id: string; quantite_livree: number }[]) {
    const c = await this.commandeAutorisee(id);
    return enregistrerLivraison(this.env, c.organization_id, id, lignes.map((l) => ({ ligne_id: l.ligne_id, quantite_recue: l.quantite_livree })), 'api');
  }

  /** Envoi des prix nets négociés pour UN client (max 5 000 articles par appel). */
  async publierTarif(clientId: string, articles: { reference: string; designation: string; prix_net_cents: number; ean?: string; unite?: string; marque?: string; famille?: string; prix_public_cents?: number }[]) {
    const l = await this.liaison(clientId);
    if (!Array.isArray(articles) || articles.length === 0) throw new HttpError(400, 'articles_requis', 'Liste « articles » vide');
    if (articles.length > 5000) throw new HttpError(413, 'trop_d_articles', '5 000 articles maximum par appel');
    const res = { crees: 0, mis_a_jour: 0, identiques: 0, rejets: [] as { index: number; raison: string }[] };
    for (const [i, a] of articles.entries()) {
      if (!a?.reference || !a?.designation || !Number.isInteger(a.prix_net_cents) || a.prix_net_cents < 0) {
        res.rejets.push({ index: i, raison: 'reference, designation et prix_net_cents (entier ≥ 0) obligatoires' });
        continue;
      }
      const r = await enregistrerPrix(this.env, l.organization_id, l.fournisseur_id, {
        reference: String(a.reference).slice(0, 60),
        designation: String(a.designation).slice(0, 240),
        ean: a.ean ?? null,
        unite: a.unite ?? 'u',
        marque: a.marque ?? null,
        famille: a.famille ?? null,
        prix_public_cents: a.prix_public_cents ?? null,
        prix_net_cents: a.prix_net_cents,
        source: 'api',
      });
      if (r === 'cree') res.crees++;
      else if (r === 'maj') res.mis_a_jour++;
      else res.identiques++;
    }
    return res;
  }

  async webhooks() {
    const rows = await all<{ id: string; url: string; evenements: string; actif: number; echecs_consecutifs: number; created_at: number }>(
      this.env,
      `SELECT id, url, evenements, actif, echecs_consecutifs, created_at FROM api_webhooks WHERE partenaire_id = ?`,
      this.ctx.partenaireId,
    );
    return { data: rows.map((r) => ({ ...r, evenements: parseJsonArray(r.evenements), actif: !!r.actif })) };
  }

  async creerWebhook(input: { url?: string; evenements?: string[] }) {
    let u: URL;
    try {
      u = new URL(input.url ?? '');
    } catch {
      throw new HttpError(400, 'url_invalide', 'URL invalide');
    }
    if (u.protocol !== 'https:') throw new HttpError(400, 'https_requis', 'Les webhooks doivent être en HTTPS');
    if (!urlWebhookAutorisee(u)) throw new HttpError(400, 'url_interdite', 'Adresse interdite : utilisez un nom de domaine public en HTTPS (port 443 ou 8443)');
    const evts = (input.evenements ?? EVENEMENTS_WEBHOOK).filter((e): e is EvenementWebhook => EVENEMENTS_WEBHOOK.includes(e as EvenementWebhook));
    if (evts.length === 0) throw new HttpError(400, 'evenements_requis', `Événements possibles : ${EVENEMENTS_WEBHOOK.join(', ')}`);
    const n = await first<{ n: number }>(this.env, `SELECT COUNT(*) AS n FROM api_webhooks WHERE partenaire_id = ?`, this.ctx.partenaireId);
    if ((n?.n ?? 0) >= 10) throw new HttpError(409, 'limite', '10 webhooks maximum');
    const id = newId('wh');
    const secret = `whsec_${randomToken(24)}`;
    await run(this.env, `INSERT INTO api_webhooks (id, partenaire_id, url, secret, evenements, actif, echecs_consecutifs, created_at) VALUES (?,?,?,?,?,1,0,?)`, id, this.ctx.partenaireId, u.toString(), secret, JSON.stringify(evts), Date.now());
    return { id, url: u.toString(), evenements: evts, secret, avertissement: 'Conservez ce secret : il sert à vérifier la signature Brix-Signature et ne sera plus affiché.' };
  }

  async supprimerWebhook(id: string) {
    await run(this.env, `DELETE FROM api_webhooks WHERE id = ? AND partenaire_id = ?`, id, this.ctx.partenaireId);
    return { ok: true };
  }

  creerCle(input: { nom?: string; scopes?: Scope[]; mode?: 'live' | 'test' }) {
    // Une clé ne peut jamais créer une clé plus puissante qu'elle-même.
    const demandes = input.scopes ?? this.ctx.scopes;
    const autorises = demandes.filter((s) => this.ctx.scopes.includes(s));
    if (autorises.length !== demandes.length) throw new HttpError(403, 'scope_refuse', 'Une clé ne peut pas accorder des droits qu’elle n’a pas');
    const mode = this.ctx.mode === 'test' ? 'test' : input.mode === 'test' ? 'test' : 'live';
    return creerCle(this.env, this.ctx.partenaireId, String(input.nom ?? 'Clé').slice(0, 80), autorises, mode);
  }

  async revoquerCle(id: string) {
    if (id === this.ctx.cleId) throw new HttpError(409, 'cle_courante', 'Impossible de révoquer la clé utilisée pour cet appel');
    await run(this.env, `UPDATE api_cles SET revoquee_le = ? WHERE id = ? AND partenaire_id = ?`, Date.now(), id, this.ctx.partenaireId);
    return { ok: true };
  }
}
