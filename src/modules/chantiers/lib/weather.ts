// Météo simulée (déterministe par date et ville) pour la preview.
// En production : remplacer par fetchWeather() de ../service.ts (Météo-France / Open-Meteo).

import { dayOffset, daysBetween, todayISO } from '@/lib/format';

export type Sky = 'soleil' | 'eclaircies' | 'nuageux' | 'pluie' | 'averses' | 'orage';

export interface DayWeather {
  date: string;
  sky: Sky;
  label: string;
  tMin: number;
  tMax: number;
  rainProb: number; // %
  rainMm: number;
  wind: number; // km/h
}

const LABEL: Record<Sky, string> = {
  soleil: 'Ensoleillé',
  eclaircies: 'Éclaircies',
  nuageux: 'Nuageux',
  pluie: 'Pluie',
  averses: 'Averses',
  orage: 'Orageux',
};

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

/** Saison approximative pour Lyon : températures min/max moyennes par mois. */
const CLIMATE: [number, number][] = [[0, 7], [1, 9], [4, 14], [7, 17], [11, 21], [15, 26], [17, 29], [17, 28], [13, 24], [9, 18], [4, 11], [1, 7]];

export function weatherFor(date: string, city = 'Lyon'): DayWeather {
  const offset = daysBetween(todayISO(), date);
  const r = hash(date + city);
  // Pour la démo : pluie certaine à J+2 et J+5, pour montrer les alertes.
  let sky = 'soleil' as Sky;
  if (offset === 2) sky = 'pluie';
  else if (offset === 5) sky = 'averses';
  else sky = r < 0.32 ? 'soleil' : r < 0.6 ? 'eclaircies' : r < 0.82 ? 'nuageux' : r < 0.94 ? 'averses' : 'pluie';
  const m = new Date(date + 'T12:00:00').getMonth();
  const [lo, hi] = CLIMATE[m];
  const wet = (['pluie', 'averses', 'orage'] as Sky[]).includes(sky);
  const tMax = Math.round(hi + (r - 0.5) * 5 - (wet ? 2 : 0));
  const tMin = Math.round(lo + (hash(date + 'min') - 0.5) * 4);
  const rainProb = wet ? 70 + Math.round(r * 25) : sky === 'nuageux' ? 20 + Math.round(r * 15) : Math.round(r * 10);
  return {
    date,
    sky,
    label: LABEL[sky],
    tMin: Math.min(tMin, tMax - 2),
    tMax,
    rainProb,
    rainMm: wet ? Math.round((2 + r * 9) * 10) / 10 : 0,
    wind: Math.round(8 + hash(date + 'w') * 22),
  };
}

export const isRainy = (w: DayWeather) => w.rainProb >= 60;

export function forecast(days = 5, city = 'Lyon', from = 0): DayWeather[] {
  return Array.from({ length: days }, (_, i) => weatherFor(dayOffset(from + i), city));
}

/** Chantiers dont une partie des travaux est en extérieur (alerte pluie). */
const OUTDOOR = /borne|irve|toiture|toit|façade|facade|ext[ée]rieur|jardin|terrasse|clôture|portail|tranchée|gouttière|piscine|éclairage ext/i;
export const isOutdoor = (text: string) => OUTDOOR.test(text);
