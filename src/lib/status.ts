import type { Tone } from '@/components/ui/Badge';
import type { ChantierStatus, DevisStatus, EInvoiceStatus, FactureStatus, LineKind } from './types';

export const DEVIS_STATUS: Record<DevisStatus, { label: string; tone: Tone }> = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  envoye: { label: 'Envoyé', tone: 'info' },
  vu: { label: 'Vu par le client', tone: 'violet' },
  signe: { label: 'Signé', tone: 'ok' },
  refuse: { label: 'Refusé', tone: 'bad' },
  expire: { label: 'Expiré', tone: 'warn' },
};

export const FACTURE_STATUS: Record<FactureStatus, { label: string; tone: Tone }> = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  emise: { label: 'Émise', tone: 'info' },
  envoyee: { label: 'Envoyée', tone: 'info' },
  payee: { label: 'Payée', tone: 'ok' },
  partielle: { label: 'Payée en partie', tone: 'warn' },
  en_retard: { label: 'En retard', tone: 'bad' },
  annulee: { label: 'Annulée', tone: 'neutral' },
};

export const CHANTIER_STATUS: Record<ChantierStatus, { label: string; tone: Tone }> = {
  a_planifier: { label: 'À planifier', tone: 'neutral' },
  en_cours: { label: 'En cours', tone: 'violet' },
  en_pause: { label: 'En pause', tone: 'warn' },
  reception: { label: 'Réception', tone: 'info' },
  termine: { label: 'Terminé', tone: 'ok' },
};

/** Statuts du cycle de vie de la facture électronique (norme XP Z12-012, CDAR). */
export const EINVOICE_STATUS: Record<EInvoiceStatus, { label: string; tone: Tone; help: string }> = {
  non_transmise: { label: 'Non transmise', tone: 'neutral', help: 'Facture à un particulier ou pas encore déposée.' },
  deposee: { label: 'Déposée', tone: 'info', help: 'Reçue par la plateforme agréée.' },
  emise: { label: 'Émise', tone: 'info', help: 'Transmise par la plateforme agréée.' },
  recue: { label: 'Reçue', tone: 'info', help: 'Arrivée sur la plateforme du client.' },
  mise_a_disposition: { label: 'Mise à disposition', tone: 'info', help: 'Le client peut la consulter.' },
  prise_en_charge: { label: 'Prise en charge', tone: 'violet', help: 'Le client la traite.' },
  approuvee: { label: 'Approuvée', tone: 'ok', help: 'Le client a validé la facture.' },
  refusee: { label: 'Refusée', tone: 'bad', help: 'Le client a refusé : voir le motif.' },
  litige: { label: 'En litige', tone: 'warn', help: 'Le client conteste une partie.' },
  paiement_transmis: { label: 'Paiement transmis', tone: 'ok', help: 'Le client annonce avoir payé.' },
  encaissee: { label: 'Encaissée', tone: 'ok', help: 'Paiement reçu, statut transmis au fisc.' },
};

export const LINE_KIND: Record<LineKind, string> = {
  section: 'Lot',
  ouvrage: 'Ouvrage',
  fourniture: 'Fourniture',
  main_oeuvre: "Main d'œuvre",
  texte: 'Texte',
};
