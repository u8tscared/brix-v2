/**
 * Outils d'écriture (portée brix.ecriture). Ils créent des brouillons ou des notes dans le document
 * de l'entreprise (lib/etat.ts › modifierEtat) : l'app les récupère à la prochaine synchronisation.
 * Jamais d'envoi d'e-mail ou de SMS, jamais de mouvement d'argent, jamais de suppression.
 * Les objets suivent exactement src/lib/types.ts, avec la marque de provenance « brix-ai ».
 */
import type { Client, Company, Devis, DevisLigne, Employee, Facture, Lead, PlanningEvent } from '../../../../../src/lib/types';
import { modifierEtat, type EtatDonnees } from '../../../lib/etat';
import { journaliser } from '../reglages';
import { ErreurOutil, S, entree, euros, factureOuverte, jourIso, lien, norm, str, totaux, trouver, type Contexte, type Outil } from './commun';

const PROVENANCE = 'brix-ai' as const;
const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f|\u00a0/g, ' ')} €`;
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const TYPES_LIGNE = ['ouvrage', 'fourniture', 'main_oeuvre', 'section', 'texte'] as const;

/** Même forme que src/lib/format.ts › uid. */
const uid = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, '').slice(0, 7)}${Date.now().toString(36).slice(-3)}`;

