// Outils de la boîte de démo : rendu mémorisé, heure relative, icônes et libellés par modèle.

import { BadgeEuro, BellRing, ClipboardList, DoorOpen, FileCheck2, FileClock, FileText, KeyRound, PackageCheck, Receipt, Reply, Wallet, type LucideIcon } from 'lucide-react';
import { rendreEmail, type DonneesEmail, type ModeleEmail, type RenduEmail } from '@/emails';
import type { EmailEnvoye } from '@/emails/boite';

export type Public = 'client' | 'artisan' | 'fournisseur';
export type Filtre = 'tous' | Public;

export const PUBLICS: { id: Filtre; libelle: string }[] = [
  { id: 'tous', libelle: 'Tous' },
  { id: 'client', libelle: 'Client' },
  { id: 'artisan', libelle: 'Artisan' },
  { id: 'fournisseur', libelle: 'Fournisseur' },
];

export const LIBELLE_PUBLIC: Record<Public, string> = { client: 'Client', artisan: 'Artisan', fournisseur: 'Fournisseur' };

/** Couleur discrète par public (pastilles, filtres). */
export const TON_PUBLIC: Record<Public, { fond: string; texte: string; point: string }> = {
  client: { fond: '#f3efff', texte: '#5b21b6', point: '#7c3aed' },
  artisan: { fond: '#fff4ea', texte: '#9a3412', point: '#f97316' },
  fournisseur: { fond: '#eaf6f0', texte: '#166534', point: '#16a34a' },
};

export const ICONE_MODELE: Record<ModeleEmail, LucideIcon> = {
  devis_envoye: FileText,
  devis_relance: FileClock,
  code_signature: KeyRound,
  devis_signe_client: FileCheck2,
  devis_signe_artisan: FileCheck2,
  facture_envoyee: Receipt,
  facture_relance: BellRing,
  paiement_recu_client: Wallet,
  paiement_recu_artisan: BadgeEuro,
  demande_prix: ClipboardList,
  commande_fournisseur: PackageCheck,
  reponse_fournisseur: Reply,
  bienvenue: DoorOpen,
};

const cache = new Map<string, RenduEmail>();

/** Rendu d'un e-mail de la boîte (mis en cache par id : un mail envoyé ne change plus). */
export function renduMail(m: EmailEnvoye): RenduEmail | null {
  const hit = cache.get(m.id);
  if (hit) return hit;
  try {
    const r = rendreEmail(m.modele, m.donnees as DonneesEmail[typeof m.modele]);
    cache.set(m.id, r);
    return r;
  } catch {
    return null;
  }
}

/** « à l'instant », « il y a 5 min », « 14:32 », « hier », « 12 nov. ». */
export function heureRelative(iso: string, maintenant = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.round((maintenant - t) / 1000);
  if (s < 45) return "à l'instant";
  if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
  const d = new Date(t);
  const auj = new Date(maintenant);
  if (d.toDateString() === auj.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const hier = new Date(maintenant - 86400000);
  if (d.toDateString() === hier.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function dateComplete(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export interface Expediteur {
  nom: string;
  detail: string;
  initiales: string;
}

/** Nom affiché de l'expéditeur (« Karim Benali · Benali Électricité » → « Benali Électricité ») et initiales de sa marque. */
export function expediteur(de: string, donnees?: unknown): Expediteur {
  const [a, b] = de.split('·').map((x) => x.trim());
  const nom = b || a || 'Brix';
  const ini = (donnees as { emetteur?: { initiales?: string } } | undefined)?.emetteur?.initiales;
  return { nom, detail: b ? a : '', initiales: (ini || initialesDe(nom)).slice(0, 3).toUpperCase() };
}

/** Destinataire lisible depuis les données (« Claire Lefèvre », « Rexel Villeurbanne »…). */
export function destinataire(m: Pick<EmailEnvoye, 'pour' | 'donnees' | 'a'>): string {
  const d = m.donnees as { destinataire?: string; civilite?: string; fournisseur?: string; prenom?: string; emetteur?: { prenom?: string; nom?: string } };
  if (m.pour === 'fournisseur') return d.fournisseur ?? m.a;
  if (m.pour === 'client') return d.destinataire ?? d.civilite ?? m.a;
  return d.emetteur ? `${d.emetteur.prenom ?? ''} ${d.emetteur.nom ?? ''}`.trim() || m.a : d.prenom ?? m.a;
}

export function initialesDe(s: string): string {
  const mots = s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  return ((mots[0]?.[0] ?? 'B') + (mots[1]?.[0] ?? '')).toUpperCase();
}

/** HTML prêt pour l'iframe : tous les liens ouvrent l'onglet parent (la démo s'enchaîne), mode sombre forcé ou coupé. */
export function srcDoc(html: string, opts: { sombre: boolean; ajuste: boolean }): string {
  let h = html.replace(/target="_blank"/g, 'target="_top"');
  if (opts.sombre) h = h.replace(/@media \(prefers-color-scheme:dark\)/g, '@media all').replace(/\[data-ogs[bc]\][^{]*\{[^}]*\}/g, '');
  else h = h.replace(/@media \(prefers-color-scheme:dark\)/g, '@media not all');
  const extra = `<base target="_top"><style>${opts.ajuste ? 'html,body{overflow:hidden!important}' : ''}::-webkit-scrollbar{width:0;height:0}</style>`;
  return h.replace(/<head>/i, `<head>${extra}`);
}
