// État de saisie d'une réponse dans le portail : lignes, conditions, calcul du total, brouillon local.
import type { Demande, Destinataire, PieceJointe, PrixReponse } from '../../data/types';
import { ecrirePrix, lirePrix } from '../demandes/commun';
import type { ReponseFournisseur } from '../../data/store';

export type DispoSaisie = 'stock' | 'delai' | 'equivalent' | 'indispo';

export interface SaisieLigne {
  prix: string;
  dispo: DispoSaisie;
  jours: string;
  designation: string;
  reference: string;
}

export interface Conditions {
  delai: string; // jours
  remise: string; // %
  franco: boolean;
  port: string;
  paiement: string;
  validite: string; // jours
  commentaire: string;
  pieceJointe?: PieceJointe;
}

export const PAIEMENTS = ['À réception', '30 jours fin de mois', '45 jours fin de mois', 'Comptant'];
export const VALIDITES = ['15', '30', '60'];

export const ligneVide = (): SaisieLigne => ({ prix: '', dispo: 'stock', jours: '2', designation: '', reference: '' });
export const conditionsVides = (): Conditions => ({ delai: '1', remise: '', franco: true, port: '', paiement: '30 jours fin de mois', validite: '30', commentaire: '' });

/** Prix unitaire saisi (avant remise), ou null si la ligne n'est pas chiffrée. */
export const prixLigne = (v: SaisieLigne | undefined) => (!v || v.dispo === 'indispo' ? null : lirePrix(v.prix));
export const ligneFaite = (v: SaisieLigne | undefined) => !!v && (v.dispo === 'indispo' || lirePrix(v.prix) != null);

export function totaux(d: Demande, lignes: Record<string, SaisieLigne>, c: Conditions) {
  const brut = d.lignes.reduce((s, l) => s + (prixLigne(lignes[l.id]) ?? 0) * l.quantite, 0);
  const remise = Math.min(90, lirePrix(c.remise) ?? 0);
  const net = Math.round(brut * (1 - remise / 100) * 100) / 100;
  const port = c.franco ? 0 : lirePrix(c.port) ?? 0;
  const faites = d.lignes.filter((l) => ligneFaite(lignes[l.id])).length;
  const chiffrees = d.lignes.filter((l) => prixLigne(lignes[l.id]) != null).length;
  return { brut, remise, montantRemise: brut - net, net, port, total: net + port, faites, chiffrees };
}

/** Ce qui part chez l'artisan : prix nets (remise déduite), disponibilités, conditions. */
export function versReponse(d: Demande, lignes: Record<string, SaisieLigne>, c: Conditions): ReponseFournisseur {
  const remise = Math.min(90, lirePrix(c.remise) ?? 0);
  const prix: PrixReponse[] = d.lignes.map((l) => {
    const v = lignes[l.id] ?? ligneVide();
    const p = prixLigne(v);
    if (p == null) return { ligneId: l.id, prix: null };
    const out: PrixReponse = { ligneId: l.id, prix: Math.round(p * (1 - remise / 100) * 100) / 100, dispo: v.dispo === 'indispo' ? undefined : v.dispo };
    if (v.dispo === 'delai') out.dispoJours = Number(v.jours) || 1;
    if (v.dispo === 'equivalent' && v.designation.trim()) {
      out.designationProposee = v.designation.trim();
      out.referenceProposee = v.reference.trim() || undefined;
    }
    return out;
  });
  return {
    prix,
    port: c.franco ? 0 : lirePrix(c.port) ?? 0,
    delaiJours: c.delai === '' ? undefined : Number(c.delai),
    remise: remise || undefined,
    conditions: c.paiement || undefined,
    validiteJours: Number(c.validite) || undefined,
    pieceJointe: c.pieceJointe,
    commentaire: c.commentaire.trim() || undefined,
  };
}

/** Reprend une réponse déjà envoyée (pour la corriger). Les prix sont remis avant remise. */
export function depuisReponse(d: Demande, dest: Destinataire): { lignes: Record<string, SaisieLigne>; conditions: Conditions } {
  const r = dest.remise ?? 0;
  const lignes = Object.fromEntries(
    d.lignes.map((l) => {
      const p = dest.prix.find((x) => x.ligneId === l.id);
      if (!p) return [l.id, ligneVide()];
      if (p.prix == null) return [l.id, { ...ligneVide(), dispo: 'indispo' as const }];
      const brut = r ? Math.round((p.prix / (1 - r / 100)) * 100) / 100 : p.prix;
      const dispo: DispoSaisie = p.designationProposee ? 'equivalent' : p.dispo ?? 'stock';
      return [l.id, { prix: ecrirePrix(brut), dispo, jours: String(p.dispoJours ?? 2), designation: p.designationProposee ?? '', reference: p.referenceProposee ?? '' }];
    }),
  );
  return {
    lignes,
    conditions: {
      delai: dest.delaiJours != null ? String(dest.delaiJours) : '1',
      remise: r ? String(r).replace('.', ',') : '',
      franco: !dest.port,
      port: dest.port ? ecrirePrix(dest.port) : '',
      paiement: dest.conditions ?? '30 jours fin de mois',
      validite: String(dest.validiteJours ?? 30),
      commentaire: dest.commentaire ?? '',
      pieceJointe: dest.pieceJointe,
    },
  };
}

// Brouillon : gardé dans ce navigateur seulement (commodité, jamais la source de vérité).
const cle = (token: string) => `brix-portail-brouillon-${token.slice(0, 16)}`;
export interface Brouillon { lignes: Record<string, SaisieLigne>; conditions: Conditions; etape: number; at: number }

export function lireBrouillon(token: string): Brouillon | null {
  try {
    const t = localStorage.getItem(cle(token));
    return t ? (JSON.parse(t) as Brouillon) : null;
  } catch {
    return null;
  }
}
export function ecrireBrouillon(token: string, b: Brouillon) {
  try {
    localStorage.setItem(cle(token), JSON.stringify(b));
  } catch {
    /* navigation privée : on continue sans brouillon */
  }
}
export function effacerBrouillon(token: string) {
  try {
    localStorage.removeItem(cle(token));
  } catch {
    /* rien */
  }
}