/** Même règle que store.nextNumber('devis'). */
function prochainNumeroDevis(devis: Devis[]) {
  const max = devis.reduce((m, x) => {
    const k = Number(String(x.number ?? '').split('-').pop());
    return Number.isFinite(k) ? Math.max(m, k) : m;
  }, 100);
  return `D-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
}

const LIGNE_ENTREE = S.obj(
  {
    designation: S.str('Libellé de la ligne'),
    quantite: S.num('Quantité (défaut 1)', { minimum: 0 }),
    unite: S.str('u, m, m², h, forfait… (défaut u)'),
    prix_unitaire_ht: S.num('Prix unitaire HT en euros', { minimum: 0 }),
    tva_pct: S.num('Taux de TVA en % (défaut : celui de l’entreprise)', { minimum: 0, maximum: 30 }),
    type: S.enum(TYPES_LIGNE, 'Type de ligne (défaut ouvrage ; section = titre de lot)'),
  },
  ['designation'],
);

function lignesDepuis(entrees: unknown, tvaDefaut: number): DevisLigne[] {
  if (!Array.isArray(entrees) || entrees.length === 0) throw new ErreurOutil('Ajoutez au moins une ligne (désignation, quantité, unité, prix unitaire HT).');
  if (entrees.length > 100) throw new ErreurOutil('100 lignes au plus par appel.');
  return entrees.map((e, i) => {
    const l = (e ?? {}) as Record<string, unknown>;
    const designation = str(l.designation);
    if (!designation) throw new ErreurOutil(`Ligne ${i + 1} : la désignation est obligatoire.`);
    const kind = (TYPES_LIGNE as readonly string[]).includes(String(l.type)) ? (l.type as DevisLigne['kind']) : 'ouvrage';
    const quantite = l.quantite === undefined ? 1 : Number(l.quantite);
    const prix = l.prix_unitaire_ht === undefined ? 0 : Number(l.prix_unitaire_ht);
    const tva = l.tva_pct === undefined ? tvaDefaut : Number(l.tva_pct);
    if (![quantite, prix, tva].every((n) => Number.isFinite(n) && n >= 0)) throw new ErreurOutil(`Ligne ${i + 1} : quantité, prix et TVA doivent être des nombres positifs.`);
    if (kind !== 'section' && kind !== 'texte' && l.prix_unitaire_ht === undefined) throw new ErreurOutil(`Ligne ${i + 1} (« ${designation} ») : indiquez le prix unitaire HT.`);
    return { id: uid('l'), kind, designation: designation.slice(0, 500), quantity: quantite, unit: str(l.unite)?.slice(0, 20) ?? 'u', unitPriceHt: euros(prix), unitCostHt: 0, vatRate: tva };
  });
}

/** Applique une écriture, la journalise, et renvoie le résultat à l'assistant. */
async function ecrire<T>(c: Contexte, outil: string, fn: (d: EtatDonnees) => { resultat: T; resume: string }): Promise<T> {
  const { resultat, resume } = await modifierEtat(c.env, c.ctx.organizationId, `mcp:${c.ctx.clientLabel}`.slice(0, 80), fn);
  await journaliser(c.env, c.ctx.organizationId, c.ctx.clientLabel, outil, resume);
  return resultat;
}

const tvaDefaut = (d: EtatDonnees) => {
  const v = Number((d.company as Company | undefined)?.defaultVat);
  return Number.isFinite(v) ? v : 20;
};

const SORTIE_ECRITURE = (objet: Record<string, ReturnType<typeof S.str>>) => ({
  type: 'object',
  properties: { donnees_du: S.str(), monnaie: S.str(), ok: S.bool(), message: S.str(), ...objet },
  required: ['donnees_du', 'ok', 'message'],
});

export const OUTILS_ECRITURE: Outil[] = [
  {
    name: 'creer_client',
    title: 'Créer un client',
    ecriture: true,
    description: 'Ajoute une fiche client (particulier ou professionnel) avec ses coordonnées. Refuse un doublon de nom.',
    inputSchema: entree({
      nom: S.str('Nom du client ou de la société'), type: S.enum(['particulier', 'pro']), contact: S.str('Personne à contacter (pro)'),
      email: S.str(), telephone: S.str(), adresse: S.str(), ville: S.str('Code postal et ville'), siret: S.str(), notes: S.str(),
    }, ['nom']),
    outputSchema: SORTIE_ECRITURE({ client: S.obj({ id: S.str(), nom: S.str(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'creer_client', (d) => {
      const nom = str(a.nom);
      if (!nom) throw new ErreurOutil('Le nom du client est obligatoire.');
      const clients = (d.clients ??= []) as Client[];
      const doublon = clients.find((x) => norm(x.name) === norm(nom));
      if (doublon) throw new ErreurOutil(`Un client « ${doublon.name} » existe déjà (id ${doublon.id}). Utilisez cet identifiant.`);
      const client: Client & { origine: typeof PROVENANCE } = {
        id: uid('c'), kind: a.type === 'pro' ? 'pro' : 'particulier', name: nom.slice(0, 120), ...(str(a.contact) ? { contact: str(a.contact) } : {}),
        email: str(a.email) ?? '', phone: str(a.telephone) ?? '', address: str(a.adresse) ?? '', city: str(a.ville) ?? '', ...(str(a.siret) ? { siret: str(a.siret) } : {}),
        tags: [], createdAt: jourIso(), ...(str(a.notes) ? { notes: str(a.notes)!.slice(0, 2000) } : {}), origine: PROVENANCE,
      };
      clients.unshift(client);
      return { resultat: { ok: true, message: `Client « ${client.name} » créé.`, client: { id: client.id, nom: client.name, lien: lien(c.env, `clients/${client.id}`) } }, resume: `Client créé : ${client.name}` };
    }),
  },
  {
    name: 'creer_devis_brouillon',
    title: 'Créer un devis brouillon',
    ecriture: true,
    description: 'Crée un devis au statut brouillon pour un client existant, avec ses lignes. Le devis n’est pas envoyé : l’artisan le relit et l’envoie depuis Brix.',
    inputSchema: entree({
      client_id: S.str('Identifiant ou nom exact d’un client existant'),
      titre: S.str('Objet du devis'),
      lignes: S.arr(LIGNE_ENTREE),
      chantier_id: S.str('Chantier lié (facultatif)'),
      notes: S.str('Conditions ou remarques'),
      validite_jours: S.int('Validité en jours (défaut 30)', { minimum: 1, maximum: 365 }),
      acompte_pct: S.num('Acompte demandé en % (défaut 30)', { minimum: 0, maximum: 100 }),
    }, ['client_id', 'titre', 'lignes']),
    outputSchema: SORTIE_ECRITURE({ devis: S.obj({ id: S.str(), numero: S.str(), titre: S.str(), client: S.str(), statut: S.str(), total_ht: S.num(), total_ttc: S.num(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'creer_devis_brouillon', (d) => {
      const cle = str(a.client_id);
      const client = cle ? trouver(d.clients as Client[] | undefined, cle, ['name']) : undefined;
      if (!client) throw new ErreurOutil(`Client « ${cle ?? ''} » introuvable. Cherchez-le avec lister_clients ou créez-le avec creer_client.`);
      const titre = str(a.titre);
      if (!titre) throw new ErreurOutil('Le titre du devis est obligatoire.');
      const chantierId = str(a.chantier_id);
      if (chantierId && !(d.chantiers ?? []).some((x) => x.id === chantierId)) throw new ErreurOutil(`Chantier « ${chantierId} » introuvable.`);
      const lignes = lignesDepuis(a.lignes, tvaDefaut(d));
      const liste = (d.devis ??= []) as Devis[];
      const devis: Devis & { source: typeof PROVENANCE } = {
        id: uid('q'), number: prochainNumeroDevis(liste), clientId: client.id, ...(chantierId ? { chantierId } : {}), title: titre.slice(0, 200), status: 'brouillon',
        createdAt: jourIso(), validityDays: typeof a.validite_jours === 'number' ? Math.round(a.validite_jours) : 30,
        depositPercent: typeof a.acompte_pct === 'number' ? a.acompte_pct : 30, lines: lignes, ...(str(a.notes) ? { notes: str(a.notes)!.slice(0, 2000) } : {}), source: PROVENANCE,
      };
      liste.unshift(devis);
      const t = totaux(lignes);
      return {
        resultat: {
          ok: true, message: `Devis ${devis.number} créé en brouillon (${eur(t.ht)} HT). Rien n’a été envoyé au client.`,
          devis: { id: devis.id, numero: devis.number, titre: devis.title, client: client.name, statut: devis.status, total_ht: t.ht, total_ttc: t.ttc, lien: lien(c.env, `devis/${devis.id}`) },
        },
        resume: `Devis brouillon ${devis.number} · ${client.name} · ${eur(t.ht)} HT`,
      };
    }),
  },
  {
    name: 'ajouter_ligne_devis',
    title: 'Ajouter des lignes à un devis',
    ecriture: true,
    description: 'Ajoute une ou plusieurs lignes à la fin d’un devis encore au statut brouillon.',
    inputSchema: entree({ devis_id: S.str('Identifiant ou numéro du devis'), lignes: S.arr(LIGNE_ENTREE) }, ['devis_id', 'lignes']),
    outputSchema: SORTIE_ECRITURE({ devis: S.obj({ id: S.str(), numero: S.str(), nombre_lignes: S.int(), total_ht: S.num(), total_ttc: S.num(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'ajouter_ligne_devis', (d) => {
      const cle = str(a.devis_id) ?? '';
      const devis = trouver(d.devis as Devis[] | undefined, cle, ['number']);
      if (!devis) throw new ErreurOutil(`Aucun devis « ${cle} ». Utilisez lister_devis pour retrouver le bon numéro.`);
      if (devis.status !== 'brouillon') throw new ErreurOutil(`Le devis ${devis.number} n’est plus un brouillon (statut ${devis.status}) : il ne peut plus être modifié ici.`);
      const ajout = lignesDepuis(a.lignes, tvaDefaut(d));
      devis.lines = [...(devis.lines ?? []), ...ajout];
      const t = totaux(devis.lines);
      return {
        resultat: { ok: true, message: `${ajout.length} ligne(s) ajoutée(s) au devis ${devis.number}.`, devis: { id: devis.id, numero: devis.number, nombre_lignes: devis.lines.length, total_ht: t.ht, total_ttc: t.ttc, lien: lien(c.env, `devis/${devis.id}`) } },
        resume: `${ajout.length} ligne(s) ajoutée(s) au devis ${devis.number}`,
      };
    }),
  },
  {
    name: 'creer_rendez_vous',
    title: 'Créer un rendez-vous',
    ecriture: true,
    description: 'Ajoute un créneau au planning (rendez-vous, chantier, SAV…) pour une personne de l’équipe. Aucune invitation n’est envoyée.',
    inputSchema: entree({
      titre: S.str('Ex. « Visite Mme Martin · devis cuisine »'), date: S.str('AAAA-MM-JJ'), debut: S.str('HH:MM'), fin: S.str('HH:MM'),
      employe_id: S.str('Personne de l’équipe (défaut : le gérant)'), chantier_id: S.str('Chantier lié (facultatif)'),
      type: S.enum(['rdv', 'chantier', 'sav', 'interne', 'formation'], 'Défaut rdv'),
    }, ['titre', 'date', 'debut', 'fin']),
    outputSchema: SORTIE_ECRITURE({ creneau: S.obj({ id: S.str(), titre: S.str(), date: S.str(), debut: S.str(), fin: S.str(), employe: S.str(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'creer_rendez_vous', (d) => {
      const titre = str(a.titre);
      const date = str(a.date) ?? '';
      const debut = str(a.debut) ?? '';
      const fin = str(a.fin) ?? '';
      if (!titre) throw new ErreurOutil('Le titre du rendez-vous est obligatoire.');
      if (!JOUR.test(date)) throw new ErreurOutil('La date doit être au format AAAA-MM-JJ.');
      if (!HEURE.test(debut) || !HEURE.test(fin) || fin <= debut) throw new ErreurOutil('Heures au format HH:MM, la fin après le début.');
      const equipe = (d.employees as Employee[] | undefined) ?? [];
      const eid = str(a.employe_id);
      const employe = eid ? equipe.find((e) => e.id === eid) : equipe.find((e) => e.role === 'patron') ?? equipe[0];
      if (!employe) throw new ErreurOutil(eid ? `Personne « ${eid} » introuvable. Les identifiants sont dans lire_planning (équipe).` : 'Aucune personne dans l’équipe : ajoutez-en une dans Brix.');
      const chantierId = str(a.chantier_id);
      if (chantierId && !(d.chantiers ?? []).some((x) => x.id === chantierId)) throw new ErreurOutil(`Chantier « ${chantierId} » introuvable.`);
      const kind = (['rdv', 'chantier', 'sav', 'interne', 'formation'] as const).find((k) => k === a.type) ?? 'rdv';
      const ev: PlanningEvent & { source: typeof PROVENANCE } = { id: uid('pe'), employeeId: employe.id, ...(chantierId ? { chantierId } : {}), title: titre.slice(0, 200), date, start: debut, end: fin, kind, source: PROVENANCE };
      ((d.events ??= []) as PlanningEvent[]).push(ev);
      const nom = `${employe.firstName} ${employe.lastName}`.trim();
      return {
        resultat: { ok: true, message: `Rendez-vous ajouté au planning de ${nom} le ${date} de ${debut} à ${fin}.`, creneau: { id: ev.id, titre: ev.title, date, debut, fin, employe: nom, lien: lien(c.env, 'planning') } },
        resume: `Rendez-vous « ${ev.title} » le ${date} à ${debut} (${nom})`,
      };
    }),
  },
  {
    name: 'noter_demande',
    title: 'Noter une demande de client',
    ecriture: true,
    description: 'Enregistre une demande entrante d’un prospect (nom, téléphone, besoin) au statut nouveau, pour la traiter ensuite dans Brix.',
    inputSchema: entree({
      nom: S.str(), telephone: S.str(), besoin: S.str('Ce que demande la personne'), email: S.str(), ville: S.str(),
      source: S.enum(['telephone', 'site', 'whatsapp', 'plateforme', 'google', 'parrainage'], 'Défaut telephone'),
      estimation_ht: S.num('Montant estimé HT (facultatif)', { minimum: 0 }),
    }, ['nom', 'telephone', 'besoin']),
    outputSchema: SORTIE_ECRITURE({ demande: S.obj({ id: S.str(), nom: S.str(), statut: S.str(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'noter_demande', (d) => {
      const nom = str(a.nom);
      const tel = str(a.telephone);
      const besoin = str(a.besoin);
      if (!nom || !tel || !besoin) throw new ErreurOutil('Nom, téléphone et besoin sont obligatoires.');
      const source = (['telephone', 'site', 'whatsapp', 'plateforme', 'google', 'parrainage'] as const).find((s) => s === a.source) ?? 'telephone';
      const lead: Lead & { origine: typeof PROVENANCE } = {
        id: uid('ld'), name: nom.slice(0, 120), phone: tel.slice(0, 40), ...(str(a.email) ? { email: str(a.email) } : {}), city: str(a.ville) ?? '', request: besoin.slice(0, 2000),
        source, receivedAt: jourIso(), status: 'nouveau', ...(typeof a.estimation_ht === 'number' ? { estimate: euros(a.estimation_ht) } : {}), origine: PROVENANCE,
      };
      ((d.leads ??= []) as Lead[]).unshift(lead);
      return { resultat: { ok: true, message: `Demande de ${lead.name} notée.`, demande: { id: lead.id, nom: lead.name, statut: lead.status, lien: lien(c.env, 'demandes') } }, resume: `Demande notée : ${lead.name}` };
    }),
  },
  {
    name: 'marquer_relance_a_faire',
    title: 'Marquer une relance à faire',
    ecriture: true,
    description: 'Ajoute un rappel « relance à faire » sur une facture impayée ou un devis envoyé. Rien n’est envoyé au client : l’artisan relance depuis Brix.',
    inputSchema: entree({ type: S.enum(['facture', 'devis']), id: S.str('Identifiant ou numéro'), note: S.str('Ce qu’il faut dire ou faire') }, ['type', 'id']),
    outputSchema: SORTIE_ECRITURE({ element: S.obj({ type: S.str(), id: S.str(), numero: S.str(), lien: S.str() }) }),
    run: (c, a) => ecrire(c, 'marquer_relance_a_faire', (d) => {
      const cle = str(a.id) ?? '';
      const marque = { le: new Date().toISOString(), ...(str(a.note) ? { note: str(a.note)!.slice(0, 500) } : {}), source: PROVENANCE };
      if (a.type === 'facture') {
        const f = trouver(d.factures as Facture[] | undefined, cle, ['number']);
        if (!f) throw new ErreurOutil(`Aucune facture « ${cle} ».`);
        if (!factureOuverte(f)) throw new ErreurOutil(`La facture ${f.number} n’a pas de reste à encaisser.`);
        Object.assign(f, { relanceAFaire: marque });
        return { resultat: { ok: true, message: `Relance à faire notée sur la facture ${f.number}. Rien n’a été envoyé.`, element: { type: 'facture', id: f.id, numero: f.number, lien: lien(c.env, `factures/${f.id}`) } }, resume: `Relance à faire : facture ${f.number}` };
      }
      if (a.type !== 'devis') throw new ErreurOutil('type doit valoir « facture » ou « devis ».');
      const v = trouver(d.devis as Devis[] | undefined, cle, ['number']);
      if (!v) throw new ErreurOutil(`Aucun devis « ${cle} ».`);
      if (v.status !== 'envoye' && v.status !== 'vu') throw new ErreurOutil(`Le devis ${v.number} n’est pas en attente de réponse (statut ${v.status}).`);
      Object.assign(v, { relanceAFaire: marque });
      return { resultat: { ok: true, message: `Relance à faire notée sur le devis ${v.number}. Rien n’a été envoyé.`, element: { type: 'devis', id: v.id, numero: v.number, lien: lien(c.env, `devis/${v.id}`) } }, resume: `Relance à faire : devis ${v.number}` };
    }),
  },
];
