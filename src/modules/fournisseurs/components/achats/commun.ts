// Petites fonctions et libellés partagés par les écrans Achats (commandes, prix, fournisseurs, connexions).
import type { Chantier, Company } from '@/lib/types';
import { genererOrders } from '../../../../../worker/src/modules/fournisseurs/connecteurs/edifact';
import type { Capacite } from '../../../../../worker/src/modules/fournisseurs/connecteurs/registre';
import type { Commande, Fournisseur, ModeLivraison } from '../../data/types';

/** Minuscules, sans accents ni ponctuation : « Câble R2V » et « cable r2v » se retrouvent. */
export const normaliser = (s: string | undefined | null) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const MODES: Record<ModeLivraison, { label: string; court: string }> = {
  livraison_chantier: { label: 'Livraison sur le chantier', court: 'Sur le chantier' },
  livraison_depot: { label: 'Livraison au dépôt', court: 'Au dépôt' },
  retrait_agence: { label: 'Retrait au comptoir', court: 'Au comptoir' },
};

export const METIERS: { cle: string; label: string }[] = [
  { cle: 'electricite', label: 'Électricité' },
  { cle: 'plomberie', label: 'Plomberie' },
  { cle: 'chauffage', label: 'Chauffage' },
  { cle: 'sanitaire', label: 'Sanitaire' },
  { cle: 'gros_oeuvre', label: 'Gros œuvre' },
  { cle: 'maconnerie', label: 'Maçonnerie' },
  { cle: 'couverture', label: 'Couverture' },
  { cle: 'menuiserie', label: 'Menuiserie' },
  { cle: 'peinture', label: 'Peinture' },
  { cle: 'outillage', label: 'Outillage et fixation' },
];

export const CAPACITES: Record<Capacite, string> = {
  demande_prix: 'Demandes de prix',
  commande: 'Commandes',
  suivi: 'Suivi de livraison',
  catalogue: 'Catalogue',
  prix_nets: 'Prix nets',
  factures: 'Factures',
  disponibilite: 'Stock en agence',
};

export const SOURCES = { import: 'Tarif importé', reponse: 'Réponse à une demande', api: 'Relié par API', manuel: 'Saisi à la main' } as const;

export const pourcent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} %`;

/** Nombre saisi à la française (« 12,50 ») ; null si vide ou illisible. */
export const lireNombre = (v: string): number | null => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};

export const ENCOURS: Commande['statut'][] = ['brouillon', 'envoyee', 'confirmee', 'expediee', 'livree_partiel'];

/** Télécharge le bon de commande au format EDI du négoce (EDIFACT ORDERS). */
export function telechargerEdi(c: Commande, f: Fournisseur | undefined, company: Company, chantier?: Chantier) {
  const cp = /\b(\d{5})\b/.exec(`${company.address} ${company.city}`)?.[1] ?? null;
  const texte = genererOrders({
    numero: c.numero,
    date: new Date(c.createdAt),
    livraison_souhaitee: c.livraisonPrevue ? new Date(c.livraisonPrevue + 'T12:00:00') : null,
    acheteur: { nom: company.legalName || company.name, adresse: company.address, ville: company.city, code_postal: cp },
    fournisseur: { nom: f?.nom ?? 'Fournisseur' },
    livraison: c.mode === 'retrait_agence' ? null : { nom: chantier?.name ?? company.name, adresse: c.adresse ?? chantier?.address ?? null, ville: chantier?.city ?? null },
    numero_compte_client: f?.numeroCompte ?? null,
    reference_chantier: chantier?.name ?? null,
    lignes: c.lignes.map((l) => ({ reference: l.reference ?? null, designation: l.designation, quantite: l.quantite, unite: l.unite, prix_unitaire_cents: Math.round(l.prix * 100) })),
  });
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/edifact' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${c.numero}.edi`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
