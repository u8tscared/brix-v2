/** Types de notifications de l'artisan et valeurs par défaut des préférences. */

export const TYPES_NOTIFICATION = {
  devis_ouvert: { libelle: 'Un client ouvre un devis', app: true, push: true },
  devis_signe: { libelle: 'Un devis est signé', app: true, push: true },
  devis_refuse: { libelle: 'Un devis est refusé', app: true, push: true },
  devis_question: { libelle: 'Un client pose une question', app: true, push: true },
  facture_ouverte: { libelle: 'Un client ouvre une facture', app: true, push: false },
  paiement_recu: { libelle: 'Vous êtes payé', app: true, push: true },
  paiement_echoue: { libelle: 'Un paiement échoue', app: true, push: true },
} as const;

export type TypeNotification = keyof typeof TYPES_NOTIFICATION;
export type Canal = 'app' | 'push';

export const estTypeNotification = (t: unknown): t is TypeNotification => typeof t === 'string' && t in TYPES_NOTIFICATION;

export interface Notifier {
  entrepriseId: string;
  type: TypeNotification;
  titre: string;
  texte: string;
  vers?: string | null; // chemin dans l'app, sans /app/ (ex. « devis/dv_123 »)
  montant?: number | null; // euros
  documentType?: 'devis' | 'facture' | 'chantier';
  documentId?: string;
}
