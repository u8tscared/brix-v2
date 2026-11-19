/** Outils de lecture : espace fournisseurs (tables D1 du module fournisseurs). */
import { listerFournisseurs, tableauDeBord } from '../../fournisseurs/annuaire';
import { haussesRecentes, rechercherCatalogue } from '../../fournisseurs/catalogue';
import { comparatifDemande, listerDemandes } from '../../fournisseurs/demandes';
import { first, lignesDemande } from '../../fournisseurs/depot';
import { clampInt } from '../../fournisseurs/util';
import { ErreurOutil, S, entree, lien, sortie, str, vide, type Outil } from './commun';

const cents = (c: number | null | undefined) => (c == null ? 0 : Math.round(c) / 100);
const ncents = (c: number | null | undefined) => (c == null ? null : Math.round(c) / 100);
const jour = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);

const LIVRAISON = S.obj({ commande: S.str(), fournisseur: S.str(), livraison_prevue: S.nstr(), statut: S.str(), adresse: S.nstr() });

export const OUTILS_FOURNISSEURS: Outil[] = [
  {
    name: 'lister_achats',
    title: 'Lister les achats et livraisons',
    description: 'Commandes fournisseurs en cours, livraisons prévues dans les 7 jours, livraisons en retard, dépenses matériaux des 30 derniers jours et points à traiter côté achats.',
    inputSchema: entree(),
    outputSchema: sortie({
      commandes_en_cours: S.obj({ nombre: S.int(), total_ht: S.num() }),
      livraisons_a_venir: S.arr(LIVRAISON),
      livraisons_en_retard: S.arr(LIVRAISON),
      depenses_30_jours_ht: S.num(),
      a_faire: S.arr(S.str()),
      lien: S.str(),
    }),
    run: async ({ env, ctx }) => {
      const t = await tableauDeBord(env, { organizationId: ctx.organizationId, userId: ctx.userId });
      const map = (l: { numero: string; fournisseur_nom: string; livraison_prevue: number; statut: string; adresse_livraison: string | null }) => ({
        commande: l.numero, fournisseur: l.fournisseur_nom, livraison_prevue: jour(l.livraison_prevue), statut: l.statut, adresse: l.adresse_livraison,
      });
      return {
        commandes_en_cours: { nombre: t.commandes_en_cours.nombre, total_ht: cents(t.commandes_en_cours.total_ht_cents) },
        livraisons_a_venir: t.livraisons_a_venir.map(map),
        livraisons_en_retard: t.livraisons_en_retard.map(map),
        depenses_30_jours_ht: cents(t.depenses_30j_cents),
        a_faire: t.a_faire.map((x) => x.texte),
        lien: lien(env, 'fournisseurs'),
      };
    },
  },
  {
    name: 'lister_demandes_prix',
    title: 'Lister les demandes de prix',
    description: 'Demandes de prix envoyées aux fournisseurs et réponses reçues. Avec « id » (ou numéro DP-…) : comparatif des offres par fournisseur et meilleure offre.',
    inputSchema: entree({ id: S.str('Identifiant ou numéro d’une demande de prix') }),
    outputSchema: sortie({
      demandes: S.arr(S.obj({ id: S.str(), numero: S.str(), titre: S.str(), statut: S.str(), articles: S.int(), reponses: S.str(), creee_le: S.nstr() })),
      demande: S.obj({ id: S.str(), numero: S.str(), titre: S.str(), statut: S.str() }),
      articles: S.arr(S.obj({ designation: S.str(), quantite: S.num(), unite: S.str(), prix_prevu_au_devis: S.nnum() })),
      reponses: S.str(),
      offres: S.arr(S.obj({ fournisseur: S.str(), total_ht_port_compris: S.num(), port: S.num(), complet: S.bool(), articles_manquants: S.int(), delai_jours: S.nnum() })),
      meilleure_offre: { type: ['object', 'null'], properties: { explication: S.str(), total_ht: S.num(), economie_vs_devis_ht: S.nnum() } },
    }),
    run: async ({ env, ctx }, a) => {
      const id = str(a.id);
      if (id) {
        const d = await first<{ id: string; numero: string; titre: string; statut: string }>(env, `SELECT id, numero, titre, statut FROM fournisseurs_demandes WHERE organization_id = ? AND (id = ? OR numero = ?)`, ctx.organizationId, id, id);
        if (!d) throw new ErreurOutil(`Aucune demande de prix « ${id} ». Appelez lister_demandes_prix sans id pour voir la liste.`);
        const [lignes, comp] = await Promise.all([lignesDemande(env, d.id), comparatifDemande(env, d.id)]);
        return {
          demande: d,
          articles: lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prix_prevu_au_devis: ncents(l.prix_cible_cents) })),
          reponses: `${comp.reponses} sur ${comp.consultes} fournisseurs`,
          offres: comp.totaux.map((t) => ({ fournisseur: t.fournisseur_nom, total_ht_port_compris: cents(t.total_cents), port: cents(t.port_cents), complet: t.complet, articles_manquants: t.lignes_manquantes, delai_jours: t.delai_livraison_jours ?? null })),
          meilleure_offre: comp.recommandation ? { explication: comp.recommandation.explication, total_ht: cents(comp.recommandation.total_cents), economie_vs_devis_ht: ncents(comp.recommandation.economie_vs_cible_cents) } : null,
        };
      }
      const rows = await listerDemandes(env, { organizationId: ctx.organizationId, userId: ctx.userId });
      if (!rows.length) return vide('Aucune demande de prix. Elles se créent depuis un devis (Achats › Demandes de prix).', { demandes: [] });
      return { demandes: rows.slice(0, 50).map((r) => ({ id: r.id, numero: r.numero, titre: r.titre, statut: r.statut, articles: r.nb_lignes, reponses: `${r.nb_reponses}/${r.nb_destinataires}`, creee_le: jour(r.created_at) })) };
    },
  },
  {
    name: 'comparer_prix_materiaux',
    title: 'Comparer les prix des matériaux',
    description: 'Cherche un matériau dans les tarifs et les réponses des fournisseurs de l’entreprise et compare les prix nets HT (ex. « tube PER 16 », « placo BA13 », code EAN).',
    inputSchema: entree({ recherche: S.str('Matériau, référence ou code EAN', { minLength: 2 }) }, ['recherche']),
    outputSchema: sortie({
      produits: S.arr(S.obj({
        designation: S.str(), unite: S.str(), meilleur_prix_ht: S.num(),
        offres: S.arr(S.obj({ fournisseur: S.str(), reference: S.nstr(), prix_net_ht: S.num(), mis_a_jour: S.nstr(), source: S.str() })),
      })),
    }),
    run: async ({ env, ctx }, a) => {
      const q = str(a.recherche);
      if (!q || q.length < 2) throw new ErreurOutil('Précisez le matériau recherché (2 caractères au moins).');
      const res = await rechercherCatalogue(env, ctx.organizationId, q, { limite: 60 });
      if (!res.length) return vide(`Aucun prix connu pour « ${q} ». Importez les tarifs de vos fournisseurs ou lancez une demande de prix.`, { produits: [] });
      return {
        produits: res.slice(0, 20).map((g) => ({
          designation: g.designation, unite: g.unite ?? '', meilleur_prix_ht: cents(g.meilleur_prix_cents),
          offres: g.offres.slice(0, 10).map((o) => ({ fournisseur: o.fournisseur_nom, reference: o.reference ?? null, prix_net_ht: cents(o.prix_net_cents), mis_a_jour: jour(o.maj_le), source: String(o.source ?? '') })),
        })),
      };
    },
  },
  {
    name: 'lister_hausses_prix',
    title: 'Lister les hausses de prix',
    description: 'Articles dont le prix net fournisseur a augmenté sur la période, triés par hausse décroissante.',
    inputSchema: entree({ jours: S.int('Période en jours (7 à 365, défaut 90)', { minimum: 7, maximum: 365 }), seuil_pct: S.num('Hausse minimale en % (défaut 3)', { minimum: 0, maximum: 100 }) }),
    outputSchema: sortie({ hausses: S.arr(S.obj({ article: S.str(), fournisseur: S.str(), ancien_prix_ht: S.num(), nouveau_prix_ht: S.num(), hausse_pct: S.num(), le: S.nstr() })) }),
    run: async ({ env, ctx }, a) => {
      const rows = await haussesRecentes(env, ctx.organizationId, clampInt(a.jours, 7, 365, 90), typeof a.seuil_pct === 'number' ? a.seuil_pct : 3);
      if (!rows.length) return vide('Aucune hausse de prix notable sur la période.', { hausses: [] });
      return { hausses: rows.slice(0, 50).map((r) => ({ article: r.designation, fournisseur: r.fournisseur_nom, ancien_prix_ht: cents(r.ancien), nouveau_prix_ht: cents(r.actuel), hausse_pct: r.hausse_pct, le: jour(r.maj_le) })) };
    },
  },
  {
    name: 'lister_fournisseurs',
    title: 'Lister les fournisseurs',
    description: 'Annuaire des fournisseurs de l’entreprise : agence, contact, franco, délai, nombre d’articles connus, volume d’achat sur 12 mois.',
    inputSchema: entree(),
    outputSchema: sortie({
      fournisseurs: S.arr(S.obj({ nom: S.str(), agence: S.nstr(), contact: S.nstr(), email: S.nstr(), telephone: S.nstr(), franco_ht: S.nnum(), delai_jours: S.nnum(), articles_connus: S.int(), achats_12_mois_ht: S.num(), connexion: S.nstr() })),
    }),
    run: async ({ env, ctx }) => {
      const rows = await listerFournisseurs(env, { organizationId: ctx.organizationId, userId: ctx.userId });
      if (!rows.length) return vide('Aucun fournisseur enregistré (Achats › Fournisseurs).', { fournisseurs: [] });
      return {
        fournisseurs: rows.slice(0, 100).map((f) => ({
          nom: f.nom, agence: f.agence ?? null, contact: f.contact_nom ?? null, email: f.email ?? null, telephone: f.telephone ?? null, franco_ht: ncents(f.franco_cents),
          delai_jours: f.delai_jours ?? null, articles_connus: f.nb_articles ?? 0, achats_12_mois_ht: cents(f.commandes_12m_cents ?? 0), connexion: f.connecteur ?? null,
        })),
      };
    },
  },
];
