// Lecture d'un document public (devis, facture) à partir de son jeton.
// Démo : le jeton est l'identifiant ou le numéro du document, lu dans le store du navigateur
// (ou, si la démo n'est pas chargée, dans les données d'exemple). Réel : GET /api/p/devis/:jeton.

import * as demo from '@/lib/demo';
import { totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Chantier, Client, Company, Devis, Facture, User } from '@/lib/types';
import { useMeta, type VariantKey } from '@/modules/devis/store';

export interface Formule {
  key: VariantKey;
  label: string;
  facteur: number;
  texte: string;
}

/** Mêmes formules que la feuille d'envoi du devis (src/modules/devis/components/SendSheet.tsx). */
export const FORMULES: Formule[] = [
  { key: 'essentiel', label: 'Essentiel', facteur: 0.88, texte: 'Gamme standard, sans options' },
  { key: 'confort', label: 'Confort', facteur: 1, texte: 'Le devis tel que préparé' },
  { key: 'premium', label: 'Premium', facteur: 1.18, texte: 'Gamme supérieure, garantie étendue' },
];

const norm = (s: string) => decodeURIComponent(s).trim().toLowerCase();

function source() {
  const s = useBrix.getState();
  if (s.devis.length) return { company: s.company, user: s.user, clients: s.clients, devis: s.devis, factures: s.factures, chantiers: s.chantiers, demo: false };
  return { company: demo.demoCompany, user: demo.demoUser, clients: demo.demoClients, devis: demo.demoDevis, factures: demo.demoFactures, chantiers: demo.demoChantiers, demo: true };
}

export interface DevisPublicData {
  devis: Devis;
  client?: Client;
  company: Company;
  user: User;
  chantier?: Chantier;
  formules: Formule[];
  ttc: number;
  ht: number;
  tva: number;
  expire: string; // ISO date
  expireDans: number; // jours
}

export function useDevisPublic(token: string): DevisPublicData | null {
  // Abonnement au store pour que la page se mette à jour (signature, autre onglet).
  useBrix((s) => s.devis);
  const src = source();
  const t = norm(token);
  const devis = src.devis.find((d) => d.id.toLowerCase() === t || d.number.toLowerCase() === t);
  const meta = useMeta(devis?.id);
  if (!devis) return null;
  const tt = totals(devis.lines);
  const from = new Date((devis.sentAt ?? devis.createdAt).slice(0, 10) + 'T12:00:00');
  const exp = new Date(from.getTime() + devis.validityDays * 86400000);
  const formules = FORMULES.filter((f) => meta.variants[f.key]);
  return {
    devis,
    client: src.clients.find((c) => c.id === devis.clientId),
    company: src.company,
    user: src.user,
    chantier: src.chantiers.find((c) => c.id === devis.chantierId),
    formules: formules.length ? formules : [FORMULES[1]],
    ttc: tt.ttc,
    ht: tt.ht,
    tva: tt.tva,
    expire: exp.toISOString().slice(0, 10),
    expireDans: Math.ceil((exp.getTime() - Date.now()) / 86400000),
  };
}

export interface FacturePublicData {
  facture: Facture;
  client?: Client;
  company: Company;
  user: User;
  devis?: Devis;
  chantier?: Chantier;
  ttc: number;
  reste: number;
}

export function useFacturePublique(token: string): FacturePublicData | null {
  useBrix((s) => s.factures);
  const src = source();
  const t = norm(token);
  const facture = src.factures.find((f) => f.id.toLowerCase() === t || f.number.toLowerCase() === t);
  if (!facture) return null;
  const ttc = totals(facture.lines).ttc;
  return {
    facture,
    client: src.clients.find((c) => c.id === facture.clientId),
    company: src.company,
    user: src.user,
    devis: src.devis.find((d) => d.id === facture.devisId),
    chantier: src.chantiers.find((c) => c.id === facture.chantierId),
    ttc,
    reste: Math.max(0, Math.round((ttc - facture.paidAmount) * 100) / 100),
  };
}

/** Prénom ou nom à qui l'on dit bonjour. */
export const civilite = (c?: Client) => (!c ? '' : c.kind === 'pro' ? c.contact ?? c.name : c.name.split(' ')[0]);

/** Masque une adresse e-mail : c•••••@gmail.com */
export const masquer = (email: string) => {
  const [u, dom] = email.split('@');
  if (!dom) return email;
  return `${u.slice(0, 1)}${'•'.repeat(Math.max(3, Math.min(6, u.length - 1)))}@${dom}`;
};
