// Services du département Équipe. En preview tout est simulé (délais réalistes).
// Pour brancher le vrai backend : remplacer le corps de chaque fonction par un appel
// au worker (`/api/equipe/...`), sans changer leur signature.

import { CHANTIER_GEO } from './data';
import { distanceKm } from './lib/timesheet';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envoi d'une invitation par SMS. À brancher : fournisseur SMS (Brevo, OVH SMS…) côté worker. */
export async function sendInviteSms(phone: string, link: string) {
  await wait(900);
  return { ok: true, demo: true, phone, link };
}

/** Lien d'invitation unique. À brancher : jeton signé généré par le worker (`/api/equipe/invitations`). */
export function inviteLink(code: string) {
  return `https://app.brix.fr/rejoindre/${code}`;
}

export function inviteCode() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return 'BE-' + Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
}

export interface Located {
  lat: number;
  lng: number;
  accuracy: number;
  real: boolean;
  chantierId?: string;
  distanceM?: number;
}

/** Position du téléphone et chantier le plus proche (moins de 400 m). Sans GPS : position de démo. */
export async function locate(fallbackChantierId = 'ch_lefevre'): Promise<Located> {
  const nearest = (lat: number, lng: number) => {
    let best: { id: string; d: number } | null = null;
    for (const [id, g] of Object.entries(CHANTIER_GEO)) {
      const dist = distanceKm({ lat, lng }, g) * 1000;
      if (!best || dist < best.d) best = { id, d: dist };
    }
    return best;
  };
  const real = await new Promise<GeolocationPosition | null>((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    const t = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve(p);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 3800, maximumAge: 60000 },
    );
  });
  if (real) {
    const n = nearest(real.coords.latitude, real.coords.longitude);
    return { lat: real.coords.latitude, lng: real.coords.longitude, accuracy: real.coords.accuracy, real: true, chantierId: n && n.d < 400 ? n.id : undefined, distanceM: n?.d };
  }
  await wait(600);
  const g = CHANTIER_GEO[fallbackChantierId];
  return { lat: g.lat + 0.0002, lng: g.lng - 0.0001, accuracy: 12, real: false, chantierId: fallbackChantierId, distanceM: 24 };
}

/** Envoi des éléments de paie à l'expert-comptable. À brancher : e-mail ou dépôt sur son portail. */
export async function sendToAccountant(_csv: string, _period: string) {
  await wait(1100);
  return { ok: true, demo: true };
}

/** Déclaration sociale nominative. À brancher : partenaire paie agréé (net-entreprises). */
export async function submitDsn(_period: string) {
  await wait(700);
  return { ok: false, reason: 'DSN à brancher : elle passera par votre partenaire paie ou votre expert-comptable.' };
}
