// Outils de lecture pour l'agent : recherche plein texte, résumé des chiffres,
// fiches de règles (NF C 15-100, TVA, facture électronique…) et écrans de l'app.

import { totals } from '@/lib/format';
import { CHANTIER_STATUS, DEVIS_STATUS, FACTURE_STATUS } from '@/lib/status';
import { LESSONS } from '../nlu/knowledge';
import { norm } from '../nlu/text';
import { devisEnAttente, encaissements, impayes, nomClient, resteDu, tresorerie, type Etat, type Periode } from './argent';

export type TypeRecherche = 'client' | 'devis' | 'facture' | 'chantier';
const TOUS: TypeRecherche[] = ['client', 'devis', 'facture', 'chantier'];

const contient = (q: string[], hay: string) => {
  const h = norm(hay);
  return q.every((w) => h.includes(w));
};

/** Recherche dans les clients, devis, factures et chantiers (tous les mots doivent apparaître). */
export function rechercher(s: Etat, texte: string, types?: TypeRecherche[] | null, limite = 8) {
  const q = norm(texte).replace(/[^a-z0-9@.+'\- ]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !['le', 'la', 'les', 'de', 'du', 'des', 'chez', 'mme', 'madame', 'monsieur', 'chantier', 'devis', 'facture', 'client'].includes(w));
  const t = types?.length ? types : TOUS;
  const out: Record<string, unknown[]> = {};
  if (!q.length) return { resultats: out, total: 0 };
  if (t.includes('client'))
    out.clients = s.clients.filter((c) => contient(q, `${c.name} ${c.contact ?? ''} ${c.city} ${c.email} ${c.phone}`)).slice(0, limite)
      .map((c) => ({ id: c.id, nom: c.name, type: c.kind, ville: c.city, telephone: c.phone, email: c.email }));
  if (t.includes('devis'))
    out.devis = s.devis.filter((d) => contient(q, `${d.number} ${d.title} ${nomClient(s, d.clientId)}`)).slice(0, limite)
      .map((d) => ({ id: d.id, numero: d.number, titre: d.title, client: nomClient(s, d.clientId), statut: DEVIS_STATUS[d.status].label, total_ht: Math.round(totals(d.lines).ht), cree_le: d.createdAt }));
  if (t.includes('facture'))
    out.factures = s.factures.filter((f) => contient(q, `${f.number} ${f.title} ${nomClient(s, f.clientId)}`)).slice(0, limite)
      .map((f) => ({ id: f.id, numero: f.number, titre: f.title, client: nomClient(s, f.clientId), statut: FACTURE_STATUS[f.status].label, total_ttc: Math.round(totals(f.lines).ttc), reste_du: Math.round(resteDu(f)), echeance: f.dueDate }));
  if (t.includes('chantier'))
    out.chantiers = s.chantiers.filter((c) => contient(q, `${c.name} ${c.city} ${nomClient(s, c.clientId)}`)).slice(0, limite)
      .map((c) => ({ id: c.id, nom: c.name, client: nomClient(s, c.clientId), ville: c.city, statut: CHANTIER_STATUS[c.status].label, avancement: c.progress }));
  const total = Object.values(out).reduce((x, l) => x + l.length, 0);
  return { resultats: out, total };
}

/** Les chiffres clés du moment. */
export function resume(s: Etat, periode: Periode = 'mois') {
  const e = encaissements(s, periode);
  const late = impayes(s);
  const att = devisEnAttente(s);
  const tr = tresorerie(s);
  return {
    periode: e.label,
    encaisse: Math.round(e.total),
    paiements_recus: e.paiements.length,
    paiements_sans_facture: e.sansFacture,
    a_encaisser: Math.round(tr.aEncaisser),
    impayes: { nombre: late.length, montant: Math.round(late.reduce((x, f) => x + resteDu(f), 0)) },
    devis_en_attente: { nombre: att.list.length, montant_ht: Math.round(att.total) },
    tresorerie: Math.round(tr.solde),
    chantiers_en_cours: s.chantiers.filter((c) => c.status === 'en_cours').length,
  };
}

export const SUJETS_REGLES = LESSONS.map((l) => l.key);

/** Fiche vérifiée sur une règle : le modèle s'appuie dessus plutôt que sur sa mémoire. */
export function regle(sujet: string) {
  const l = LESSONS.find((x) => x.key === sujet);
  if (!l) return null;
  return { lesson: l, contenu: { sujet: l.key, titre: l.card.title, sous_titre: l.card.subtitle ?? null, points: l.card.bullets ?? l.card.paragraphs ?? [], source: l.card.source ?? null } };
}

/** Écrans que Bob peut ouvrir (chemins de src/modules/registry.tsx, hors réglages internes). */
export const ECRANS: Record<string, { chemin: string; label: string; detail?: 'client' | 'devis' | 'facture' | 'chantier' }> = {
  accueil: { chemin: '/app', label: 'l’accueil' },
  demandes: { chemin: '/app/demandes', label: 'les demandes' },
  clients: { chemin: '/app/clients', label: 'les clients', detail: 'client' },
  rendez_vous: { chemin: '/app/rendez-vous', label: 'les rendez-vous' },
  avis: { chemin: '/app/avis', label: 'les avis' },
  devis: { chemin: '/app/devis', label: 'les devis', detail: 'devis' },
  factures: { chemin: '/app/factures', label: 'les factures', detail: 'facture' },
  facture_electronique: { chemin: '/app/facture-electronique', label: 'la facture électronique' },
  paiements: { chemin: '/app/paiements', label: 'les paiements' },
  relances: { chemin: '/app/relances', label: 'les relances' },
  tresorerie: { chemin: '/app/tresorerie', label: 'la trésorerie' },
  notes_de_frais: { chemin: '/app/notes-de-frais', label: 'les notes de frais' },
  chantiers: { chemin: '/app/chantiers', label: 'les chantiers', detail: 'chantier' },
  planning: { chemin: '/app/planning', label: 'le planning' },
  prise_de_cotes: { chemin: '/app/prise-de-cotes', label: 'la prise de cotes' },
  photos: { chemin: '/app/photos', label: 'les photos' },
  pv_reception: { chemin: '/app/pv-reception', label: 'les PV de réception' },
  sav: { chemin: '/app/sav', label: 'le SAV' },
  equipe: { chemin: '/app/equipe', label: 'l’équipe' },
  pointage: { chemin: '/app/pointage', label: 'le pointage' },
  conges: { chemin: '/app/conges', label: 'les congés' },
  habilitations: { chemin: '/app/habilitations', label: 'les habilitations' },
  paie: { chemin: '/app/paie', label: 'la paie' },
  fournisseurs: { chemin: '/app/fournisseurs', label: 'les fournisseurs' },
  stock: { chemin: '/app/stock', label: 'le stock' },
  vehicules: { chemin: '/app/vehicules', label: 'les véhicules' },
  sous_traitants: { chemin: '/app/sous-traitants', label: 'les sous-traitants' },
  bob: { chemin: '/app/bob', label: 'les réglages de Bob' },
  brief: { chemin: '/app/bob/brief', label: 'le brief du matin' },
  outils: { chemin: '/app/outils', label: 'les outils métier' },
  calcul_nfc15100: { chemin: '/app/outils/nfc15100', label: 'le calcul NF C 15-100' },
  site: { chemin: '/app/site', label: 'le site internet' },
  compta: { chemin: '/app/compta', label: 'la compta' },
  documents: { chemin: '/app/documents', label: 'les documents' },
  reglages: { chemin: '/app/reglages', label: 'les réglages' },
};

/** Chemin d'un écran, éventuellement sur une fiche précise (id ou numéro). */
export function cheminEcran(s: Etat, ecran: string, identifiant?: string | null): { chemin: string; label: string } | null {
  const e = ECRANS[ecran];
  if (!e) return null;
  if (!identifiant || !e.detail) return e;
  const id = identifiant.trim();
  const list: { id: string; number?: string; name?: string }[] =
    e.detail === 'client' ? s.clients : e.detail === 'devis' ? s.devis : e.detail === 'facture' ? s.factures : s.chantiers;
  const found = list.find((x) => x.id === id || x.number === id || (x.name && norm(x.name) === norm(id)));
  return found ? { chemin: `${e.chemin}/${found.id}`, label: `${e.label.replace(/^(les|la|le|l’)\s?/, '')} ${found.number ?? found.name ?? ''}`.trim() } : e;
}
