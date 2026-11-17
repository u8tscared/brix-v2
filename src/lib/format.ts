import type { DevisLigne } from './types';

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const money = (n: number, round = false) => (round ? eur0 : eur).format(n || 0).replace(/ /g, ' ');
export const pct = (n: number, digits = 0) => `${(n || 0).toFixed(digits).replace('.', ',')} %`;
export const num = (n: number, digits = 2) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n).replace(/ /g, ' ');

/** Jour local (et non UTC : entre minuit et 2 h en France, l'UTC donne la veille). */
export const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => localISO(new Date());

/** Date relative à aujourd'hui (jours), au format ISO YYYY-MM-DD. */
export const dayOffset = (offset: number, base = new Date()) => {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localISO(d);
};

export const dateLong = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const dateShort = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const dateFull = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const monthName = (d = new Date()) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const relative = (iso: string) => {
  const diff = daysBetween(todayISO(), iso.slice(0, 10));
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  if (diff > 1 && diff < 7) return `dans ${diff} jours`;
  if (diff < -1 && diff > -30) return `il y a ${-diff} jours`;
  return dateShort(iso);
};

export interface Totals {
  ht: number;
  tva: number;
  ttc: number;
  cost: number;
  margin: number;
  marginRate: number;
  byVat: { rate: number; base: number; tva: number }[];
}

export function totals(lines: DevisLigne[]): Totals {
  let ht = 0;
  let cost = 0;
  const vat = new Map<number, number>();
  for (const l of lines) {
    if (l.kind === 'section' || l.kind === 'texte') continue;
    const lineHt = l.quantity * l.unitPriceHt;
    ht += lineHt;
    cost += l.quantity * (l.unitCostHt || 0);
    vat.set(l.vatRate, (vat.get(l.vatRate) || 0) + lineHt);
  }
  const byVat = [...vat.entries()].map(([rate, base]) => ({ rate, base, tva: (base * rate) / 100 }));
  const tva = byVat.reduce((s, v) => s + v.tva, 0);
  const margin = ht - cost;
  return { ht, tva, ttc: ht + tva, cost, margin, marginRate: ht ? (margin / ht) * 100 : 0, byVat };
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Bonne nuit';
  if (h < 18) return 'Bonjour';
  return 'Bonsoir';
};
