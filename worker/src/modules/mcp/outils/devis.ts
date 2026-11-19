/** Outils de lecture : devis. */
import type { Devis, DevisLigne } from '../../../../../src/lib/types';
import { ErreurOutil, PAGINATION, S, SORTIE_PAGE, contient, entier, entree, euros, ilYa, lien, nomClient, paginer, sortie, str, totaux, trouver, vide, type Outil } from './commun';

const STATUTS = ['brouillon', 'envoye', 'vu', 'signe', 'refuse', 'expire'] as const;

const RESUME = S.obj({
  id: S.str(), numero: S.str(), titre: S.str(), client: S.nstr(), client_id: S.str(), statut: S.str(),
  total_ht: S.num(), total_ttc: S.num(), cree_le: S.str(), envoye_le: S.nstr(), signe_le: S.nstr(), lien: S.str(),
});

export const LIGNE = S.obj({ type: S.str(), designation: S.str(), quantite: S.num(), unite: S.str(), prix_unitaire_ht: S.num(), tva_pct: S.num(), total_ht: S.num() });

export const ligneSortie = (l: DevisLigne) => ({
  type: l.kind, designation: l.designation, quantite: Number(l.quantity) || 0, unite: l.unit ?? '', prix_unitaire_ht: euros(l.unitPriceHt), tva_pct: Number(l.vatRate) || 0,
  total_ht: l.kind === 'section' || l.kind === 'texte' ? 0 : euros((Number(l.quantity) || 0) * (Number(l.unitPriceHt) || 0)),
});

export const resumeDevis = (env: Parameters<typeof lien>[0], d: Devis, clients: Parameters<typeof nomClient>[0]) => {
  const t = totaux(d.lines);
  return {
    id: d.id, numero: d.number, titre: d.title ?? '', client: nomClient(clients, d.clientId), client_id: d.clientId, statut: d.status,
    total_ht: t.ht, total_ttc: t.ttc, cree_le: d.createdAt, envoye_le: d.sentAt ?? null, signe_le: d.signedAt ?? null, lien: lien(env, `devis/${d.id}`),
  };
};

export const OUTILS_DEVIS: Outil[] = [
  {
    name: 'lister_devis',
    title: 'Lister les devis',
    description: 'Liste les devis de l’entreprise (numéro, client, montants HT et TTC, statut, dates), du plus récent au plus ancien. Filtres : statut, client, texte, période.',
    inputSchema: entree({
      statut: S.enum(STATUTS),
      client_id: S.str('Identifiant du client'),
      recherche: S.str('Texte cherché dans le numéro, le titre ou le nom du client'),
      depuis_jours: S.int('Devis créés sur les N derniers jours (défaut 365)', { minimum: 1, maximum: 1825 }),
      ...PAGINATION,
    }),
    outputSchema: sortie({ ...SORTIE_PAGE, total_ht: S.num(), devis: S.arr(RESUME) }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const depuis = ilYa(entier(a.depuis_jours, 1, 1825, 365));
      const statut = str(a.statut);
      const clientId = str(a.client_id);
      const q = str(a.recherche);
      const liste = (donnees.devis as Devis[] | undefined ?? [])
        .filter((d) => (d.createdAt ?? '') >= depuis && (!statut || d.status === statut) && (!clientId || d.clientId === clientId))
        .filter((d) => !q || contient(d.number, q) || contient(d.title, q) || contient(nomClient(donnees.clients as never, d.clientId), q))
        .sort((x, y) => (y.createdAt ?? '').localeCompare(x.createdAt ?? ''));
      if (!liste.length) return vide(`Aucun devis${statut ? ` « ${statut} »` : ''} sur cette période.`, { total: 0, suivant: null, total_ht: 0, devis: [] });
      const p = paginer(liste, a);
      return { total: p.total, suivant: p.suivant, total_ht: euros(liste.reduce((s, d) => s + totaux(d.lines).ht, 0)), devis: p.page.map((d) => resumeDevis(env, d, donnees.clients as never)) };
    },
  },
  {
    name: 'lire_devis',
    title: 'Lire un devis',
    description: 'Détail d’un devis : client, chantier, statut, lignes (désignation, quantité, unité, prix HT, TVA), totaux HT, TVA, TTC et marge estimée.',
    inputSchema: entree({ id: S.str('Identifiant ou numéro du devis (ex. D-2026-118)') }, ['id']),
    outputSchema: sortie({
      devis: S.obj({ id: S.str(), numero: S.str(), titre: S.str(), client: S.nstr(), client_id: S.str(), chantier_id: S.nstr(), statut: S.str(), cree_le: S.str(), envoye_le: S.nstr(), signe_le: S.nstr(), validite_jours: S.num(), acompte_pct: S.num(), notes: S.nstr(), lien: S.str() }),
      lignes: S.arr(LIGNE),
      totaux: S.obj({ ht: S.num(), tva: S.num(), ttc: S.num(), marge_ht: S.num() }),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const id = str(a.id);
      if (!id) throw new ErreurOutil('Indiquez l’identifiant ou le numéro du devis.');
      const d = trouver(donnees.devis as Devis[] | undefined, id, ['number']);
      if (!d) throw new ErreurOutil(`Aucun devis « ${id} ». Utilisez lister_devis pour retrouver le bon numéro.`);
      const t = totaux(d.lines);
      return {
        devis: {
          id: d.id, numero: d.number, titre: d.title ?? '', client: nomClient(donnees.clients as never, d.clientId), client_id: d.clientId, chantier_id: d.chantierId ?? null,
          statut: d.status, cree_le: d.createdAt, envoye_le: d.sentAt ?? null, signe_le: d.signedAt ?? null, validite_jours: d.validityDays ?? 30, acompte_pct: d.depositPercent ?? 0,
          notes: d.notes ?? null, lien: lien(env, `devis/${d.id}`),
        },
        lignes: (d.lines ?? []).slice(0, 200).map(ligneSortie),
        totaux: { ht: t.ht, tva: t.tva, ttc: t.ttc, marge_ht: t.marge },
      };
    },
  },
];
