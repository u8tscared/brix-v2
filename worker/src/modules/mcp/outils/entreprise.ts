/** Outils de lecture : entreprise, planning, demandes entrantes. */
import type { Chantier, Company, Devis, Employee, Facture, Lead, PlanningEvent } from '../../../../../src/lib/types';
import { first } from '../../fournisseurs/depot';
import { peutEcrire } from '../jetons';
import { ErreurOutil, PAGINATION, S, SORTIE_PAGE, entree, euros, factureOuverte, ilYa, jourIso, lien, paginer, resteFacture, sortie, str, totaux, vide, type Outil } from './commun';

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const nomEmploye = (e?: Employee) => (e ? `${e.firstName} ${e.lastName}`.trim() : null);

export const OUTILS_ENTREPRISE: Outil[] = [
  {
    name: 'lire_entreprise',
    title: 'Lire l’entreprise',
    description: 'Nom, métier, taille, ville, SIRET, taux horaire et TVA par défaut de l’entreprise, modules activés, et compteurs du jour : devis en attente, factures impayées, chantiers en cours, nouvelles demandes, commandes fournisseurs.',
    inputSchema: entree(),
    outputSchema: sortie({
      nom: S.str(), raison_sociale: S.str(), metier: S.str(), taille: S.str(), ville: S.str(), siret: S.str(), taux_horaire_ht: S.num(), tva_defaut_pct: S.num(),
      modules_actives: S.arr(S.str()), aujourd_hui: S.str(), actions_autorisees: S.bool('Vrai si cet accès peut créer des brouillons'),
      compteurs: S.obj({
        devis_en_attente: S.obj({ nombre: S.int(), montant_ht: S.num() }),
        factures_impayees: S.obj({ nombre: S.int(), reste_a_encaisser_ttc: S.num() }),
        chantiers_en_cours: S.int(), demandes_nouvelles: S.int(), commandes_fournisseurs_en_cours: S.int(),
      }),
      lien: S.str(),
    }),
    run: async ({ env, ctx, etat }) => {
      const { donnees } = await etat();
      const co = donnees.company as Company | undefined;
      if (!co?.name) return vide('L’entreprise n’est pas encore configurée dans Brix (ou ses données ne sont pas encore synchronisées).');
      const devis = ((donnees.devis as Devis[] | undefined) ?? []).filter((d) => d.status === 'envoye' || d.status === 'vu');
      const impayes = ((donnees.factures as Facture[] | undefined) ?? []).filter(factureOuverte);
      const cmd = await first<{ n: number }>(env, `SELECT COUNT(*) AS n FROM fournisseurs_commandes WHERE organization_id = ? AND statut IN ('envoyee','confirmee','expediee','livree_partiel')`, ctx.organizationId).catch(() => null);
      return {
        nom: co.name, raison_sociale: co.legalName ?? '', metier: co.trade ?? '', taille: co.size ?? '', ville: co.city ?? '', siret: co.siret ?? '',
        taux_horaire_ht: euros(co.hourlyRate), tva_defaut_pct: Number(co.defaultVat) || 0,
        modules_actives: Array.isArray(donnees.enabled) ? (donnees.enabled as string[]) : [],
        aujourd_hui: jourIso(), actions_autorisees: peutEcrire(ctx),
        compteurs: {
          devis_en_attente: { nombre: devis.length, montant_ht: euros(devis.reduce((s, d) => s + totaux(d.lines).ht, 0)) },
          factures_impayees: { nombre: impayes.length, reste_a_encaisser_ttc: euros(impayes.reduce((s, f) => s + resteFacture(f), 0)) },
          chantiers_en_cours: ((donnees.chantiers as Chantier[] | undefined) ?? []).filter((c) => c.status === 'en_cours').length,
          demandes_nouvelles: ((donnees.leads as Lead[] | undefined) ?? []).filter((l) => l.status === 'nouveau').length,
          commandes_fournisseurs_en_cours: cmd?.n ?? 0,
        },
        lien: lien(env, ''),
      };
    },
  },
  {
    name: 'lire_planning',
    title: 'Lire le planning',
    description: 'Créneaux du planning (chantiers, rendez-vous, SAV, absences, formations) entre deux dates, pour toute l’équipe ou une personne. Par défaut : les 7 prochains jours.',
    inputSchema: entree({
      du: S.str('Premier jour, AAAA-MM-JJ (défaut aujourd’hui)'),
      au: S.str('Dernier jour inclus, AAAA-MM-JJ (défaut du + 6 jours, 62 jours au plus)'),
      employe_id: S.str('Identifiant d’une personne de l’équipe'),
      type: S.enum(['chantier', 'rdv', 'sav', 'absence', 'formation', 'interne']),
    }),
    outputSchema: sortie({
      du: S.str(), au: S.str(),
      equipe: S.arr(S.obj({ id: S.str(), nom: S.str(), role: S.str() })),
      creneaux: S.arr(S.obj({ id: S.str(), date: S.str(), debut: S.str(), fin: S.str(), titre: S.str(), type: S.str(), employe_id: S.str(), employe: S.nstr(), chantier: S.nstr() })),
      lien: S.str(),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const du = str(a.du) ?? jourIso();
      if (!JOUR.test(du)) throw new ErreurOutil('« du » doit être une date AAAA-MM-JJ.');
      const au = str(a.au) ?? jourIso(new Date(new Date(`${du}T12:00:00Z`).getTime() + 6 * 86_400_000));
      if (!JOUR.test(au) || au < du) throw new ErreurOutil('« au » doit être une date AAAA-MM-JJ postérieure à « du ».');
      if ((new Date(au).getTime() - new Date(du).getTime()) / 86_400_000 > 62) throw new ErreurOutil('Période trop longue : 62 jours au plus.');
      const employes = (donnees.employees as Employee[] | undefined) ?? [];
      const chantiers = (donnees.chantiers as Chantier[] | undefined) ?? [];
      const creneaux = ((donnees.events as PlanningEvent[] | undefined) ?? [])
        .filter((e) => e.date >= du && e.date <= au && (!str(a.employe_id) || e.employeeId === a.employe_id) && (!str(a.type) || e.kind === a.type))
        .sort((x, y) => `${x.date}${x.start}`.localeCompare(`${y.date}${y.start}`))
        .slice(0, 200)
        .map((e) => ({
          id: e.id, date: e.date, debut: e.start, fin: e.end, titre: e.title, type: e.kind, employe_id: e.employeeId,
          employe: nomEmploye(employes.find((x) => x.id === e.employeeId)), chantier: chantiers.find((c) => c.id === e.chantierId)?.name ?? null,
        }));
      const equipe = employes.map((e) => ({ id: e.id, nom: nomEmploye(e) ?? '', role: e.role }));
      if (!creneaux.length) return vide(`Rien au planning du ${du} au ${au}.`, { du, au, equipe, creneaux: [], lien: lien(env, 'planning') });
      return { du, au, equipe, creneaux, lien: lien(env, 'planning') };
    },
  },
  {
    name: 'lister_demandes',
    title: 'Lister les demandes de clients',
    description: 'Demandes entrantes de prospects (nom, téléphone, ville, besoin, source, statut, estimation), de la plus récente à la plus ancienne.',
    inputSchema: entree({ statut: S.enum(['nouveau', 'qualifie', 'rdv', 'devis', 'perdu', 'gagne']), depuis_jours: S.int('Reçues sur les N derniers jours (défaut 90)', { minimum: 1, maximum: 730 }), ...PAGINATION }),
    outputSchema: sortie({
      ...SORTIE_PAGE,
      demandes: S.arr(S.obj({ id: S.str(), nom: S.str(), telephone: S.str(), email: S.nstr(), ville: S.str(), besoin: S.str(), source: S.str(), recue_le: S.str(), statut: S.str(), estimation_ht: S.nnum(), lien: S.str() })),
    }),
    run: async ({ env, etat }, a) => {
      const { donnees } = await etat();
      const depuis = ilYa(typeof a.depuis_jours === 'number' ? Math.min(730, Math.max(1, a.depuis_jours)) : 90);
      const liste = ((donnees.leads as Lead[] | undefined) ?? [])
        .filter((l) => (l.receivedAt ?? '') >= depuis && (!str(a.statut) || l.status === a.statut))
        .sort((x, y) => (y.receivedAt ?? '').localeCompare(x.receivedAt ?? ''));
      if (!liste.length) return vide('Aucune demande de client sur cette période.', { total: 0, suivant: null, demandes: [] });
      const p = paginer(liste, a);
      return {
        total: p.total, suivant: p.suivant,
        demandes: p.page.map((l) => ({
          id: l.id, nom: l.name, telephone: l.phone ?? '', email: l.email ?? null, ville: l.city ?? '', besoin: l.request ?? '', source: l.source, recue_le: l.receivedAt,
          statut: l.status, estimation_ht: typeof l.estimate === 'number' ? euros(l.estimate) : null, lien: lien(env, 'demandes'),
        })),
      };
    },
  },
];
