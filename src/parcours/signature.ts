// Parcours client d'un devis : ouverture, code de vérification, signature, acompte, question, refus.
// Démo : tout se passe dans le navigateur et se répercute aussitôt dans l'app de l'artisan
// (store partagé + synchronisation entre onglets), avec les e-mails rangés dans /#/boite.
// Réel : mêmes étapes côté worker (worker/src/modules/{documents,signature,paiements}), voir docs/parcours.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset, money, todayISO, totals, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Chantier, Client, Devis, Facture } from '@/lib/types';
import { useBoite } from '@/emails/boite';
import type { DonneesDocument, Emetteur } from '@/emails/types';
import { buildAcompte } from '@/modules/factures/lib/billing';
import { useDevisMeta, type VariantKey } from '@/modules/devis/store';
import { useNotifs } from '@/modules/notifications/store';
import { civilite, FORMULES } from './documents';
import { lienPublic } from './liens';

/* ------------------------------------------------------------------ */
/* Dossier de preuve local                                             */
/* ------------------------------------------------------------------ */

export interface Preuve {
  devisId: string;
  signataire: string;
  email: string;
  image: string; // PNG data URL
  methode: 'dessin' | 'texte';
  formule: VariantKey;
  montantTtc: number;
  signeLe: string; // ISO
  empreinte: string; // SHA-256 du document canonique
  authentification: string; // « Code à usage unique envoyé à c•••@gmail.com »
  mentions: { bonPourAccord: boolean; cgv: boolean; demarrageAnticipe?: boolean };
  appareil: string;
  acompte?: { factureId: string; payeLe: string; moyen: string; montant: number };
}

interface ParcoursState {
  preuves: Record<string, Preuve>;
  codes: Record<string, { code: string; expire: number; essais: number }>;
  vus: Record<string, string>; // devisId → dernière ouverture notifiée (ISO)
  questions: { id: string; devisId: string; texte: string; at: string }[];
}

export const useParcours = create<ParcoursState>()(
  persist(() => ({ preuves: {}, codes: {}, vus: {}, questions: [] }) as ParcoursState, { name: 'brix-v2-parcours', version: 1 }),
);

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

const S = () => useBrix.getState();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Si la page publique est ouverte sans données (preview vierge), charge la démo. */
export function assurerDonnees() {
  if (!S().devis.length) S().loadDemo();
}

export function emetteur(): Emetteur {
  const { company, user } = S();
  return {
    entreprise: company.name,
    prenom: user.firstName,
    nom: user.lastName,
    telephone: company.phone,
    email: user.email || company.email,
    ville: company.city.replace(/^\d+\s*/, ''),
    initiales: company.logoInitials || company.name.slice(0, 2).toUpperCase(),
    siret: company.siret,
  };
}

const deNom = () => {
  const e = emetteur();
  return `${e.prenom} ${e.nom} · ${e.entreprise}`;
};

