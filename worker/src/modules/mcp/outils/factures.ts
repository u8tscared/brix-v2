/** Outils de lecture : factures, impayés, chiffre d'affaires. */
import type { Client, Devis, Facture } from '../../../../../src/lib/types';
import { LIGNE, ligneSortie } from './devis';
import {
  ErreurOutil, PAGINATION, S, SORTIE_PAGE, entier, entree, euros, factureOuverte, ilYa, jourIso, lien, nomClient, paginer, resteFacture, sortie, str, totaux, trouver, vide, type Outil,
} from './commun';

const STATUTS = ['brouillon', 'emise', 'envoyee', 'payee', 'partielle', 'en_retard', 'annulee'] as const;
const jours = (de: string, a: string) => Math.floor((new Date(a).getTime() - new Date(de).getTime()) / 86_400_000);

const RESUME = S.obj({
  id: S.str(), numero: S.str(), type: S.str(), titre: S.str(), client: S.nstr(), client_id: S.str(), statut: S.str(), emise_le: S.str(), echeance: S.str(),
  total_ht: S.num(), total_ttc: S.num(), paye_ttc: S.num(), reste_ttc: S.num(), facture_electronique: S.str(), lien: S.str(),
});

const resume = (env: Parameters<typeof lien>[0], f: Facture, clients: Client[] | undefined) => {
  const t = totaux(f.lines);
  return {
    id: f.id, numero: f.number, type: f.kind, titre: f.title ?? '', client: nomClient(clients, f.clientId), client_id: f.clientId, statut: f.status,
    emise_le: f.issueDate, echeance: f.dueDate, total_ht: t.ht, total_ttc: t.ttc, paye_ttc: euros(f.paidAmount), reste_ttc: resteFacture(f),
    facture_electronique: f.einvoice?.status ?? 'non_transmise', lien: lien(env, `factures/${f.id}`),
  };
};

