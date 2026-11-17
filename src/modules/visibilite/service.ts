// Services Visibilité, simulés en démo.
// Vraies versions : génération du site par Bob puis déploiement Cloudflare Pages (POST /api/site/publish),
// achat de domaine via le registrar (POST /api/site/domain), publication Meta Graph API et Google Business Profile
// (POST /api/reseaux/publish).
import type { TradeKey } from '@/lib/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const SITE_STEPS = ['Lecture de votre fiche entreprise', 'Rédaction des textes par Bob', 'Choix des photos de vos chantiers', 'Ajout de vos avis Google', 'Mise en ligne sécurisée'];

export async function generateSite(onStep: (i: number) => void) {
  for (let i = 0; i < SITE_STEPS.length; i++) {
    onStep(i);
    await wait(i === 1 ? 1200 : 750);
  }
  onStep(SITE_STEPS.length);
}

export async function publishSite() {
  await wait(1200);
  return { ok: true, demo: true };
}

export async function checkDomain(domain: string) {
  await wait(800);
  return { available: !/google|facebook/.test(domain), price: domain.endsWith('.fr') ? 12 : 15 };
}

export async function publishPost(_id: string, _networks: string[]) {
  await wait(1000);
  return { ok: true, demo: true };
}

export const SERVICES: Partial<Record<TradeKey, { title: string; text: string }[]>> = {
  electricien: [
    { title: 'Rénovation électrique', text: 'Appartements et maisons, de la saignée au Consuel.' },
    { title: 'Mise aux normes', text: 'Tableau, terre, différentiels : NF C 15-100.' },
    { title: 'Borne de recharge', text: 'Installateur IRVE, aide à la prime et au crédit d\'impôt.' },
    { title: 'Dépannage rapide', text: 'Panne, disjoncteur qui saute : intervention sous 24 h.' },
    { title: 'Éclairage LED', text: 'Intérieur, extérieur, parties communes.' },
    { title: 'Domotique', text: 'Volets, chauffage, alarmes pilotés depuis le téléphone.' },
  ],
  plombier: [
    { title: 'Dépannage plomberie', text: 'Fuite, débouchage, chasse d\'eau.' },
    { title: 'Salle de bain', text: 'Rénovation complète clé en main.' },
    { title: 'Chauffe-eau', text: 'Remplacement, thermodynamique.' },
    { title: 'Chauffage', text: 'Chaudière, pompe à chaleur.' },
  ],
};

export const DEFAULT_SERVICES = [
  { title: 'Rénovation', text: 'Travaux de rénovation clé en main.' },
  { title: 'Dépannage', text: 'Intervention rapide.' },
  { title: 'Neuf', text: 'Construction et extension.' },
  { title: 'Conseil', text: 'Visite et devis gratuits.' },
];
