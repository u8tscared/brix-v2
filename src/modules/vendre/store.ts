// Petit store local du département Vendre (échanges, rappels, réglages de rendez-vous, avis).
// Persisté dans le navigateur. Côté serveur, ces données iront dans les tables du module vendre.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset, uid } from '@/lib/format';

export interface Exchange { id: string; clientId: string; at: string; kind: 'appel' | 'mail' | 'sms' | 'whatsapp' | 'note' | 'visite'; text: string }
export interface Review { id: string; author: string; rating: number; text: string; date: string; source: 'Google' | 'Pages Jaunes' | 'Brix'; chantier?: string; reply?: string; replyDraft?: string }
export interface VisitType { id: string; label: string; minutes: number; price: string; on: boolean }
export interface ReviewRequest { chantierId: string; sentAt: string; channel: 'sms' | 'mail'; opened?: boolean }

interface VendreState {
  exchanges: Exchange[];
  reminders: Record<string, { on: boolean; date: string; label: string }>;
  rdv: { slug: string; days: number[]; from: string; to: string; minNotice: number; buffer: number; agenda: string | null; types: VisitType[]; bookings: number };
  reviews: Review[];
  autoReview: { on: boolean; delayDays: number; channel: 'sms' | 'mail' };
  reviewRequests: ReviewRequest[];
  addExchange: (e: Omit<Exchange, 'id'>) => void;
  setReminder: (clientId: string, r: { on: boolean; date: string; label: string }) => void;
  setRdv: (p: Partial<VendreState['rdv']>) => void;
  setReview: (id: string, p: Partial<Review>) => void;
  setAutoReview: (p: Partial<VendreState['autoReview']>) => void;
  addReviewRequest: (r: ReviewRequest) => void;
}

const ago = (n: number) => dayOffset(-n);

export const useVendre = create<VendreState>()(
  persist(
    (set) => ({
      exchanges: [
        { id: 'x1', clientId: 'c_lefevre', at: ago(1) + 'T18:12', kind: 'whatsapp', text: 'Photos des saignées du séjour envoyées. Mme Lefèvre valide l\'emplacement des spots.' },
        { id: 'x2', clientId: 'c_lefevre', at: ago(6) + 'T08:05', kind: 'visite', text: 'Démarrage du chantier, clés récupérées chez la gardienne.' },
        { id: 'x3', clientId: 'c_lefevre', at: ago(31) + 'T17:40', kind: 'appel', text: 'Premier appel : souhaite une rénovation complète avant emménagement.' },
        { id: 'x4', clientId: 'c_garnier', at: ago(0) + 'T07:30', kind: 'note', text: 'A rouvert le devis 3 fois, s\'intéresse à l\'option VMC.' },
        { id: 'x5', clientId: 'c_martin', at: ago(2) + 'T11:00', kind: 'appel', text: 'Mme Martin demande la mise en service lundi avant 6 h pour le fournil.' },
        { id: 'x6', clientId: 'c_tilleuls', at: ago(12) + 'T09:20', kind: 'mail', text: 'Relance amiable situation n°2 envoyée par Bob.' },
      ],
      reminders: {
        c_tilleuls: { on: true, date: dayOffset(1), label: 'Entretien annuel des parties communes' },
        c_martin: { on: true, date: dayOffset(160), label: 'Contrôle du tableau triphasé' },
      },
      rdv: {
        slug: 'benali-electricite',
        days: [1, 2, 3, 4, 5],
        from: '08:00',
        to: '18:00',
        minNotice: 24,
        buffer: 30,
        agenda: 'Google Agenda',
        bookings: 7,
        types: [
          { id: 'vt1', label: 'Visite pour un devis', minutes: 45, price: 'Gratuit', on: true },
          { id: 'vt2', label: 'Dépannage', minutes: 60, price: 'à partir de 89 €', on: true },
          { id: 'vt3', label: 'Diagnostic électrique', minutes: 90, price: '180 €', on: true },
          { id: 'vt4', label: 'Conseil borne de recharge', minutes: 30, price: 'Gratuit', on: false },
        ],
      },
      reviews: [
        { id: 'r1', author: 'Michel Roux', rating: 5, text: 'Tableau changé en une matinée, chantier propre et explications claires. Je recommande sans hésiter.', date: ago(3), source: 'Google', chantier: 'Dépannage tableau' },
        { id: 'r2', author: 'Sophie Martin', rating: 5, text: 'Intervention en urgence un dimanche pour notre chambre froide. Réactifs et efficaces, merci à Mehdi !', date: ago(11), source: 'Google', chantier: 'Dépannage chambre froide', reply: 'Merci Sophie, ravi d\'avoir pu sauver la fournée du lundi. À très vite pour le triphasé !' },
        { id: 'r3', author: 'Dr Linh Nguyen', rating: 5, text: 'Très bon suivi, devis respecté au centime près. Le câblage réseau du cabinet est impeccable.', date: ago(19), source: 'Google', chantier: 'Prises supplémentaires', reply: 'Merci Docteur, c\'est un plaisir de travailler dans un cabinet aussi bien organisé.' },
        { id: 'r4', author: 'Romain G.', rating: 4, text: 'Bon travail mais un peu de retard au démarrage. Le résultat est très propre.', date: ago(26), source: 'Google' },
        { id: 'r5', author: 'Marc Roche', rating: 5, text: 'Prestataire sérieux pour notre SCI, factures claires et toujours joignable.', date: ago(44), source: 'Pages Jaunes', reply: 'Merci Marc, au plaisir de continuer à entretenir vos immeubles.' },
        { id: 'r6', author: 'Céline D.', rating: 5, text: 'Borne installée rapidement, aide pour le crédit d\'impôt très appréciée.', date: ago(58), source: 'Google', reply: 'Merci Céline, bonne route avec votre nouvelle voiture !' },
      ],
      autoReview: { on: true, delayDays: 2, channel: 'sms' },
      reviewRequests: [{ chantierId: 'ch_morel', sentAt: ago(36), channel: 'sms', opened: true }],
      addExchange: (e) => set((s) => ({ exchanges: [{ ...e, id: uid('x') }, ...s.exchanges] })),
      setReminder: (clientId, r) => set((s) => ({ reminders: { ...s.reminders, [clientId]: r } })),
      setRdv: (p) => set((s) => ({ rdv: { ...s.rdv, ...p } })),
      setReview: (id, p) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, ...p } : r)) })),
      setAutoReview: (p) => set((s) => ({ autoReview: { ...s.autoReview, ...p } })),
      addReviewRequest: (r) => set((s) => ({ reviewRequests: [r, ...s.reviewRequests.filter((x) => x.chantierId !== r.chantierId)] })),
    }),
    { name: 'brix-v2-vendre', version: 1 },
  ),
);
