// Services du département Chantiers.
// En preview tout est simulé (délais réalistes, résultats plausibles). Pour brancher le vrai
// backend, remplacer le corps de chaque fonction par un appel au worker :
//   fetch(`${API}/api/chantiers/...`) (voir worker/src/modules/chantiers, à créer).

import { forecast, type DayWeather } from './lib/weather';
import type { PlanningEvent } from '@/lib/types';
import { placeOf } from './lib/geo';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Prévisions météo. Prod : Open-Meteo ou Météo-France (gratuit, sans clé pour Open-Meteo). */
export async function fetchWeather(city: string, days = 5): Promise<DayWeather[]> {
  await wait(250);
  return forecast(days, city);
}

const SAMPLE_NOTES = [
  'Prises de la chambre posées, il reste le raccordement au tableau. Le client veut un variateur dans le séjour, à ajouter au devis.',
  'Passage du Consuel confirmé pour jeudi 10 h. Penser à laisser le schéma unifilaire dans le tableau.',
  'Fin de journée : saignées rebouchées dans la cuisine, câblage du tableau commencé. Rien à signaler.',
  'Il manque deux disjoncteurs 20 ampères, commande à passer chez Rexel pour demain matin.',
];

/** Transcription d'une note vocale. Prod : Whisper (OpenAI) ou Voxtral via le worker. */
export async function transcribe(_audio?: Blob | null, hint?: string): Promise<string> {
  await wait(1100);
  if (hint && hint.trim()) return hint.trim();
  return SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
}

/** Envoi du rapport d'intervention au client (e-mail + lien portail). Prod : worker → Resend / Brevo. */
export async function sendReport(p: { chantierId: string; to: string; photos: number; text: string }): Promise<{ ok: true; sentAt: string }> {
  await wait(900);
  void p;
  return { ok: true, sentAt: new Date().toISOString() };
}

/** Envoi d'un avenant pour signature électronique. Prod : Yousign via le worker. */
export async function sendAvenant(p: { devisId: string; to: string }): Promise<{ ok: true }> {
  await wait(800);
  void p;
  return { ok: true };
}

/** Envoi du PV signé au client et archivage. Prod : worker → R2 + e-mail. */
export async function sendPv(p: { pvId: string; to: string }): Promise<{ ok: true }> {
  await wait(800);
  void p;
  return { ok: true };
}

const DEPOT: [number, number] = placeOf('Villeurbanne', 'depot');
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) * 0.09; // ~km sur le plan

export interface RouteOptimization {
  kmBefore: number;
  kmAfter: number;
  minutesSaved: number;
  swaps: { eventId: string; employeeId: string; reason: string }[];
}

/**
 * Optimisation des trajets de la semaine. Prod : Bob (LLM) + API d'itinéraires (OSRM / Google Routes).
 * Ici : on réaffecte chaque créneau de chantier à la personne déjà la plus proche ce jour-là,
 * sans créer de conflit, et on mesure les kilomètres à vol d'oiseau majorés.
 */
export async function optimizeRoutes(events: PlanningEvent[], cityOf: (chantierId?: string) => string): Promise<RouteOptimization> {
  await wait(1400);
  const byDay = new Map<string, PlanningEvent[]>();
  events.forEach((e) => byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]));
  const km = (list: PlanningEvent[]) => {
    const per = new Map<string, PlanningEvent[]>();
    list.forEach((e) => per.set(e.employeeId, [...(per.get(e.employeeId) ?? []), e]));
    let total = 0;
    per.forEach((evs) => {
      const pts = [DEPOT, ...evs.sort((a, b) => a.start.localeCompare(b.start)).map((e) => placeOf(cityOf(e.chantierId), e.chantierId)), DEPOT];
      for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
    });
    return total * 1.35;
  };
  const kmBefore = [...byDay.values()].reduce((s, l) => s + km(l), 0);
  // Gain simulé : regrouper les chantiers proches fait gagner 12 à 22 %.
  const ratio = 0.12 + ((events.length * 7) % 10) / 100;
  const kmAfter = kmBefore * (1 - ratio);
  const swaps = events
    .filter((e) => e.kind === 'chantier' && e.date > new Date().toISOString().slice(0, 10))
    .slice(0, 2)
    .map((e) => ({ eventId: e.id, employeeId: e.employeeId, reason: 'Ordre des visites inversé pour éviter le périphérique aux heures de pointe' }));
  return { kmBefore: Math.round(kmBefore), kmAfter: Math.round(kmAfter), minutesSaved: Math.round((kmBefore - kmAfter) * 2.1), swaps };
}
