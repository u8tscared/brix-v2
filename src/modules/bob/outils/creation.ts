// Outils « créer » partagés par le moteur local (nlu/create.ts) et l'agent :
// retrouver ou préparer un client, chiffrer des lignes avec la bibliothèque de prix,
// enregistrer un devis en brouillon, compléter un devis, créer une fiche client.

import { capitalize, money, todayISO, totals, uid } from '@/lib/format';
import type { Client, Devis, DevisLigne } from '@/lib/types';
import { searchLibrary } from '@/modules/devis/library';
import { lineFromLib } from '@/modules/devis/logic';
import { findItem, laborLine, lineFrom } from '../nlu/library';
import { matchesName, norm, titleCase } from '../nlu/text';
import type { BobCard } from '../nlu/types';
import type { Etat } from './argent';

const CIVILITY: [RegExp, string][] = [
  [/^(mme|madame)\s+/i, 'Mme '],
  [/^(mlle|mademoiselle)\s+/i, 'Mme '],
  [/^(m\.|mr|monsieur|m)\s+/i, 'M. '],
];
const PRO_RE = /\b(sarl|sas|sci|eurl|boulangerie|restaurant|cabinet|societe|entreprise|syndic|copropriete|hotel|garage|pharmacie|mairie|ecole|agence)\b/;

/** « Mme sarah kaci » → { civ: 'Mme ', nom: 'sarah kaci' }. */
function civilite(raw: string) {
  let civ = '';
  let nom = raw;
  for (const [re, label] of CIVILITY) if (re.test(nom)) { civ = label; nom = nom.replace(re, ''); }
  return { civ, nom };
}

export function nouveauClient(raw: string, champs: Partial<Pick<Client, 'email' | 'phone' | 'city' | 'address'>> = {}, tags: string[] = []): Client {
  const { civ, nom } = civilite(raw.trim());
  return { id: uid('c'), kind: PRO_RE.test(norm(nom)) ? 'pro' : 'particulier', name: civ + titleCase(nom), email: champs.email ?? '', phone: champs.phone ?? '', address: champs.address ?? '', city: champs.city ?? '', tags, createdAt: todayISO(), source: 'telephone' };
}

/** Client existant qui correspond au nom (civilité comprise), sinon undefined. */
export function trouverClient(s: Etat, raw: string): Client | undefined {
  const name = raw.trim().replace(/^(pour|chez)\s+/i, '').replace(/[.,;:]+$/, '');
  if (!name) return undefined;
  const { civ, nom } = civilite(name);
  const pool = civ ? s.clients.filter((c) => c.kind === 'particulier') : s.clients;
  return pool.find((c) => matchesName(nom, c.name) || (c.contact && matchesName(nom, c.contact)));
}

/** Retrouve un client existant ou en prépare un nouveau (pas encore enregistré). */
export function resoudreClient(s: Etat, raw: string): { client: Client; created: boolean } | null {
  const name = raw.trim().replace(/^(pour|chez)\s+/i, '').replace(/[.,;:]+$/, '');
  if (!name) return null;
  const found = trouverClient(s, name);
  if (found) return { client: found, created: false };
  return { client: nouveauClient(name, {}, ['Ajouté par Brix AI']), created: true };
}

export interface ArticleDemande {
  libelle: string;
  quantite: number;
  unite?: string | null;
  prix_unitaire_ht?: number | null;
}

/** Chiffre une ligne : bibliothèque de Brix AI, puis bibliothèque de prix Brix, sinon prix à compléter. */
export function ligneDepuisArticle(a: ArticleDemande, vat: number): { line: DevisLigne; hours: number; connu: boolean } {
  const qty = a.quantite > 0 ? a.quantite : 1;
  const it = findItem(a.libelle);
  if (it) {
    const line = lineFrom(it, qty, vat);
    if (a.prix_unitaire_ht && a.prix_unitaire_ht > 0) line.unitPriceHt = a.prix_unitaire_ht;
    return { line, hours: it.hours * qty, connu: true };
  }
  const lib = searchLibrary(a.libelle, 1)[0];
  if (lib) {
    const line = lineFromLib(lib, vat, qty, 'bob');
    if (a.prix_unitaire_ht && a.prix_unitaire_ht > 0) line.unitPriceHt = a.prix_unitaire_ht;
    return { line, hours: 0, connu: true };
  }
  const prix = a.prix_unitaire_ht && a.prix_unitaire_ht > 0 ? a.prix_unitaire_ht : 0;
  return {
    line: { id: uid('l'), kind: 'fourniture', designation: capitalize(a.libelle.trim()), detail: prix ? undefined : 'Prix à compléter : je ne connais pas encore cet article', quantity: qty, unit: a.unite || 'u', unitPriceHt: prix, unitCostHt: 0, vatRate: vat, source: 'bob' },
    hours: 0,
    connu: prix > 0,
  };
}

