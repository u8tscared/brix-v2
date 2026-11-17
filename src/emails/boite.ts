// Boîte d'envoi de la démo : chaque e-mail « envoyé » par Brix y est rangé et se lit dans /#/boite.
// En réel, l'envoi passe par le worker (POST /api/emails/send → Brevo ou Resend) et ce journal vient de D1.
// Ce fichier utilise zustand (navigateur uniquement) : le worker n'importe que ./types et ./modeles.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DonneesEmail, ModeleEmail } from './types';

export interface EmailEnvoye<M extends ModeleEmail = ModeleEmail> {
  id: string;
  at: string; // ISO
  de: string; // « Karim Benali · Benali Électricité »
  a: string; // adresse du destinataire
  pour: 'client' | 'artisan' | 'fournisseur';
  modele: M;
  donnees: DonneesEmail[M];
  lu?: boolean;
}

interface Boite {
  mails: EmailEnvoye[];
  ajouter: <M extends ModeleEmail>(m: Omit<EmailEnvoye<M>, 'id' | 'at'>) => EmailEnvoye<M>;
  lire: (id: string) => void;
  vider: () => void;
}

const id = () => `m_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const useBoite = create<Boite>()(
  persist(
    (set) => ({
      mails: [],
      ajouter: (m) => {
        const mail = { ...m, id: id(), at: new Date().toISOString() } as EmailEnvoye<typeof m.modele>;
        set((s) => ({ mails: [mail as EmailEnvoye, ...s.mails].slice(0, 120) }));
        return mail;
      },
      lire: (mid) => set((s) => ({ mails: s.mails.map((x) => (x.id === mid ? { ...x, lu: true } : x)) })),
      vider: () => set({ mails: [] }),
    }),
    { name: 'brix-v2-boite', version: 1 },
  ),
);
