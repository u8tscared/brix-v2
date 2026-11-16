// État des intégrations (simulé et persisté en preview). En production, chaque
// connexion passe par le worker (OAuth ou clé API stockée en secret).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Integration {
  key: string;
  name: string;
  what: string;
  category: 'Agenda et mails' | 'Banque et compta' | 'Paiement' | 'Messages';
  initials: string;
  color: string;
}

export const INTEGRATIONS: Integration[] = [
  { key: 'google', name: 'Google Agenda et Gmail', what: 'Rendez-vous et planning synchronisés, envoi des devis depuis votre adresse.', category: 'Agenda et mails', initials: 'G', color: '#4285f4' },
  { key: 'outlook', name: 'Outlook', what: 'Agenda et mails Microsoft 365.', category: 'Agenda et mails', initials: 'O', color: '#0a64d6' },
  { key: 'qonto', name: 'Qonto', what: 'Vos paiements associés aux factures, tout seuls.', category: 'Banque et compta', initials: 'Q', color: '#17171f' },
  { key: 'banques', name: 'Autres banques', what: 'Crédit Agricole, BNP, Société Générale, CIC… via un accès sécurisé agréé.', category: 'Banque et compta', initials: 'B', color: '#1f389d' },
  { key: 'pennylane', name: 'Pennylane', what: 'Factures et dépenses envoyées à votre comptable chaque jour.', category: 'Banque et compta', initials: 'P', color: '#00a77e' },
  { key: 'stripe', name: 'Stripe', what: 'Paiement par carte et lien de paiement sur les factures.', category: 'Paiement', initials: 'S', color: '#635bff' },
  { key: 'gocardless', name: 'Prélèvement SEPA', what: 'Contrats d’entretien payés automatiquement chaque année.', category: 'Paiement', initials: 'SE', color: '#0f766e' },
  { key: 'whatsapp', name: 'WhatsApp Business', what: 'Devis, rappels de rendez-vous et brief du matin sur WhatsApp.', category: 'Messages', initials: 'W', color: '#25d366' },
  { key: 'sms', name: 'SMS', what: 'Rappels de rendez-vous et confirmations par SMS.', category: 'Messages', initials: 'SM', color: '#d946ef' },
];

export const useIntegrations = create<{ connected: Record<string, string>; connect: (k: string) => void; disconnect: (k: string) => void }>()(
  persist(
    (set) => ({
      connected: { google: 'karim@benali-elec.fr', qonto: 'Compte pro · FR76 •••• 143', stripe: 'Paiements actifs' },
      connect: (k) => set((s) => ({ connected: { ...s.connected, [k]: 'Connecté à l’instant' } })),
      disconnect: (k) =>
        set((s) => {
          const c = { ...s.connected };
          delete c[k];
          return { connected: c };
        }),
    }),
    { name: 'brix-v2-integrations' },
  ),
);
