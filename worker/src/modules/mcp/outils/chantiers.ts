/** Outils de lecture : chantiers et clients. */
import type { Chantier, Client, Devis, Employee, Facture } from '../../../../../src/lib/types';
import { listerCommandes } from '../../fournisseurs/commandes';
import { resumeDevis } from './devis';
import {
  ErreurOutil, PAGINATION, S, SORTIE_PAGE, contient, entree, euros, factureOuverte, lien, nomClient, paginer, resteFacture, sortie, str, totaux, trouver, vide, type Outil,
} from './commun';

const STATUTS_CHANTIER = ['a_planifier', 'en_cours', 'en_pause', 'termine', 'reception'] as const;

const RESUME_CHANTIER = S.obj({
  id: S.str(), nom: S.str(), client: S.nstr(), client_id: S.str(), ville: S.str(), statut: S.str(), debut: S.str(), fin: S.str(),
  avancement_pct: S.num(), budget_ht: S.num(), couts_engages_ht: S.num(), prochaine_etape: S.str(), lien: S.str(),
});

const resumeChantier = (env: Parameters<typeof lien>[0], c: Chantier, clients: Client[] | undefined) => ({
  id: c.id, nom: c.name, client: nomClient(clients, c.clientId), client_id: c.clientId, ville: c.city ?? '', statut: c.status, debut: c.startDate ?? '', fin: c.endDate ?? '',
  avancement_pct: Number(c.progress) || 0, budget_ht: euros(c.budgetHt), couts_engages_ht: euros(c.costHt), prochaine_etape: c.nextStep ?? '', lien: lien(env, `chantiers/${c.id}`),
});

const RESUME_CLIENT = S.obj({
  id: S.str(), nom: S.str(), type: S.str(), contact: S.nstr(), email: S.str(), telephone: S.str(), ville: S.str(),
  facture_ht: S.num(), reste_a_encaisser_ttc: S.num(), devis_en_attente: S.int(), lien: S.str(),
});