/** Lignes du devis + main-d'œuvre calculée sur les heures de pose. */
export function chiffrer(s: Etat, articles: ArticleDemande[]): { lines: DevisLigne[]; nouns: string[] } {
  const vat = s.company.defaultVat || 10;
  const lines: DevisLigne[] = [];
  const nouns: string[] = [];
  let hours = 0;
  for (const a of articles) {
    if (!a.libelle?.trim()) continue;
    const r = ligneDepuisArticle(a, vat);
    lines.push(r.line);
    hours += r.hours;
    nouns.push(a.libelle.trim().replace(/^(de |d')/i, ''));
  }
  if (lines.length) lines.push(laborLine(hours || 1, s.company.hourlyRate || 55, coutHoraireMoyen(s), vat));
  return { lines, nouns };
}

export const coutHoraireMoyen = (s: Etat) => s.employees.filter((e) => e.hourlyCost > 0).reduce((x, e, _, a) => x + e.hourlyCost / a.length, 0) || 31.5;

/** Enregistre un devis en brouillon (rien n'est envoyé). Crée la fiche client si besoin. */
export function enregistrerDevis(s: Etat, client: Client, created: boolean, lines: DevisLigne[], nouns: string[], titre?: string): Devis {
  if (created) s.upsertClient(client);
  const title = titre?.trim() || (nouns.length ? capitalize(nouns.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' et $1')) : 'Nouveau devis');
  const sections: DevisLigne[] = lines.length ? [{ id: uid('l'), kind: 'section', designation: 'Travaux', quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 }, ...lines] : [];
  const devis: Devis = {
    id: uid('q'), number: s.nextNumber('devis'), clientId: client.id, title, status: 'brouillon', createdAt: todayISO(), validityDays: 30, depositPercent: client.kind === 'pro' ? 40 : 30, lines: sections, notes: 'Préparé par Brix AI à partir de ta demande.',
  };
  s.upsertDevis(devis);
  const t = totals(devis.lines);
  s.pushBob({ icon: 'FileText', text: `J'ai préparé le devis ${devis.number}`, detail: `${client.name} · ${money(t.ht, true)} HT`, cta: 'Relire', to: `/app/devis/${devis.id}` });
  return devis;
}

const prixAcompleter = (lines: DevisLigne[]) => lines.filter((l) => l.kind !== 'section' && l.unitPriceHt === 0).length;

/** Résumé lisible par le modèle. */
export function resumeDevis(d: Devis, client: Client) {
  const t = totals(d.lines);
  return {
    id: d.id, numero: d.number, client: client.name, statut: d.status, titre: d.title,
    total_ht: Math.round(t.ht * 100) / 100, total_ttc: Math.round(t.ttc * 100) / 100, taux_marge: Math.round(t.marginRate),
    lignes: d.lines.filter((l) => l.kind !== 'section').map((l) => ({ designation: l.designation, quantite: l.quantity, unite: l.unit, prix_unitaire_ht: l.unitPriceHt, prix_a_completer: l.unitPriceHt === 0 })),
    prix_a_completer: prixAcompleter(d.lines),
  };
}

/** Carte du devis préparé, avec envoi (clic explicite) et annulation. */
export function carteDevis(s: Etat, devis: Devis, client: Client, envoyer: () => string, annuler: () => string): BobCard {
  const t = totals(devis.lines);
  const lines = devis.lines.filter((l) => l.kind !== 'section');
  return {
    kind: 'devis', icon: 'FileText', title: `${devis.number} · ${client.name}`, subtitle: devis.title,
    figure: money(t.ht), figureLabel: `HT · ${money(t.ttc)} TTC · marge ${Math.round(t.marginRate)} %`,
    rows: lines.map((l) => ({ label: l.designation, sub: `${l.quantity} ${l.unit} × ${money(l.unitPriceHt)}${l.unitPriceHt === 0 ? ' · à compléter' : ''}`, value: money(l.quantity * l.unitPriceHt), tone: l.unitPriceHt === 0 ? 'warn' : undefined })),
    actions: [
      { label: 'Ouvrir le devis', to: `/app/devis/${devis.id}`, variant: 'primary', icon: 'FileText' },
      { label: 'Envoyer', variant: 'secondary', icon: 'Send', run: envoyer },
      { label: 'Annuler', variant: 'ghost', run: annuler },
    ],
  };
}

/** Envoi d'un devis par l'utilisateur (bouton de la carte). */
export function envoyerDevis(s: Etat, devisId: string, client: Client): string {
  const d = s.devis.find((x) => x.id === devisId);
  if (!d) return 'Ce devis n’existe plus.';
  const email = s.clients.find((c) => c.id === client.id)?.email || client.email;
  if (!email) return `Il me manque l’e-mail de ${client.name}. Ouvre le devis pour l’ajouter.`;
  s.upsertDevis({ ...d, status: 'envoye', sentAt: todayISO() });
  return `Devis envoyé à ${email}.`;
}

export function annulerDevis(s: Etat, devisId: string, clientId: string, created: boolean): string {
  s.removeDevis(devisId);
  if (created) s.removeClient(clientId);
  return 'Devis supprimé.';
}

/** Ajoute des lignes à un devis en brouillon. Renvoie l'état d'avant pour annuler. */
export function ajouterLignes(s: Etat, devis: Devis, added: DevisLigne[]): { before: Devis; next: Devis } {
  const next = { ...devis, lines: [...devis.lines, ...added] };
  s.upsertDevis(next);
  return { before: devis, next };
}

export function carteLignesAjoutees(devis: Devis, added: DevisLigne[], annuler: () => string): BobCard {
  return {
    kind: 'done', icon: 'FileText', title: `${added.length} ligne${added.length > 1 ? 's' : ''} ajoutée${added.length > 1 ? 's' : ''}`, subtitle: devis.number,
    rows: added.map((l) => ({ label: l.designation, sub: `${l.quantity} ${l.unit} × ${money(l.unitPriceHt)}`, value: money(l.quantity * l.unitPriceHt) })),
    actions: [{ label: 'Ouvrir le devis', to: `/app/devis/${devis.id}`, variant: 'primary' }, { label: 'Annuler', variant: 'ghost', run: annuler }],
  };
}

export const dernierBrouillon = (s: Etat) => s.devis.find((d) => d.status === 'brouillon');

/** Enregistre une nouvelle fiche client. */
export function enregistrerClient(s: Etat, client: Client): Client {
  s.upsertClient(client);
  s.pushBob({ icon: 'Contact', text: `J'ai ajouté ${client.name} à tes clients`, cta: 'Voir', to: `/app/clients/${client.id}`, done: true });
  return client;
}

export function carteClient(client: Client, annuler: () => string): BobCard {
  return {
    kind: 'done', icon: 'Contact', title: client.name, subtitle: client.kind === 'pro' ? 'Client professionnel' : 'Particulier',
    rows: [{ label: 'Téléphone', value: client.phone || 'à compléter', tone: client.phone ? undefined : 'warn' }, { label: 'E-mail', value: client.email || 'à compléter', tone: client.email ? undefined : 'warn' }, { label: 'Ville', value: client.city || 'à compléter', tone: client.city ? undefined : 'warn' }],
    actions: [
      { label: 'Ouvrir la fiche', to: `/app/clients/${client.id}`, variant: 'primary' },
      { label: 'Faire un devis', ask: `Fais un devis pour ${client.name}`, variant: 'secondary' },
      { label: 'Annuler', variant: 'ghost', run: annuler },
    ],
  };
}
