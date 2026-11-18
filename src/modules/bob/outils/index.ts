// Exécution des outils demandés par le modèle (blocs tool_use), côté navigateur,
// sur le store local. Les définitions (noms, schémas) vivent dans le worker
// (worker/src/modules/bob/outils.ts) : les noms doivent rester identiques.
//
// Règle : rien ne part chez un tiers sans clic explicite. Les relances sont
// seulement préparées (carte de confirmation) ; les devis restent en brouillon.

import { useBrix } from '@/lib/store';
import { dateLong, money, todayISO } from '@/lib/format';
import type { BobCard } from '../nlu/types';
import {
  aRelancer, carteImpayes, devisEnAttente, envoyerRelances, impayes, ligneImpaye, margeChantiers,
  margeDevisSignes, nomClient, resteDu, type Etat, type Periode,
} from './argent';
import {
  ajouterLignes, annulerDevis, carteClient, carteDevis, carteLignesAjoutees, chiffrer, dernierBrouillon, enregistrerClient,
  enregistrerDevis, envoyerDevis, ligneDepuisArticle, nouveauClient, resoudreClient, resumeDevis, trouverClient, type ArticleDemande,
} from './creation';
import { cheminEcran, rechercher, regle, resume, type TypeRecherche } from './lecture';
import { capital, carteAgenda, evenements, planifier, prenom, statutChantier, trouverChantier, trouverEmploye, type Creneau } from './planning';

export interface ResultatOutil {
  /** Envoyé au modèle (JSON). */
  contenu: unknown;
  erreur?: boolean;
  /** Pastille discrète dans le panneau. */
  activite: { label: string; to?: string; ton?: 'ok' | 'warn' };
  carte?: BobCard;
  naviguer?: string;
}

/** Libellé affiché pendant qu'un outil tourne. */
export const EN_COURS: Record<string, string> = {
  rechercher: 'Recherche…',
  lire_resume: 'Lecture de tes chiffres…',
  lister_impayes: 'Recherche des impayés…',
  relancer_factures: 'Préparation des relances…',
  lister_devis_en_attente: 'Recherche des devis à signer…',
  creer_devis: 'Préparation du devis…',
  ajouter_lignes_devis: 'Ajout des lignes…',
  lire_agenda: 'Lecture du planning…',
  planifier: 'Mise à jour du planning…',
  statut_chantier: 'Point sur le chantier…',
  creer_client: 'Création de la fiche client…',
  calculer_marge: 'Calcul de la marge…',
  ouvrir_ecran: 'Ouverture de l’écran…',
  expliquer_regle: 'Lecture de la fiche…',
};

type Entree = Record<string, unknown>;
const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
const opt = (x: unknown) => str(x) || undefined;
const iso = (x: unknown) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '');
const erreur = (message: string, label = 'Je n’ai pas pu le faire'): ResultatOutil => ({ contenu: { erreur: message }, erreur: true, activite: { label, ton: 'warn' } });

function articles(x: unknown): ArticleDemande[] {
  if (!Array.isArray(x)) return [];
  return x.flatMap((a) => {
    const o = (a ?? {}) as Entree;
    const libelle = str(o.libelle);
    const quantite = typeof o.quantite === 'number' && o.quantite > 0 ? o.quantite : 1;
    const prix = typeof o.prix_unitaire_ht === 'number' && o.prix_unitaire_ht >= 0 ? o.prix_unitaire_ht : null;
    return libelle ? [{ libelle, quantite, unite: opt(o.unite) ?? null, prix_unitaire_ht: prix }] : [];
  });
}

const G = () => useBrix.getState();

