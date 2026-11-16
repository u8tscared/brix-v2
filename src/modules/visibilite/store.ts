// Store local du département Visibilité (site vitrine, réseaux sociaux, portail client).
// Persisté dans le navigateur ; côté serveur ces réglages iront dans le module visibilite du worker.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset } from '@/lib/format';

export type SiteTheme = 'clair' | 'atelier' | 'nature';
export interface Post { id: string; chantierId: string; text: string; networks: string[]; status: 'pret' | 'programme' | 'publie'; date: string; likes?: number }

export interface PortalSettings {
  steps: boolean;
  photos: boolean;
  nextVisit: boolean;
  documents: boolean;
  payment: boolean;
  chat: boolean;
  review: boolean;
  autoSend: boolean;
  welcome: string;
}

interface VisiState {
  site: { generated: boolean; published: boolean; theme: SiteTheme; domain: 'brix' | 'perso'; customDomain: string; sections: Record<string, boolean>; tagline: string };
  accounts: Record<string, boolean>;
  posts: Post[];
  portal: PortalSettings;
  setSite: (p: Partial<VisiState['site']>) => void;
  setAccount: (k: string, on: boolean) => void;
  upsertPost: (p: Post) => void;
  setPortal: (p: Partial<PortalSettings>) => void;
}

export const useVisi = create<VisiState>()(
  persist(
    (set) => ({
      site: {
        generated: false,
        published: false,
        theme: 'clair',
        domain: 'brix',
        customDomain: 'benali-elec.fr',
        sections: { prestations: true, realisations: true, avis: true, zone: true, rdv: true },
        tagline: 'Votre électricien de confiance à Villeurbanne et dans tout le Grand Lyon.',
      },
      accounts: { facebook: true, instagram: true, google: true, linkedin: false },
      posts: [
        { id: 'p_roux', chantierId: 'ch_morel', text: 'Tableau électrique remplacé en une matinée à Villeurbanne. Ancien tableau à fusibles, nouveau tableau aux normes avec différentiels 30 mA : la maison est en sécurité.', networks: ['facebook', 'instagram', 'google'], status: 'publie', date: dayOffset(-36), likes: 48 },
        { id: 'p_martin', chantierId: 'ch_martin', text: 'Passage en triphasé terminé pour la Boulangerie Martin, cours Émile Zola. Nouveau four et chambre froide raccordés, sans fermer la boutique un seul jour.', networks: ['facebook', 'instagram', 'google'], status: 'pret', date: dayOffset(3) },
        { id: 'p_tilleuls', chantierId: 'ch_tilleuls', text: '36 hublots LED à détection posés dans les 3 cages d\'escalier de la SCI Les Tilleuls : jusqu\'à 70 % d\'économie sur l\'éclairage des communs.', networks: ['facebook', 'google'], status: 'programme', date: dayOffset(12) },
      ],
      portal: { steps: true, photos: true, nextVisit: true, documents: true, payment: true, chat: true, review: true, autoSend: true, welcome: 'Bonjour, retrouvez ici l\'avancement de votre chantier, vos documents et vos factures. Une question ? Écrivez-moi directement. Karim' },
      setSite: (p) => set((s) => ({ site: { ...s.site, ...p } })),
      setAccount: (k, on) => set((s) => ({ accounts: { ...s.accounts, [k]: on } })),
      upsertPost: (p) => set((s) => ({ posts: s.posts.some((x) => x.id === p.id) ? s.posts.map((x) => (x.id === p.id ? p : x)) : [p, ...s.posts] })),
      setPortal: (p) => set((s) => ({ portal: { ...s.portal, ...p } })),
    }),
    { name: 'brix-v2-visibilite', version: 1 },
  ),
);
