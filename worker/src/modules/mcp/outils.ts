/**
 * Outils Brix AI MCP — lecture seule, en français, pensés pour qu'un assistant (Claude, ChatGPT…)
 * réponde aux questions d'un artisan sur SES chiffres : « qui me doit de l'argent ? »,
 * « combien j'ai signé ce mois-ci ? », « où acheter mes tubes PER le moins cher ? ».
 *
 * Chaque réponse porte « donnees_du » (horodatage de lecture) et « vide: true » quand il n'y a rien,
 * pour que l'assistant dise ce qui manque au lieu d'inventer.
 */

import type { Env } from '../../env';
import { tableauDeBord, listerFournisseurs } from '../fournisseurs/annuaire';
import { haussesRecentes, rechercherCatalogue } from '../fournisseurs/catalogue';
import { listerCommandes } from '../fournisseurs/commandes';
import { comparatifDemande, listerDemandes } from '../fournisseurs/demandes';
import { all, first, lignesDemande } from '../fournisseurs/depot';
import { clampInt, parseJsonArray } from '../fournisseurs/util';
import type { McpCtx } from './jetons';

type Args = Record<string, unknown>;

export interface Outil {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
  run: (env: Env, ctx: McpCtx, args: Args) => Promise<Record<string, unknown>>;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const euros = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100);
const centsEnEuros = (c: number | null | undefined) => (c == null ? null : Math.round(c) / 100);
const isoJour = (d: Date) => d.toISOString().slice(0, 10);
const vide = (message: string, extra: Record<string, unknown> = {}) => ({ vide: true, message, ...extra });
const dateMs = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);

const enveloppe = async (fn: () => Promise<Record<string, unknown>>) => ({ donnees_du: new Date().toISOString(), monnaie: 'EUR', ...(await fn()) });