export function donneesDevis(d: Devis, client: Client | undefined, facteur = 1, message?: string): DonneesDocument {
  const t = totals(d.lines);
  const lignes = d.lines
    .filter((l) => l.kind !== 'section' && l.kind !== 'texte')
    .map((l) => ({ libelle: l.designation, montant: l.quantity * l.unitPriceHt * (1 + l.vatRate / 100) * facteur }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 4);
  const exp = new Date(new Date((d.sentAt ?? d.createdAt).slice(0, 10) + 'T12:00:00').getTime() + d.validityDays * 86400000);
  return {
    emetteur: emetteur(),
    destinataire: client?.name ?? 'Client',
    civilite: civilite(client),
    numero: d.number,
    titre: d.title,
    montantTtc: t.ttc * facteur,
    lien: lienPublic('devis', d.id),
    message,
    lignes,
    echeance: exp.toISOString().slice(0, 10),
    acomptePourcent: d.depositPercent,
    acompteMontant: (t.ttc * facteur * d.depositPercent) / 100,
  };
}

/** Empreinte SHA-256 du contenu engageant du devis (lignes, totaux, conditions). */
export async function empreinteDevis(d: Devis, formule: VariantKey): Promise<string> {
  const canon = JSON.stringify({
    numero: d.number,
    titre: d.title,
    formule,
    validite: d.validityDays,
    acompte: d.depositPercent,
    lignes: d.lines.map((l) => [l.kind, l.designation, l.quantity, l.unit, l.unitPriceHt, l.vatRate]),
    totaux: totals(d.lines),
  });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const journal = (id: string, text: string, tone: 'bob' | 'client' | 'me' = 'client') => useDevisMeta.getState().log(id, text, tone);

/* ------------------------------------------------------------------ */
/* Étapes                                                              */
/* ------------------------------------------------------------------ */

/** Le client ouvre le devis : statut « vu », compteur, notification (au plus une fois par 30 min). */
export function marquerOuvert(devisId: string) {
  const d = S().devis.find((x) => x.id === devisId);
  if (!d || d.status === 'brouillon') return;
  const last = useParcours.getState().vus[devisId];
  if (last && Date.now() - new Date(last).getTime() < 30 * 60000) return;
  const now = new Date().toISOString();
  useParcours.setState((s) => ({ vus: { ...s.vus, [devisId]: now } }));
  const views = (d.views ?? 0) + 1;
  S().upsertDevis({ ...d, status: d.status === 'envoye' ? 'vu' : d.status, views, viewedAt: now });
  const c = S().clients.find((x) => x.id === d.clientId);
  if (d.status === 'signe') return;
  journal(devisId, `Ouvert par ${c?.name ?? 'le client'}${views > 1 ? ` (${views}e fois)` : ''}`);
  useNotifs.getState().ajouter({ type: 'devis_ouvert', titre: `${c?.name ?? 'Votre client'} consulte votre devis`, texte: `${d.number} · ${d.title}`, qui: c?.name, vers: `/app/devis/${d.id}` });
}

/** Envoie le code à 6 chiffres (démo : rangé dans la boîte e-mail et renvoyé pour l'afficher). */
export async function demanderCode(devisId: string, email: string): Promise<string> {
  await wait(700);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  useParcours.setState((s) => ({ codes: { ...s.codes, [devisId]: { code, expire: Date.now() + 10 * 60000, essais: 0 } } }));
  const d = S().devis.find((x) => x.id === devisId);
  const c = d && S().clients.find((x) => x.id === d.clientId);
  useBoite.getState().ajouter({ modele: 'code_signature', pour: 'client', a: email, de: 'Brix · signature sécurisée', donnees: { emetteur: emetteur(), civilite: civilite(c), code, numero: d?.number ?? '', minutes: 10 } });
  return code;
}

export type ResultatCode = 'ok' | 'faux' | 'expire' | 'bloque';

export function verifierCode(devisId: string, saisi: string): ResultatCode {
  const c = useParcours.getState().codes[devisId];
  if (!c) return 'expire';
  if (c.essais >= 5) return 'bloque';
  if (Date.now() > c.expire) return 'expire';
  if (c.code !== saisi) {
    useParcours.setState((s) => ({ codes: { ...s.codes, [devisId]: { ...c, essais: c.essais + 1 } } }));
    return c.essais + 1 >= 5 ? 'bloque' : 'faux';
  }
  return 'ok';
}

export interface Signature {
  signataire: string;
  email: string;
  image: string;
  methode: 'dessin' | 'texte';
  formule: VariantKey;
  mentions: Preuve['mentions'];
}

/** Signature : statut, chantier, journal, preuve, e-mails, notification. Renvoie la preuve. */
export async function signer(devisId: string, sig: Signature): Promise<Preuve> {
  await wait(900);
  const s = S();
  const d = s.devis.find((x) => x.id === devisId);
  if (!d) throw new Error('Devis introuvable');
  const c = s.clients.find((x) => x.id === d.clientId);
  const facteur = FORMULES.find((f) => f.key === sig.formule)?.facteur ?? 1;
  // La formule choisie s'applique aux prix : le devis signé est celui de la formule.
  const lines = facteur === 1 ? d.lines : d.lines.map((l) => ({ ...l, unitPriceHt: Math.round(l.unitPriceHt * facteur * 100) / 100 }));
  const t = totals(lines);
  const now = new Date().toISOString();

  let chantierId = d.chantierId;
  if (!chantierId || !s.chantiers.some((x) => x.id === chantierId)) {
    const hours = lines.filter((l) => l.unit === 'h').reduce((a, l) => a + l.quantity, 0);
    const ch: Chantier = {
      id: uid('ch'),
      clientId: d.clientId,
      name: `${d.title} · ${c?.name ?? 'client'}`,
      address: c?.address ?? '',
      city: c?.city.replace(/^\d+\s*/, '') ?? '',
      status: 'a_planifier',
      startDate: dayOffset(10),
      endDate: dayOffset(10 + Math.max(1, Math.ceil(hours / 16))),
      progress: 0,
      budgetHt: Math.round(t.ht * 100) / 100,
      costHt: 0,
      team: [],
      nextStep: 'Planifier le démarrage avec le client',
      devisId: d.id,
      photos: 0,
    };
    s.upsertChantier(ch);
    chantierId = ch.id;
    journal(devisId, `Chantier « ${ch.name} » créé`, 'bob');
  }
  const signed: Devis = { ...d, lines, status: 'signe', signedAt: now, viewedAt: d.viewedAt ?? now, views: Math.max(1, d.views ?? 0), chantierId };
  s.upsertDevis(signed);
  const formuleLabel = FORMULES.find((f) => f.key === sig.formule)?.label;
  journal(devisId, `Signé électroniquement par ${sig.signataire}${facteur !== 1 ? ` (formule ${formuleLabel})` : ''}`);
  useDevisMeta.getState().patch(devisId, { chosenVariant: sig.formule });

  // La demande d'origine passe en « Gagnée »
  const n = (x?: string) => (x ?? '').replace(/\s/g, '').toLowerCase();
  for (const l of S().leads) if (c && l.status !== 'gagne' && l.status !== 'perdu' && (n(l.name) === n(c.name) || (!!l.phone && n(l.phone) === n(c.phone)))) S().upsertLead({ ...l, status: 'gagne' });

  // Facture d'acompte émise d'office (réglable tout de suite sur la page du devis)
  if (d.depositPercent > 0 && !S().factures.some((x) => x.devisId === d.id && x.kind === 'acompte' && x.status !== 'annulee')) {
    const f = buildAcompte(signed, S().nextNumber('facture'), d.depositPercent);
    S().upsertFacture({ ...f, chantierId, status: 'envoyee', dueDate: dayOffset(7) });
    journal(devisId, `Facture d'acompte ${f.number} émise (${money(totals(f.lines).ttc)})`, 'bob');
  }

  const empreinte = await empreinteDevis(signed, sig.formule);
  const preuve: Preuve = {
    devisId,
    signataire: sig.signataire,
    email: sig.email,
    image: sig.image,
    methode: sig.methode,
    formule: sig.formule,
    montantTtc: t.ttc,
    signeLe: now,
    empreinte,
    authentification: `Code à usage unique envoyé à ${sig.email}`,
    mentions: sig.mentions,
    appareil: typeof navigator !== 'undefined' ? navigator.userAgent.replace(/\s*\(.*?\)\s*/g, ' ').slice(0, 80) : '',
  };
  useParcours.setState((st) => ({ preuves: { ...st.preuves, [devisId]: preuve }, codes: Object.fromEntries(Object.entries(st.codes).filter(([k]) => k !== devisId)) }));

  const base = donneesDevis(signed, c);
  useBoite.getState().ajouter({ modele: 'devis_signe_client', pour: 'client', a: sig.email, de: deNom(), donnees: { ...base, signeLe: now, signataire: sig.signataire, formule: formuleLabel, empreinte } });
  useBoite.getState().ajouter({
    modele: 'devis_signe_artisan',
    pour: 'artisan',
    a: emetteur().email,
    de: 'Brix',
    donnees: { ...base, signeLe: now, signataire: sig.signataire, formule: formuleLabel, lienApp: `${lienPublic('boite').split('#')[0]}#/app/devis/${d.id}` },
  });
  useNotifs.getState().ajouter({ type: 'devis_signe', titre: `${c?.name ?? 'Votre client'} a signé le devis`, texte: `${d.number} · ${money(t.ttc)} TTC${d.depositPercent ? ` · acompte de ${d.depositPercent} % demandé` : ''}`, qui: c?.name, montant: t.ttc, vers: `/app/devis/${d.id}` });
  S().pushBob({ icon: 'BadgeCheck', text: `${c?.name ?? 'Le client'} a signé le devis ${d.number}`, detail: `${money(t.ttc)} TTC · chantier à planifier`, cta: 'Voir le devis', to: `/app/devis/${d.id}` });
  return preuve;
}

export type MoyenPaiement = 'carte' | 'apple' | 'virement' | '3x';
export const MOYEN_LABEL: Record<MoyenPaiement, string> = { carte: 'Carte bancaire', apple: 'Apple Pay', virement: 'Virement instantané', '3x': 'En 3 fois sans frais' };

/** Règle l'acompte après signature : crée la facture d'acompte payée, reçus, notification. */
export async function payerAcompte(devisId: string, moyen: MoyenPaiement): Promise<Facture | null> {
  await wait(1500);
  const s = S();
  const d = s.devis.find((x) => x.id === devisId);
  if (!d || !d.depositPercent) return null;
  const c = s.clients.find((x) => x.id === d.clientId);
  let f = s.factures.find((x) => x.devisId === d.id && x.kind === 'acompte' && x.status !== 'annulee');
  if (!f) f = { ...buildAcompte(d, s.nextNumber('facture'), d.depositPercent), chantierId: d.chantierId };
  const ttc = totals(f.lines).ttc;
  const paid: Facture = { ...f, status: 'payee', paidAmount: ttc, issueDate: f.issueDate || todayISO() };
  S().upsertFacture(paid);
  return finaliserPaiement(paid, c, moyen, ttc, devisId);
}

/** Paie le reste d'une facture depuis sa page publique. */
export async function payerFacture(factureId: string, moyen: MoyenPaiement): Promise<Facture | null> {
  await wait(1500);
  const f = S().factures.find((x) => x.id === factureId);
  if (!f) return null;
  const ttc = totals(f.lines).ttc;
  const montant = Math.max(0, ttc - f.paidAmount);
  const paid: Facture = { ...f, status: 'payee', paidAmount: ttc };
  S().upsertFacture(paid);
  const c = S().clients.find((x) => x.id === f.clientId);
  return finaliserPaiement(paid, c, moyen, montant, f.devisId);
}

function finaliserPaiement(f: Facture, c: Client | undefined, moyen: MoyenPaiement, montant: number, devisId?: string) {
  const now = new Date().toISOString();
  if (devisId) {
    journal(devisId, `${f.kind === 'acompte' ? 'Acompte' : 'Facture'} ${f.number} réglé${f.kind === 'acompte' ? '' : 'e'} en ligne (${money(montant)}, ${MOYEN_LABEL[moyen].toLowerCase()})`);
    const p = useParcours.getState().preuves[devisId];
    if (p && f.kind === 'acompte') useParcours.setState((st) => ({ preuves: { ...st.preuves, [devisId]: { ...p, acompte: { factureId: f.id, payeLe: now, moyen: MOYEN_LABEL[moyen], montant } } } }));
  }
  S().upsertBank({ id: uid('tx'), date: todayISO(), label: `${moyen === 'virement' ? 'VIR INST' : 'CB EN LIGNE'} ${c?.name.toUpperCase() ?? ''} ${f.number}`, amount: montant, matchedFactureId: f.id, category: 'Encaissement client' });
  const doc: DonneesDocument = {
    emetteur: emetteur(),
    destinataire: c?.name ?? 'Client',
    civilite: civilite(c),
    numero: f.number,
    titre: f.title,
    montantTtc: montant,
    lien: lienPublic('facture', f.id),
  };
  const email = c?.email ?? '';
  useBoite.getState().ajouter({ modele: 'paiement_recu_client', pour: 'client', a: email, de: deNom(), donnees: { ...doc, payeLe: now, moyen: MOYEN_LABEL[moyen], reste: 0 } });
  useBoite.getState().ajouter({ modele: 'paiement_recu_artisan', pour: 'artisan', a: emetteur().email, de: 'Brix', donnees: { ...doc, payeLe: now, moyen: MOYEN_LABEL[moyen], client: c?.name ?? 'Client', lienApp: `${lienPublic('boite').split('#')[0]}#/app/factures/${f.id}` } });
  useNotifs.getState().ajouter({ type: 'paiement_recu', titre: `Paiement reçu : ${money(montant)}`, texte: `${c?.name ?? 'Client'} · ${f.number} · ${MOYEN_LABEL[moyen].toLowerCase()}`, qui: c?.name, montant, vers: `/app/factures/${f.id}` });
  return f;
}

/** Question du client à l'artisan depuis la page du devis. */
export async function poserQuestion(devisId: string, texte: string) {
  await wait(500);
  const d = S().devis.find((x) => x.id === devisId);
  const c = d && S().clients.find((x) => x.id === d.clientId);
  useParcours.setState((s) => ({ questions: [...s.questions, { id: uid('qst'), devisId, texte, at: new Date().toISOString() }] }));
  journal(devisId, `Question de ${c?.name ?? 'le client'} : « ${texte} »`);
  useNotifs.getState().ajouter({ type: 'devis_question', titre: `${c?.name ?? 'Votre client'} a une question`, texte, qui: c?.name, vers: `/app/devis/${devisId}` });
}

export async function refuser(devisId: string, motif: string) {
  await wait(600);
  const d = S().devis.find((x) => x.id === devisId);
  if (!d) return;
  const c = S().clients.find((x) => x.id === d.clientId);
  S().upsertDevis({ ...d, status: 'refuse' });
  journal(devisId, `Refusé par ${c?.name ?? 'le client'}${motif ? ` : « ${motif} »` : ''}`);
  useNotifs.getState().ajouter({ type: 'devis_refuse', titre: `${c?.name ?? 'Votre client'} a décliné le devis`, texte: motif || d.title, qui: c?.name, vers: `/app/devis/${devisId}` });
}

/** Envoi d'un devis depuis l'app (appelé par la feuille d'envoi du module Devis). */
export function envoyerDevis(devisId: string, opts: { a: string; message?: string; canal?: 'email' | 'sms' | 'whatsapp' }) {
  const d = S().devis.find((x) => x.id === devisId);
  if (!d) return null;
  const c = S().clients.find((x) => x.id === d.clientId);
  const donnees = donneesDevis(d, c, 1, opts.message);
  if ((opts.canal ?? 'email') === 'email') useBoite.getState().ajouter({ modele: 'devis_envoye', pour: 'client', a: opts.a, de: deNom(), donnees });
  return { lien: donnees.lien };
}

/** Relance d'un devis (e-mail doux), utilisable par le module Devis. */
export function relancerDevis(devisId: string, rang = 1) {
  const d = S().devis.find((x) => x.id === devisId);
  if (!d) return;
  const c = S().clients.find((x) => x.id === d.clientId);
  useBoite.getState().ajouter({ modele: 'devis_relance', pour: 'client', a: c?.email ?? '', de: deNom(), donnees: { ...donneesDevis(d, c), rang } });
}