export const OUTILS_CHANTIERS: Outil[] = [
  {
    name: 'lister_chantiers',
    title: 'Lister les chantiers',
    description: 'Liste les chantiers (nom, client, ville, statut, dates, avancement, budget, coûts engagés, prochaine étape). Filtres : statut, texte.',
    inputSchema: entree({ statut: S.enum(STATUTS_CHANTIER), recherche: S.str('Texte cherché dans le nom, la ville ou le client'), ...PAGINATION }),
    outputSchema: sortie({ ...SORTIE_PAGE, chantiers: S.arr(RESUME_CHANTIER) }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const clients = donnees.clients as Client[] | undefined;
      const q = str(a.recherche);
      const liste = ((donnees.chantiers as Chantier[] | undefined) ?? [])
        .filter((c) => (!str(a.statut) || c.status === a.statut) && (!q || contient(c.name, q) || contient(c.city, q) || contient(nomClient(clients, c.clientId), q)))
        .sort((x, y) => (y.startDate ?? '').localeCompare(x.startDate ?? ''));
      if (!liste.length) return vide('Aucun chantier ne correspond.', { total: 0, suivant: null, chantiers: [] });
      const p = paginer(liste, a);
      return { total: p.total, suivant: p.suivant, chantiers: p.page.map((c) => resumeChantier(env, c, clients)) };
    },
  },
  {
    name: 'lire_chantier',
    title: 'Lire un chantier',
    description: 'Détail d’un chantier : adresse, équipe, devis liés, commandes fournisseurs engagées et marge estimée (budget moins coûts et achats).',
    inputSchema: entree({ id: S.str('Identifiant ou nom du chantier') }, ['id']),
    outputSchema: sortie({
      chantier: RESUME_CHANTIER,
      adresse: S.str(),
      equipe: S.arr(S.obj({ id: S.str(), nom: S.str() })),
      devis: S.arr(S.obj({ id: S.str(), numero: S.str(), titre: S.str(), statut: S.str(), total_ht: S.num(), lien: S.str() })),
      achats_fournisseurs: S.arr(S.obj({ numero: S.str(), fournisseur: S.str(), statut: S.str(), total_ht: S.num(), livraison_prevue: S.nstr() })),
      achats_engages_ht: S.num(),
      marge_estimee_ht: S.nnum(),
    }),
    run: async ({ env, ctx, etat }, a) => {
      const { donnees } = await etat();
      const id = str(a.id);
      if (!id) throw new ErreurOutil('Indiquez l’identifiant ou le nom du chantier.');
      const c = trouver(donnees.chantiers as Chantier[] | undefined, id, ['name']);
      if (!c) throw new ErreurOutil(`Aucun chantier « ${id} ». Utilisez lister_chantiers pour retrouver le bon.`);
      const employes = (donnees.employees as Employee[] | undefined) ?? [];
      const devis = ((donnees.devis as Devis[] | undefined) ?? []).filter((d) => d.chantierId === c.id || d.id === c.devisId);
      const commandes = await listerCommandes(env, { organizationId: ctx.organizationId, userId: ctx.userId }, { chantier_id: c.id }).catch(() => []);
      const engage = commandes.filter((x) => x.statut !== 'annulee' && x.statut !== 'brouillon').reduce((s, x) => s + x.total_ht_cents + x.frais_port_cents, 0) / 100;
      return {
        chantier: resumeChantier(env, c, donnees.clients as Client[]),
        adresse: [c.address, c.city].filter(Boolean).join(', '),
        equipe: (c.team ?? []).map((eid) => employes.find((e) => e.id === eid)).filter(Boolean).map((e) => ({ id: e!.id, nom: `${e!.firstName} ${e!.lastName}`.trim() })),
        devis: devis.map((d) => {
          const r = resumeDevis(env, d, donnees.clients as never);
          return { id: r.id, numero: r.numero, titre: r.titre, statut: r.statut, total_ht: r.total_ht, lien: r.lien };
        }),
        achats_fournisseurs: commandes.map((x) => ({
          numero: x.numero, fournisseur: x.fournisseur_nom ?? '', statut: x.statut, total_ht: euros(x.total_ht_cents / 100),
          livraison_prevue: x.livraison_prevue ? new Date(x.livraison_prevue).toISOString().slice(0, 10) : null,
        })),
        achats_engages_ht: euros(engage),
        marge_estimee_ht: c.budgetHt ? euros(c.budgetHt - (Number(c.costHt) || 0) - engage) : null,
      };
    },
  },
  {
    name: 'lister_clients',
    title: 'Lister les clients',
    description: 'Liste les clients (particuliers et professionnels) avec coordonnées, montant facturé HT, reste à encaisser et devis en attente. Recherche par nom, ville ou e-mail.',
    inputSchema: entree({ recherche: S.str('Nom, ville ou e-mail'), type: S.enum(['particulier', 'pro']), ...PAGINATION }),
    outputSchema: sortie({ ...SORTIE_PAGE, clients: S.arr(RESUME_CLIENT) }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const q = str(a.recherche);
      const factures = (donnees.factures as Facture[] | undefined) ?? [];
      const devis = (donnees.devis as Devis[] | undefined) ?? [];
      const liste = ((donnees.clients as Client[] | undefined) ?? [])
        .filter((c) => (!str(a.type) || c.kind === a.type) && (!q || contient(c.name, q) || contient(c.city, q) || contient(c.email, q) || contient(c.contact, q)))
        .sort((x, y) => x.name.localeCompare(y.name, 'fr'));
      if (!liste.length) return vide(q ? `Aucun client ne correspond à « ${q} ».` : 'Aucun client enregistré.', { total: 0, suivant: null, clients: [] });
      const p = paginer(liste, a);
      return {
        total: p.total, suivant: p.suivant,
        clients: p.page.map((c) => {
          const fc = factures.filter((f) => f.clientId === c.id && !['brouillon', 'annulee'].includes(f.status));
          return {
            id: c.id, nom: c.name, type: c.kind, contact: c.contact ?? null, email: c.email ?? '', telephone: c.phone ?? '', ville: c.city ?? '',
            facture_ht: euros(fc.reduce((s, f) => s + (f.kind === 'avoir' ? -1 : 1) * totaux(f.lines).ht, 0)),
            reste_a_encaisser_ttc: euros(fc.filter(factureOuverte).reduce((s, f) => s + resteFacture(f), 0)),
            devis_en_attente: devis.filter((d) => d.clientId === c.id && (d.status === 'envoye' || d.status === 'vu')).length,
            lien: lien(env, `clients/${c.id}`),
          };
        }),
      };
    },
  },
  {
    name: 'lire_client',
    title: 'Lire un client',
    description: 'Fiche d’un client : coordonnées, notes, ses devis, ses factures et ses chantiers.',
    inputSchema: entree({ id: S.str('Identifiant ou nom du client') }, ['id']),
    outputSchema: sortie({
      client: S.obj({ id: S.str(), nom: S.str(), type: S.str(), contact: S.nstr(), email: S.str(), telephone: S.str(), adresse: S.str(), ville: S.str(), siret: S.nstr(), notes: S.nstr(), cree_le: S.str(), lien: S.str() }),
      devis: S.arr(S.obj({ id: S.str(), numero: S.str(), statut: S.str(), total_ht: S.num() })),
      factures: S.arr(S.obj({ id: S.str(), numero: S.str(), statut: S.str(), total_ttc: S.num(), reste_ttc: S.num() })),
      chantiers: S.arr(S.obj({ id: S.str(), nom: S.str(), statut: S.str() })),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const id = str(a.id);
      if (!id) throw new ErreurOutil('Indiquez l’identifiant ou le nom du client.');
      const c = trouver(donnees.clients as Client[] | undefined, id, ['name']);
      if (!c) throw new ErreurOutil(`Aucun client « ${id} ». Utilisez lister_clients pour le retrouver.`);
      return {
        client: {
          id: c.id, nom: c.name, type: c.kind, contact: c.contact ?? null, email: c.email ?? '', telephone: c.phone ?? '', adresse: c.address ?? '', ville: c.city ?? '',
          siret: c.siret ?? null, notes: c.notes ?? null, cree_le: c.createdAt ?? '', lien: lien(env, `clients/${c.id}`),
        },
        devis: ((donnees.devis as Devis[] | undefined) ?? []).filter((d) => d.clientId === c.id).slice(0, 30).map((d) => ({ id: d.id, numero: d.number, statut: d.status, total_ht: totaux(d.lines).ht })),
        factures: ((donnees.factures as Facture[] | undefined) ?? []).filter((f) => f.clientId === c.id).slice(0, 30).map((f) => ({ id: f.id, numero: f.number, statut: f.status, total_ttc: totaux(f.lines).ttc, reste_ttc: resteFacture(f) })),
        chantiers: ((donnees.chantiers as Chantier[] | undefined) ?? []).filter((x) => x.clientId === c.id).slice(0, 30).map((x) => ({ id: x.id, nom: x.name, statut: x.status })),
      };
    },
  },
];