export const OUTILS: Outil[] = [
  {
    name: 'entreprise',
    title: "L'entreprise",
    description:
      "Commence ici. Nom, métier, taille et modules activés de l'entreprise de l'artisan, et ses compteurs clés du jour (devis en attente, factures impayées, chantiers en cours, commandes fournisseurs).",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async (env, ctx) => {
      const org = await first<{ name: string; trade: string; size: string; plan: string; enabled_modules: string; city: string | null; siret: string | null }>(
        env,
        `SELECT name, trade, size, plan, enabled_modules, city, siret FROM organizations WHERE id = ?`,
        ctx.organizationId,
      );
      if (!org) return vide("Entreprise introuvable : le compte Brix n'est pas encore configuré.");
      const o = ctx.organizationId;
      const [devis, impayes, chantiers, cmd] = await Promise.all([
        first<{ n: number; total: number | null }>(env, `SELECT COUNT(*) AS n, SUM(total_ht) AS total FROM devis WHERE organization_id = ? AND status IN ('envoye','vu')`, o),
        first<{ n: number; reste: number | null }>(env, `SELECT COUNT(*) AS n, SUM(total_ttc - paid_amount) AS reste FROM factures WHERE organization_id = ? AND status IN ('emise','envoyee','partielle','en_retard') AND total_ttc > paid_amount`, o),
        first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM chantiers WHERE organization_id = ? AND status = 'en_cours'`, o),
        first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM fournisseurs_commandes WHERE organization_id = ? AND statut IN ('envoyee','confirmee','expediee','livree_partiel')`, o).catch(() => ({ n: 0 })),
      ]);
      return {
        nom: org.name,
        metier: org.trade,
        taille: org.size,
        offre: org.plan,
        ville: org.city,
        siret: org.siret,
        modules_actives: parseJsonArray(org.enabled_modules),
        aujourd_hui: isoJour(new Date()),
        compteurs: {
          devis_en_attente: { nombre: devis?.n ?? 0, montant_ht: euros(devis?.total ?? 0) },
          factures_impayees: { nombre: impayes?.n ?? 0, reste_a_encaisser_ttc: euros(impayes?.reste ?? 0) },
          chantiers_en_cours: chantiers?.n ?? 0,
          commandes_fournisseurs_en_cours: cmd?.n ?? 0,
        },
      };
    },
  },
  {
    name: 'devis',
    title: 'Devis',
    description:
      "Liste des devis (numéro, client, montant HT, statut, dates), filtrable par statut (brouillon, envoye, vu, signe, refuse, expire) et période. Avec « id », renvoie le détail et les lignes d'un devis.",
    inputSchema: {
      type: 'object',
      properties: {
        statut: { type: 'string', enum: ['brouillon', 'envoye', 'vu', 'signe', 'refuse', 'expire'] },
        depuis_jours: { type: 'integer', minimum: 1, maximum: 730, description: 'Devis créés sur les N derniers jours (défaut 90)' },
        id: { type: 'string', description: "Identifiant ou numéro d'un devis précis" },
      },
      additionalProperties: false,
    },
    run: async (env, ctx, a) => {
      const id = str(a.id);
      if (id) {
        const d = await first<Record<string, unknown> & { id: string }>(
          env,
          `SELECT d.id, d.number AS numero, d.title AS titre, d.status AS statut, d.total_ht, d.total_ttc, d.created_at AS cree_le, d.sent_at AS envoye_le, d.signed_at AS signe_le, c.name AS client, ch.name AS chantier
           FROM devis d LEFT JOIN clients c ON c.id = d.client_id LEFT JOIN chantiers ch ON ch.id = d.chantier_id
           WHERE d.organization_id = ? AND (d.id = ? OR d.number = ?)`,
          ctx.organizationId, id, id,
        );
        if (!d) return vide(`Aucun devis « ${id} ».`);
        const lignes = await all(env, `SELECT kind AS type, designation, quantity AS quantite, unit AS unite, unit_price_ht AS prix_unitaire_ht, unit_cost_ht AS cout_unitaire_ht FROM devis_lignes WHERE devis_id = ? ORDER BY position`, d.id);
        return { devis: d, lignes };
      }
      const jours = clampInt(a.depuis_jours, 1, 730, 90);
      const statut = str(a.statut);
      const rows = await all<{ total_ht: number; statut: string }>(
        env,
        `SELECT d.number AS numero, d.title AS titre, d.status AS statut, d.total_ht, d.created_at AS cree_le, d.signed_at AS signe_le, c.name AS client
         FROM devis d LEFT JOIN clients c ON c.id = d.client_id
         WHERE d.organization_id = ? AND d.created_at >= ? ${statut ? 'AND d.status = ?' : ''} ORDER BY d.created_at DESC LIMIT 100`,
        ...[ctx.organizationId, isoJour(new Date(Date.now() - jours * 86_400_000)), ...(statut ? [statut] : [])],
      );
      if (rows.length === 0) return vide(`Aucun devis${statut ? ` « ${statut} »` : ''} sur les ${jours} derniers jours.`);
      return { periode_jours: jours, nombre: rows.length, total_ht: euros(rows.reduce((s, r) => s + (r.total_ht ?? 0), 0)), devis: rows };
    },
  },
  {
    name: 'factures',
    title: 'Factures',
    description:
      'Liste des factures émises (numéro, client, montants, payé, échéance, statut, statut de facture électronique). Filtre par statut ou impayées seulement.',
    inputSchema: {
      type: 'object',
      properties: {
        statut: { type: 'string', enum: ['brouillon', 'emise', 'envoyee', 'payee', 'partielle', 'en_retard', 'annulee'] },
        impayees_seulement: { type: 'boolean' },
        depuis_jours: { type: 'integer', minimum: 1, maximum: 730 },
      },
      additionalProperties: false,
    },
    run: async (env, ctx, a) => {
      const jours = clampInt(a.depuis_jours, 1, 730, 180);
      const where = ['f.organization_id = ?', `COALESCE(f.issue_date, f.created_at) >= ?`];
      const binds: unknown[] = [ctx.organizationId, isoJour(new Date(Date.now() - jours * 86_400_000))];
      if (str(a.statut)) (where.push('f.status = ?'), binds.push(str(a.statut)));
      if (a.impayees_seulement) where.push(`f.status NOT IN ('brouillon','annulee','payee') AND f.total_ttc > f.paid_amount`);
      const rows = await all<{ total_ttc: number; paye: number }>(
        env,
        `SELECT f.number AS numero, f.kind AS type, f.status AS statut, f.issue_date AS emise_le, f.due_date AS echeance, f.total_ht, f.total_ttc, f.paid_amount AS paye,
           f.einvoice_status AS facture_electronique, c.name AS client
         FROM factures f LEFT JOIN clients c ON c.id = f.client_id WHERE ${where.join(' AND ')} ORDER BY COALESCE(f.issue_date, f.created_at) DESC LIMIT 100`,
        ...binds,
      );
      if (rows.length === 0) return vide('Aucune facture sur cette période.');
      return {
        nombre: rows.length,
        total_ttc: euros(rows.reduce((s, r) => s + r.total_ttc, 0)),
        reste_a_encaisser_ttc: euros(rows.reduce((s, r) => s + Math.max(0, r.total_ttc - r.paye), 0)),
        factures: rows,
      };
    },
  },
  {
    name: 'impayes',
    title: 'Impayés et relances',
    description: "Qui doit de l'argent à l'artisan : factures échues non soldées, par client, avec le nombre de jours de retard. À utiliser pour préparer des relances.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async (env, ctx) => {
      const today = isoJour(new Date());
      const rows = await all<{ numero: string; client: string | null; echeance: string; reste: number; email: string | null; telephone: string | null }>(
        env,
        `SELECT f.number AS numero, c.name AS client, c.email, c.phone AS telephone, f.due_date AS echeance, (f.total_ttc - f.paid_amount) AS reste
         FROM factures f LEFT JOIN clients c ON c.id = f.client_id
         WHERE f.organization_id = ? AND f.status NOT IN ('brouillon','annulee','payee') AND f.total_ttc > f.paid_amount AND f.due_date IS NOT NULL AND f.due_date < ?
         ORDER BY f.due_date`,
        ctx.organizationId,
        today,
      );
      if (rows.length === 0) return vide("Aucune facture en retard de paiement. Bravo.");
      return {
        total_en_retard_ttc: euros(rows.reduce((s, r) => s + r.reste, 0)),
        factures: rows.map((r) => ({ ...r, reste: euros(r.reste), jours_de_retard: Math.floor((Date.now() - new Date(r.echeance).getTime()) / 86_400_000) })),
      };
    },
  },
  {
    name: 'chiffre_affaires',
    title: "Chiffre d'affaires",
    description: "Chiffre d'affaires facturé HT et encaissé par mois, devis signés et taux de transformation des devis, sur les N derniers mois.",
    inputSchema: { type: 'object', properties: { mois: { type: 'integer', minimum: 1, maximum: 24, description: 'Défaut 12' } }, additionalProperties: false },
    run: async (env, ctx, a) => {
      const mois = clampInt(a.mois, 1, 24, 12);
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (mois - 1));
      const depuis = isoJour(d);
      const [fact, devis] = await Promise.all([
        all<{ mois: string; facture_ht: number; encaisse_ttc: number }>(
          env,
          `SELECT substr(COALESCE(issue_date, created_at), 1, 7) AS mois, SUM(CASE WHEN kind = 'avoir' THEN -total_ht ELSE total_ht END) AS facture_ht, SUM(paid_amount) AS encaisse_ttc
           FROM factures WHERE organization_id = ? AND status NOT IN ('brouillon','annulee') AND COALESCE(issue_date, created_at) >= ? GROUP BY 1 ORDER BY 1`,
          ctx.organizationId,
          depuis,
        ),
        all<{ status: string; n: number; total: number }>(env, `SELECT status, COUNT(*) AS n, SUM(total_ht) AS total FROM devis WHERE organization_id = ? AND created_at >= ? GROUP BY status`, ctx.organizationId, depuis),
      ]);
      if (fact.length === 0 && devis.length === 0) return vide(`Pas encore de facture ni de devis sur les ${mois} derniers mois.`);
      const envoyes = devis.filter((x) => x.status !== 'brouillon').reduce((s, x) => s + x.n, 0);
      const signes = devis.find((x) => x.status === 'signe');
      return {
        periode: { depuis, mois },
        facture_ht_total: euros(fact.reduce((s, x) => s + x.facture_ht, 0)),
        encaisse_ttc_total: euros(fact.reduce((s, x) => s + x.encaisse_ttc, 0)),
        par_mois: fact.map((x) => ({ mois: x.mois, facture_ht: euros(x.facture_ht), encaisse_ttc: euros(x.encaisse_ttc) })),
        devis: {
          envoyes,
          signes: signes?.n ?? 0,
          montant_signe_ht: euros(signes?.total ?? 0),
          taux_transformation_pct: envoyes > 0 ? Math.round(((signes?.n ?? 0) / envoyes) * 1000) / 10 : null,
        },
      };
    },
  },
  {
    name: 'chantiers',
    title: 'Chantiers',
    description:
      "Chantiers (nom, client, adresse, dates, avancement, budget). Avec « id », renvoie le détail : devis liés, achats fournisseurs engagés et marge estimée (budget − achats).",
    inputSchema: {
      type: 'object',
      properties: { statut: { type: 'string', enum: ['a_planifier', 'en_cours', 'en_pause', 'termine', 'reception'] }, id: { type: 'string', description: 'Identifiant ou nom du chantier' } },
      additionalProperties: false,
    },
    run: async (env, ctx, a) => {
      const id = str(a.id);
      if (id) {
        const ch = await first<{ id: string; budget_ht: number } & Record<string, unknown>>(
          env,
          `SELECT ch.id, ch.name AS nom, ch.address AS adresse, ch.city AS ville, ch.status AS statut, ch.start_date AS debut, ch.end_date AS fin, ch.progress AS avancement_pct, ch.budget_ht, c.name AS client
           FROM chantiers ch LEFT JOIN clients c ON c.id = ch.client_id WHERE ch.organization_id = ? AND (ch.id = ? OR ch.name LIKE ?) LIMIT 1`,
          ctx.organizationId, id, `%${id}%`,
        );
        if (!ch) return vide(`Aucun chantier « ${id} ».`);
        const [devis, achats] = await Promise.all([
          all(env, `SELECT number AS numero, title AS titre, status AS statut, total_ht FROM devis WHERE organization_id = ? AND chantier_id = ?`, ctx.organizationId, ch.id),
          listerCommandes(env, { organizationId: ctx.organizationId, userId: ctx.userId }, { chantier_id: ch.id }).catch(() => []),
        ]);
        const engage = achats.filter((c) => c.statut !== 'annulee' && c.statut !== 'brouillon').reduce((s, c) => s + c.total_ht_cents + c.frais_port_cents, 0) / 100;
        return {
          chantier: ch,
          devis,
          achats_fournisseurs: achats.map((c) => ({ numero: c.numero, fournisseur: c.fournisseur_nom, statut: c.statut, total_ht: centsEnEuros(c.total_ht_cents), livraison_prevue: dateMs(c.livraison_prevue) })),
          achats_engages_ht: euros(engage),
          marge_estimee_ht: ch.budget_ht ? euros(ch.budget_ht - engage) : null,
        };
      }
      const statut = str(a.statut);
      const rows = await all(
        env,
        `SELECT ch.id, ch.name AS nom, ch.city AS ville, ch.status AS statut, ch.start_date AS debut, ch.end_date AS fin, ch.progress AS avancement_pct, ch.budget_ht, c.name AS client
         FROM chantiers ch LEFT JOIN clients c ON c.id = ch.client_id WHERE ch.organization_id = ? ${statut ? 'AND ch.status = ?' : ''} ORDER BY ch.start_date DESC LIMIT 100`,
        ...[ctx.organizationId, ...(statut ? [statut] : [])],
      );
      return rows.length ? { nombre: rows.length, chantiers: rows } : vide('Aucun chantier enregistré.');
    },
  },
  {
    name: 'clients',
    title: 'Clients',
    description: 'Recherche de clients (particuliers et pros) avec coordonnées, montant facturé et devis en cours.',
    inputSchema: { type: 'object', properties: { recherche: { type: 'string', description: 'Nom, ville ou e-mail' } }, additionalProperties: false },
    run: async (env, ctx, a) => {
      const q = str(a.recherche);
      const rows = await all(
        env,
        `SELECT c.name AS nom, c.kind AS type, c.email, c.phone AS telephone, c.city AS ville,
           (SELECT SUM(total_ht) FROM factures f WHERE f.client_id = c.id AND f.status NOT IN ('brouillon','annulee')) AS facture_ht,
           (SELECT COUNT(*) FROM devis d WHERE d.client_id = c.id AND d.status IN ('envoye','vu')) AS devis_en_attente
         FROM clients c WHERE c.organization_id = ? ${q ? 'AND (c.name LIKE ? OR c.city LIKE ? OR c.email LIKE ?)' : ''} ORDER BY c.name LIMIT 50`,
        ...[ctx.organizationId, ...(q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [])],
      );
      return rows.length ? { nombre: rows.length, clients: rows } : vide(q ? `Aucun client ne correspond à « ${q} ».` : 'Aucun client enregistré.');
    },
  },
  {
    name: 'achats',
    title: 'Achats et livraisons',
    description: "Commandes fournisseurs en cours, livraisons prévues dans les 7 jours, livraisons en retard, dépenses matériaux des 30 derniers jours et choses à faire côté achats.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async (env, ctx) => {
      const t = await tableauDeBord(env, { organizationId: ctx.organizationId, userId: ctx.userId });
      const map = (l: { numero: string; fournisseur_nom: string; livraison_prevue: number; statut: string; adresse_livraison: string | null }) => ({
        commande: l.numero, fournisseur: l.fournisseur_nom, livraison_prevue: dateMs(l.livraison_prevue), statut: l.statut, adresse: l.adresse_livraison,
      });
      return {
        commandes_en_cours: { nombre: t.commandes_en_cours.nombre, total_ht: centsEnEuros(t.commandes_en_cours.total_ht_cents) },
        livraisons_a_venir: t.livraisons_a_venir.map(map),
        livraisons_en_retard: t.livraisons_en_retard.map(map),
        depenses_30_jours_ht: centsEnEuros(t.depenses_30j_cents),
        a_faire: t.a_faire.map((x) => x.texte),
      };
    },
  },
  {
    name: 'demandes_prix',
    title: 'Demandes de prix fournisseurs',
    description: "Demandes de prix envoyées aux fournisseurs et réponses reçues. Avec « id » (ou numéro DP-…), renvoie le comparatif : prix par fournisseur, meilleure offre et recommandation.",
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, additionalProperties: false },
    run: async (env, ctx, a) => {
      const c = { organizationId: ctx.organizationId, userId: ctx.userId };
      const id = str(a.id);
      if (id) {
        const d = await first<{ id: string; numero: string; titre: string; statut: string }>(env, `SELECT id, numero, titre, statut FROM fournisseurs_demandes WHERE organization_id = ? AND (id = ? OR numero = ?)`, ctx.organizationId, id, id);
        if (!d) return vide(`Aucune demande de prix « ${id} ».`);
        const [lignes, comp] = await Promise.all([lignesDemande(env, d.id), comparatifDemande(env, d.id)]);
        return {
          demande: d,
          articles: lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prix_prevu_au_devis: centsEnEuros(l.prix_cible_cents) })),
          reponses: `${comp.reponses} sur ${comp.consultes} fournisseurs`,
          offres: comp.totaux.map((t) => ({ fournisseur: t.fournisseur_nom, total_ht_port_compris: centsEnEuros(t.total_cents), port: centsEnEuros(t.port_cents), complet: t.complet, articles_manquants: t.lignes_manquantes, delai_jours: t.delai_livraison_jours })),
          recommandation: comp.recommandation ? { explication: comp.recommandation.explication, total_ht: centsEnEuros(comp.recommandation.total_cents), economie_vs_devis_ht: centsEnEuros(comp.recommandation.economie_vs_cible_cents) } : null,
        };
      }
      const rows = await listerDemandes(env, c);
      if (rows.length === 0) return vide("Aucune demande de prix. L'artisan peut en créer une depuis un devis (Achats › Demandes de prix).");
      return { demandes: rows.slice(0, 50).map((r) => ({ numero: r.numero, titre: r.titre, statut: r.statut, articles: r.nb_lignes, reponses: `${r.nb_reponses}/${r.nb_destinataires}`, creee_le: dateMs(r.created_at) })) };
    },
  },
  {
    name: 'prix_materiaux',
    title: 'Prix des matériaux',
    description: "Cherche un matériau dans les tarifs et réponses des fournisseurs de l'artisan et compare les prix nets HT entre fournisseurs (ex. « tube PER 16 », « placo BA13 », code EAN).",
    inputSchema: { type: 'object', properties: { recherche: { type: 'string', minLength: 2 } }, required: ['recherche'], additionalProperties: false },
    run: async (env, ctx, a) => {
      const q = str(a.recherche);
      if (!q) return vide('Précisez le matériau recherché.');
      const res = await rechercherCatalogue(env, ctx.organizationId, q, { limite: 60 });
      if (res.length === 0) return vide(`Aucun prix connu pour « ${q} ». Importez les tarifs de vos fournisseurs ou lancez une demande de prix.`);
      return {
        produits: res.slice(0, 20).map((g) => ({
          designation: g.designation,
          unite: g.unite,
          meilleur_prix_ht: centsEnEuros(g.meilleur_prix_cents),
          offres: g.offres.map((o) => ({ fournisseur: o.fournisseur_nom, reference: o.reference, prix_net_ht: centsEnEuros(o.prix_net_cents), mis_a_jour: dateMs(o.maj_le), source: o.source })),
        })),
      };
    },
  },
  {
    name: 'hausses_prix',
    title: 'Hausses de prix fournisseurs',
    description: 'Articles dont le prix net fournisseur a augmenté récemment, triés par hausse. Utile pour mettre à jour les prix des devis.',
    inputSchema: { type: 'object', properties: { jours: { type: 'integer', minimum: 7, maximum: 365 }, seuil_pct: { type: 'number', minimum: 0, maximum: 100 } }, additionalProperties: false },
    run: async (env, ctx, a) => {
      const rows = await haussesRecentes(env, ctx.organizationId, clampInt(a.jours, 7, 365, 90), typeof a.seuil_pct === 'number' ? a.seuil_pct : 3);
      if (rows.length === 0) return vide('Aucune hausse de prix notable sur la période.');
      return { hausses: rows.map((r) => ({ article: r.designation, fournisseur: r.fournisseur_nom, ancien_prix_ht: centsEnEuros(r.ancien), nouveau_prix_ht: centsEnEuros(r.actuel), hausse_pct: r.hausse_pct, le: dateMs(r.maj_le) })) };
    },
  },
  {
    name: 'fournisseurs',
    title: 'Fournisseurs',
    description: "Annuaire des fournisseurs de l'artisan (agence, contact, franco, délai, nombre d'articles connus, volume d'achat sur 12 mois).",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async (env, ctx) => {
      const rows = await listerFournisseurs(env, { organizationId: ctx.organizationId, userId: ctx.userId });
      if (rows.length === 0) return vide('Aucun fournisseur enregistré (Achats › Fournisseurs).');
      return {
        fournisseurs: rows.map((f) => ({ nom: f.nom, agence: f.agence, contact: f.contact_nom, email: f.email, telephone: f.telephone, franco_ht: centsEnEuros(f.franco_cents), delai_jours: f.delai_jours, articles_connus: f.nb_articles, achats_12_mois_ht: centsEnEuros(f.commandes_12m_cents ?? 0), connexion: f.connecteur })),
      };
    },
  },
];

export async function executerOutil(env: Env, ctx: McpCtx, name: string, args: Args) {
  const outil = OUTILS.find((o) => o.name === name);
  if (!outil) return null;
  return enveloppe(() => outil.run(env, ctx, args ?? {}));
}