const OUTILS: Record<string, (s: Etat, e: Entree) => ResultatOutil> = {
  rechercher: (s, e) => {
    const texte = str(e.texte);
    if (!texte) return erreur('texte vide');
    const types = Array.isArray(e.types) ? (e.types.filter((t) => ['client', 'devis', 'facture', 'chantier'].includes(String(t))) as TypeRecherche[]) : null;
    const r = rechercher(s, texte, types);
    return { contenu: r, activite: { label: r.total ? `${r.total} résultat${r.total > 1 ? 's' : ''} pour « ${texte} »` : `Rien trouvé pour « ${texte} »` } };
  },

  lire_resume: (s, e) => {
    const periode = (['mois', 'semaine', 'annee'].includes(str(e.periode)) ? str(e.periode) : 'mois') as Periode;
    return { contenu: resume(s, periode), activite: { label: 'Chiffres du moment lus' } };
  },

  lister_impayes: (s) => {
    const list = impayes(s);
    const total = list.reduce((x, f) => x + resteDu(f), 0);
    return {
      contenu: { nombre: list.length, total_du_ttc: Math.round(total), factures: list.map((f) => ligneImpaye(s, f)) },
      activite: { label: list.length ? `${list.length} facture${list.length > 1 ? 's' : ''} en retard` : 'Aucun impayé', to: '/app/relances' },
      carte: list.length ? carteImpayes(s, list, false) : undefined,
    };
  },

  relancer_factures: (s, e) => {
    const refs = Array.isArray(e.factures) ? e.factures.map(str).filter(Boolean) : [];
    const ids = refs.map((r) => s.factures.find((f) => f.id === r || f.number === r)?.id).filter((x): x is string => !!x);
    if (refs.length && !ids.length) return erreur(`factures introuvables : ${refs.join(', ')}`);
    const list = aRelancer(s, ids);
    if (!list.length) return { contenu: { preparees: 0, message: 'Personne à relancer.' }, activite: { label: 'Personne à relancer' } };
    const total = list.reduce((x, f) => x + resteDu(f), 0);
    const carte: BobCard = {
      kind: 'list', icon: 'Send', title: `Relancer ${list.length} client${list.length > 1 ? 's' : ''} ?`, subtitle: 'Un e-mail poli avec le lien de paiement. Rien ne part sans ton accord.',
      figure: money(total, true), figureLabel: 'à récupérer',
      rows: list.map((f) => ({ label: nomClient(s, f.clientId), sub: `${f.number} · relance n° ${f.remindersSent + 1}`, value: money(resteDu(f)), to: `/app/factures/${f.id}` })),
      actions: [
        {
          label: 'Envoyer les relances', variant: 'primary', icon: 'Send',
          run: () => {
            const st = G();
            const fresh = aRelancer(st, list.map((f) => f.id));
            if (!fresh.length) return 'Ces factures sont déjà réglées.';
            envoyerRelances(st, fresh);
            return `${fresh.length} relance${fresh.length > 1 ? 's envoyées' : ' envoyée'}.`;
          },
        },
        { label: 'Pas maintenant', variant: 'ghost', run: () => 'Rien n’est parti.' },
      ],
    };
    return {
      contenu: { preparees: list.length, total_du_ttc: Math.round(total), factures: list.map((f) => ligneImpaye(s, f)), etat: 'en_attente_de_confirmation', consigne: 'Une carte de confirmation est affichée. Rien n’est envoyé tant que l’utilisateur n’a pas cliqué sur « Envoyer les relances ». Ne dis pas que les relances sont parties.' },
      activite: { label: `${list.length} relance${list.length > 1 ? 's' : ''} à confirmer`, ton: 'warn' },
      carte,
    };
  },

  lister_devis_en_attente: (s) => {
    const r = devisEnAttente(s);
    return {
      contenu: { nombre: r.list.length, total_ht: Math.round(r.total), devis: r.list.map((d) => ({ id: d.id, numero: d.number, client: nomClient(s, d.clientId), titre: d.title, statut: d.status === 'vu' ? `vu ${d.views ?? 1} fois` : 'envoyé, pas encore ouvert', envoye_le: d.sentAt ?? null })) },
      activite: { label: r.list.length ? `${r.list.length} devis à signer` : 'Aucun devis en attente', to: '/app/devis' },
      carte: r.card,
    };
  },

  creer_devis: (s, e) => {
    const resolved = resoudreClient(s, str(e.client));
    if (!resolved) return erreur('nom du client manquant');
    const { client, created } = resolved;
    const { lines, nouns } = chiffrer(s, articles(e.lignes));
    const devis = enregistrerDevis(s, client, created, lines, nouns, opt(e.titre));
    return {
      contenu: { ...resumeDevis(devis, client), client_cree: created, envoye: false, note: 'Devis en brouillon. L’utilisateur peut l’envoyer depuis la carte affichée.' },
      activite: { label: `Devis ${devis.number} créé`, to: `/app/devis/${devis.id}`, ton: 'ok' },
      carte: carteDevis(s, devis, client, () => envoyerDevis(G(), devis.id, client), () => annulerDevis(G(), devis.id, client.id, created)),
    };
  },

  ajouter_lignes_devis: (s, e) => {
    const ref = opt(e.devis);
    const devis = ref ? s.devis.find((d) => d.id === ref || d.number === ref) : dernierBrouillon(s);
    if (!devis) return erreur(ref ? `devis ${ref} introuvable` : 'aucun devis en brouillon');
    if (devis.status !== 'brouillon') return erreur(`le devis ${devis.number} n’est plus en brouillon (${devis.status}) : on ne modifie pas un devis déjà envoyé`);
    const vat = s.company.defaultVat || 10;
    const added = articles(e.lignes).map((a) => ligneDepuisArticle(a, vat).line);
    if (!added.length) return erreur('aucune ligne à ajouter');
    const { before, next } = ajouterLignes(s, devis, added);
    const client = s.clients.find((c) => c.id === devis.clientId);
    return {
      contenu: client ? resumeDevis(next, client) : { numero: next.number },
      activite: { label: `${added.length} ligne${added.length > 1 ? 's' : ''} ajoutée${added.length > 1 ? 's' : ''} à ${devis.number}`, to: `/app/devis/${devis.id}`, ton: 'ok' },
      carte: carteLignesAjoutees(devis, added, () => { G().upsertDevis(before); return 'Lignes retirées.'; }),
    };
  },

  lire_agenda: (s, e) => {
    const du = iso(e.du) || todayISO();
    const au = iso(e.au) || du;
    const equipe = e.equipe === true;
    const evs = evenements(s, du, au < du ? du : au, equipe);
    const titre = du === au ? capital(dateLong(du)) : `Du ${dateLong(du)} au ${dateLong(au)}`;
    return {
      contenu: { du, au, equipe, creneaux: evs.map((x) => ({ date: x.date, debut: x.start, fin: x.end, titre: x.title, type: x.kind, qui: prenom(s, x.employeeId), chantier_id: x.chantierId ?? null })) },
      activite: { label: evs.length ? `${evs.length} créneau${evs.length > 1 ? 'x' : ''} au planning` : 'Planning vide sur ces dates', to: '/app/planning' },
      carte: evs.length ? carteAgenda(s, evs, titre, equipe) : undefined,
    };
  },

  planifier: (s, e) => {
    const emp = trouverEmploye(s, str(e.employe));
    if (!emp) return erreur(`personne de l’équipe ne s’appelle « ${str(e.employe)} ». Équipe : ${s.employees.map((x) => x.firstName).join(', ')}`);
    const c = trouverChantier(s, str(e.chantier));
    if (!c) return erreur(`chantier « ${str(e.chantier)} » introuvable`);
    const date = iso(e.date);
    if (!date) return erreur('date invalide (format AAAA-MM-JJ attendu)');
    const creneau = (['journee', 'matin', 'apres_midi'].includes(str(e.creneau)) ? str(e.creneau) : 'journee') as Creneau;
    const r = planifier(s, emp, c, date, creneau);
    return {
      contenu: { fait: true, employe: emp.firstName, chantier: c.name, date, debut: r.half[0], fin: r.half[1], conflits: r.conflicts.map((x) => ({ titre: x.title, debut: x.start, fin: x.end })) },
      activite: { label: `${emp.firstName} placé sur ${c.name}`, to: '/app/planning', ton: r.conflicts.length ? 'warn' : 'ok' },
      carte: r.card(() => r.annuler(G())),
    };
  },

  statut_chantier: (s, e) => {
    const c = trouverChantier(s, str(e.chantier));
    if (!c) return { contenu: { trouve: false, chantiers_en_cours: s.chantiers.filter((x) => x.status === 'en_cours').map((x) => x.name) }, activite: { label: 'Chantier introuvable', ton: 'warn' } };
    const r = statutChantier(s, c);
    return { contenu: r.donnees, activite: { label: `Point sur ${c.name}`, to: `/app/chantiers/${c.id}` }, carte: r.card };
  },

  creer_client: (s, e) => {
    const nom = str(e.nom);
    if (!nom) return erreur('nom manquant');
    const existe = trouverClient(s, nom);
    if (existe) return { contenu: { deja_existant: true, id: existe.id, nom: existe.name, telephone: existe.phone, ville: existe.city }, activite: { label: `${existe.name} existe déjà`, to: `/app/clients/${existe.id}` } };
    const client = enregistrerClient(s, nouveauClient(nom, { phone: opt(e.telephone), email: opt(e.email), city: opt(e.ville), address: opt(e.adresse) }));
    return {
      contenu: { cree: true, id: client.id, nom: client.name, a_completer: [!client.phone && 'téléphone', !client.email && 'e-mail', !client.city && 'ville'].filter(Boolean) },
      activite: { label: `Fiche ${client.name} créée`, to: `/app/clients/${client.id}`, ton: 'ok' },
      carte: carteClient(client, () => { G().removeClient(client.id); return 'Client retiré.'; }),
    };
  },

  calculer_marge: (s, e) => {
    if (str(e.portee) === 'chantiers_en_cours') {
      const r = margeChantiers(s);
      return { contenu: { portee: 'chantiers_en_cours', budget_ht: Math.round(r.budget), taux_marge_prevu: Math.round(r.taux * 10) / 10, chantiers: r.detail }, activite: { label: 'Marge des chantiers calculée', to: '/app/chantiers' }, carte: r.card };
    }
    const r = margeDevisSignes(s);
    return { contenu: { portee: 'devis_signes', nombre: r.nombre, total_ht: Math.round(r.ht), marge: Math.round(r.marge), taux_marge: Math.round(r.taux * 10) / 10, devis: r.detail }, activite: { label: 'Marge des devis signés calculée', to: '/app/devis' }, carte: r.nombre ? r.card : undefined };
  },

  ouvrir_ecran: (s, e) => {
    const r = cheminEcran(s, str(e.ecran), opt(e.identifiant));
    if (!r) return erreur(`écran inconnu : ${str(e.ecran)}`);
    return { contenu: { ouvert: r.chemin }, activite: { label: `J’ouvre ${r.label}`, to: r.chemin }, naviguer: r.chemin };
  },

  expliquer_regle: (_s, e) => {
    const r = regle(str(e.sujet));
    if (!r) return erreur(`pas de fiche pour « ${str(e.sujet)} »`);
    return { contenu: r.contenu, activite: { label: `Fiche : ${r.lesson.card.title}` }, carte: r.lesson.card };
  },
};

/** Exécute un outil sur l'état courant du store. Ne lève jamais : une erreur devient un résultat is_error. */
export function executerOutil(nom: string, entree: unknown, s: Etat = G()): ResultatOutil {
  const fn = OUTILS[nom];
  if (!fn) return erreur(`outil inconnu : ${nom}`);
  if (!entree || typeof entree !== 'object' || Array.isArray(entree)) return erreur('entrée invalide');
  try {
    return fn(s, entree as Entree);
  } catch (err) {
    return erreur(err instanceof Error ? err.message : 'erreur inattendue');
  }
}

export const NOMS_OUTILS = Object.keys(OUTILS);
