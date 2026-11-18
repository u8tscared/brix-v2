// Fonctions partagées de l'espace Achats. La logique métier pure (besoins, comparatif) est celle du
// worker, importée telle quelle : un seul calcul, côté app comme côté serveur.

import type { Tone } from '@/components/ui';
import { lienPublic } from '@/parcours/liens';
import type { Devis } from '@/lib/types';
import { extraireBesoins } from '../../../../worker/src/modules/fournisseurs/besoins';
import { comparer, type Comparatif } from '../../../../worker/src/modules/fournisseurs/comparateur';
import type { Demande, Fournisseur, LigneDemande, StatutCommande, StatutDemande, StatutDestinataire } from './types';

export const iso = () => new Date().toISOString();

export function jeton(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function prochainNumero(prefix: 'DP' | 'BC', existants: string[]): string {
  const an = new Date().getFullYear();
  const p = `${prefix}-${an}-`;
  const max = existants.filter((n) => n.startsWith(p)).map((n) => Number(n.slice(p.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  return `${p}${String(max + 1).padStart(4, '0')}`;
}

/** Lignes de fourniture d'un devis (même règle que le serveur : fournitures, ouvrages référencés, doublons additionnés). */
export function besoinsDuDevis(devis: Devis): Omit<LigneDemande, 'id'>[] {
  return extraireBesoins(
    devis.lines.map((l, i) => ({
      id: l.id,
      devis_id: devis.id,
      position: i,
      kind: l.kind === 'texte' ? 'section' : l.kind,
      designation: l.designation,
      quantity: l.quantity,
      unit: l.unit,
      unit_price_ht: l.unitPriceHt,
      unit_cost_ht: l.unitCostHt,
      vat_rate: l.vatRate,
      supplier_ref: l.supplierRef ?? null,
    })),
  ).map((b) => ({
    designation: b.designation,
    reference: b.reference ?? undefined,
    quantite: b.quantite,
    unite: b.unite,
    prixCible: b.prix_cible_cents != null ? b.prix_cible_cents / 100 : undefined,
    devisLigneId: b.devis_ligne_ids[0],
  }));
}

/** Fournisseur habituel indiqué sur les lignes du devis (« Rexel », « Cédéo »…), pour présélectionner. */
export function fournisseursSuggeres(devis: Devis, fournisseurs: Fournisseur[]): string[] {
  const noms = new Set(devis.lines.map((l) => l.supplier?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).filter(Boolean) as string[]);
  return fournisseurs
    .filter((f) => [...noms].some((n) => f.nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(n)))
    .map((f) => f.id);
}

const c = (e: number | null | undefined) => (e == null ? null : Math.round(e * 100));

/** Comparatif en euros, calculé avec le même moteur que le serveur. */
export function comparatif(d: Demande, fournisseurs: Fournisseur[]): Comparatif {
  return comparer(
    d.lignes.map((l) => ({ id: l.id, designation: l.designation, quantite: l.quantite, prix_cible_cents: c(l.prixCible) })),
    d.destinataires.map((x) => {
      const f = fournisseurs.find((ff) => ff.id === x.fournisseurId);
      return {
        destinataire_id: x.id,
        fournisseur_id: x.fournisseurId,
        fournisseur_nom: f?.nom ?? 'Fournisseur',
        repondu: x.statut === 'repondue',
        frais_port_cents: c(x.port),
        franco_cents: c(f?.franco),
        delai_livraison_jours: x.delaiJours ?? null,
        prix: Object.fromEntries(x.prix.map((p) => [p.ligneId, c(p.prix)])),
      };
    }),
  );
}

export const eur = (cents: number | null | undefined) => (cents == null ? null : cents / 100);

export const STATUT_DEMANDE: Record<StatutDemande, { label: string; tone: Tone }> = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  envoyee: { label: 'En attente des réponses', tone: 'info' },
  reponses_partielles: { label: 'Réponses en cours', tone: 'violet' },
  complete: { label: 'Toutes les réponses', tone: 'ok' },
  commandee: { label: 'Commandée', tone: 'dark' },
  annulee: { label: 'Annulée', tone: 'neutral' },
};

export const STATUT_DESTINATAIRE: Record<StatutDestinataire, { label: string; tone: Tone }> = {
  a_envoyer: { label: 'À envoyer', tone: 'neutral' },
  envoyee: { label: 'Envoyée', tone: 'neutral' },
  vue: { label: 'Ouverte', tone: 'info' },
  repondue: { label: 'A répondu', tone: 'ok' },
  declinee: { label: 'Ne peut pas', tone: 'warn' },
};

export const STATUT_COMMANDE: Record<StatutCommande, { label: string; tone: Tone }> = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  envoyee: { label: 'Envoyée', tone: 'info' },
  confirmee: { label: 'Confirmée', tone: 'violet' },
  expediee: { label: 'En livraison', tone: 'warn' },
  livree_partiel: { label: 'Livrée en partie', tone: 'warn' },
  livree: { label: 'Livrée', tone: 'ok' },
  facturee: { label: 'Facturée', tone: 'dark' },
  annulee: { label: 'Annulée', tone: 'neutral' },
};

export const ETAPES_COMMANDE: { statut: StatutCommande; label: string }[] = [
  { statut: 'envoyee', label: 'Envoyée' },
  { statut: 'confirmee', label: 'Confirmée' },
  { statut: 'expediee', label: 'En livraison' },
  { statut: 'livree', label: 'Reçue' },
  { statut: 'facturee', label: 'Facturée' },
];

export const ORDRE_COMMANDE: StatutCommande[] = ['brouillon', 'envoyee', 'confirmee', 'expediee', 'livree_partiel', 'livree', 'facturee'];

export const lienPortail = (token: string) => lienPublic('fournisseur', token);