export const OUTILS_FACTURES: Outil[] = [
  {
    name: 'lister_factures',
    title: 'Lister les factures',
    description: 'Liste les factures (numéro, type, client, montants, payé, reste, échéance, statut, statut de facture électronique), de la plus récente à la plus ancienne.',
    inputSchema: entree({
      statut: S.enum(STATUTS),
      impayees_seulement: S.bool('Seulement les factures avec un reste à encaisser'),
      client_id: S.str('Identifiant du client'),
      depuis_jours: S.int('Factures émises sur les N derniers jours (défaut 365)', { minimum: 1, maximum: 1825 }),
      ...PAGINATION,
    }),
    outputSchema: sortie({ ...SORTIE_PAGE, total_ttc: S.num(), reste_a_encaisser_ttc: S.num(), factures: S.arr(RESUME) }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const depuis = ilYa(entier(a.depuis_jours, 1, 1825, 365));
      const liste = ((donnees.factures as Facture[] | undefined) ?? [])
        .filter((f) => (f.issueDate ?? '') >= depuis && (!str(a.statut) || f.status === a.statut) && (!str(a.client_id) || f.clientId === a.client_id))
        .filter((f) => !a.impayees_seulement || factureOuverte(f))
        .sort((x, y) => (y.issueDate ?? '').localeCompare(x.issueDate ?? ''));
      if (!liste.length) return vide('Aucune facture sur cette période.', { total: 0, suivant: null, total_ttc: 0, reste_a_encaisser_ttc: 0, factures: [] });
      const p = paginer(liste, a);
      return {
        total: p.total, suivant: p.suivant,
        total_ttc: euros(liste.reduce((s, f) => s + totaux(f.lines).ttc, 0)),
        reste_a_encaisser_ttc: euros(liste.filter(factureOuverte).reduce((s, f) => s + resteFacture(f), 0)),
        factures: p.page.map((f) => resume(env, f, donnees.clients as Client[])),
      };
    },
  },
  {
    name: 'lire_facture',
    title: 'Lire une facture',
    description: 'Détail d’une facture : client, devis d’origine, lignes, totaux, montant payé, reste, relances envoyées et historique de facture électronique.',
    inputSchema: entree({ id: S.str('Identifiant ou numéro de la facture (ex. F-2026-201)') }, ['id']),
    outputSchema: sortie({
      facture: RESUME,
      devis_origine: S.nstr(),
      relances_envoyees: S.int(),
      relance_a_faire: S.bool(),
      lignes: S.arr(LIGNE),
      totaux: S.obj({ ht: S.num(), tva: S.num(), ttc: S.num() }),
      historique_facture_electronique: S.arr(S.obj({ le: S.str(), statut: S.str(), note: S.nstr() })),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const id = str(a.id);
      if (!id) throw new ErreurOutil('Indiquez l’identifiant ou le numéro de la facture.');
      const f = trouver(donnees.factures as Facture[] | undefined, id, ['number']);
      if (!f) throw new ErreurOutil(`Aucune facture « ${id} ». Utilisez lister_factures pour retrouver le bon numéro.`);
      const t = totaux(f.lines);
      const devis = f.devisId ? (donnees.devis as Devis[] | undefined)?.find((d) => d.id === f.devisId)?.number ?? null : null;
      return {
        facture: resume(env, f, donnees.clients as Client[]),
        devis_origine: devis,
        relances_envoyees: f.remindersSent ?? 0,
        relance_a_faire: !!(f as Facture & { relanceAFaire?: unknown }).relanceAFaire,
        lignes: (f.lines ?? []).slice(0, 200).map(ligneSortie),
        totaux: { ht: t.ht, tva: t.tva, ttc: t.ttc },
        historique_facture_electronique: (f.einvoice?.history ?? []).slice(-20).map((h) => ({ le: h.at, statut: h.status, note: h.note ?? null })),
      };
    },
  },
  {
    name: 'lister_impayes',
    title: 'Lister les impayés',
    description: 'Factures échues et non soldées, de la plus ancienne échéance à la plus récente, avec le client, ses coordonnées, le reste dû et les jours de retard.',
    inputSchema: entree({ ...PAGINATION }),
    outputSchema: sortie({
      ...SORTIE_PAGE,
      total_en_retard_ttc: S.num(),
      factures: S.arr(S.obj({
        id: S.str(), numero: S.str(), client: S.nstr(), client_id: S.str(), email: S.nstr(), telephone: S.nstr(), echeance: S.str(),
        reste_ttc: S.num(), jours_de_retard: S.int(), relances_envoyees: S.int(), relance_a_faire: S.bool(), lien: S.str(),
      })),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const auj = jourIso();
      const clients = (donnees.clients as Client[] | undefined) ?? [];
      const liste = ((donnees.factures as Facture[] | undefined) ?? []).filter((f) => factureOuverte(f) && f.dueDate && f.dueDate < auj).sort((x, y) => x.dueDate.localeCompare(y.dueDate));
      if (!liste.length) return vide('Aucune facture en retard de paiement.', { total: 0, suivant: null, total_en_retard_ttc: 0, factures: [] });
      const p = paginer(liste, a);
      return {
        total: p.total, suivant: p.suivant,
        total_en_retard_ttc: euros(liste.reduce((s, f) => s + resteFacture(f), 0)),
        factures: p.page.map((f) => {
          const c = clients.find((x) => x.id === f.clientId);
          return {
            id: f.id, numero: f.number, client: c?.name ?? null, client_id: f.clientId, email: c?.email || null, telephone: c?.phone || null, echeance: f.dueDate,
            reste_ttc: resteFacture(f), jours_de_retard: jours(f.dueDate, auj), relances_envoyees: f.remindersSent ?? 0,
            relance_a_faire: !!(f as Facture & { relanceAFaire?: unknown }).relanceAFaire, lien: lien(env, `factures/${f.id}`),
          };
        }),
      };
    },
  },
  {
    name: 'calculer_chiffre_affaires',
    title: 'Calculer le chiffre d’affaires',
    description: 'Chiffre d’affaires facturé HT et encaissé TTC par mois (avoirs déduits), devis envoyés et signés, taux de transformation, sur les N derniers mois.',
    inputSchema: entree({ mois: S.int('Nombre de mois (1 à 24, défaut 12)', { minimum: 1, maximum: 24 }) }),
    outputSchema: sortie({
      periode: S.obj({ depuis: S.str(), mois: S.int() }),
      facture_ht_total: S.num(),
      encaisse_ttc_total: S.num(),
      par_mois: S.arr(S.obj({ mois: S.str(), facture_ht: S.num(), encaisse_ttc: S.num() })),
      devis: S.obj({ envoyes: S.int(), signes: S.int(), montant_signe_ht: S.num(), taux_transformation_pct: S.nnum() }),
    }),
    run: async ({ etat }, a) => {
      const { donnees } = await etat();
      const mois = entier(a.mois, 1, 24, 12);
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (mois - 1));
      const depuis = jourIso(d);
      const fact = ((donnees.factures as Facture[] | undefined) ?? []).filter((f) => !['brouillon', 'annulee'].includes(f.status) && (f.issueDate ?? '') >= depuis);
      const devis = ((donnees.devis as Devis[] | undefined) ?? []).filter((x) => (x.createdAt ?? '') >= depuis);
      if (!fact.length && !devis.length) {
        return vide(`Pas encore de facture ni de devis sur les ${mois} derniers mois.`, {
          periode: { depuis, mois }, facture_ht_total: 0, encaisse_ttc_total: 0, par_mois: [], devis: { envoyes: 0, signes: 0, montant_signe_ht: 0, taux_transformation_pct: null },
        });
      }
      const parMois = new Map<string, { facture_ht: number; encaisse_ttc: number }>();
      for (const f of fact) {
        const k = f.issueDate.slice(0, 7);
        const m = parMois.get(k) ?? { facture_ht: 0, encaisse_ttc: 0 };
        const ht = totaux(f.lines).ht;
        m.facture_ht += f.kind === 'avoir' ? -ht : ht;
        m.encaisse_ttc += Number(f.paidAmount) || 0;
        parMois.set(k, m);
      }
      const lignes = [...parMois.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => ({ mois: k, facture_ht: euros(v.facture_ht), encaisse_ttc: euros(v.encaisse_ttc) }));
      const envoyes = devis.filter((x) => x.status !== 'brouillon').length;
      const signes = devis.filter((x) => x.status === 'signe');
      return {
        periode: { depuis, mois },
        facture_ht_total: euros(lignes.reduce((s, x) => s + x.facture_ht, 0)),
        encaisse_ttc_total: euros(lignes.reduce((s, x) => s + x.encaisse_ttc, 0)),
        par_mois: lignes,
        devis: {
          envoyes, signes: signes.length, montant_signe_ht: euros(signes.reduce((s, x) => s + totaux(x.lines).ht, 0)),
          taux_transformation_pct: envoyes ? Math.round((signes.length / envoyes) * 1000) / 10 : null,
        },
      };
    },
  },
];
