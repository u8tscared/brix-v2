// Notifications de l'artisan : ce qui se passe hors de l'app (client qui ouvre, signe, paie ; fournisseur qui répond).
// Démo : alimentées par les pages publiques du même navigateur (synchronisées entre onglets).
// Réel : table notifications (worker/src/modules/notifications) + Web Push / APNs / FCM.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TypeNotif =
  | 'devis_ouvert'
  | 'devis_signe'
  | 'devis_question'
  | 'devis_refuse'
  | 'facture_ouverte'
  | 'paiement_recu'
  | 'fournisseur_reponse'
  | 'commande_confirmee'
  | 'relance_envoyee'
  | 'avis_recu'
  | 'systeme';

export interface Notif {
  id: string;
  at: string;
  type: TypeNotif;
  titre: string;
  texte?: string;
  qui?: string; // nom affiché (client, fournisseur)
  montant?: number;
  vers?: string; // route interne de l'app (#/app/…)
  lu: boolean;
}

export type Canal = 'app' | 'push' | 'email' | 'sms';

export const TYPES_REGLABLES: { type: TypeNotif; label: string; defaut: Canal[] }[] = [
  { type: 'devis_signe', label: 'Un client signe un devis', defaut: ['app', 'push', 'email'] },
  { type: 'paiement_recu', label: 'Vous recevez un paiement', defaut: ['app', 'push', 'email'] },
  { type: 'devis_ouvert', label: 'Un client ouvre un devis', defaut: ['app', 'push'] },
  { type: 'devis_question', label: 'Un client pose une question', defaut: ['app', 'push', 'sms'] },
  { type: 'fournisseur_reponse', label: 'Un fournisseur répond', defaut: ['app', 'push'] },
  { type: 'commande_confirmee', label: 'Une commande est confirmée', defaut: ['app'] },
  { type: 'facture_ouverte', label: 'Une facture est consultée', defaut: ['app'] },
];

interface NotifState {
  items: Notif[];
  prefs: Record<string, Canal[]>;
  calme: { actif: boolean; de: string; a: string }; // heures calmes
  ajouter: (n: Omit<Notif, 'id' | 'at' | 'lu'>) => Notif;
  lire: (id: string) => void;
  toutLire: () => void;
  basculer: (type: TypeNotif, canal: Canal) => void;
  setCalme: (c: Partial<NotifState['calme']>) => void;
}

const nid = () => `n_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const useNotifs = create<NotifState>()(
  persist(
    (set) => ({
      items: [],
      prefs: Object.fromEntries(TYPES_REGLABLES.map((t) => [t.type, t.defaut])),
      calme: { actif: true, de: '20:00', a: '07:00' },
      ajouter: (n) => {
        const notif: Notif = { ...n, id: nid(), at: new Date().toISOString(), lu: false };
        set((s) => ({ items: [notif, ...s.items].slice(0, 200) }));
        return notif;
      },
      lire: (id) => set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, lu: true } : x)) })),
      toutLire: () => set((s) => ({ items: s.items.map((x) => ({ ...x, lu: true })) })),
      basculer: (type, canal) =>
        set((s) => {
          const cur = s.prefs[type] ?? [];
          return { prefs: { ...s.prefs, [type]: cur.includes(canal) ? cur.filter((c) => c !== canal) : [...cur, canal] } };
        }),
      setCalme: (c) => set((s) => ({ calme: { ...s.calme, ...c } })),
    }),
    { name: 'brix-v2-notifications', version: 1 },
  ),
);

/** Quelques notifications réalistes pour la démo (une seule fois, si la liste est vide). */
export function amorcerDemo() {
  const s = useNotifs.getState();
  if (s.items.length) return;
  const il = (min: number) => new Date(Date.now() - min * 60000).toISOString();
  useNotifs.setState({
    items: [
      { id: 'n_demo1', at: il(12), type: 'devis_ouvert', titre: 'Thomas Garnier consulte votre devis', texte: 'D-2026-118 · 3e ouverture, il compare peut-être', qui: 'Thomas Garnier', vers: '/app/devis/q_118', lu: false },
      { id: 'n_demo2', at: il(95), type: 'fournisseur_reponse', titre: 'Votre fournisseur a répondu', texte: 'Demande de prix tableau triphasé · 1 184,00 € HT, livré jeudi', vers: '/app/fournisseurs', lu: false },
      { id: 'n_demo3', at: il(60 * 26), type: 'paiement_recu', titre: 'Paiement reçu : 490,00 €', texte: 'Cabinet Dr Nguyen · F-2026-195 · virement', montant: 490, vers: '/app/factures/f_195', lu: true },
      { id: 'n_demo4', at: il(60 * 28), type: 'devis_question', titre: 'Claire Lefèvre a une question', texte: 'Peut-on ajouter une prise USB à côté du lit ?', qui: 'Claire Lefèvre', vers: '/app/devis/q_121', lu: true },
    ],
  });
}
